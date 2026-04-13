import { Colors } from '@/constants/theme';
import { getMemeHistory, MemeItem } from '@/src/utils/historyManager';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Image as ImageIcon, Plus, User, Zap, Search, Calendar, ChevronLeft, X } from 'lucide-react-native';
import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { ActivityIndicator, Dimensions, FlatList, Image, Platform, Pressable, StyleSheet, Text, View, TextInput, Alert, Modal } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DashboardScreen() {
  const router = useRouter();
  const [memes, setMemes] = useState<MemeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('All');
  const [searchMode, setSearchMode] = useState<'name' | 'date'>('name');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const { user, signOut } = useAuth();

  const STYLES = ['All', 'Funny', 'Dark', 'Roast', 'Cute'];

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    
    if (data) setProfile(data);
  };

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

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ]);
  };

  const filteredMemes = memes.filter(meme => {
    // 1. Name Match
    const matchesSearch = searchMode === 'date' || 
                         meme.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (meme.style?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    // 2. Date Match
    let matchesDate = true;
    if (searchMode === 'date' && selectedDate) {
      const memeDate = new Date(meme.createdAt);
      matchesDate = memeDate.getFullYear() === selectedDate.getFullYear() &&
                    memeDate.getMonth() === selectedDate.getMonth() &&
                    memeDate.getDate() === selectedDate.getDate();
    }

    // 3. Style Match
    const matchesStyle = selectedStyle === 'All' || meme.style === selectedStyle;
    
    return matchesSearch && matchesDate && matchesStyle;
  });

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
          data={filteredMemes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <View style={styles.searchRow}>
                {searchMode === 'name' ? (
                  <View style={styles.searchContainer}>
                    <Search color={Colors.dark.muted} size={20} />
                    <TextInput 
                      placeholder="Find by name..."
                      placeholderTextColor={Colors.dark.muted}
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>
                ) : (
                  <Pressable 
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.searchContainer, selectedDate && styles.dateActive]}
                  >
                    <Calendar color={selectedDate ? Colors.dark.accent : Colors.dark.muted} size={20} />
                    <Text style={[styles.searchInput, !selectedDate && { color: Colors.dark.muted }]}>
                      {selectedDate 
                        ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Select date...'}
                    </Text>
                    {selectedDate && (
                      <Pressable onPress={() => setSelectedDate(null)} style={styles.clearDate}>
                        <X color={Colors.dark.muted} size={16} />
                      </Pressable>
                    )}
                  </Pressable>
                )}
                
                <Pressable 
                  onPress={() => setSearchMode(searchMode === 'name' ? 'date' : 'name')}
                  style={[styles.modeToggle, searchMode === 'date' && styles.modeToggleActive]}
                >
                  {searchMode === 'name' ? (
                    <Calendar color="#FFF" size={20} />
                  ) : (
                    <Search color="#FFF" size={20} />
                  )}
                </Pressable>
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
                {searchQuery || selectedStyle !== 'All' 
                  ? `${filteredMemes.length} RESULTS FOUND` 
                  : 'YOUR CREATIONS'}
              </Text>
            </View>
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

      <CustomDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate || new Date()}
        onSelect={(date) => {
          setSelectedDate(date);
          setShowDatePicker(false);
        }}
      />
    </SafeAreaView>
  );
}

function CustomDatePicker({ visible, onClose, selectedDate, onSelect }: any) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  
  const monthName = currentMonth.toLocaleString('default', { month: 'long' });
  
  const daysArray = [];
  for (let i = 0; i < startDay; i++) daysArray.push(null);
  for (let i = 1; i <= days; i++) daysArray.push(new Date(year, month, i));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.datePickerContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{monthName.toUpperCase()}</Text>
              <Text style={styles.modalSubtitle}>{year}</Text>
            </View>
            <View style={styles.monthNav}>
              <Pressable onPress={() => setCurrentMonth(new Date(year, month - 1))} style={styles.navIcon}>
                <ChevronLeft color="#FFF" size={20} />
              </Pressable>
              <Pressable onPress={() => setCurrentMonth(new Date(year, month + 1))} style={styles.navIcon}>
                <ChevronRight color="#FFF" size={20} />
              </Pressable>
            </View>
          </View>
          
          <View style={styles.calendarGrid}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={`head-${i}`} style={styles.dayHead}>{d}</Text>
            ))}
            {daysArray.map((date, i) => {
              if (!date) return <View key={`empty-${i}`} style={styles.dayCell} />;
              
              const isSelected = selectedDate && 
                date.getDate() === selectedDate.getDate() && 
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();
                
              const isToday = new Date().toDateString() === date.toDateString();

              return (
                <Pressable 
                  key={`day-${i}`} 
                  style={[styles.dayCell, isSelected && styles.daySelected]} 
                  onPress={() => onSelect(date)}
                >
                  <Text style={[
                    styles.dayText, 
                    isSelected && styles.dayTextSelected,
                    isToday && !isSelected && { color: Colors.dark.accent }
                  ]}>
                    {date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>CANCEL</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
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
  dateActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(0, 255, 102, 0.05)',
  },
  clearDate: {
    padding: 4,
  },
  modeToggle: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modeToggleActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '600',
  },
  datePickerContent: {
    backgroundColor: '#1A1A1B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  modalSubtitle: {
    color: Colors.dark.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  monthNav: {
    flexDirection: 'row',
    gap: 8,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  dayHead: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: Colors.dark.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 12,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  daySelected: {
    backgroundColor: Colors.dark.accent,
  },
  dayText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#000',
    fontWeight: '900',
  },
  closeBtn: {
    marginTop: 24,
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.dark.muted,
    fontWeight: '900',
    letterSpacing: 1,
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
