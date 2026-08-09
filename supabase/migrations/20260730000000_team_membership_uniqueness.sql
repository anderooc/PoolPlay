-- ShootSet - Collegiate club volleyball tournament hub
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

DO $$
DECLARE
  duplicate_details text;
BEGIN
  SELECT string_agg(
    format(
      'team=%s user=%s count=%s',
      duplicate_membership.team_id,
      duplicate_membership.user_id,
      duplicate_membership.membership_count
    ),
    '; '
  )
  INTO duplicate_details
  FROM (
    SELECT team_id, user_id, count(*) AS membership_count
    FROM public.team_members
    GROUP BY team_id, user_id
    HAVING count(*) > 1
    ORDER BY team_id, user_id
    LIMIT 20
  ) duplicate_membership;

  IF duplicate_details IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot enforce unique team membership while duplicate rows exist: %',
      duplicate_details
      USING HINT =
        'Reconcile the listed memberships explicitly, then retry this migration.';
  END IF;
END
$$;

CREATE UNIQUE INDEX team_members_team_user_unique
  ON public.team_members (team_id, user_id);
