import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  type BodyPartType,
  type EquipmentType,
  type MuscleType,
} from "@ironkor/shared/constants";

import { useTheme } from "@/theme";


function formatLabel(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type FilterKey = "bodyPart" | "primaryMuscle" | "equipment";

interface FilterConfig {
  key: FilterKey;
  label: string;
  values: readonly string[];
}

interface ExerciseFilterRowProps {
  availableBodyParts: readonly BodyPartType[];
  availableEquipment: readonly EquipmentType[];
  availablePrimaryMuscles: readonly MuscleType[];
  bodyPart: BodyPartType | undefined;
  equipment: EquipmentType | undefined;
  primaryMuscle: MuscleType | undefined;
  onBodyPartChange: (value: BodyPartType | undefined) => void;
  onEquipmentChange: (value: EquipmentType | undefined) => void;
  onPrimaryMuscleChange: (value: MuscleType | undefined) => void;
}

function ExerciseFilterRow({
  availableBodyParts,
  availableEquipment,
  availablePrimaryMuscles,
  bodyPart,
  equipment,
  primaryMuscle,
  onBodyPartChange,
  onEquipmentChange,
  onPrimaryMuscleChange,
}: ExerciseFilterRowProps) {
  const { theme } = useTheme();
  const [activePicker, setActivePicker] = useState<FilterKey | null>(null);

  const filterValues: Record<FilterKey, string | undefined> = {
    bodyPart,
    primaryMuscle,
    equipment,
  };

  const filterHandlers: Record<FilterKey, (value: string | undefined) => void> = useMemo(
    () => ({
      bodyPart: (v) => { onBodyPartChange(v as BodyPartType | undefined); },
      primaryMuscle: (v) => { onPrimaryMuscleChange(v as MuscleType | undefined); },
      equipment: (v) => { onEquipmentChange(v as EquipmentType | undefined); },
    }),
    [onBodyPartChange, onPrimaryMuscleChange, onEquipmentChange],
  );

  const hasActiveFilters =
    bodyPart !== undefined || equipment !== undefined || primaryMuscle !== undefined;

  const clearAll = useCallback(() => {
    onBodyPartChange(undefined);
    onEquipmentChange(undefined);
    onPrimaryMuscleChange(undefined);
  }, [onBodyPartChange, onEquipmentChange, onPrimaryMuscleChange]);

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      { key: "bodyPart", label: "Body Part", values: availableBodyParts },
      { key: "primaryMuscle", label: "Muscle", values: availablePrimaryMuscles },
      { key: "equipment", label: "Equipment", values: availableEquipment },
    ],
    [availableBodyParts, availableEquipment, availablePrimaryMuscles],
  );

  const activeConfig = filterConfigs.find((f) => f.key === activePicker);

  const handleSelect = useCallback(
    (value: string | undefined) => {
      if (activePicker) {
        filterHandlers[activePicker](value);
      }
      setActivePicker(null);
    },
    [activePicker, filterHandlers],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          gap: theme.tokens.spacing.xs,
        },
        pill: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xxs + 1,
          backgroundColor: theme.colors.secondarySoft,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.borderSoft,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xxs + 2,
          minHeight: 34,
        },
        pillActive: {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.borderAccent,
        },
        pillText: {
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          color: theme.colors.textMuted,
        },
        pillTextActive: {
          color: theme.colors.accent,
        },
        clearPill: {
          backgroundColor: theme.colors.errorSoft,
          borderColor: theme.colors.error,
        },
        clearPillText: {
          color: theme.colors.error,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        backdrop: {
          flex: 1,
          backgroundColor: theme.colors.overlay,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: theme.tokens.spacing.xl,
        },
        pickerCard: {
          width: "100%",
          maxHeight: "60%",
          backgroundColor: theme.colors.backgroundElevated,
          borderRadius: theme.tokens.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: "hidden",
        },
        pickerHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: theme.tokens.spacing.lg,
          paddingVertical: theme.tokens.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.borderSoft,
        },
        pickerTitle: {
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          color: theme.colors.text,
        },
        pickerClose: {
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          color: theme.colors.textMuted,
        },
        optionRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: theme.tokens.spacing.lg,
          paddingVertical: theme.tokens.spacing.sm + 2,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderSoft,
        },
        optionRowSelected: {
          backgroundColor: theme.colors.accentSoft,
        },
        optionText: {
          fontSize: theme.tokens.typography.fontSize.md,
          color: theme.colors.text,
        },
        optionTextSelected: {
          fontWeight: theme.tokens.typography.fontWeight.bold,
          color: theme.colors.accent,
        },
      }),
    [theme],
  );

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {filterConfigs.map((filter) => {
          const currentValue = filterValues[filter.key];
          const isActive = currentValue !== undefined;

          return (
            <Pressable
              key={filter.key}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => { setActivePicker(filter.key); }}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {filter.label}: {isActive ? formatLabel(currentValue) : "Any"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={isActive ? theme.colors.accent : theme.colors.textMuted}
              />
            </Pressable>
          );
        })}

        {hasActiveFilters ? (
          <Pressable style={[styles.pill, styles.clearPill]} onPress={clearAll}>
            <Ionicons name="close-circle" size={14} color={theme.colors.error} />
            <Text style={styles.clearPillText}>Clear</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={activePicker !== null}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => { setActivePicker(null); }}
      >
        <Pressable style={styles.backdrop} onPress={() => { setActivePicker(null); }}>
          <Pressable style={styles.pickerCard} onPress={(e) => { e.stopPropagation(); }}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{activeConfig?.label ?? ""}</Text>
              <Pressable onPress={() => { setActivePicker(null); }}>
                <Text style={styles.pickerClose}>Done</Text>
              </Pressable>
            </View>

            <FlatList
              data={["any", ...(activeConfig?.values ?? [])]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const value = item === "any" ? undefined : item;
                const isSelected =
                  activePicker !== null && filterValues[activePicker] === value;

                return (
                  <Pressable
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => { handleSelect(value); }}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                    >
                      {item === "any" ? "Any" : formatLabel(item)}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default memo(ExerciseFilterRow);
