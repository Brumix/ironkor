import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import { useTheme } from "@/theme";

interface SelectorFieldCardProps {
  helperText?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  placeholder?: string;
  value?: string | null;
}

function SelectorFieldCard({
  helperText,
  iconName,
  label,
  onPress,
  placeholder = "Choose a value",
  value,
}: SelectorFieldCardProps) {
  const { theme } = useTheme();
  const hasValue = Boolean(value);

  return (
    <AppCard
      onPress={onPress}
      pressedScale={0.985}
      style={{
        borderColor: hasValue ? theme.colors.borderAccent : theme.colors.borderSoft,
        backgroundColor: hasValue ? theme.colors.accentSoft : theme.colors.surfaceRaised,
        paddingVertical: theme.tokens.spacing.md,
      }}
      variant="highlight"
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: hasValue ? theme.colors.accent : theme.colors.secondarySoft,
            borderRadius: theme.tokens.radius.pill,
            height: 40,
            justifyContent: "center",
            width: 40,
          }}
        >
          <Ionicons
            color={hasValue ? theme.colors.onAccent : theme.colors.textMuted}
            name={iconName}
            size={18}
          />
        </View>

        <View style={{ flex: 1, gap: theme.tokens.spacing.xxs }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.tokens.typography.fontSize.sm,
              fontWeight: theme.tokens.typography.fontWeight.semibold,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              color: hasValue ? theme.colors.text : theme.colors.textSubtle,
              fontSize: theme.tokens.typography.fontSize.md,
              fontWeight: hasValue
                ? theme.tokens.typography.fontWeight.bold
                : theme.tokens.typography.fontWeight.medium,
            }}
          >
            {value ?? placeholder}
          </Text>
          {helperText ? (
            <Text
              style={{
                color: theme.colors.textSubtle,
                fontSize: theme.tokens.typography.fontSize.xs,
              }}
            >
              {helperText}
            </Text>
          ) : null}
        </View>

        <Ionicons
          color={hasValue ? theme.colors.accent : theme.colors.textSubtle}
          name="chevron-forward"
          size={18}
        />
      </View>
    </AppCard>
  );
}

export default memo(SelectorFieldCard);
