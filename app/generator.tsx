import { Colors } from '@/constants/theme';
import { AnimatedButton } from '@/src/components/AnimatedButton';
import { SelectionModal } from '@/src/components/SelectionModal';
import { useAlert } from '@/src/context/AlertContext';
import { useAuth } from '@/src/context/AuthContext';
import { useBilling } from '@/src/context/BillingContext';
import { generateMemeLines } from '@/src/services/aiService';
import { getUserMemeCount } from '@/src/services/memeService';
import { processMemeImage } from '@/src/utils/imageProcessor';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ChevronDown, Crown, ImagePlus, RotateCcw, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, View, Linking } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function GeneratorScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [style, setStyle] = useState('Roast');
  const [language, setLanguage] = useState('Hinglish');
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const { user } = useAuth();
  const { isPremium } = useBilling();


  const STYLES = ['Funny', 'Dark', 'Roast', 'Cute'];
  const LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Tamil', 'Telugu'];

  const ensureCameraPermission = async () => {
    if (permission?.granted) return true;
    
    const result = await requestPermission();
    if (result.granted) return true;

    if (!result.canAskAgain) {
      showAlert({
        title: 'Camera Permission',
        message: 'We need camera access to create memes. Please enable it in your device settings.',
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'SETTINGS', onPress: () => Linking.openSettings() }
        ]
      });
    }
    return false;
  };

  const ensureMediaPermission = async () => {
    if (mediaPermission?.granted) return true;

    const result = await requestMediaPermission();
    if (result.granted) return true;

    if (!result.canAskAgain) {
      showAlert({
        title: 'Gallery Permission',
        message: 'We need gallery access to pick images. Please enable it in your device settings.',
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'SETTINGS', onPress: () => Linking.openSettings() }
        ]
      });
    }
    return false;
  };

  const handleCapture = async () => {
    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) return;

    if (!cameraRef.current) {
      showAlert({
        title: 'Camera Error',
        message: 'The fire lab camera is still warming up. Try again in a second!',
        type: 'warning'
      });
      return;
    }

    try {
      // 1. CAPTURE IMMEDIATELY (Reduces shutter lag to minimum)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: false,
        skipProcessing: true, // Bypasses post-processing for instant results
      });

      if (!photo?.uri) {
        throw new Error('No photo data');
      }

      // Show the still image immediately
      setCapturedImage(photo.uri);

      // 2. NOW start processing/network states
      setIsProcessing(true);

      // 3. --- RATE LIMIT CHECK ---
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
          setIsProcessing(false);
          return;
        }
      }

      const processed = await processMemeImage(photo.uri);

      // --- AI GENERATION STEP ---
      setIsGeneratingAI(true);
      const memeLines = await generateMemeLines(processed.uri, style, language);
      setIsGeneratingAI(false);

      // --- SUPABASE PREPARATIONS ---
      let memeId = Date.now().toString();

      router.push({
        pathname: '/result',
        params: {
          id: memeId,
          uri: processed.uri,
          top: JSON.stringify(memeLines.top),
          bottom: JSON.stringify(memeLines.bottom),
          style,
          language
        }
      });

    } catch (error: any) {
      console.error('Capture error:', error);
      showAlert({
        title: 'Capture Failed',
        message: error.message || 'The fire lab had a malfunction. Try again or pick from gallery!',
        type: 'error'
      });
      setCapturedImage(null); // Reset to camera on error
    } finally {
      setIsProcessing(false);
      setIsGeneratingAI(false);
    }

  };

  const pickImage = async () => {
    const hasPermission = await ensureMediaPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1.0,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const pickedUri = result.assets[0].uri;
        setCapturedImage(pickedUri);
        setIsProcessing(true);

        // --- RATE LIMIT CHECK ---
        if (user) {
          const count = await getUserMemeCount(user.id);
          if (!isPremium && count >= 3) {
            showAlert({
              title: 'Limit Reached',
              message: 'You have used your 3 free memes. Upgrade to Premium for unlimited fire! 🔥',
              type: 'warning',
              buttons: [
                { text: 'Later', style: 'cancel' },
                { text: 'UPGRADE NOW', onPress: () => router.push('/subscription') }
              ]
            });
            setIsProcessing(false);
            setCapturedImage(null);
            return;
          }
        }

        const processed = await processMemeImage(pickedUri);
        setCapturedImage(processed.uri);

        // --- AI GENERATION STEP ---
        setIsGeneratingAI(true);
        const memeLines = await generateMemeLines(processed.uri, style, language);
        setIsGeneratingAI(false);

        // --- SUPABASE PREPARATIONS ---
        let memeId = Date.now().toString();

        router.push({
          pathname: '/result',
          params: {
            id: memeId,
            uri: processed.uri,
            top: JSON.stringify(memeLines.top),
            bottom: JSON.stringify(memeLines.bottom),
            style,
            language
          }
        });
      }

    } catch (error) {
      console.error('Picker error:', error);
      Alert.alert('Error', 'Failed to pick image from gallery.');
      setCapturedImage(null);
    } finally {
      setIsProcessing(false);
    }

  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.dark.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Animated.View entering={FadeIn.delay(100)} style={styles.headerControls}>
          <Pressable onPress={() => router.back()} style={styles.navButton}>
            <X color="#FFF" size={28} />
          </Pressable>
          <View style={styles.dropdowns}>
            <Pressable onPress={() => setShowStyleModal(true)} style={styles.dropdown}>
              <Text style={styles.dropdownText}>{style}</Text>
              <ChevronDown color={Colors.dark.accent} size={16} />
            </Pressable>
            <Pressable onPress={() => setShowLanguageModal(true)} style={styles.dropdown}>
              <Text style={styles.dropdownText}>{language}</Text>
              <ChevronDown color={Colors.dark.accent} size={16} />
            </Pressable>
          </View>
          <Pressable onPress={() => router.push('/subscription')} style={styles.navButton}>
            <Crown color={Colors.dark.accent} size={28} fill={Colors.dark.accent} />
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.content}>
        <View style={styles.cameraContainer}>
          {capturedImage ? (
            <Image source={{ uri: capturedImage }} style={styles.camera} resizeMode="cover" />
          ) : permission.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
            />
          ) : (
            <Pressable style={styles.permissionPlaceholder} onPress={ensureCameraPermission}>
              <View style={styles.permissionIconContainer}>
                <CameraView style={{ width: 1, height: 1, opacity: 0 }} />
                <View style={styles.logoPlaceholder}>
                  <RotateCcw color={Colors.dark.accent} size={40} />
                </View>
              </View>
              <Text style={styles.permissionPlaceholderTitle}>CAMERA ACCESS REQUIRED</Text>
              <Text style={styles.permissionPlaceholderSubtitle}>Tap to enable the fire lab lens</Text>
            </Pressable>
          )}

          {(isProcessing || isGeneratingAI) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.dark.accent} size="large" />
              <Text style={styles.loadingText}>
                {isGeneratingAI ? 'BRAINSTORMING FIRE...' : 'PREPARING FIRE...'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.iconButton} onPress={pickImage}>
          <ImagePlus color="#FFF" size={32} />
        </Pressable>

        <Pressable
          style={styles.captureButtonContainer}
          onPress={handleCapture}
          disabled={isProcessing}
        >
          <View style={styles.captureButtonOuter}>
            <View style={styles.captureButtonInner} />
          </View>
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
        >
          <RotateCcw color="#FFF" size={32} />
        </Pressable>
      </View>

      {/* Selection Modals */}
      <SelectionModal
        visible={showStyleModal}
        onClose={() => setShowStyleModal(false)}
        options={STYLES}
        selected={style}
        onSelect={setStyle}
        title="SELECT STYLE"
      />

      <SelectionModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        options={LANGUAGES}
        selected={language}
        onSelect={setLanguage}
        title="SELECT LANGUAGE"
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    padding: 20,
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 255, 102, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.1)',
  },
  logoPlaceholder: {
    padding: 10,
  },
  permissionPlaceholderTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  permissionPlaceholderSubtitle: {
    color: Colors.dark.muted,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  header: {
    height: 60,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    padding: 4,
  },
  dropdowns: {
    flexDirection: 'row',
    gap: 12,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdownText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1A1A1B',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  camera: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: Colors.dark.accent,
    marginTop: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footer: {
    height: 140,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
  },
});
