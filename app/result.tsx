import { Colors } from '@/constants/theme';
import { AnimatedButton } from '@/src/components/AnimatedButton';
import { generateMemeLines } from '@/src/services/aiService';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Check, Download, Home, RotateCcw, Share2, X, AlertCircle } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { SelectionModal } from '@/src/components/SelectionModal';
import { updateMemeInHistory } from '@/src/utils/historyManager';
import { useBilling } from '@/src/context/BillingContext';
import { useAuth } from '@/src/context/AuthContext';
import { getUserMemeCount, saveMemeToDb, uploadMemeImage, incrementMemeCount } from '@/src/services/memeService';
import { useAlert } from '@/src/context/AlertContext';

import { ChevronDown } from 'lucide-react-native';
import { useEffect } from 'react';
import { getLanguages, addLanguageToDb } from '@/src/services/languageService';
import storage from '@/src/utils/storage';



const { width } = Dimensions.get('window');

const STYLES = ['Funny', 'Dark', 'Roast', 'Cute'];

export default function ResultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium } = useBilling();
  const { showAlert } = useAlert();

  const params = useLocalSearchParams<{ 
    id: string; 
    uri: string; 
    top: string; 
    bottom: string; 
    style: string; 
    language: string;
    isNew?: string;
  }>();

  // Safely extract params (handle both string and string[])
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri;
  const top = Array.isArray(params.top) ? params.top[0] : params.top;
  const bottom = Array.isArray(params.bottom) ? params.bottom[0] : params.bottom;
  const initialStyle = Array.isArray(params.style) ? params.style[0] : params.style;
  const initialLanguage = Array.isArray(params.language) ? params.language[0] : params.language;
  const isNew = Array.isArray(params.isNew) ? params.isNew[0] : params.isNew;
  
  const [shouldAutoSave, setShouldAutoSave] = useState(isNew === 'true');

  const [currentStyle, setCurrentStyle] = useState(initialStyle || 'Funny');
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage || 'English');
  const [languagesList, setLanguagesList] = useState<string[]>([]);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);

  // Safe JSON parsing helper to prevent white screen crashes
  const safeJsonParse = (str: string | undefined, fallback: string[]) => {
    if (!str) return fallback;
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [String(parsed), ''];
    } catch (e) {
      console.error('Failed to parse meme lines:', e);
      return fallback;
    }
  };

  // State for dynamic meme text
  const [topLines, setTopLines] = useState<string[]>(safeJsonParse(top, ['MEME COMES HERE', 'IN 2 LINES']));
  const [bottomLines, setBottomLines] = useState<string[]>(safeJsonParse(bottom, ['AND HERE IN', 'TWO LINES']));
  const [isReloading, setIsReloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`--- Result Screen Loaded (ID: ${id}) ---`);
    if (!uri) console.warn('Warning: Result screen loaded without a valid image URI');
    
    // Fetch global languages
    getLanguages().then(setLanguagesList);
  }, [id, uri]);

  const handleLanguageSelect = (lang: string) => {
    setCurrentLanguage(lang);
    storage.setItem('preferred_language', lang);
  };

  const handleStyleSelect = (style: string) => {
    setCurrentStyle(style);
    storage.setItem('preferred_style', style);
  };

  const handleAddLanguage = async (newLang: string) => {
    if (!newLang) return;
    // Optimistic update
    if (!languagesList.includes(newLang)) {
      setLanguagesList(prev => [...prev, newLang]);
    }
    handleLanguageSelect(newLang);
    setShowLanguageModal(false);
    
    // Save to DB
    await addLanguageToDb(newLang);
  };

  // Automatic Cloud Upload: Every generation and reload is synced to the lab.

  const autoUploadMeme = async (existingCaptureUri?: string) => {
    if ((!viewShotRef.current?.capture && !existingCaptureUri) || isUploadingToCloud || !user) return;

    try {
      // Safety Limit Check: Don't increment if already over limit (unless premium)
      if (!isPremium) {
        const count = await getUserMemeCount(user.id);
        if (count >= 3) {
          console.log('Auto-upload skipped: Limit reached');
          setShouldAutoSave(false);
          return;
        }
      }

      setIsUploadingToCloud(true);
      setShouldAutoSave(false); // Mark as handled
      
      // 1. Capture the final rendered meme (image + text) if not provided
      const captureUri = existingCaptureUri || await viewShotRef.current!.capture();
      
      // 3. Upload to Supabase Storage
      const publicUrl = await uploadMemeImage(captureUri, user!.id);
      
      // 4. Save to DB record
      const fullCaption = [...topLines, ...bottomLines].join(' ');
      await saveMemeToDb({
        user_id: user!.id,
        image_url: publicUrl,
        caption: fullCaption,
        metadata: {
          style: currentStyle,
          language: currentLanguage,
          topLines: topLines,
          bottomLines: bottomLines
        }
      });
      
      // 4. Increment the daily count in Supabase profile
      await incrementMemeCount(user!.id);
      
      console.log('Meme synced and count incremented! 🚀');

    } catch (error: any) {
      console.error('Cloud sync failed:', error);
      // For development, show the error so the user can debug bucket/permission issues
      showAlert({
        title: 'Cloud Sync Failed',
        message: error.message || 'Failed to backup your fire to the lab. 🔥',
        type: 'error'
      });
    } finally {
      setIsUploadingToCloud(false);
    }
  };

  useEffect(() => {
    // Auto-sync to cloud whenever the meme is ready or updated
    if (isImageLoaded && !isReloading && !isSaving && !isUploadingToCloud && shouldAutoSave) {
      const timer = setTimeout(() => {
        autoUploadMeme();
      }, 1500); // Settle time for text rendering
      return () => clearTimeout(timer);
    }
  }, [isImageLoaded, topLines, bottomLines, isReloading, shouldAutoSave]);


  // Re-generate AI text for the same image
  const handleReload = async () => {

    if (!uri) return;
    try {
      setIsReloading(true);
      setRecentError(null);

      // --- RATE LIMIT CHECK ---
      if (user) {
        const count = await getUserMemeCount(user.id);
        if (!isPremium && count >= 3) {
          showAlert({
            title: 'Limit Reached',
            message: 'You have used your 3 free memes. Upgrade to Premium for more fire! 🔥',
            type: 'warning',
            buttons: [
              { text: 'Later', style: 'cancel' },
              { text: 'UPGRADE NOW', onPress: () => router.push('/subscription') }
            ]
          });
          setIsReloading(false);
          return;
        }
      }

      const newLines = await generateMemeLines(uri, currentStyle, currentLanguage);
      setTopLines(newLines.top);
      setBottomLines(newLines.bottom);
      setShouldAutoSave(true);

      // --- SUPABASE SAVE STEP is now handled by the useEffect above ---
      // which triggers when topLines/bottomLines change.
      
      // Update local history if needed
      if (id) {
        const fullCaption = [...newLines.top, ...newLines.bottom].join(' ');
        await updateMemeInHistory(id, {
          topLines: newLines.top,
          bottomLines: newLines.bottom,
          style: currentStyle,
          language: currentLanguage,
          caption: fullCaption
        });
      }

    } catch (error: any) {
      console.error('Reload failed:', error);
      const msg = error.message || 'Failed to brainstorm more fire. Try again later! 🔥';
      setRecentError(msg);
      // We still show the custom alert for high visibility
      showAlert({
        title: 'AI Error',
        message: msg,
        type: 'error'
      });
    } finally {
      setIsReloading(false);
    }

  };

  const handleShare = async () => {
    try {
      if (!viewShotRef.current?.capture) return;

      const captureUri = await viewShotRef.current.capture();

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(captureUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share your FIRE meme!',
          UTI: 'public.jpeg',
        });
      } else {
        // Fallback to basic text share if Sharing is not available
        await Share.share({
          message: `Check out this FIRE meme! 🔥\n\n${topLines.join(' ')}\n${bottomLines.join(' ')}`,
          url: uri,
        });
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      showAlert({
        title: 'Share Failed',
        message: 'The lab could not share your meme. Try saving it instead!',
        type: 'error'
      });
    }
  };

  const handleSaveToGallery = async () => {
    if (!isImageLoaded) {
      Alert.alert('Hold on', 'Wait for the fire to load fully! 🔥');
      return;
    }

    try {
      setIsSaving(true);

      // 1. Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert({
          title: 'Permission Needed',
          message: 'The fire lab needs access to your gallery to save memes!',
          type: 'warning'
        });
        return;
      }

      // 2. Small delay to ensure any animations have settled
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Capture the view
      if (!viewShotRef.current?.capture) return;
      const captureUri = await viewShotRef.current.capture();

      // 4. Save to media library
      await MediaLibrary.saveToLibraryAsync(captureUri);
      setHasSaved(true);

      // Auto-upload to lab if not already done (new generations/reloads only)
      if (shouldAutoSave) {
        await autoUploadMeme(captureUri);
      }
      
      setTimeout(() => setHasSaved(false), 3000);
      
      showAlert({
        title: 'Success!',
        message: 'Meme saved to your gallery and the cloud! 🖼️🔥',
        type: 'success',
        autoDismiss: true
      });
    } catch (error) {
      console.error('Saving failed:', error);
      showAlert({
        title: 'Save Failed',
        message: 'Could not save the fire to your gallery. 🔥',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/dashboard')}>
          <Home color="#FFF" size={28} />
        </Pressable>
        
        {isNew === 'true' && (
          <View style={styles.dropdowns}>
            <Pressable onPress={() => setShowStyleModal(true)} style={styles.dropdown}>
              <Text style={styles.dropdownText}>{currentStyle}</Text>
              <ChevronDown color={Colors.dark.accent} size={16} />
            </Pressable>
            <Pressable onPress={() => setShowLanguageModal(true)} style={styles.dropdown}>
              <Text style={styles.dropdownText}>{currentLanguage}</Text>
              <ChevronDown color={Colors.dark.accent} size={16} />
            </Pressable>
          </View>
        )}

        {isNew === 'true' && (
          <Pressable onPress={handleReload} disabled={isReloading} style={styles.reloadButton}>
            <RotateCcw color={isReloading ? Colors.dark.muted : Colors.dark.accent} size={28} />
          </Pressable>
        )}
      </View>

      <View style={styles.content}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'jpg', quality: 1.0, result: 'tmpfile' }}
        >
          <Animated.View
            entering={ZoomIn.duration(600).springify().damping(15)}
            style={[styles.memeContainer, { opacity: isImageLoaded ? 1 : 0.5 }]}
            collapsable={false}
          >
            <Image
              source={{ uri: uri || 'https://picsum.photos/seed/meme/800/800' }}
              style={styles.memeImage}
              onLoad={() => setIsImageLoaded(true)}
            />

            <View style={styles.textOverlay} collapsable={false}>
              {/* Top Text Cluster */}
              <View style={styles.topCluster}>
                {topLines.map((line, i) => (
                  <Text
                    key={`top-${i}`}
                    style={styles.memeText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {line.toUpperCase()}
                  </Text>
                ))}
              </View>

              {/* Bottom Text Cluster */}
              <View style={styles.bottomCluster}>
                {bottomLines.map((line, i) => (
                  <Text
                    key={`bottom-${i}`}
                    style={styles.memeText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {line.toUpperCase()}
                  </Text>
                ))}
              </View>
            </View>

            {/* Reloading Overlay */}
            {isReloading && (
              <View style={styles.loadingOverlay}>
                {recentError ? (
                  <>
                    <AlertCircle color="#FF4D4D" size={48} />
                    <Text style={[styles.loadingText, { color: '#FF4D4D' }]}>BRAINSTORMING FAILED</Text>
                    <Text style={styles.errorSubtext}>{recentError}</Text>
                    <Pressable style={styles.retryMiniButton} onPress={handleReload}>
                      <RotateCcw color="#FFF" size={16} />
                      <Text style={styles.retryMiniText}>TRY AGAIN</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ActivityIndicator color={Colors.dark.accent} size="large" />
                    <Text style={styles.loadingText}>REFRESHING FIRE...</Text>
                  </>
                )}
              </View>
            )}

            {!isPremium && (
              <View style={styles.diagonalWatermark} pointerEvents="none">
                <Text style={styles.diagonalText}>Memecam.in</Text>
              </View>
            )}
          </Animated.View>
        </ViewShot>
      </View>

      <Animated.View entering={FadeInUp.delay(400)} style={styles.footer}>
        <Pressable style={styles.closeButton} onPress={() => router.replace('/dashboard')}>
          <X color="#FFF" size={32} />
        </Pressable>

        <AnimatedButton
          title={hasSaved ? "SAVED!" : (isSaving ? "SAVING..." : "SAVE MEME")}
          onPress={handleSaveToGallery}
          style={styles.saveButton}
          disabled={isSaving || hasSaved}
          leftIcon={hasSaved ? <Check color="#FFF" size={20} /> : <Download color="#FFF" size={20} />}
        />

        <Pressable style={styles.shareButtonSmall} onPress={handleShare}>
          <Share2 color="#FFF" size={32} />
        </Pressable>

      </Animated.View>

      <SelectionModal 
        visible={showStyleModal} 
        onClose={() => setShowStyleModal(false)}
        options={STYLES}
        selected={currentStyle}
        onSelect={handleStyleSelect}
        title="SELECT STYLE"
      />

      <SelectionModal 
        visible={showLanguageModal} 
        onClose={() => setShowLanguageModal(false)}
        options={languagesList}
        selected={currentLanguage}
        onSelect={handleLanguageSelect}
        title="SELECT LANGUAGE"
        allowAdd={true}
        onAdd={handleAddLanguage}
        addPlaceholder="Add custom language..."
      />
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
  dropdowns: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdownText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: '#000',
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
    fontSize: 32, // Increased from 27 for more impact
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  diagonalWatermark: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  diagonalText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 42,
    fontWeight: '900',
    transform: [{ rotate: '-45deg' }],
    letterSpacing: 2,
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
  saveButton: {
    flex: 1,
    height: 60,
  },
  errorSubtext: {
    color: '#A1A1AA',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
    fontWeight: '500',
  },
  retryMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryMiniText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
