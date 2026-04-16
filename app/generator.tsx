import { Colors } from '@/constants/theme';
import { AnimatedButton } from '@/src/components/AnimatedButton';
import { generateMemeLines } from '@/src/services/aiService';
import { saveMemeToHistory } from '@/src/utils/historyManager';
import { processMemeImage } from '@/src/utils/imageProcessor';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ChevronDown, Crown, ImagePlus, RotateCcw, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View, Modal, FlatList } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GeneratorScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [style, setStyle] = useState('Funny');
  const [language, setLanguage] = useState('English');
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const STYLES = ['Funny', 'Dark', 'Roast', 'Cute'];
  const LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Tamil', 'Telugu'];

  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
    if (mediaPermission && !mediaPermission.granted) requestMediaPermission();
  }, [permission, mediaPermission]);

  const handleCapture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setIsProcessing(true);
        const processed = await processMemeImage(photo.uri);

        // --- AI GENERATION STEP ---
        setIsGeneratingAI(true);
        const memeLines = await generateMemeLines(processed.uri, style, language);
        setIsGeneratingAI(false);

        // --- PERSISTENT SAVE STEP (with metadata for dashboard) ---
        const fullCaption = [...memeLines.top, ...memeLines.bottom].join(' ');
        const saved = await saveMemeToHistory(processed.uri, fullCaption, style, language, memeLines.top, memeLines.bottom);

        router.push({
          pathname: '/result',
          params: {
            uri: saved.url,
            top: JSON.stringify(memeLines.top),
            bottom: JSON.stringify(memeLines.bottom),
            style,
            language
          }
        });
      } else {
        throw new Error('No photo data');
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Capture Failed', 'Please try again or select from gallery.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setIsProcessing(true);
        const processed = await processMemeImage(result.assets[0].uri);

        // --- AI GENERATION STEP ---
        setIsGeneratingAI(true);
        const memeLines = await generateMemeLines(processed.uri, style, language);
        setIsGeneratingAI(false);

        // --- PERSISTENT SAVE STEP (with metadata for dashboard) ---
        const fullCaption = [...memeLines.top, ...memeLines.bottom].join(' ');
        const saved = await saveMemeToHistory(processed.uri, fullCaption, style, language, memeLines.top, memeLines.bottom);

        router.push({
          pathname: '/result',
          params: {
            uri: saved.url,
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

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permissionText}>We need your permission to use the camera</Text>
        <AnimatedButton title="Grant Permission" onPress={requestPermission} />
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
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          />

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

function SelectionModal({ visible, onClose, options, selected, onSelect, title }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <X color="#FFF" size={24} />
            </Pressable>
          </View>
          <FlatList 
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable 
                style={[styles.optionItem, selected === item && styles.optionItemSelected]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[styles.optionText, selected === item && styles.optionTextSelected]}>
                  {item.toUpperCase()}
                </Text>
                {selected === item && <View style={styles.selectedDot} />}
              </Pressable>
            )}
          />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  optionItemSelected: {
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
  },
  optionText: {
    color: '#A1A1AA',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  optionTextSelected: {
    color: Colors.dark.accent,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.accent,
  },
});
