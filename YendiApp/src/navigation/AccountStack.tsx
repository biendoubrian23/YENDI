import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccountScreen from '../screens/account/AccountScreen';
import PersonalInfoScreen from '../screens/account/PersonalInfoScreen';
import ReferralScreen from '../screens/account/ReferralScreen';
import HelpSupportScreen from '../screens/account/HelpSupportScreen';
import LegalNoticeScreen from '../screens/account/LegalNoticeScreen';

export type AccountStackParamList = {
  Account: undefined;
  PersonalInfo: undefined;
  Referral: undefined;
  HelpSupport: undefined;
  LegalNotice: undefined;
};

const Stack = createNativeStackNavigator<AccountStackParamList>();

export default function AccountStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="LegalNotice" component={LegalNoticeScreen} />
    </Stack.Navigator>
  );
}
