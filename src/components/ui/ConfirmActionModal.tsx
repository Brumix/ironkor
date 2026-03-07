import { memo, useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import { useTheme } from "@/theme";

type ConfirmVariant = "danger" | "primary";

interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ConfirmVariant;
  closeOnBackdropPress?: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  closeOnBackdropPress = true,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
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
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        actionRow: {
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: theme.tokens.spacing.sm,
          flexWrap: "wrap",
        },
      }),
    [theme],
  );

  function handleCancel() {
    if (isSubmitting) {
      return;
    }

    onCancel();
  }

  function handleBackdropPress() {
    if (!closeOnBackdropPress || isSubmitting) {
      return;
    }

    onCancel();
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

        <AppCard style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actionRow}>
            <AppButton label={cancelLabel} onPress={handleCancel} variant="secondary" disabled={isSubmitting} />
            <AppButton
              label={confirmLabel}
              onPress={() => {
                void onConfirm();
              }}
              variant={confirmVariant}
              disabled={isSubmitting}
            />
          </View>
        </AppCard>
      </View>
    </Modal>
  );
}

export default memo(ConfirmActionModal);
