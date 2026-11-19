import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/database/database";
import { authAttempts } from "./auth-tables";

/**
 * Límite de intentos compartido entre instancias: una sola sentencia atómica (`INSERT … ON CONFLICT DO UPDATE`)
 * cuenta el intento y reinicia la ventana si ya venció, sin carreras entre requests concurrentes.
 */
export class DrizzleAttemptLimiter {
  constructor(
    private readonly db: Database,
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Registra un intento; devuelve los ms a esperar si se superó el límite, o 0 si se permite. */
  async take(key: string, now: Date = new Date()): Promise<number> {
    const keyHash = createHash("sha256").update(key).digest("hex");
    const expired = new Date(now.getTime() - this.windowMs);
    const [row] = await this.db
      .insert(authAttempts)
      .values({ keyHash, windowStart: now, count: 1 })
      .onConflictDoUpdate({
        target: authAttempts.keyHash,
        set: {
          count: sql`case when ${authAttempts.windowStart} <= ${expired.toISOString()}::timestamptz then 1 else ${authAttempts.count} + 1 end`,
          windowStart: sql`case when ${authAttempts.windowStart} <= ${expired.toISOString()}::timestamptz then ${now.toISOString()}::timestamptz else ${authAttempts.windowStart} end`,
        },
      })
      .returning({ count: authAttempts.count, windowStart: authAttempts.windowStart });
    // Limpieza oportunista de ventanas viejas (sin cron).
    if (Math.random() < 0.02) {
      await this.db.delete(authAttempts).where(lt(authAttempts.windowStart, expired));
    }
    if (!row || row.count <= this.limit) return 0;
    return Math.max(1, row.windowStart.getTime() + this.windowMs - now.getTime());
  }
}
