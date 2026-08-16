
import { useState , Dispatch, SetStateAction } from "react";
import { Pressable, Text, View } from "react-native";

export type DropdownOption<T extends string> = {
  label: string;
  value: T;
};
type DropdownProps <T extends string> = {
  options: DropdownOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  placeholder?: string;
};

export  function Dropdown<T extends string> ({
  options,
  value,
  onSelect,
  placeholder = "Selecciona una opción",
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option : DropdownOption<T>) => option.value === value);
  console.log("selected:",value)
  const handleSelect = (option: DropdownOption<T>) => {
    console.log(option.value)
    onSelect(option.value);
    setIsOpen(false);
  };



    return (

 <View className="w-100 relative z-50" >
      <Pressable
        onPress={() => setIsOpen((prev) => !prev)}
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark px-4 py-3"
      >
        <Text className={selectedOption ? "text-base text-ink dark:text-ink-dark" : "text-base text-muted dark:text-muted-dark"}>
          {selectedOption?.label ?? placeholder}
        </Text>

        <Text className="text-xs text-muted dark:text-muted-dark">
          {isOpen ? "▲" : "▼"}
        </Text>
      </Pressable>

      {isOpen && (
        <View className="absolute left-0 right-0 top-full  mt-2 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-deepSoft dark:bg-deepSoft-dark">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option)}
                className={`px-4 py-3 ${isSelected ? "bg-accent/10 dark:bg-accent-dark/10" : "bg-transparent"}`}
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
      )}
    </View>
    )

}


