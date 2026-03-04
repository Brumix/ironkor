import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ReactNode } from "react";

interface WorkoutPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function WorkoutPage({ title, subtitle, children }: WorkoutPageProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 140 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0B0B",
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    marginBottom: 8,
    gap: 6,
  },
  title: {
    color: "#F8F8F8",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#AFB4BD",
    fontSize: 15,
    lineHeight: 20,
  },
});
