import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import HeaderBackButton from "@/components/ui/HeaderBackButton";
import SectionHeader from "@/components/ui/SectionHeader";
import { useAppAlert } from "@/components/ui/useAppAlert";
import WorkoutPage from "@/components/workout/WorkoutPage";
import type { ExerciseCatalog } from "@/features/workout/types";
import { useTheme } from "@/theme";

import type { Id } from "@convex/_generated/dataModel";

function renderLabel(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function MyExercisesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { showAlert, AlertModal } = useAppAlert();

  const exercisesData = useQuery(api.exercises.listCustom, {});
  const deleteCustom = useMutation(api.exercises.deleteCustom);

  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"exercises">; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const exercises = useMemo<ExerciseCatalog[]>(() => exercisesData ?? [], [exercisesData]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        helper: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight:
            theme.tokens.typography.fontSize.md *
            theme.tokens.typography.lineHeight.relaxed,
        },
        exerciseName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        exerciseMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        description: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontStyle: "italic",
        },
        cardBody: {
          gap: theme.tokens.spacing.sm,
        },
        metaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
        },
        actionRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.xs,
          flexWrap: "wrap",
        },
        emptyCard: {
          gap: theme.tokens.spacing.md,
          alignItems: "flex-start",
        },
      }),
    [theme],
  );

  async function confirmDelete() {
    if (!deleteTarget || isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteCustom({ exerciseId: deleteTarget.id });
      setDeleteTarget(null);
    } catch {
      showAlert({
        title: "Failed",
        message: "Could not delete exercise.",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const isLoading = exercisesData === undefined;

  function openCreateExercise() {
    router.push({
      pathname: "/(workout)/custom-exercise",
      params: { fromManage: "1" },
    });
  }

  function openEditExercise(exerciseId: Id<"exercises">) {
    router.push({
      pathname: "/(workout)/custom-exercise",
      params: {
        exerciseId: String(exerciseId),
        fromManage: "1",
      },
    });
  }

  return (
    <WorkoutPage
      headerChip={{ icon: "barbell-outline", label: "My Exercises" }}
      title={null}
      subtitle="Custom exercise catalog"
      headerAction={
        <HeaderBackButton
          onPress={() => {
            router.replace("/(workout)/routines");
          }}
        />
      }
      headerActionPosition="left"
    >
      <SectionHeader
        title="Your exercises"
        subtitle={isLoading ? "Loading..." : `${exercises.length} custom ${exercises.length === 1 ? "exercise" : "exercises"}`}
        action={
          <AppButton
            icon={<Ionicons name="add-circle-outline" size={16} color={theme.colors.text} />}
            label="New"
            size="sm"
            variant="secondary"
            onPress={openCreateExercise}
          />
        }
      />

      {isLoading ? (
        <AppCard variant="muted">
          <Text style={styles.helper}>Loading your exercises...</Text>
        </AppCard>
      ) : exercises.length === 0 ? (
        <AppCard variant="muted" style={styles.emptyCard}>
          <Text style={styles.helper}>
            You have not created any custom exercises yet. Tap New to add your first one.
          </Text>
          <AppButton
            icon={<Ionicons name="add-circle-outline" size={16} color={theme.colors.text} />}
            label="Create first exercise"
            size="sm"
            variant="secondary"
            onPress={openCreateExercise}
          />
        </AppCard>
      ) : (
        exercises.map((exercise: ExerciseCatalog, index: number) => (
          <Animated.View
            entering={FadeInUp.delay(60 + index * 30).springify().damping(20)}
            key={String(exercise._id)}
            layout={LinearTransition.springify().damping(20)}
          >
            <AppCard style={styles.cardBody}>
              <View>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {exercise.description ? (
                  <Text style={styles.description}>{exercise.description}</Text>
                ) : null}
              </View>

              <View style={styles.metaRow}>
                <AppChip label={renderLabel(exercise.bodyPart)} variant="neutral" />
                <AppChip label={renderLabel(exercise.equipment)} variant="neutral" />
                <AppChip label={renderLabel(exercise.primaryMuscle)} variant="accent" />
              </View>

              {exercise.muscleGroups.length > 1 ? (
                <Text style={styles.exerciseMeta}>
                  Also: {exercise.muscleGroups.filter((muscle) => muscle !== exercise.primaryMuscle).map(renderLabel).join(", ")}
                </Text>
              ) : null}

              <View style={styles.actionRow}>
                <AppButton
                  icon={<Ionicons name="create-outline" size={16} color={theme.colors.text} />}
                  label="Edit"
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    openEditExercise(exercise._id);
                  }}
                />
                <AppButton
                  accessibilityLabel={`Delete ${exercise.name}`}
                  icon={<Ionicons name="trash-outline" size={16} color={theme.colors.error} />}
                  size="sm"
                  variant="danger"
                  onPress={() => {
                    setDeleteTarget({ id: exercise._id, name: exercise.name });
                  }}
                />
              </View>
            </AppCard>
          </Animated.View>
        ))
      )}

      <ConfirmActionModal
        visible={Boolean(deleteTarget)}
        title="Delete Exercise"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This won't remove it from existing sessions.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        closeOnBackdropPress
        isSubmitting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
          }
        }}
      />

      {AlertModal}
    </WorkoutPage>
  );
}
