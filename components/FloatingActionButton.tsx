// components/FloatingActionButton.tsx
import { Href, router } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

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
  backgroundColor = "#000",
}: FloatingActionButtonProps) {
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
        style={{
          backgroundColor,
          width: 64,
          height: 64,
          borderRadius: 999,
          justifyContent: "center",
          alignItems: "center",
          elevation: 6,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "600" }}>
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
