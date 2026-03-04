import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  const centerRoute = state.routes.find((route) => resolveRouteName(route.name) === CENTER_TAB);
  const sideRoutes = SIDE_TAB_ORDER
    .map((name) => state.routes.find((route) => resolveRouteName(route.name) === name))
    .filter((route): route is NonNullable<typeof route> => Boolean(route));
  const leftRoutes = sideRoutes.slice(0, 2);
  const rightRoutes = sideRoutes.slice(2);

  const renderTab = (route: typeof sideRoutes[number]) => {
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
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
        testID={descriptors[route.key].options.tabBarButtonTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.tabButton,
          {
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <Ionicons
          name={isFocused ? (meta.activeIcon as never) : (meta.icon as never)}
          size={20}
          color={isFocused ? "#101114" : "#7B808A"}
        />
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{meta.label}</Text>
      </Pressable>
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
        <Pressable
          onPress={() => { navigation.navigate(centerRoute.name, centerRoute.params); }}
          style={({ pressed }) => [
            styles.centerButton,
            {
              transform: [{ scale: pressed ? 0.96 : 1 }],
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Start today's workout"
        >
          <Ionicons name="play" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#0B0B0B",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  pill: {
    minHeight: 76,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tabButton: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
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
    fontSize: 11,
    color: "#7B808A",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#101114",
    fontWeight: "700",
  },
  centerButton: {
    position: "absolute",
    alignSelf: "center",
    top: -10,
    width: 68,
    height: 68,
    borderRadius: 999,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
});
