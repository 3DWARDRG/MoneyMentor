import { useColorScheme } from "nativewind";
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import GlowOrb from "./GlowOrb";

const ScreenBackdrop = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const gradId = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  const stops = isDark
    ? [
        ["0%", "#0b1b36"],
        ["55%", "#071426"],
        ["100%", "#050a16"],
      ]
    : [
        ["0%", "#fdfbf7"],
        ["55%", "#faf8f4"],
        ["100%", "#f5f1e9"],
      ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            {stops.map(([offset, color]) => (
              <Stop key={offset} offset={offset} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
      </Svg>
      {isDark ? (
        <>
          <GlowOrb
            size={380}
            color="#1d7df0"
            opacity={0.28}
            top={-150}
            left={-160}
          />
          <GlowOrb
            size={300}
            color="#224790"
            opacity={0.22}
            bottom={-130}
            right={-140}
          />
        </>
      ) : (
        <>
          <GlowOrb
            size={380}
            color="#f3e5c3"
            opacity={0.5}
            top={-150}
            left={-160}
          />
          <GlowOrb
            size={300}
            color="#e8d8bc"
            opacity={0.45}
            bottom={-130}
            right={-140}
          />
        </>
      )}
    </View>
  );
};

export default ScreenBackdrop;
