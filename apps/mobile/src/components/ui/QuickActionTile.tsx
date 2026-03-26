import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import { useTheme } from "@/theme";

type QuickActionTone = "default" | "accent" | "success";

interface QuickActionTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  tone?: QuickActionTone;
  onPress: () => void;
}

function QuickActionTile({ icon, title, subtitle, tone = "default", onPress }: QuickActionTileProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          minHeight: 116,
          justifyContent: "space-between",
        },
        iconWrap: {
          width: 42,
          height: 42,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
        },
        title: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        subtitle: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight: theme.tokens.typography.fontSize.sm * theme.tokens.typography.lineHeight.relaxed,
        },
        body: {
          gap: theme.tokens.spacing.xs,
        },
      }),
    [theme],
  );

  const toneStyles = {
    default: {
      iconBackground: theme.colors.surfaceAlt,
      iconColor: theme.colors.textMuted,
      variant: "default" as const,
    },
    accent: {
      iconBackground: theme.colors.accentSoft,
      iconColor: theme.colors.accent,
      variant: "highlight" as const,
    },
    success: {
      iconBackground: theme.colors.successSoft,
      iconColor: theme.colors.success,
      variant: "highlight" as const,
    },
  }[tone];

  return (
    <AppCard onPress={onPress} style={styles.container} variant={toneStyles.variant}>
      <View style={[styles.iconWrap, { backgroundColor: toneStyles.iconBackground }]}>
        <Ionicons color={toneStyles.iconColor} name={icon} size={18} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </AppCard>
  );
}

export default memo(QuickActionTile);
