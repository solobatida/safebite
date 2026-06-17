import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1B7A4E' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#F5F7F4' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'SafeBite' }} />
        <Stack.Screen name="language" options={{ title: 'Language' }} />
        <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan' }} />
      </Stack>
    </>
  );
}
