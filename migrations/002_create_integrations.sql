
CREATE TABLE IF NOT EXISTS "integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "provider_type" text NOT NULL,
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "last_sync_at" timestamptz,
  "status" text DEFAULT 'PENDING', 
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
