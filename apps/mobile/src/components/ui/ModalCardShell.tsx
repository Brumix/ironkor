import { memo, useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import { useTheme } from "@/theme";

import type { ReactNode } from "react";

export interface ModalCardShellProps {
  children?: ReactNode;
  visible: boolean;
  title: string;
  message?: string;
  /** Shown above the title (e.g. alert variant icon). */
  headerAccessory?: ReactNode;
  /** Primary actions (e.g. OK, or Cancel + Confirm). */
  footer: ReactNode;
  closeOnBackdropPress?: boolean;
  onRequestClose: () => void;
}

/**
 * Shared overlay + card layout for themed modal dialogs (single-button alerts and two-button confirms).
 */
function ModalCardShell({
  children,
  visible,
  title,
  message,
  headerAccessory,
  footer,
  closeOnBackdropPress = true,
  onRequestClose,
}: ModalCardShellProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: theme.tokens.spacing.lg,
          backgroundColor: theme.colors.overlay,
        },
        card: {
          alignSelf: "center",
          width: "100%",
          maxWidth: 460,
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
          lineHeight:
            theme.tokens.typography.fontSize.md *
            theme.tokens.typography.lineHeight.relaxed,
        },
        footerRow: {
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: theme.tokens.spacing.sm,
          flexWrap: "wrap",
        },
      }),
    [theme],
  );

  function handleBackdropPress() {
    if (!closeOnBackdropPress) {
      return;
    }
    onRequestClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

        <AppCard style={styles.card}>
          {headerAccessory}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}
          <View style={styles.footerRow}>{footer}</View>
        </AppCard>
      </View>
    </Modal>
  );
}

export default memo(ModalCardShell);
