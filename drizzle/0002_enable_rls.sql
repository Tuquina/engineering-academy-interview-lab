-- Defensa en profundidad para PostgreSQL administrado (Supabase expone el esquema public por su API de datos):
-- con RLS activo y sin políticas, los roles de esa API no leen ni escriben nada. La app se conecta con el rol
-- dueño de las tablas, que no está sujeto a RLS, así que su comportamiento no cambia.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_flashcards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth_attempts" ENABLE ROW LEVEL SECURITY;
