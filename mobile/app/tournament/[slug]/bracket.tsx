/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { fetchTournamentPlay } from "~/api/endpoints";
import { BRACKET_TYPE_LABELS } from "~/lib/format";
import { DrawnBracket } from "~/tournament/bracket-draw";
import { flattenBrackets, type DisplayBracket } from "~/tournament/flatten-brackets";
import { HostSettingsEntry } from "~/tournament/host-settings-entry";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { usePublicLoader } from "~/tournament/use-public-loader";
import { useThemeColors, type ThemeColors } from "~/theme/colors";

export default function BracketScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!slug) return Promise.reject(new Error("Tournament not found."));
      return fetchTournamentPlay(slug, signal);
    },
    [slug]
  );

  const { data, error, isRefreshing, reload, refresh } = usePublicLoader(
    load,
    "Could not load the bracket."
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Bracket" });
  }, [navigation]);

  if (data === null && error === null) return <LoadingScreen />;
  if (!data) {
    return (
      <ErrorScreen
        title="Bracket unavailable"
        message={error ?? "Could not load the bracket."}
        onRetry={() => void reload()}
      />
    );
  }

  const brackets = flattenBrackets(data);
  const anyReleased = data.divisions.some((division) => division.released);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
    >
      {slug ? (
        <HostSettingsEntry
          slug={slug}
          href={`/tournament/${slug}/settings/bracket`}
          title="Bracket settings"
          detail="Gold / silver / bronze structure"
        />
      ) : null}
      {data.divisions.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          Divisions have not been posted yet. The bracket lands here after the
          host releases play.
        </Text>
      ) : !anyReleased ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          The host has not released this bracket yet.
        </Text>
      ) : brackets.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          Bracket rounds appear after pool play is seeded.
        </Text>
      ) : (
        brackets.map((bracket) => (
          <BracketSection
            key={`${bracket.tier}-${bracket.name}-${bracket.contextName ?? ""}`}
            bracket={bracket}
            colors={colors}
            onMatchPress={(matchSlug) =>
              router.push(`/tournament/${slug}/matches/${matchSlug}`)
            }
          />
        ))
      )}
    </ScrollView>
  );
}

function BracketSection({
  bracket,
  colors,
  onMatchPress,
}: {
  bracket: DisplayBracket;
  colors: ThemeColors;
  onMatchPress: (matchSlug: string) => void;
}) {
  const typeLabel = BRACKET_TYPE_LABELS[bracket.type];
  const showType = bracket.type === "double_elimination";
  const reduceMotion = useReduceMotion();
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const hintDismissed = useRef(false);

  const dismissHint = useCallback(() => {
    if (hintDismissed.current) return;
    hintDismissed.current = true;
    if (reduceMotion) {
      hintOpacity.setValue(0);
      return;
    }
    Animated.timing(hintOpacity, {
      toValue: 0,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [hintOpacity, reduceMotion]);

  const onBracketScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Math.abs(event.nativeEvent.contentOffset.x) < 16) return;
      dismissHint();
    },
    [dismissHint]
  );

  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {bracket.name} bracket
        </Text>
        {bracket.contextName ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {bracket.contextName}
          </Text>
        ) : null}
        {showType && typeLabel ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {typeLabel}
          </Text>
        ) : null}
      </View>
      {bracket.matches.length === 0 ? (
        <Text style={[styles.emptyPad, { color: colors.mutedForeground }]}>
          Seeds automatically when pool play finishes.
        </Text>
      ) : (
        <>
          <Animated.Text
            style={[
              styles.hint,
              { color: colors.mutedForeground, opacity: hintOpacity },
            ]}
          >
            Swipe sideways to see later rounds
          </Animated.Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.draw}
            onScroll={onBracketScroll}
            scrollEventThrottle={16}
          >
            <DrawnBracket
              matches={bracket.matches}
              onMatchPress={onMatchPress}
            />
          </ScrollView>
        </>
      )}
    </View>
  );
}

function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => sub.remove();
  }, []);
  return reduceMotion;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 2,
  },
  title: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  meta: { fontSize: 13 },
  hint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  draw: { paddingHorizontal: 16, paddingVertical: 12 },
  empty: { fontSize: 15, lineHeight: 22 },
  emptyPad: { fontSize: 15, lineHeight: 22, padding: 20, textAlign: "center" },
});
