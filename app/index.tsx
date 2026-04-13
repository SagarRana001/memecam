import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  FadeIn,
  SlideInLeft
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { AnimatedButton } from '@/src/components/AnimatedButton';

export default function LandingScreen() {
  const router = useRouter();

  const handleLogin = () => {
    // In a real app, this would trigger Google Auth via expo-auth-session
    // For now, we simulate success and go to the dashboard
    router.push('/dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <Animated.View 
            entering={SlideInLeft.duration(800).delay(200).springify().damping(12)}
          >
            <Text style={styles.heroText}>MAKE</Text>
          </Animated.View>
          
          <Animated.View 
            entering={SlideInLeft.duration(800).delay(400).springify().damping(12)}
          >
            <Text style={styles.heroText}>ANY</Text>
          </Animated.View>

          <Animated.View 
            entering={SlideInLeft.duration(800).delay(600).springify().damping(12)}
          >
            <Text style={styles.heroText}>MOMENT</Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.duration(800).delay(800).springify().damping(12)}
            style={styles.accentRow}
          >
            <Text style={[styles.heroText, styles.accentText]}>FIRE</Text>
            <Animated.Text 
              entering={FadeIn.duration(1000).delay(1200)}
              style={styles.emoji}
            >
              🔥
            </Animated.Text>
          </Animated.View>
        </View>

        <Animated.View 
          entering={FadeInDown.duration(800).delay(1400)}
          style={styles.footer}
        >
          <AnimatedButton 
            title="Login with Google"
            onPress={handleLogin}
            style={styles.loginButton}
          />
          
          <Text style={styles.disclaimer}>
            By signing up, you agree with our{' '}
            <Text style={styles.link}>terms and conditions</Text>.
          </Text>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  heroSection: {
    marginTop: 40,
  },
  heroText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 74,
    letterSpacing: -2,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentText: {
    color: '#00FF66',
  },
  emoji: {
    fontSize: 64,
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    gap: 20,
  },
  loginButton: {
    width: '100%',
    height: 60,
  },
  disclaimer: {
    color: '#A1A1AA',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  link: {
    color: '#00FF66',
    textDecorationLine: 'underline',
  },
});
