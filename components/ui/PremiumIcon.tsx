import { getPremiumIcon } from "@/constants/premiumIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PremiumIconProps {
  token?: string | null;
  size?: number;
  /** Radio del contenedor (0 = cuadrado, size/2 = círculo) */
  radius?: number;
  /** Fondo del contenedor. Si es null, el contenedor usa el color de la marca. */
  backgroundColor?: string | null;
  /** Emoji por defecto si el token no es premium */
  fallback?: string;
  /** Color del emoji/texto de fallback */
  textColor?: string;
  iconColor?: string;
}

export default function PremiumIcon({
  token,
  size = 40,
  radius = size / 2,
  backgroundColor = null,
  fallback = "📁",
  textColor = "#97a4bb",
  iconColor = "#ffffff",
}: PremiumIconProps) {
  const def = getPremiumIcon(token);

  if (!def) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: backgroundColor ?? "transparent",
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.55, color: textColor }}>
          {token || fallback}
        </Text>
      </View>
    );
  }

  const Icon = def.icon;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: backgroundColor ?? def.color,
        },
      ]}
    >
      <Icon size={size * 0.5} color={iconColor} strokeWidth={2.4} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
