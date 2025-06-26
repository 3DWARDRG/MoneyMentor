import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import FilterButton from './FilterButton';

const options = ['Mensual', 'Trimestral', 'Anual', 'Personalizado'];

const StatisticsHeader = () => {
  const [selected, setSelected] = useState('Mensual');

  return (
    <View className="mb-5">
      <Text className="text-2xl font-bold mb-4">Estadísticas</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row space-x-2 py-2"
      >
        {options.map((label) => (
          <FilterButton
            key={label}
            label={label}
            isActive={selected === label}
            onPress={() => setSelected(label)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default StatisticsHeader;
