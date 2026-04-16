import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { BillingProvider } from '@/src/context/BillingContext';
import { useRouter, useSegments } from 'expo-router';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({});

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <BillingProvider>
            <RootLayoutNav />
          </BillingProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'index';

    /* 
    if (!session && !inAuthGroup) {
      // Redirect to landing/login if not logged in
      router.replace('/');
    } else if (session && inAuthGroup) {
      // Redirect to dashboard if logged in
      router.replace('/dashboard');
    }
    */
  }, [session, loading, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0A' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />

        <Stack.Screen name="dashboard" />
        <Stack.Screen name="generator" />
        <Stack.Screen name="result" />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" translucent />
    </ThemeProvider>
  );
}
