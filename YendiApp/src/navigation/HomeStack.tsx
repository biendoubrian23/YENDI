import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import TripResultsScreen from '../screens/home/TripResultsScreen';
import SeatSelectionScreen from '../screens/home/SeatSelectionScreen';
import PassengerInfoScreen from '../screens/home/PassengerInfoScreen';
import PaymentScreen from '../screens/home/PaymentScreen';
import ETicketScreen from '../screens/home/ETicketScreen';

export type HomeStackParamList = {
  Home: undefined;
  TripResults: {
    from: string;
    to: string;
    date: string;
    passengers: number;
  };
  SeatSelection: {
    trip: any;
    from: string;
    to: string;
    date: string;
    passengers: number;
  };
  PassengerInfo: {
    trip: any;
    seats: number[];
    from: string;
    to: string;
    date: string;
    passengers: number;
  };
  Payment: {
    trip: any;
    seats: number[];
    from: string;
    to: string;
    date: string;
    passengers: number;
    passengerInfos?: Array<{ seatNumber: number; name: string; phone: string }>;
  };
  ETicket: {
    trip: any;
    tickets: Array<{
      ticketId: string;
      seatNumber: number;
      passengerName: string;
      passengerPhone: string;
    }>;
    from: string;
    to: string;
    date: string;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="TripResults" component={TripResultsScreen} />
      <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
      <Stack.Screen name="PassengerInfo" component={PassengerInfoScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="ETicket" component={ETicketScreen} />
    </Stack.Navigator>
  );
}
