import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import { useTheme } from "@/theme";

interface InfoPopoverButtonProps {
  title: string;
  message: string;
  accessibilityLabel: string;
  /** Smaller, borderless control for inline use next to field labels. */
  compact?: boolean;
}

function InfoPopoverButton({
  title,
  message,
  accessibilityLabel,
  compact = false,
}: InfoPopoverButtonProps) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        trigger: {
          width: compact
            ? theme.tokens.layout.helpTriggerCompact
            : theme.tokens.layout.helpTriggerDefault,
          height: compact
            ? theme.tokens.layout.helpTriggerCompact
            : theme.tokens.layout.helpTriggerDefault,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: compact ? "transparent" : theme.colors.surfaceAlt,
          borderWidth: compact ? theme.tokens.spacing.none : theme.tokens.spacing.hairline,
          borderColor: theme.colors.borderSoft,
        },
        overlay: {
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: theme.tokens.spacing.lg,
          backgroundColor: theme.colors.overlay,
        },
        card: {
          gap: theme.tokens.spacing.md,
        },
        title: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize.xl,
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        message: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        dismiss: {
          alignSelf: "flex-end",
          paddingHorizontal: theme.tokens.spacing.md,
          paddingVertical: theme.tokens.spacing.sm,
          backgroundColor: theme.colors.secondarySoft,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: theme.tokens.spacing.hairline,
          borderColor: theme.colors.border,
        },
        dismissText: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
      }),
    [compact, theme],
  );

  return (
    <>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={
          compact
            ? {
                top: theme.tokens.hitSlop.compactHelpVertical,
                bottom: theme.tokens.hitSlop.compactHelpVertical,
                left: theme.tokens.hitSlop.compactHelpHorizontal,
                right: theme.tokens.hitSlop.compactHelpHorizontal,
              }
            : undefined
        }
        onPress={() => {
          setVisible(true);
        }}
        style={styles.trigger}
      >
        <Ionicons
          color={compact ? theme.colors.textSubtle : theme.colors.textMuted}
          name="help-circle-outline"
          size={compact ? theme.tokens.icon.sm : theme.tokens.icon.md}
        />
      </Pressable>

      <Modal
        visible={visible}
        animationType="fade"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          setVisible(false);
        }}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setVisible(false);
            }}
          />

          <AppCard style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <Pressable
              onPress={() => {
                setVisible(false);
              }}
              style={styles.dismiss}
            >
              <Text style={styles.dismissText}>Close</Text>
            </Pressable>
          </AppCard>
        </View>
      </Modal>
    </>
  );
}

export default memo(InfoPopoverButton);
