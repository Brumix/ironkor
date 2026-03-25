import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

interface StatBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  accent?: boolean;
}

function StatBadge({ icon, value, label, accent = false }: StatBadgeProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: "flex-start",
          gap: theme.tokens.spacing.sm,
          padding: theme.tokens.spacing.md,
          borderRadius: theme.tokens.radius.lg,
          borderWidth: 1,
          minHeight: 120,
          justifyContent: "space-between",
        },
        containerDefault: {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        containerAccent: {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.borderAccent,
        },
        iconWrap: {
          width: 42,
          height: 42,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
        },
        iconWrapDefault: {
          backgroundColor: theme.colors.surfaceAlt,
        },
        iconWrapAccent: {
          backgroundColor: theme.colors.accentSoft,
        },
        value: {
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize["3xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        valueDefault: {
          color: theme.colors.text,
        },
        valueAccent: {
          color: theme.colors.accent,
        },
        label: {
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.medium,
          color: theme.colors.textMuted,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
        },
      }),
    [theme],
  );

  return (
    <View style={[styles.container, accent ? styles.containerAccent : styles.containerDefault]}>
      <View style={[styles.iconWrap, accent ? styles.iconWrapAccent : styles.iconWrapDefault]}>
        <Ionicons
          color={accent ? theme.colors.accent : theme.colors.textMuted}
          name={icon}
          size={16}
        />
      </View>
      <Text style={[styles.value, accent ? styles.valueAccent : styles.valueDefault]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default memo(StatBadge);
