
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
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3"
      >
        <Text className={selectedOption ? "text-base text-slate-900" : "text-base text-slate-400"}>
          {selectedOption?.label ?? placeholder}
        </Text>

        <Text className="text-xs text-slate-500">
          {isOpen ? "▲" : "▼"}
        </Text>
      </Pressable>

      {isOpen && (
        <View className="absolute left-0 right-0 top-full  mt-2 overflow-hidden rounded-xl border border-slate-300 bg-white">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option)}
                className={`px-4 py-3 ${isSelected ? "bg-indigo-50" : "bg-white"}`}
              >
                <Text
                  className={
                    isSelected
                      ? "text-base font-semibold text-indigo-700"
                      : "text-base text-slate-900"
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


