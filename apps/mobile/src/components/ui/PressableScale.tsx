import { useCallback } from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import type { ReactNode } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  pressedOpacity?: number;
}

const SPRING_CONFIG = { damping: 26, stiffness: 300, mass: 0.8 };

export default function PressableScale({
  children,
  style,
  pressedScale = 0.97,
  pressedOpacity = 0.92,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(pressedScale, SPRING_CONFIG);
    opacity.value = withSpring(pressedOpacity, SPRING_CONFIG);
  }, [pressedScale, pressedOpacity, scale, opacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withSpring(1, SPRING_CONFIG);
  }, [scale, opacity]);

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        handlePressIn();
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        handlePressOut();
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
