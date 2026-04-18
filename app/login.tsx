import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, ArrowRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { signInWithGoogle } from '@/src/utils/auth';

import { useAuth } from '@/src/context/AuthContext';
import { useAlert } from '@/src/context/AlertContext';

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!authLoading && session) {
      router.replace('/dashboard');
    }
  }, [session, authLoading]);

  if (authLoading || session) {
    return null;
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/dashboard');
    } catch (error: any) {
      showAlert({
        title: 'Login Failed',
        message: error.message || 'The fire lab could not verify your clearance. 🔥',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
          <View style={styles.logoContainer}>
            <LogIn color={Colors.dark.accent} size={40} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue creating fire</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.form}>
          <Pressable 
            style={[styles.loginButton, loading && styles.buttonDisabled]} 
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>CONTINUE WITH GOOGLE</Text>
                <ArrowRight color="#000" size={20} />
              </>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service
            </Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.muted,
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.accent,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
    elevation: 10,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: Colors.dark.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
