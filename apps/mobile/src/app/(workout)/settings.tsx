import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAction, useQuery } from "convex/react";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import MetricCard from "@/components/ui/MetricCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { useAppAlert } from "@/components/ui/useAppAlert";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useAuth } from "@/features/auth/clerkCompat";
import { useTheme } from "@/theme";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { mode, setMode, theme } = useTheme();
  const { showAlert, AlertModal } = useAppAlert();
  const viewer = useQuery(api.auth.getViewer);
  const deleteMyAccount = useAction(api.auth.deleteMyAccount);
  const [autoStartTimer, setAutoStartTimer] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        metricsRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
        },
        metricColumn: {
          flex: 1,
        },
        accountMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        accountName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.xl,
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        accountRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
          alignItems: "center",
        },
        accountText: {
          flex: 1,
          gap: theme.tokens.spacing.xxs,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.md,
        },
        textBlock: {
          flex: 1,
          gap: theme.tokens.spacing.xxs + 1,
        },
        label: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        description: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight: theme.tokens.typography.fontSize.sm * theme.tokens.typography.lineHeight.relaxed,
        },
        themeRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.sm,
          flexWrap: "wrap",
        },
      }),
    [theme],
  );

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (error) {
      showAlert({
        title: "Sign-out failed",
        message: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteMyAccount({});
      await signOut();
      setShowDeleteAccountModal(false);
      router.replace("/sign-in");
    } catch (error) {
      showAlert({
        title: "Delete account failed",
        message: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <WorkoutPage headerChip={{ icon: "options-outline", label: "Preferences" }} subtitle="Gym-ready setup">
      <SectionHeader
        title="Account"
        subtitle="Your secure Ironkor identity"
      />

      <AppCard>
        <View style={styles.accountRow}>
          <MetricCard
            helper="Clerk-secured account"
            icon="shield-checkmark-outline"
            label="Security"
            tone="accent"
            value="On"
          />
          <View style={styles.accountText}>
            <Text style={styles.accountName}>
              {viewer?.displayName ?? "Ironkor athlete"}
            </Text>
            <Text style={styles.accountMeta}>
              {viewer?.primaryEmail ?? "Syncing your email..."}
            </Text>
          </View>
        </View>

        <View style={styles.themeRow}>
          <AppButton
            icon={<Ionicons color={theme.colors.text} name="log-out-outline" size={16} />}
            label="Sign out"
            loading={isSigningOut}
            onPress={handleSignOut}
            size="sm"
            variant="secondary"
          />
          <AppButton
            icon={<Ionicons color={theme.colors.error} name="trash-outline" size={16} />}
            label="Delete account"
            loading={isDeletingAccount}
            onPress={() => {
              setShowDeleteAccountModal(true);
            }}
            size="sm"
            variant="danger"
          />
        </View>
      </AppCard>

      <SectionHeader
        title="Interaction"
        subtitle="Small settings that make the workout flow feel faster"
      />

      <AppCard>
        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Auto-start timer</Text>
            <Text style={styles.description}>Start the rest timer as soon as a set is marked complete.</Text>
          </View>
          <Switch
            onValueChange={setAutoStartTimer}
            thumbColor={theme.colors.surface}
            trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.accent }}
            value={autoStartTimer}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Haptic feedback</Text>
            <Text style={styles.description}>Feel subtle tactile confirmation when sets are checked off.</Text>
          </View>
          <Switch
            onValueChange={setHapticFeedback}
            thumbColor={theme.colors.surface}
            trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.accent }}
            value={hapticFeedback}
          />
        </View>
      </AppCard>

      <SectionHeader
        title="Visual mode"
        subtitle="Switch between light, dark, or system-controlled themes"
      />

      <AppCard variant="muted">
        <View style={styles.themeRow}>
          <AppButton label="System" onPress={() => { setMode("system"); }} size="sm" variant={mode === "system" ? "accent" : "secondary"} />
          <AppButton label="Light" onPress={() => { setMode("light"); }} size="sm" variant={mode === "light" ? "accent" : "secondary"} />
          <AppButton label="Dark" onPress={() => { setMode("dark"); }} size="sm" variant={mode === "dark" ? "accent" : "secondary"} />
        </View>
      </AppCard>

      <SectionHeader
        title="Experience"
        subtitle="A quick summary of the current behavior preferences"
      />

      <View style={styles.metricsRow}>
        <View style={styles.metricColumn}>
          <MetricCard
            helper="Rest timer begins right after a completed set"
            icon="timer-outline"
            label="Auto Timer"
            tone={autoStartTimer ? "success" : "default"}
            value={autoStartTimer ? "On" : "Off"}
          />
        </View>
        <View style={styles.metricColumn}>
          <MetricCard
            helper="Tactile feedback when sets are completed"
            icon="phone-portrait-outline"
            label="Haptics"
            tone={hapticFeedback ? "accent" : "default"}
            value={hapticFeedback ? "On" : "Off"}
          />
        </View>
      </View>

      <ConfirmActionModal
        visible={showDeleteAccountModal}
        title="Delete account"
        message="This permanently deletes your Ironkor account, routines, sessions, and custom exercises."
        confirmLabel="Delete forever"
        cancelLabel="Cancel"
        confirmVariant="danger"
        closeOnBackdropPress={!isDeletingAccount}
        isSubmitting={isDeletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          if (!isDeletingAccount) {
            setShowDeleteAccountModal(false);
          }
        }}
      />

      {AlertModal}
    </WorkoutPage>
  );
}
