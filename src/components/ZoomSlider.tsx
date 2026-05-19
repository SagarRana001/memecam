import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, useEffect } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors } from '@/constants/theme';
import { useEffect as ReactUseEffect } from 'react';

interface ZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function ZoomSlider({ zoom, onZoomChange }: ZoomSliderProps) {
  const SLIDER_HEIGHT = 150;
  const THUMB_SIZE = 24;
  
  const sliderPosition = useSharedValue((1 - zoom) * SLIDER_HEIGHT);
  const startPosition = useSharedValue((1 - zoom) * SLIDER_HEIGHT);
  
  ReactUseEffect(() => {
    sliderPosition.value = (1 - zoom) * SLIDER_HEIGHT;
  }, [zoom]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startPosition.value = sliderPosition.value;
    })
    .onUpdate((e) => {
      let newPos = startPosition.value + e.translationY;
      if (newPos < 0) newPos = 0;
      if (newPos > SLIDER_HEIGHT) newPos = SLIDER_HEIGHT;
      
      const newZoom = 1 - (newPos / SLIDER_HEIGHT);
      runOnJS(onZoomChange)(newZoom);
    });

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sliderPosition.value }],
  }));

  const animatedTrackStyle = useAnimatedStyle(() => ({
    height: SLIDER_HEIGHT - sliderPosition.value,
    bottom: 0,
    position: 'absolute',
    width: '100%',
    backgroundColor: Colors.dark.accent,
    borderRadius: 2,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.trackBackground}>
        <Animated.View style={animatedTrackStyle} />
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.thumbContainer, animatedThumbStyle]}>
          <View style={styles.thumb} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 150 + 24, // SLIDER_HEIGHT + THUMB_SIZE
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  trackBackground: {
    width: 4,
    height: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'absolute',
  },
  thumbContainer: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
