-- brackt - Collegiate club volleyball tournament hub
-- Copyright (C) 2026 Andrew Chang
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- Realtime inbox updates: authenticated users may SELECT only their own rows.
-- Mutations still go through the API (service role); this is read + subscribe.

DROP POLICY IF EXISTS "user_notifications_select_own"
  ON public.user_notifications;

CREATE POLICY "user_notifications_select_own"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_id = (SELECT auth.uid()::text)
        AND u.disabled_at IS NULL
    )
  );

GRANT SELECT ON TABLE public.user_notifications TO authenticated;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
END
$migration$;
