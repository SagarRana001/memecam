import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate 
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface AnimatedButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  onPress, 
  title, 
  style, 
  textStyle,
  variant = 'primary' 
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: Colors.dark.accent, color: '#000' };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: Colors.dark.accent, borderWidth: 1, color: Colors.dark.accent };
      case 'danger':
        return { backgroundColor: Colors.dark.danger, color: '#fff' };
      default:
        return { backgroundColor: Colors.dark.surface, color: '#fff' };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.95, { damping: 12, stiffness: 150 }))}
      onPressOut={() => (scale.value = withSpring(1))}
      style={[
        styles.button, 
        { backgroundColor: vStyles.backgroundColor, borderColor: vStyles.borderColor, borderWidth: vStyles.borderWidth },
        style, 
        animatedStyle
      ]}
    >
      <Text style={[styles.text, { color: vStyles.color }, textStyle]}>{title}</Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System', // Placeholder for Satoshi/Cabinet
    textTransform: 'uppercase',
  },
});
