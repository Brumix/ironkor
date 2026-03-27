import { createElement, useCallback, useState } from "react";

import AppAlertModal from "@/components/ui/AppAlertModal";
import type { AlertVariant } from "@/components/ui/AppAlertModal";

export interface ShowAlertOptions {
  title: string;
  message?: string;
  variant?: AlertVariant;
  dismissLabel?: string;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  variant?: AlertVariant;
  dismissLabel?: string;
}

const INITIAL_STATE: AlertState = { visible: false, title: "" };

/**
 * Provides imperative alert triggering (`showAlert`) alongside a
 * `AlertModal` element that must be rendered somewhere in the component tree.
 *
 * Usage:
 *   const { showAlert, AlertModal } = useAppAlert();
 *   // In JSX: {AlertModal}
 *   // Imperatively: showAlert({ title: "Oops", message: "...", variant: "error" });
 */
export function useAppAlert() {
  const [state, setState] = useState(INITIAL_STATE);

  const dismiss = useCallback(() => {
    setState((current) => ({ ...current, visible: false }));
  }, []);

  const showAlert = useCallback((options: ShowAlertOptions) => {
    setState({ ...options, visible: true });
  }, []);

  const AlertModal = createElement(AppAlertModal, {
    visible: state.visible,
    title: state.title,
    message: state.message,
    variant: state.variant,
    dismissLabel: state.dismissLabel,
    onDismiss: dismiss,
  });

  return { showAlert, AlertModal };
}
