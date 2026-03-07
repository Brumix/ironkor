import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const ROUTE_META = {
  home: {
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
  },
  routines: {
    label: "Routines",
    icon: "barbell-outline",
    activeIcon: "barbell",
  },
  start: {
    label: "Start",
    icon: "play",
    activeIcon: "play",
  },
  plan: {
    label: "Plan",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  settings: {
    label: "Settings",
    icon: "settings-outline",
    activeIcon: "settings",
  },
} as const;

type RouteName = keyof typeof ROUTE_META;
const SIDE_TAB_ORDER: RouteName[] = ["home", "routines", "plan", "settings"];
const CENTER_TAB: RouteName = "start";
const KNOWN_ROUTE_NAMES = Object.keys(ROUTE_META) as RouteName[];

function resolveRouteName(name: string): RouteName | undefined {
  if (KNOWN_ROUTE_NAMES.includes(name as RouteName)) {
    return name as RouteName;
  }

  return KNOWN_ROUTE_NAMES.find((routeName) => name.endsWith(`/${routeName}`));
}

export default function WorkoutBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          backgroundColor: "transparent",
          paddingHorizontal: theme.tokens.spacing.xl - 2,
          paddingTop: theme.tokens.spacing.sm,
        },
        pill: {
          minHeight: 76,
          borderRadius: theme.tokens.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.backgroundElevated,
          paddingHorizontal: theme.tokens.spacing.sm + 2,
          paddingVertical: theme.tokens.spacing.md,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          shadowColor: theme.colors.text,
          shadowOpacity: theme.isDark ? 0.26 : 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: theme.tokens.elevation.md,
        },
        tabButton: {
          width: 56,
          alignItems: "center",
          justifyContent: "center",
          gap: theme.tokens.spacing.xxs + 1,
          borderRadius: theme.tokens.radius.md,
          paddingVertical: theme.tokens.spacing.xs,
        },
        group: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flex: 1,
        },
        centerSpacer: {
          width: 78,
        },
        tabLabel: {
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
        tabLabelActive: {
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        centerButton: {
          position: "absolute",
          alignSelf: "center",
          top: -10,
          width: 68,
          height: 68,
          borderRadius: theme.tokens.radius.pill,
          backgroundColor: theme.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.34,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: theme.tokens.elevation.lg,
        },
      }),
    [theme],
  );

  const centerRoute = state.routes.find((route) => resolveRouteName(route.name) === CENTER_TAB);
  const sideRoutes = SIDE_TAB_ORDER.map((name) => state.routes.find((route) => resolveRouteName(route.name) === name))
    .filter((route): route is NonNullable<typeof route> => Boolean(route));
  const leftRoutes = sideRoutes.slice(0, 2);
  const rightRoutes = sideRoutes.slice(2);

  const renderTab = (route: (typeof sideRoutes)[number]) => {
    const routeName = resolveRouteName(route.name);

    if (!routeName) {
      return null;
    }

    const meta = ROUTE_META[routeName];
    const isFocused = state.index === state.routes.findIndex((item) => item.key === route.key);

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      });
    };

    return (
      <PressableScale
        accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        key={route.key}
        onLongPress={onLongPress}
        onPress={onPress}
        pressedOpacity={0.85}
        pressedScale={0.95}
        style={[
          styles.tabButton,
          isFocused && {
            backgroundColor: theme.colors.surfaceAlt,
          },
        ]}
        testID={descriptors[route.key].options.tabBarButtonTestID}
      >
        <Ionicons
          color={isFocused ? theme.colors.primary : theme.colors.textSubtle}
          name={isFocused ? (meta.activeIcon as never) : (meta.icon as never)}
          size={20}
        />
        <Text style={[styles.tabLabel, { color: isFocused ? theme.colors.text : theme.colors.textSubtle }, isFocused && styles.tabLabelActive]}>
          {meta.label}
        </Text>
      </PressableScale>
    );
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.pill}>
        <View style={styles.group}>{leftRoutes.map(renderTab)}</View>
        <View style={styles.centerSpacer} />
        <View style={styles.group}>{rightRoutes.map(renderTab)}</View>
      </View>

      {centerRoute ? (
        <PressableScale
          accessibilityLabel="Start today's workout"
          accessibilityRole="button"
          onPress={() => {
            navigation.navigate(centerRoute.name, centerRoute.params);
          }}
          style={styles.centerButton}
        >
          <Ionicons color={theme.colors.onPrimary} name="play" size={24} />
        </PressableScale>
      ) : null}
    </View>
  );
}
