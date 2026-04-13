import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, Image, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Plus, User, ChevronRight, Zap, Image as ImageIcon } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { getMemeHistory, MemeItem } from '@/src/utils/historyManager';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DashboardScreen() {
  const router = useRouter();
  const [memes, setMemes] = useState<MemeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Re-fetch history every time the dashboard is focused
  useFocusEffect(
    useCallback(() => {
      const loadHistory = async () => {
        setIsLoading(true);
        const history = await getMemeHistory();
        setMemes(history);
        setIsLoading(false);
      };
      loadHistory();
    }, [])
  );

  const renderItem = ({ item, index }: { item: MemeItem, index: number }) => (
    <Animated.View 
      entering={FadeInUp.delay(index * 50).springify().damping(12)}
      style={styles.cardContainer}
    >
      <Pressable 
        style={styles.memeCard}
        onPress={() => router.push({ pathname: '/result', params: { uri: item.url } })}
      >
        <Image source={{ uri: item.url }} style={styles.memeImage} />
        <View style={styles.cardOverlay}>
          <Text numberOfLines={2} style={styles.cardCaption}>{item.caption}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>FIRE LAB 🔥</Text>
          <Text style={styles.subtitle}>Your Daily Spark</Text>
        </View>
        <Pressable style={styles.profileButton}>
          <User color="#FFF" size={24} />
        </Pressable>
      </View>

      {/* Quick Stats / Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerInfo}>
          <Zap color={Colors.dark.accent} size={24} fill={Colors.dark.accent} />
          <Text style={styles.bannerText}>3 MEMES REMAINING TODAY</Text>
        </View>
        <Pressable onPress={() => router.push('/subscription')}>
          <ChevronRight color={Colors.dark.accent} size={20} />
        </Pressable>
      </View>

      {/* Meme Grid */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={Colors.dark.accent} size="large" />
        </View>
      ) : memes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ImageIcon color={Colors.dark.muted} size={64} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>NO FIRE YET</Text>
          <Text style={styles.emptyText}>Tap the NEW button to create your first banger.</Text>
        </View>
      ) : (
        <FlatList
          data={memes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <Text style={styles.sectionTitle}>YOUR CREATIONS</Text>
          )}
        />
      )}

      {/* Floating Action Button */}
      <Animated.View 
        entering={FadeInDown.delay(400).springify()}
        style={styles.fabContainer}
      >
        <Pressable 
          style={styles.fab}
          onPress={() => router.push('/generator')}
        >
          <Plus color="#000" size={32} />
          <Text style={styles.fabText}>NEW</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.muted,
    fontWeight: '500',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  banner: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(0, 255, 102, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.1)',
    marginBottom: 24,
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerText: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: COLUMN_WIDTH,
    marginBottom: 16,
  },
  memeCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.dark.surface,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  memeImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  cardCaption: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    left: '50%',
    marginLeft: -70,
  },
  fab: {
    width: 140,
    height: 60,
    backgroundColor: Colors.dark.accent,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 20,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  fabText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.dark.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
