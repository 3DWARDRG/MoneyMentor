import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
} from "react-native";

const KeyboardAvoidingScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardAvoidingScrollView(
    {
      children,
      contentContainerStyle,
      onScroll,
      scrollEventThrottle,
      className,
      ...props
    },
    ref,
  ) {
    const scrollRef = useRef<ScrollView>(null);
    const [verticalOffset, setVerticalOffset] = useState(0);

    // Distancia entre el tope de la pantalla y este contenedor (header/status bar).
    // Necesaria para que en iOS el teclado cubra la extensión y el contenido
    // quede arriba, sin un recuadro vacío.
    const measureOffset = useCallback(() => {
      const node = scrollRef.current as unknown as {
        measureInWindow?: (cb: (x: number, y: number) => void) => void;
      } | null;
      if (!node || typeof node.measureInWindow !== "function") {
        return;
      }
      node.measureInWindow((x, y) => {
        setVerticalOffset((prev) => (prev === y ? prev : y));
      });
    }, []);

    useEffect(() => {
      measureOffset();
    }, [measureOffset]);

    const handleScroll = useCallback(
      (event: any) => {
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
      <KeyboardAvoidingView
        onLayout={measureOffset}
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? verticalOffset : 0}
      >
        <ScrollView
          ref={setRef}
          {...props}
          className={className}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle ?? 16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={contentContainerStyle}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  },
);

export default KeyboardAvoidingScrollView;
