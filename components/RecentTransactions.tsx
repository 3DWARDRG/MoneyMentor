import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import TransactionItem from './TransactionsItem';

const RecentTransactions = () => {
  return (

    <View className="mb-4">
      <View className="flex-row justify-between items-center p-3">
        <Text className="font-bold text-base">Transacciones recientes</Text>
        <Pressable>
          <Text className="text-blue-600 text-sm">Ver todas</Text>
        </Pressable>
      </View>

      <TransactionItem
        icon="🛒"
        bgColor="bg-red-100"
        iconColor="text-red-600"
        title="Supermercado"
        date="Hoy, 14:30"
        amount="-$85.20"
        amountColor="text-red-600"
      />

      <TransactionItem
        icon="💸"
        bgColor="bg-blue-100"
        iconColor="text-blue-600"
        title="Transferencia recibida"
        date="Ayer, 10:15"
        amount="+$1,200.00"
        amountColor="text-green-600"
      />

      <TransactionItem
        icon="🎵"
        bgColor="bg-purple-100"
        iconColor="text-purple-600"
        title="Spotify Premium"
        date="24 Mar, 12:00"
        amount="-$9.99"
        amountColor="text-red-600"
      />
            <TransactionItem
        icon="🛒"
        bgColor="bg-red-100"
        iconColor="text-red-600"
        title="Supermercado"
        date="Hoy, 14:30"
        amount="-$85.20"
        amountColor="text-red-600"
      />

      <TransactionItem
        icon="💸"
        bgColor="bg-blue-100"
        iconColor="text-blue-600"
        title="Transferencia recibida"
        date="Ayer, 10:15"
        amount="+$1,200.00"
        amountColor="text-green-600"
      />

      <TransactionItem
        icon="🎵"
        bgColor="bg-purple-100"
        iconColor="text-purple-600"
        title="Spotify Premium"
        date="24 Mar, 12:00"
        amount="-$9.99"
        amountColor="text-red-600"
      />

            <TransactionItem
        icon="🎵"
        bgColor="bg-purple-100"
        iconColor="text-purple-600"
        title="Spotify Premium"
        date="24 Mar, 12:00"
        amount="-$9.99"
        amountColor="text-red-600"
      />

            <TransactionItem
        icon="💸"
        bgColor="bg-blue-100"
        iconColor="text-blue-600"
        title="Transferencia recibida"
        date="Ayer, 10:15"
        amount="+$1,200.00"
        amountColor="text-green-600"
      />

      <TransactionItem
        icon="🎵"
        bgColor="bg-purple-100"
        iconColor="text-purple-600"
        title="Spotify Premium"
        date="24 Mar, 12:00"
        amount="-$9.99"
        amountColor="text-red-600"
      />

            <TransactionItem
        icon="🎵"
        bgColor="bg-purple-100"
        iconColor="text-purple-600"
        title="Spotify Premium"
        date="24 Mar, 12:00"
        amount="-$9.99"
        amountColor="text-red-600"
      />

    </View>
  );
};

export default RecentTransactions;
