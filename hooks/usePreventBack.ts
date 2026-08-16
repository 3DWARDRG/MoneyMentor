// hooks/usePreventBack.ts
import { useNavigation } from "expo-router";
import { useEffect, useLayoutEffect } from "react";
import { BackHandler, Platform } from "react-native";

export const usePreventBack = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  return null;
};
