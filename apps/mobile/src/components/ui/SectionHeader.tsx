import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.sm,
        },
        textBlock: {
          flex: 1,
          gap: theme.tokens.spacing.xxs,
        },
        title: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize.xl,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        subtitle: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export default memo(SectionHeader);
