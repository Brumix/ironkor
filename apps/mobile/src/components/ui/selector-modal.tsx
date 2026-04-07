import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import ModalCardShell from "@/components/ui/ModalCardShell";
import type { SelectorOption } from "@/features/onboarding/helpers";
import { useTheme } from "@/theme";

type SelectorValue = number | string;

interface SelectorModalProps {
  message?: string;
  onRequestClose: () => void;
  onSelect: (value: SelectorValue) => void;
  options: readonly SelectorOption[];
  selectedValue?: SelectorValue | null;
  title: string;
  visible: boolean;
}

const ITEM_HEIGHT = 56;

function SelectorModal({
  message,
  onRequestClose,
  onSelect,
  options,
  selectedValue,
  title,
  visible,
}: SelectorModalProps) {
  const { theme } = useTheme();
  const listRef = useRef<FlatList<SelectorOption>>(null);

  const selectedIndex = useMemo(
    () =>
      selectedValue === null || selectedValue === undefined
        ? -1
        : options.findIndex((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  useEffect(() => {
    if (!visible || selectedIndex < 0) {
      return;
    }

    const timeout = setTimeout(() => {
      listRef.current?.scrollToIndex({
        animated: false,
        index: selectedIndex,
        viewPosition: 0.5,
      });
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [selectedIndex, visible]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          maxHeight: 320,
        },
        optionRow: {
          minHeight: ITEM_HEIGHT,
          paddingHorizontal: theme.tokens.spacing.md,
          borderRadius: theme.tokens.radius.md,
          borderWidth: 1,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.sm,
        },
        optionText: {
          flex: 1,
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
        optionListContent: {
          gap: theme.tokens.spacing.sm,
        },
      }),
    [theme],
  );

  return (
    <ModalCardShell
      closeOnBackdropPress
      footer={
        <AppButton
          label="Close"
          onPress={onRequestClose}
          size="sm"
          variant="secondary"
        />
      }
      message={message}
      onRequestClose={onRequestClose}
      title={title}
      visible={visible}
    >
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.optionListContent}
        data={options}
        getItemLayout={(_, index) => ({
          index,
          length: ITEM_HEIGHT + theme.tokens.spacing.sm,
          offset: index * (ITEM_HEIGHT + theme.tokens.spacing.sm),
        })}
        keyExtractor={(item) => `${item.value}`}
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({
            animated: false,
            offset: index * (ITEM_HEIGHT + theme.tokens.spacing.sm),
          });
        }}
        renderItem={({ item }) => {
          const isSelected = item.value === selectedValue;
          return (
            <Pressable
              onPress={() => {
                onSelect(item.value);
                onRequestClose();
              }}
              style={[
                styles.optionRow,
                {
                  backgroundColor: isSelected
                    ? theme.colors.accentSoft
                    : theme.colors.surfaceRaised,
                  borderColor: isSelected
                    ? theme.colors.borderAccent
                    : theme.colors.borderSoft,
                },
              ]}
            >
              <Text style={styles.optionText}>{item.label}</Text>
              <View>
                <Ionicons
                  color={isSelected ? theme.colors.accent : theme.colors.textSubtle}
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                />
              </View>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </ModalCardShell>
  );
}

export default memo(SelectorModal);
