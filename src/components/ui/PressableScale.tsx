import { Pressable } from "react-native";

import type { ReactNode } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  pressedOpacity?: number;
}

export default function PressableScale({
  children,
  style,
  pressedScale = 0.98,
  pressedOpacity = 0.9,
  ...rest
}: PressableScaleProps) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        style,
        pressed && {
          transform: [{ scale: pressedScale }],
          opacity: pressedOpacity,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}
