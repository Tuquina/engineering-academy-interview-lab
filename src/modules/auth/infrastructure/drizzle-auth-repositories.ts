import { count, eq, lt, sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/database/database";
import type { NewUser, SessionRepository, StoredUser, UserRepository } from "../application/auth-service";
import type { Role } from "../domain/user";
import { sessions, users } from "./auth-tables";

type UserRow = typeof users.$inferSelect;

function toUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    githubLogin: row.githubLogin,
    githubId: row.githubId,
    passwordHash: row.passwordHash,
    hasPassword: row.passwordHash !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Clave del lock que serializa la creación de la primera cuenta (que será admin). */
const FIRST_USER_LOCK = 724_001;

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string) {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ? toUser(row) : null;
  }

  async findByGithubId(githubId: string) {
    const [row] = await this.db.select().from(users).where(eq(users.githubId, githubId)).limit(1);
    return row ? toUser(row) : null;
  }

  async count() {
    const [row] = await this.db.select({ value: count() }).from(users);
    return row?.value ?? 0;
  }

  /**
   * Crea el usuario en una transacción con un lock asesor: dos registros simultáneos en una base vacía no pueden
   * convertirse ambos en "la primera cuenta".
   */
  async create(user: NewUser, options: { firstUserRole: Role }) {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${FIRST_USER_LOCK})`);
      const [existing] = await tx.select({ value: count() }).from(users);
      const role = (existing?.value ?? 0) === 0 ? options.firstUserRole : user.role;
      const [row] = await tx
        .insert(users)
        .values({ ...user, role })
        .returning();
      return toUser(row!);
    });
  }

  async update(
    id: string,
    patch: Partial<Pick<StoredUser, "githubId" | "githubLogin" | "role" | "displayName">>,
  ) {
    const [row] = await this.db.update(users).set(patch).where(eq(users.id, id)).returning();
    if (!row) throw new Error(`No existe el usuario ${id}.`);
    return toUser(row);
  }

  async touchLogin(id: string, at: Date) {
    await this.db.update(users).set({ lastLoginAt: at }).where(eq(users.id, id));
  }
}

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  async create(session: { idHash: string; userId: string; expiresAt: Date; userAgent: string | null }) {
    await this.db.insert(sessions).values({
      id: session.idHash,
      userId: session.userId,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent,
    });
  }

  async find(idHash: string) {
    const [row] = await this.db
      .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.id, idHash))
      .limit(1);
    return row ?? null;
  }

  async extend(idHash: string, expiresAt: Date) {
    await this.db.update(sessions).set({ expiresAt }).where(eq(sessions.id, idHash));
  }

  async delete(idHash: string) {
    await this.db.delete(sessions).where(eq(sessions.id, idHash));
  }

  async deleteExpired(now: Date) {
    const deleted = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now))
      .returning({ id: sessions.id });
    return deleted.length;
  }
}
