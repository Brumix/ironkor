import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "@/theme";

interface HeaderBackButtonProps {
  onPress: () => void;
}

export default function HeaderBackButton({ onPress }: HeaderBackButtonProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-start",
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.border,
          width: 36,
          height: 36,
        },
      }),
    [theme],
  );

  return (
    <Pressable accessibilityLabel="Go back" hitSlop={12} onPress={onPress} style={styles.button}>
      <Ionicons color={theme.colors.text} name="chevron-back" size={18} />
    </Pressable>
  );
}
