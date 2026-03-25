import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const SPRING_CONFIG = { damping: 20, stiffness: 260, mass: 0.8 };

interface TabButtonProps {
  routeKey: string;
  routeName: RouteName;
  isFocused: boolean;
  accessibilityLabel?: string;
  testID?: string;
  onPress: () => void;
  onLongPress: () => void;
}

function TabButton({ routeName, isFocused, accessibilityLabel, testID, onPress, onLongPress }: TabButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.88, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const meta = ROUTE_META[routeName];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabButton: {
          width: 56,
          alignItems: "center",
          justifyContent: "center",
          gap: theme.tokens.spacing.xxs + 1,
          paddingVertical: theme.tokens.spacing.xs,
        },
        tabLabel: {
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
        activeIndicator: {
          position: "absolute",
          bottom: -2,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.colors.accent,
        },
      }),
    [theme],
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
    >
      <Animated.View style={[styles.tabButton, animatedStyle]}>
        <Ionicons
          color={isFocused ? theme.colors.accent : theme.colors.textSubtle}
          name={isFocused ? (meta.activeIcon as never) : (meta.icon as never)}
          size={22}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.colors.accent : theme.colors.textSubtle,
              fontWeight: isFocused
                ? theme.tokens.typography.fontWeight.bold
                : theme.tokens.typography.fontWeight.medium,
            },
          ]}
        >
          {meta.label}
        </Text>
        {isFocused ? <View style={styles.activeIndicator} /> : null}
      </Animated.View>
    </Pressable>
  );
}

export default function WorkoutBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const centerScale = useSharedValue(1);

  const centerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value }],
  }));

  const handleCenterPressIn = useCallback(() => {
    centerScale.value = withSpring(0.92, SPRING_CONFIG);
  }, [centerScale]);

  const handleCenterPressOut = useCallback(() => {
    centerScale.value = withSpring(1, { ...SPRING_CONFIG, damping: 14 });
  }, [centerScale]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          backgroundColor: theme.colors.background,
          paddingHorizontal: theme.tokens.spacing.xl - 2,
          paddingTop: 0,
        },
        pill: {
          minHeight: 80,
          borderRadius: theme.tokens.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.borderSoft,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.tokens.spacing.sm + 2,
          paddingVertical: theme.tokens.spacing.md,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.42 : 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: theme.tokens.elevation.md,
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
        centerButtonWrapper: {
          position: "absolute",
          alignSelf: "center",
          top: -20,
          width: 72,
          height: 72,
          borderRadius: theme.tokens.radius.pill,
          overflow: "hidden",
          shadowColor: theme.colors.shadowAccent,
          shadowOpacity: 0.4,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 },
          elevation: theme.tokens.elevation.lg,
        },
        centerButtonGradient: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        centerButtonBorder: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1.5,
          borderColor: theme.colors.borderAccent,
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

    const isFocused = state.index === state.routes.findIndex((item) => item.key === route.key);

    return (
      <TabButton
        accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
        isFocused={isFocused}
        key={route.key}
        onLongPress={() => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        }}
        onPress={() => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        }}
        routeKey={route.key}
        routeName={routeName}
        testID={descriptors[route.key].options.tabBarButtonTestID}
      />
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
        <Animated.View style={[styles.centerButtonWrapper, centerAnimatedStyle]}>
          <Pressable
            accessibilityLabel="Start today's workout"
            accessibilityRole="button"
            onPress={() => {
              navigation.navigate(centerRoute.name, centerRoute.params);
            }}
            onPressIn={handleCenterPressIn}
            onPressOut={handleCenterPressOut}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={[theme.gradients.heroAccentStart, theme.gradients.heroAccentEnd]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.centerButtonGradient}
            >
              <Ionicons color={theme.colors.onAccent} name="play" size={26} />
            </LinearGradient>
            <View style={styles.centerButtonBorder} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
