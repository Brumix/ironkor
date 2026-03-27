import { memo } from "react";

import AppButton from "@/components/ui/AppButton";
import ModalCardShell from "@/components/ui/ModalCardShell";

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
  function handleRequestClose() {
    if (isSubmitting) {
      return;
    }
    onCancel();
  }

  return (
    <ModalCardShell
      visible={visible}
      title={title}
      message={message}
      closeOnBackdropPress={closeOnBackdropPress && !isSubmitting}
      onRequestClose={handleRequestClose}
      footer={
        <>
          <AppButton
            label={cancelLabel}
            onPress={handleRequestClose}
            variant="secondary"
            disabled={isSubmitting}
          />
          <AppButton
            label={confirmLabel}
            onPress={() => {
              void onConfirm();
            }}
            variant={confirmVariant}
            disabled={isSubmitting}
          />
        </>
      }
    />
  );
}

export default memo(ConfirmActionModal);
