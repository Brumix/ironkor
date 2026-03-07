import { Tabs } from "expo-router";

import WorkoutBottomNav from "@/components/workout/WorkoutBottomNav";
import { useTheme } from "@/theme";

export default function WorkoutLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <WorkoutBottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="routines" />
      <Tabs.Screen name="start" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen
        name="routine-editor"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="session-editor"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
