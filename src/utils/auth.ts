import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

// Configure Google Sign-In
// The webClientId is required for Supabase to verify the ID token.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
});

export const signInWithGoogle = async () => {
  try {
    // 1. Check for Play Services (Android only)
    await GoogleSignin.hasPlayServices();
    
    // 2. Clear pre-existing signs to ensure account picker shows up (optional)
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Ignore if not signed in
    }

    // 3. Trigger Native Google Sign-In sheet
    const userInfo = await GoogleSignin.signIn();
    
    // 4. Authenticate with Supabase using the ID Token
    if (userInfo.data?.idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });
      
      if (error) throw error;
      return data;
    } else {
      throw new Error('No ID Token received from Google');
    }
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      // User cancelled the login flow - no alert needed
      console.log('Login cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      // Operation (e.g. sign in) is in progress already
      console.log('Login in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert('Play Services', 'Play services not available or outdated');
    } else {
      Alert.alert('Login Error', error.message || 'An error occurred during Google Sign-in');
      console.error('Google Sign-in Error Detail:', error);
    }
    throw error;
  }
};

