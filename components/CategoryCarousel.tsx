// components/CategoryCarousel.tsx
import React, { useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import PremiumIcon from "./ui/PremiumIcon";

const { width: PAGE_WIDTH } = Dimensions.get("window");
const ITEM_SIZE = 80;
const PAGE_HEIGHT = 40;

interface Category {
  id: string;
  name: string;
  icon?: string; // Asumiendo que puedes tener un ícono (emoji o texto)
}

interface Props {
  categories: Category[];
  onSelectCategory: (categoryId: string) => void;
}

export default function CategoryCarousel({
  categories,
  onSelectCategory,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const carouselRef = useRef<ICarouselInstance>(null);

  const handleSelect = (index: number) => {
    if (index === activeIndex) {
      const selected = categories[index];
      if (selected) {
        setSelectedId(selected.id);
        onSelectCategory(selected.id);
      }
    }
  };

  if (categories.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-center text-muted dark:text-muted-dark">No hay categorías</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#07101e",
        height: 100,
      }}
    >
      <Carousel
        ref={carouselRef}
        loop={false}
        style={{
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT * 2,
          justifyContent: "center",
          alignItems: "center",
        }}
        width={ITEM_SIZE}
        height={ITEM_SIZE}
        data={categories}
        onSnapToItem={setActiveIndex}
        renderItem={({ item, animationValue, index }) => (
          <AnimatedItem
            animationValue={animationValue}
            label={item.name}
            text={item.icon || "📁"}
            isActive={index === activeIndex}
            onPress={() => handleSelect(index)}
          />
        )}
      />
    </View>
  );
}

interface ItemProps {
  animationValue: Animated.SharedValue<number>;
  label: string;
  text: string;
  isActive: boolean;
  onPress: () => void;
}

const AnimatedItem: React.FC<ItemProps> = ({
  animationValue,
  label,
  text,
  isActive,
  onPress,
}) => {
  const translateY = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [0.5, 1, 0.5],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const labelStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [1, 1.25, 1],
      Extrapolation.CLAMP,
    );
    const color = interpolateColor(
      animationValue.value,
      [-1, 0, 1],
      ["#97a4bb", "#4b9aff", "#97a4bb"],
    );
    return {
      transform: [{ scale }, { translateY: translateY.value }],
      color,
    };
  });

  const onPressIn = () => {
    if (isActive) translateY.value = withTiming(-8, { duration: 250 });
  };

  const onPressOut = () => {
    translateY.value = withTiming(0, { duration: 250 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={!isActive}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            width: ITEM_SIZE,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 50,
            borderWidth: 2,
            borderColor: isActive ? "#4b9aff" : "rgba(255,255,255,0.1)",
            backgroundColor: "#0c1324",
          },
          containerStyle,
        ]}
      >
        <PremiumIcon token={text} size={28} fallback="📁" textColor="#97a4bb" />
        <Animated.Text
          style={[{ fontSize: 11, fontWeight: "bold" }, labelStyle]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
};
