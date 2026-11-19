import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Tablas del módulo de autenticación (MASTER_PROMPT §28: Users y sesiones). */

export const userRole = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Normalizado en minúsculas; único. Puede faltar si la cuenta se creó con GitHub sin email verificado. */
    email: text("email").unique(),
    displayName: text("display_name").notNull(),
    /** Hash scrypt con su sal y parámetros; `null` en cuentas sólo de GitHub. */
    passwordHash: text("password_hash"),
    githubId: text("github_id").unique(),
    githubLogin: text("github_login"),
    role: userRole("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [check("users_identity_present", sql`${t.email} is not null or ${t.githubId} is not null`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 del token: si la tabla se filtra, los tokens no sirven para iniciar sesión. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);
