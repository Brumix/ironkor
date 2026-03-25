import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

interface ExerciseSetRowProps {
  index: number;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  isCompleted: boolean;
  onToggle: () => void;
}

const COMPLETION_SPRING = { damping: 12, stiffness: 200, mass: 0.7 };

function ExerciseSetRow({ index, name, sets, reps, restSeconds, isCompleted, onToggle }: ExerciseSetRowProps) {
  const { theme } = useTheme();
  const checkScale = useSharedValue(isCompleted ? 1 : 0);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const handleToggle = useCallback(() => {
    if (!isCompleted) {
      checkScale.value = withSpring(1, COMPLETION_SPRING);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      checkScale.value = withSpring(0, COMPLETION_SPRING);
      Haptics.selectionAsync().catch(() => undefined);
    }

    onToggle();
  }, [isCompleted, checkScale, onToggle]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          borderRadius: theme.tokens.radius.lg,
          borderWidth: 1,
          padding: theme.tokens.spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.md,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.24 : 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: theme.tokens.elevation.sm,
        },
        rowDefault: {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        rowCompleted: {
          backgroundColor: theme.colors.successSoft,
          borderColor: theme.colors.borderSuccess,
        },
        indexBadge: {
          width: 36,
          height: 36,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        indexBadgeDefault: {
          backgroundColor: theme.colors.surfaceMuted,
        },
        indexBadgeCompleted: {
          backgroundColor: theme.colors.success,
        },
        indexText: {
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          color: theme.colors.textMuted,
        },
        indexTextCompleted: {
          color: theme.colors.onSuccess,
        },
        body: {
          flex: 1,
        },
        name: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        nameCompleted: {
          color: theme.colors.textMuted,
        },
        meta: {
          color: theme.colors.textSubtle,
          fontSize: theme.tokens.typography.fontSize.sm,
          marginTop: 2,
        },
        checkWrapper: {
          width: 32,
          height: 32,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        checkWrapperDefault: {
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: 1.5,
          borderColor: theme.colors.border,
        },
        checkWrapperCompleted: {
          backgroundColor: theme.colors.success,
          borderWidth: 0,
        },
        statusLabel: {
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wider,
        },
      }),
    [theme],
  );

  const formatRest = (seconds: number) => (seconds >= 60 ? `${Math.floor(seconds / 60)}m` : `${seconds}s`);

  return (
    <PressableScale onPress={handleToggle} pressedScale={0.98} style={[styles.row, isCompleted ? styles.rowCompleted : styles.rowDefault]}>
      <View style={[styles.indexBadge, isCompleted ? styles.indexBadgeCompleted : styles.indexBadgeDefault]}>
        {isCompleted ? (
          <Animated.View entering={FadeIn.duration(150)}>
            <Ionicons color={theme.colors.onSuccess} name="checkmark" size={18} />
          </Animated.View>
        ) : (
          <Text style={styles.indexText}>{index + 1}</Text>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, isCompleted && styles.nameCompleted]}>{name}</Text>
        <Text style={styles.meta}>
          {sets} sets · {reps} reps · {formatRest(restSeconds)} rest
        </Text>
      </View>

      <View style={[styles.checkWrapper, isCompleted ? styles.checkWrapperCompleted : styles.checkWrapperDefault]}>
        <Animated.View style={checkStyle}>
          <Ionicons color={theme.colors.onSuccess} name="checkmark-sharp" size={16} />
        </Animated.View>
      </View>
    </PressableScale>
  );
}

export default memo(ExerciseSetRow);
