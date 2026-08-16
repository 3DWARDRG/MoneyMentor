import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Keyboard,
  ScrollView,
  ScrollViewProps,
  TextInput,
} from "react-native";

const KEYBOARD_EXTRA_OFFSET = 24;

const KeyboardAvoidingScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardAvoidingScrollView(
    {
      children,
      contentContainerStyle,
      onScroll,
      scrollEventThrottle,
      ...props
    },
    ref,
  ) {
    const scrollRef = useRef<ScrollView>(null);
    const scrollOffsetRef = useRef(0);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
      const show = Keyboard.addListener("keyboardDidShow", (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      const hide = Keyboard.addListener("keyboardDidHide", () => {
        setKeyboardHeight(0);
      });
      return () => {
        show.remove();
        hide.remove();
      };
    }, []);

    const scrollFocusedInputIntoView = useCallback(() => {
      const scroll = scrollRef.current;
      const focused = TextInput.State.currentlyFocusedInput();
      if (!scroll || !focused || keyboardHeight <= 0) {
        return;
      }
      focused.measureInWindow((x, y, width, height) => {
        const keyboardTop = Dimensions.get("window").height - keyboardHeight;
        const overlap = y + height - keyboardTop + KEYBOARD_EXTRA_OFFSET;
        if (overlap > 0) {
          scroll.scrollTo({
            y: scrollOffsetRef.current + overlap,
            animated: true,
          });
        }
      });
    }, [keyboardHeight]);

    useEffect(() => {
      if (keyboardHeight > 0) {
        scrollFocusedInputIntoView();
      }
    }, [keyboardHeight, scrollFocusedInputIntoView]);

    const handleScroll = useCallback(
      (event: any) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      },
      [onScroll],
    );

    const setRef = useCallback(
      (node: ScrollView | null) => {
        scrollRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    return (
      <ScrollView
        ref={setRef}
        {...props}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          contentContainerStyle,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight },
        ]}
      >
        {children}
      </ScrollView>
    );
  },
);

export default KeyboardAvoidingScrollView;
