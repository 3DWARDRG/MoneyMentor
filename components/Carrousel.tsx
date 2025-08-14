import React, { useState, useRef } from "react";
import { View, Text, Dimensions, Pressable } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

const { width: PAGE_WIDTH } = Dimensions.get("window");

const ITEM_SIZE = 80;
const PAGE_HEIGHT = 40;

interface CarouselItem {
    title: string;
    text: string;
}

export default function MyCarousel() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedItem, setSelectedItem] = useState<CarouselItem | null>(null);
    const carouselRef = useRef<ICarouselInstance>(null);

    const carouselItems: CarouselItem[] = [
        { title: "Item 1", text: "Text 1" },
        { title: "Item 2", text: "Text 2" },
        { title: "Item 3", text: "Text 3" },
        { title: "Item 4", text: "Text 4" },
        { title: "Item 5", text: "Text 5" },
    ];

    const handleSelect = (index: number) => {
        if (index === activeIndex) {
            setSelectedItem(carouselItems[index]);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "white" }}>
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
                data={carouselItems}
                onSnapToItem={setActiveIndex}
                renderItem={({ item, animationValue, index }) => (
                    <AnimatedItem
                        animationValue={animationValue}
                        label={item.title}
                        text={item.text}
                        isActive={index === activeIndex}
                        onPress={() => handleSelect(index)}
                    />
                )}
            />

            {selectedItem && (
                <View style={{ marginTop: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: "600" }}>
                        Seleccionado: {selectedItem.title}
                    </Text>
                </View>
            )}
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

const AnimatedItem: React.FC<ItemProps> = ({ animationValue, label, text, isActive, onPress }) => {
    const translateY = useSharedValue(0);

    const containerStyle = useAnimatedStyle(() => {
        const opacity = interpolate(animationValue.value, [-1, 0, 1], [0.5, 1, 0.5], Extrapolation.CLAMP);
        return { opacity };
    });

    const labelStyle = useAnimatedStyle(() => {
        const scale = interpolate(animationValue.value, [-1, 0, 1], [1, 1.25, 1], Extrapolation.CLAMP);
        const color = interpolateColor(animationValue.value, [-1, 0, 1], ["#888888", "#002a57", "#888888"]);
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
        <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={!isActive}>
            <Animated.View
                style={[
                    {
                        height: "100%",
                        width: ITEM_SIZE,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 50,
                        borderWidth: 2,
                        borderColor: isActive ? "#002a57" : "#cccccc",
                        backgroundColor: "#f9f9f9",
                    },
                    containerStyle,
                ]}
            >
                <Animated.Text style={[{ fontSize: 14, fontWeight: "bold" }, labelStyle]}>
                    {label}
                </Animated.Text>
                <Text style={{ fontSize: 10, color: "#555" }}>{text}</Text>
            </Animated.View>
        </Pressable>
    );
};
