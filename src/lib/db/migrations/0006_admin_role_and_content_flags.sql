ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'admin';

CREATE TABLE IF NOT EXISTS "content_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "area" text NOT NULL,
  "text" text NOT NULL,
  "blocked_word" text NOT NULL,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "content_flags"
    ADD CONSTRAINT "content_flags_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "content_flags_created_at_idx"
  ON "content_flags" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "content_flags_user_id_idx"
  ON "content_flags" ("user_id");
