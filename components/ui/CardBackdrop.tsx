import { useColorScheme } from "nativewind";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import GlowOrb from "./GlowOrb";

interface CardBackdropProps {
  glowColor?: string;
  glowOpacity?: number;
  glowSize?: number;
  glowTop?: number;
  glowRight?: number;
  glowLeft?: number;
  glowBottom?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

const CardBackdrop = ({
  glowColor = "#1d7df0",
  glowOpacity = 0.12,
  glowSize = 220,
  glowTop,
  glowRight,
  glowLeft,
  glowBottom,
  backgroundColor,
  style,
}: CardBackdropProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View style={[StyleSheet.absoluteFillObject, style]} pointerEvents="none">
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: backgroundColor
              ? backgroundColor
              : isDark
                ? "rgba(12,19,36,0.94)"
                : "rgba(255,255,255,0.9)",
          },
        ]}
      />
      <GlowOrb
        size={glowSize}
        color={isDark ? glowColor : "#f0e2c4"}
        opacity={glowOpacity}
        top={glowTop}
        right={glowRight}
        left={glowLeft}
        bottom={glowBottom}
      />
    </View>
  );
};

export default CardBackdrop;
