CREATE TABLE "auth_attempts" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_attempts_window_idx" ON "auth_attempts" USING btree ("window_start");