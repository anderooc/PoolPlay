-- Optional division scope for courts (shared across divisions when null).
ALTER TABLE "courts" ADD COLUMN "division_id" uuid REFERENCES "divisions"("id") ON DELETE SET NULL;
