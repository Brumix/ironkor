import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAction } from "convex/react";
import { Image } from "expo-image";
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
import { useAccountDeletionTransition } from "@/features/auth/AccountDeletionTransitionProvider";
import { useClerk, useUser } from "@/features/auth/clerkCompat";
import { resolveSignInMethod } from "@/features/auth/resolveSignInMethod";
import { useSecureSignOut } from "@/features/auth/useSecureSignOut";
import { useTheme } from "@/theme";

function getDisplayInitials(displayName: string) {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "IA";
  }

  return words
    .slice(0, 2)
    .map((word) => word.slice(0, 1).toUpperCase())
    .join("");
}

export default function SettingsScreen() {
  const { client } = useClerk();
  const { user } = useUser();
  const {
    beginAccountDeletionTransition,
    endAccountDeletionTransition,
  } = useAccountDeletionTransition();
  const { mode, setMode, theme } = useTheme();
  const secureSignOut = useSecureSignOut();
  const { showAlert, AlertModal } = useAppAlert();
  const deleteMyAccount = useAction(api.auth.deleteMyAccount);
  const [autoStartTimer, setAutoStartTimer] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const displayName = user?.fullName ?? "Ironkor athlete";
  const emailAddress = user?.primaryEmailAddress?.emailAddress ?? "Syncing your email...";
  const signInMethod = resolveSignInMethod({
    lastAuthenticationStrategy: client?.lastAuthenticationStrategy,
    user,
  });
  const avatarInitials = getDisplayInitials(displayName);
  const shouldShowAvatarImage = Boolean(user?.hasImage && user.imageUrl);

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
        accountActions: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.sm,
        },
        accountAvatar: {
          width: 76,
          height: 76,
          borderRadius: theme.tokens.radius.xl,
          backgroundColor: theme.colors.accentSoft,
          borderWidth: 1,
          borderColor: theme.colors.borderAccent,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        },
        accountAvatarFallback: {
          color: theme.colors.accentStrong,
          fontSize: theme.tokens.typography.fontSize.xl,
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        accountBadge: {
          alignSelf: "flex-start",
          backgroundColor: theme.colors.secondarySoft,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.borderSoft,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xxs,
        },
        accountBadgeLabel: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.caps,
          textTransform: "uppercase",
        },
        accountDetails: {
          flex: 1,
          gap: theme.tokens.spacing.xs,
        },
        accountHeader: {
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
          alignItems: "center",
        },
        accountMethodInline: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xs,
          marginTop: theme.tokens.spacing.xs,
        },
        accountMethodInlineLabel: {
          color: theme.colors.textSubtle,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        accountMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight:
            theme.tokens.typography.fontSize.sm *
            theme.tokens.typography.lineHeight.relaxed,
        },
        accountName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        accountMethodValue: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
        accountMethodIcon: {
          width: 24,
          height: 24,
          borderRadius: theme.tokens.radius.pill,
          backgroundColor: theme.colors.accentSoft,
          borderWidth: 1,
          borderColor: theme.colors.borderAccent,
          alignItems: "center",
          justifyContent: "center",
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
        dangerCard: {
          backgroundColor: theme.colors.errorSoft,
          borderColor: theme.colors.error,
        },
        dangerHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        dangerIcon: {
          width: 42,
          height: 42,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.error,
        },
        dangerTitleBlock: {
          flex: 1,
          gap: theme.tokens.spacing.xxs,
        },
        dangerTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        dangerDescription: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight:
            theme.tokens.typography.fontSize.sm *
            theme.tokens.typography.lineHeight.relaxed,
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
      await secureSignOut();
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
    beginAccountDeletionTransition();
    try {
      setShowDeleteAccountModal(false);
      // Let the shared auth layout swap out the workout tabs before we flag the user as deleting.
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      await deleteMyAccount({});
      await secureSignOut();
      router.replace("/sign-in");
    } catch (error) {
      endAccountDeletionTransition();
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
        <View style={styles.accountHeader}>
          <View style={styles.accountAvatar}>
            {shouldShowAvatarImage ? (
              <Image
                source={{ uri: user?.imageUrl ?? "" }}
                style={styles.accountAvatar}
                contentFit="cover"
                transition={theme.tokens.motion.quick}
              />
            ) : (
              <Text style={styles.accountAvatarFallback}>{avatarInitials}</Text>
            )}
          </View>

          <View style={styles.accountDetails}>
            <View style={styles.accountBadge}>
              <Text style={styles.accountBadgeLabel}>Profile</Text>
            </View>

            <Text selectable style={styles.accountName}>
              {displayName}
            </Text>
            <Text selectable style={styles.accountMeta}>
              {emailAddress}
            </Text>

            <View style={styles.accountMethodInline}>
              <Text style={styles.accountMethodInlineLabel}>Signed in with</Text>
              <View style={styles.accountMethodIcon}>
                <Ionicons color={theme.colors.accentStrong} name={signInMethod.iconName} size={12} />
              </View>
              <Text selectable style={styles.accountMethodValue}>
                {signInMethod.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.accountActions}>
          <AppButton
            icon={<Ionicons color={theme.colors.text} name="log-out-outline" size={16} />}
            label="Sign out"
            loading={isSigningOut}
            onPress={handleSignOut}
            size="sm"
            variant="secondary"
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

      <SectionHeader
        title="Danger zone"
        subtitle="Permanent account actions stay here at the end of settings"
      />

      <AppCard style={styles.dangerCard}>
        <View style={styles.dangerHeader}>
          <View style={styles.dangerIcon}>
            <Ionicons color={theme.colors.error} name="warning-outline" size={20} />
          </View>
          <View style={styles.dangerTitleBlock}>
            <Text style={styles.dangerTitle}>Delete account permanently</Text>
            <Text style={styles.dangerDescription}>
              This removes your current Ironkor account from active use. We preserve your routines, sessions, and custom exercises for 30 days in case you want to restore this account later.
            </Text>
          </View>
        </View>

        <AppButton
          fullWidth
          icon={<Ionicons color={theme.colors.error} name="trash-outline" size={16} />}
          label="Delete account"
          loading={isDeletingAccount}
          onPress={() => {
            setShowDeleteAccountModal(true);
          }}
          variant="danger"
        />
      </AppCard>

      <ConfirmActionModal
        visible={showDeleteAccountModal}
        title="Delete account"
        message="This deletes your current Ironkor account from active use. Your routines, sessions, and custom exercises stay preserved for 30 days so you can restore this account later. If you sign in again within 30 days, you can restore it or start fresh. After 30 days, or if you choose Start fresh, the old account is deleted forever."
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
