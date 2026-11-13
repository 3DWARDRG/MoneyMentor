// components/FloatingActionButton.tsx
import { Href, router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type FloatingActionButtonProps = {
  href: Href;
  label?: string;
  bottom?: number;
  right?: number;
  backgroundColor?: string;
};

export default function FloatingActionButton({
  href,
  label = "+",
  bottom = 96,
  right = 24,
}: FloatingActionButtonProps) {
  const rawId = "fabGradient";

  return (
    <View
      style={{
        position: "absolute",
        bottom,
        right,
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        onPress={() => router.push(href)}
        activeOpacity={0.85}
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          justifyContent: "center",
          alignItems: "center",
          elevation: 8,
          shadowColor: "#3b82f6",
          shadowOpacity: 0.55,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.25)",
        }}
      >
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={rawId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#66bcff" />
              <Stop offset="100%" stopColor="#1e5ed3" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${rawId})`} />
        </Svg>
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "600" }}>
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
