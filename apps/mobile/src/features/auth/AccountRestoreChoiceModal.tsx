import ConfirmActionModal from "@/components/ui/ConfirmActionModal";

export default function AccountRestoreChoiceModal({
  isSubmitting,
  onRestore,
  onStartFresh,
  visible,
}: {
  isSubmitting: boolean;
  onRestore: () => void | Promise<void>;
  onStartFresh: () => void | Promise<void>;
  visible: boolean;
}) {
  return (
    <ConfirmActionModal
      visible={visible}
      title="Restore your previous account"
      message="We kept your previous Ironkor account for 30 days. Restore it to bring back your routines, sessions, and custom exercises, or start fresh and keep the old account hidden forever."
      confirmLabel="Restore previous account"
      cancelLabel="Start fresh"
      confirmVariant="primary"
      closeOnBackdropPress={false}
      isSubmitting={isSubmitting}
      onConfirm={onRestore}
      onCancel={onStartFresh}
    />
  );
}
