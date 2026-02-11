import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyTicketsScreen from '../screens/tickets/MyTicketsScreen';
import InvoiceScreen from '../screens/tickets/InvoiceScreen';

export type TicketsStackParamList = {
  MyTickets: undefined;
  Invoice: { ticketId?: string };
};

const Stack = createNativeStackNavigator<TicketsStackParamList>();

export default function TicketsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} />
    </Stack.Navigator>
  );
}
