import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../../auth/infrastructure/auth-tables";

/**
 * Estado de usuario sincronizado: un documento versionado por usuario y por store del cliente (progreso, notas,
 * flashcards, laboratorios…). Equivale a UserProgress, QuizAttempts, FlashcardReviews, UserNotes, Bookmarks,
 * InterviewSessions, ArchitectureProjects y UserPreferences del §28, representados como documentos (ADR-0010).
 */
export const userDocuments = pgTable(
  "user_documents",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeKey: text("store_key").notNull(),
    /** Concurrencia optimista: cada escritura exige la revisión que leyó el cliente. */
    revision: integer("revision").notNull(),
    data: jsonb("data").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.storeKey] }),
    check("user_documents_revision_positive", sql`${t.revision} > 0`),
  ],
);
