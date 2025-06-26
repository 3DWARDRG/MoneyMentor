import React from 'react';
import { View, Text } from 'react-native';

interface TransactionItemProps {
  icon: string;               // Emoji o string del ícono
  bgColor: string;            // Clases Tailwind para el fondo (ej. 'bg-red-100')
  iconColor: string;          // Clases Tailwind para el color del ícono
  title: string;              // Título de la transacción
  date: string;               // Fecha y hora de la transacción
  amount: string;             // Monto (ej. "-$85.20")
  amountColor: string;        // Clases Tailwind para el color del monto
}


const TransactionItem = ({ icon, bgColor, iconColor, title, date, amount, amountColor } : TransactionItemProps) => {
  return (
    <View className="flex-row items-center p-3 border-b border-gray-200">
      <View className={`h-10 w-10 rounded-full ${bgColor} flex items-center justify-center mr-3`}>
        {/* Puedes reemplazar esto con un ícono real */}
        <Text className={`${iconColor} font-bold text-base`}>{icon}</Text>
      </View>
      <View className="flex-grow">
        <Text className="font-medium">{title}</Text>
        <Text className="text-xs text-gray-500">{date}</Text>
      </View>
      <Text className={`${amountColor} font-medium`}>{amount}</Text>
    </View>
  );
};

export default TransactionItem;
