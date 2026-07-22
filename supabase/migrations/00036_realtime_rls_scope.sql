-- ShootSet - Collegiate club volleyball tournament hub
-- Copyright (C) 2026 Andrew Chang
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.

-- Keep browser Realtime reads aligned with the visibility checks used by the
-- Next.js app. SECURITY DEFINER avoids recursive RLS evaluation while the
-- policies inspect users, tournaments, memberships, and registrations.
CREATE OR REPLACE FUNCTION public.current_user_can_view_tournament(
  target_tournament_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.tournaments t ON t.id = target_tournament_id
    WHERE u.auth_id = (SELECT auth.uid()::text)
      AND (
        t.status <> 'draft'
        OR t.organizer_id = u.id
        OR u.role = 'admin'
        OR EXISTS (
          SELECT 1
          FROM public.school_members sm
          WHERE sm.school_id = t.host_school_id
            AND sm.user_id = u.id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_access_tournament_chat(
  target_tournament_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.tournaments t ON t.id = target_tournament_id
    WHERE u.auth_id = (SELECT auth.uid()::text)
      AND (
        t.organizer_id = u.id
        OR u.role = 'admin'
        OR EXISTS (
          SELECT 1
          FROM public.school_members sm
          WHERE sm.school_id = t.host_school_id
            AND sm.user_id = u.id
            AND sm.role IN ('president', 'officer')
        )
        OR EXISTS (
          SELECT 1
          FROM public.registrations r
          JOIN public.team_members tm ON tm.team_id = r.team_id
          WHERE r.tournament_id = t.id
            AND tm.user_id = u.id
            AND r.status IN ('confirmed', 'checked_in')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_can_view_tournament(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_can_access_tournament_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_tournament(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_tournament_chat(uuid) TO authenticated;

DROP POLICY IF EXISTS "matches_select_authenticated" ON public.matches;
CREATE POLICY "matches_select_visible_tournament"
  ON public.matches FOR SELECT TO authenticated
  USING (public.current_user_can_view_tournament(tournament_id));

DROP POLICY IF EXISTS "sets_select_authenticated" ON public.sets;
CREATE POLICY "sets_select_visible_tournament"
  ON public.sets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = sets.match_id
        AND public.current_user_can_view_tournament(m.tournament_id)
    )
  );

DROP POLICY IF EXISTS "tournament_chat_channels_select"
  ON public.tournament_chat_channels;
CREATE POLICY "tournament_chat_channels_select"
  ON public.tournament_chat_channels FOR SELECT TO authenticated
  USING (
    public.current_user_can_access_tournament_chat(tournament_id)
  );

DROP POLICY IF EXISTS "tournament_chat_messages_select"
  ON public.tournament_chat_messages;
CREATE POLICY "tournament_chat_messages_select"
  ON public.tournament_chat_messages FOR SELECT TO authenticated
  USING (
    public.current_user_can_access_tournament_chat(tournament_id)
  );
