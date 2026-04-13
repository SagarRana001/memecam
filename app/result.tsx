import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Image, Pressable, Share, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { X, Share2, Home, RotateCcw } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { AnimatedButton } from '@/src/components/AnimatedButton';
import { generateMemeLines } from '@/src/services/aiService';

const { width } = Dimensions.get('window');

export default function ResultScreen() {
  const router = useRouter();
  const { uri, top, bottom } = useLocalSearchParams<{ uri: string, top: string, bottom: string }>();

  // State for dynamic meme text
  const [topLines, setTopLines] = useState<string[]>(top ? JSON.parse(top) : ['MEME COMES HERE', 'IN 2 LINES']);
  const [bottomLines, setBottomLines] = useState<string[]>(bottom ? JSON.parse(bottom) : ['AND HERE IN', 'TWO LINES']);
  const [isReloading, setIsReloading] = useState(false);

  // Re-generate AI text for the same image
  const handleReload = async () => {
    if (!uri) return;
    try {
      setIsReloading(true);
      const newLines = await generateMemeLines(uri);
      setTopLines(newLines.top);
      setBottomLines(newLines.bottom);
    } catch (error) {
      console.error('Reload failed:', error);
    } finally {
      setIsReloading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this FIRE meme! 🔥\n\n${topLines.join(' ')}\n${bottomLines.join(' ')}`,
        url: uri,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/dashboard')}>
          <Home color="#FFF" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>YOUR FIRE MEME</Text>
        <Pressable onPress={handleReload} disabled={isReloading} style={styles.reloadButton}>
          <RotateCcw color={isReloading ? Colors.dark.muted : Colors.dark.accent} size={28} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Animated.View entering={ZoomIn.duration(600).springify()} style={styles.memeContainer}>
          <Image 
            source={{ uri: uri || 'https://picsum.photos/seed/meme/800/800' }} 
            style={styles.memeImage}
          />
          
          <View style={styles.textOverlay}>
            {/* Top Text Cluster */}
            <View style={styles.topCluster}>
              {topLines.map((line, i) => (
                <Text key={`top-${i}`} style={styles.memeText} numberOfLines={1}>
                  {line.toUpperCase()}
                </Text>
              ))}
            </View>

            {/* Bottom Text Cluster */}
            <View style={styles.bottomCluster}>
              {bottomLines.map((line, i) => (
                <Text key={`bottom-${i}`} style={styles.memeText} numberOfLines={1}>
                  {line.toUpperCase()}
                </Text>
              ))}
            </View>
          </View>

          {/* Reloading Overlay */}
          {isReloading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.dark.accent} size="large" />
              <Text style={styles.loadingText}>REFRESHING FIRE...</Text>
            </View>
          )}

          <View style={styles.watermark}>
            <Text style={styles.watermarkText}>MemeGen.ai</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(400)} style={styles.footer}>
        <Pressable style={styles.closeButton} onPress={() => router.replace('/dashboard')}>
          <X color="#FFF" size={32} />
        </Pressable>

        <AnimatedButton 
          title="SHARE TO WORLD"
          onPress={handleShare}
          style={styles.shareButton}
        />

        <Pressable style={styles.shareButtonSmall} onPress={handleShare}>
          <Share2 color="#FFF" size={32} />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 20,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  reloadButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  memeContainer: {
    width: width - 32,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1B',
    position: 'relative',
    elevation: 20,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  memeImage: {
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: Colors.dark.accent,
    marginTop: 16,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12,
  },
  topCluster: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: -4,
  },
  bottomCluster: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: -4,
  },
  memeText: {
    color: '#FFF',
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  watermark: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  watermarkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footer: {
    height: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  closeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    flex: 1,
    height: 60,
  },
  shareButtonSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
