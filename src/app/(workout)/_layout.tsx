import { Tabs } from "expo-router";

import WorkoutBottomNav from "@/components/workout/WorkoutBottomNav";

export default function WorkoutLayout() {
  return (
    <Tabs
      tabBar={(props) => <WorkoutBottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#0B0B0B" },
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
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
