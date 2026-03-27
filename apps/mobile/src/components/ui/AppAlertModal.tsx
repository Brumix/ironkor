import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import ModalCardShell from "@/components/ui/ModalCardShell";
import { useTheme } from "@/theme";

import type { ComponentProps } from "react";

export type AlertVariant = "info" | "warning" | "error" | "success";

export interface AppAlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  variant?: AlertVariant;
  dismissLabel?: string;
  onDismiss: () => void;
}

type IoniconsName = ComponentProps<typeof Ionicons>["name"];
type ButtonVariant = "primary" | "secondary" | "danger";

interface VariantTokens {
  iconName: IoniconsName;
  iconColor: string;
  iconBackground: string;
  buttonVariant: ButtonVariant;
}

function resolveVariantTokens(
  variant: AlertVariant,
  theme: ReturnType<typeof useTheme>["theme"],
): VariantTokens {
  switch (variant) {
    case "warning":
      return {
        iconName: "warning-outline",
        iconColor: theme.colors.warning,
        iconBackground: theme.colors.warningSoft,
        buttonVariant: "secondary",
      };
    case "error":
      return {
        iconName: "alert-circle-outline",
        iconColor: theme.colors.error,
        iconBackground: theme.colors.errorSoft,
        buttonVariant: "danger",
      };
    case "success":
      return {
        iconName: "checkmark-circle-outline",
        iconColor: theme.colors.success,
        iconBackground: theme.colors.successSoft,
        buttonVariant: "primary",
      };
    case "info":
    default:
      return {
        iconName: "information-circle-outline",
        iconColor: theme.colors.primary,
        iconBackground: theme.colors.primarySoft,
        buttonVariant: "primary",
      };
  }
}

function AppAlertModal({
  visible,
  title,
  message,
  variant = "info",
  dismissLabel = "OK",
  onDismiss,
}: AppAlertModalProps) {
  const { theme } = useTheme();
  const variantTokens = resolveVariantTokens(variant, theme);

  const iconStyles = useMemo(
    () =>
      StyleSheet.create({
        iconCircle: {
          width: 44,
          height: 44,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [theme],
  );

  const headerAccessory = (
    <View
      style={[
        iconStyles.iconCircle,
        { backgroundColor: variantTokens.iconBackground },
      ]}
    >
      <Ionicons
        color={variantTokens.iconColor}
        name={variantTokens.iconName}
        size={24}
      />
    </View>
  );

  return (
    <ModalCardShell
      visible={visible}
      title={title}
      message={message}
      headerAccessory={headerAccessory}
      closeOnBackdropPress
      onRequestClose={onDismiss}
      footer={
        <AppButton
          label={dismissLabel}
          onPress={onDismiss}
          variant={variantTokens.buttonVariant}
        />
      }
    />
  );
}

export default memo(AppAlertModal);
