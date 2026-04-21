-- Allow registrations before an organizer assigns a division / pool.
ALTER TABLE "registrations" ALTER COLUMN "division_id" DROP NOT NULL;
