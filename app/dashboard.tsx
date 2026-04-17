import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { getUserMemes, getUserProfile } from '@/src/services/memeService';
import { getMemeHistory, MemeItem } from '@/src/utils/historyManager';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Image as ImageIcon, Plus, Search, User, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBilling } from '@/src/context/BillingContext';


const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DashboardScreen() {
  const router = useRouter();
  const [memes, setMemes] = useState<MemeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('All');
  const [profile, setProfile] = useState<any>(null);
  const [memeCount, setMemeCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);


  const { user, signOut } = useAuth();
  const { isPremium } = useBilling();


  const STYLES = ['All', 'Funny', 'Dark', 'Roast', 'Cute'];

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Handle search debounce
  useEffect(() => {
    if (searchQuery !== debouncedSearch) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setIsSearching(false);
      // Automatically close keyboard after search triggers (user requirement)
      if (searchQuery.length > 0) {
        Keyboard.dismiss();
      }
    }, 800); // Slightly longer delay to give user time to finish
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      const data = await getUserProfile(user.id);
      setProfile(data);
      setMemeCount(data.memes_generated_today || 0);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };


  useFocusEffect(
    useCallback(() => {
      const loadHistory = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
          // 1. Fetch profile/count for the banner
          const profileData = await getUserProfile(user.id);
          setProfile(profileData);
          setMemeCount(profileData.memes_generated_today || 0);


          // 2. Fetch memes from Supabase
          const dbMemes = await getUserMemes(user.id);
          // 3. Transform to MemeItem structure (to keep UI code working)
          const transformed: MemeItem[] = dbMemes.map((m: any) => ({
            id: m.id,
            url: m.image_url,
            caption: m.caption,
            topLines: m.top_lines,
            bottomLines: m.bottom_lines,
            createdAt: new Date(m.created_at).getTime(),
            style: m.style,
            language: m.language
          }));

          setMemes(transformed);
        } catch (error) {
          console.error('Failed to load Supabase memes:', error);
          // Fallback to local if needed, or show error
          const history = await getMemeHistory();
          setMemes(history);
        } finally {
          setIsLoading(false);
        }
      };
      loadHistory();
    }, [user])

  );

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ]);
  };

  const filteredMemes = memes.filter(meme => {
    // 1. Name/Style Match
    const matchesSearch = meme.caption.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (meme.style?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

    // 2. Style Chip Match
    const matchesStyle = selectedStyle === 'All' || meme.style === selectedStyle;

    return matchesSearch && matchesStyle;
  });

  const renderItem = ({ item, index }: { item: MemeItem, index: number }) => (
    <Animated.View
      entering={FadeInUp.delay(index * 50).springify().damping(12)}
      style={styles.cardContainer}
    >
      <Pressable
        style={styles.memeCard}
        onPress={() => router.push({
          pathname: '/result',
          params: {
            id: item.id,
            uri: item.url,
            top: item.topLines ? JSON.stringify(item.topLines) : undefined,
            bottom: item.bottomLines ? JSON.stringify(item.bottomLines) : undefined,
            style: item.style,
            language: item.language
          }
        })}
      >
        <Image source={{ uri: item.url }} style={styles.memeImage} />
        <View style={styles.cardOverlay}>
          {item.style && (
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, styles.styleBadge]}>
                <Text style={styles.badgeText}>{item.style.toUpperCase()}</Text>
              </View>
              {item.language && (
                <View style={[styles.badge, styles.langBadge]}>
                  <Text style={styles.badgeText}>{item.language.toUpperCase()}</Text>
                </View>
              )}
            </View>
          )}
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
          <Text style={styles.greeting}>
            {profile?.full_name ? `HI, ${profile.full_name.toUpperCase()}` : 'FIRE LAB 🔥'}
          </Text>
          <Text style={styles.subtitle}>Your Daily Spark</Text>
        </View>
        <Pressable style={styles.profileButton} onPress={handleLogout}>
          <User color="#FFF" size={24} />
        </Pressable>
      </View>

      {/* Quick Stats / Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerInfo}>
          <Zap color={Colors.dark.accent} size={24} fill={Colors.dark.accent} />
          <Text style={styles.bannerText}>
            {(isPremium || profile?.is_subscriber)
              ? 'UNLIMITED FIRE ACTIVATED 🔥'
              : `${Math.max(0, 3 - memeCount)} MEMES REMAINING`}
          </Text>
        </View>
        {!(isPremium || profile?.is_subscriber) && (

          <Pressable onPress={() => router.push('/subscription')}>
            <ChevronRight color={Colors.dark.accent} size={20} />
          </Pressable>
        )}
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
          data={filteredMemes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                  {isSearching ? (
                    <ActivityIndicator size="small" color={Colors.dark.accent} style={{ marginRight: 0 }} />
                  ) : (
                    <Search color={Colors.dark.muted} size={20} />
                  )}
                  <TextInput
                    placeholder="Find by name..."
                    placeholderTextColor={Colors.dark.muted}
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onBlur={() => Keyboard.dismiss()}
                  />
                  {searchQuery.length > 0 && !isSearching && (
                    <Pressable onPress={() => {
                      setSearchQuery('');
                      Keyboard.dismiss();
                    }} style={styles.clearSearch}>
                      <X color={Colors.dark.muted} size={18} />
                    </Pressable>
                  )}
                </View>
              </View>

              <FlatList
                horizontal
                data={STYLES}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContainer}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedStyle(item)}
                    style={[
                      styles.filterChip,
                      selectedStyle === item && styles.filterChipActive
                    ]}
                  >
                    <Text style={[
                      styles.filterText,
                      selectedStyle === item && styles.filterTextActive
                    ]}>
                      {item.toUpperCase()}
                    </Text>
                  </Pressable>
                )}
              />

              <Text style={styles.sectionTitle}>
                {debouncedSearch || selectedStyle !== 'All'
                  ? `${filteredMemes.length} RESULTS FOUND`
                  : 'YOUR CREATIONS'}
              </Text>
            </View>
          }
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
    ...Platform.select({
      web: {
        height: '100dvh',
      },
    }),
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
  listHeader: {
    marginBottom: 24,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  clearSearch: {
    padding: 4,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '600',
  },
  filterContainer: {
    gap: 10,
    paddingBottom: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterChipActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  filterText: {
    color: Colors.dark.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  filterTextActive: {
    color: '#000',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  styleBadge: {
    backgroundColor: Colors.dark.accent,
  },
  langBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
});
