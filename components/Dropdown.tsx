import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type DropdownOption<T extends string> = {
  label: string;
  value: T;
};
type DropdownProps<T extends string> = {
  options: DropdownOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  placeholder?: string;
  invalid?: boolean;
};

/**
 * Dropdown con opciones en un Modal transparente anclado al botón. Renderizar la
 * lista dentro del ScrollView como hijo absoluto hace que quede tapada por los
 * hermanos siguientes (y recortada por los bordes del scroll), por eso las
 * opciones se muestran por encima de todo y son siempre tappables.
 */
export function Dropdown<T extends string>({
  options,
  value,
  onSelect,
  placeholder = "Selecciona una opción",
  invalid = false,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = useRef<View>(null);

  const selectedOption = options.find(
    (option: DropdownOption<T>) => option.value === value,
  );

  const open = () => {
    const node = triggerRef.current;
    if (node && typeof node.measureInWindow === "function") {
      node.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, width, height });
        setIsOpen(true);
      });
    } else {
      setAnchor(null);
      setIsOpen(true);
    }
  };

  const close = () => setIsOpen(false);

  const handleSelect = (option: DropdownOption<T>) => {
    onSelect(option.value);
    close();
  };

  const listStyle = anchor
    ? {
        position: "absolute" as const,
        top: anchor.y + anchor.height + 8,
        left: anchor.x,
        width: anchor.width,
      }
    : {
        position: "absolute" as const,
        top: 80,
        left: 24,
        right: 24,
      };

  return (
    <>
      <View ref={triggerRef} className="w-100 relative z-50" collapsable={false}>
        <Pressable
          onPress={isOpen ? close : open}
          className={`min-h-12 flex-row items-center justify-between rounded-xl border bg-deepSoft dark:bg-deepSoft-dark px-4 py-3 ${
            invalid
              ? "border-expense/60 dark:border-expense-dark/60"
              : "border-black/10 dark:border-white/10"
          }`}
        >
          <Text
            className={
              selectedOption
                ? "text-base text-ink dark:text-ink-dark"
                : "text-base text-muted dark:text-muted-dark"
            }
          >
            {selectedOption?.label ?? placeholder}
          </Text>

          <Text className="text-xs text-muted dark:text-muted-dark">
            {isOpen ? "▲" : "▼"}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close}>
          <View style={listStyle}>
            <View className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark">
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleSelect(option)}
                    className={`px-4 py-3 ${
                      isSelected
                        ? "bg-accent/10 dark:bg-accent-dark/10"
                        : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={
                        isSelected
                          ? "text-base font-semibold text-accent dark:text-accent-dark"
                          : "text-base text-ink dark:text-ink-dark"
                      }
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
