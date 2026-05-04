import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { BillingProvider } from '@/src/context/BillingContext';
import { AlertProvider } from '@/src/context/AlertContext';
import { CustomAlert } from '@/src/components/CustomAlert';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIcon}>
        <AlertTriangle color={Colors.dark.accent} size={48} />
      </View>
      <Text style={styles.errorTitle}>SOMETHING WENT WRONG</Text>
      <Text style={styles.errorMsg}>
        The fire lab had a minor explosion. Don't worry, we're putting it out.
      </Text>
      <Pressable style={styles.retryButton} onPress={props.retry}>
        <RotateCcw color="#000" size={20} />
        <Text style={styles.retryText}>RETRY</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  errorMsg: {
    color: Colors.dark.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 12,
    alignItems: 'center',
  },
  retryText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
  },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({});

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // In RootLayout, we don't have access to useAuth yet because it's inside the provider.
  // We'll move the SplashScreen hiding to RootLayoutNav instead.

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AlertProvider>
            <BillingProvider>
              <RootLayoutNav />
            </BillingProvider>
          </AlertProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return <NavigationContent />;
}

function NavigationContent() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'terms' || segments[0] === '(auth)' || segments[0] === undefined;

    if (!session && !inAuthGroup) {
      router.replace('/');
    } else if (session && (segments[0] === 'login' || segments[0] === undefined)) {
      router.replace('/dashboard');
    }
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
        <Stack.Screen name="terms" />

        <Stack.Screen name="dashboard" />
        <Stack.Screen name="generator" />
        <Stack.Screen name="result" />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" translucent />
      <CustomAlert />
    </ThemeProvider>
  );
}
