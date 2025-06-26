import React from 'react';
import { View, Text } from 'react-native';
import ReminderItem from './ReminderItem';

const UpcomingReminders = () => {
  return (
    <View className="mb-6">
      <Text className="text-gray-500 text-sm mb-2">Hoy</Text>

      <ReminderItem
        title="Pago de tarjeta de crédito"
        subtitle="Vence hoy"
        amount="$450.00"
        icon="💳"
        onSnooze={() => console.log('Posponer')}
        onPay={() => console.log('Pagar ahora')}
      />
            <Text className="text-gray-500 text-sm mb-2">Mañana</Text>

      <ReminderItem
        title="Pago de tarjeta de crédito"
        subtitle="Vence mañana"
        amount="$450.00"
        icon="💳"
        onSnooze={() => console.log('Posponer')}
        onPay={() => console.log('Pagar ahora')}
      />
    </View>
  );
};

export default UpcomingReminders;
