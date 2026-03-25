import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTheme } from "@/theme";

type MetricTone = "default" | "accent" | "success" | "warning";

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  helper?: string;
  tone?: MetricTone;
  progress?: number;
}

function MetricCard({ icon, label, value, helper, tone = "default", progress }: MetricCardProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          minHeight: 150,
          justifyContent: "space-between",
        },
        iconWrap: {
          width: 44,
          height: 44,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
        },
        label: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
          textTransform: "uppercase",
        },
        value: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize["3xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        helper: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight: theme.tokens.typography.fontSize.sm * theme.tokens.typography.lineHeight.relaxed,
        },
        textBlock: {
          gap: theme.tokens.spacing.xs,
        },
      }),
    [theme],
  );

  const toneStyles = {
    default: {
      iconBackground: theme.colors.surfaceAlt,
      iconColor: theme.colors.textMuted,
      cardVariant: "default" as const,
    },
    accent: {
      iconBackground: theme.colors.accentSoft,
      iconColor: theme.colors.accent,
      cardVariant: "highlight" as const,
    },
    success: {
      iconBackground: theme.colors.successSoft,
      iconColor: theme.colors.success,
      cardVariant: "highlight" as const,
    },
    warning: {
      iconBackground: theme.colors.warningSoft,
      iconColor: theme.colors.warning,
      cardVariant: "muted" as const,
    },
  }[tone];

  return (
    <AppCard style={styles.container} variant={toneStyles.cardVariant}>
      <View style={[styles.iconWrap, { backgroundColor: toneStyles.iconBackground }]}>
        <Ionicons color={toneStyles.iconColor} name={icon} size={18} />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      </View>

      {typeof progress === "number" ? <ProgressBar progress={progress} /> : null}
    </AppCard>
  );
}

export default memo(MetricCard);
