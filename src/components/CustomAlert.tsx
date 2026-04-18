import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useAlert } from '../context/AlertContext';

const { width } = Dimensions.get('window');

export function CustomAlert() {
  const { alert, visible, hideAlert } = useAlert();

  if (!alert) return null;

  const { title, message, type = 'info', buttons = [] } = alert;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 color={Colors.dark.accent} size={48} />;
      case 'error': return <AlertCircle color="#FF4D4D" size={48} />;
      case 'warning': return <AlertTriangle color="#FFB800" size={48} />;
      default: return <Info color={Colors.dark.accent} size={48} />;
    }
  };

  const defaultButtons = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: hideAlert }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(200)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdrop} onPress={hideAlert} />
        </Animated.View>

        <Animated.View 
          entering={ZoomIn.duration(300)}
          exiting={ZoomOut.duration(200)}
          style={styles.alertContainer}
        >
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>

          <Text style={styles.title}>{title.toUpperCase()}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {defaultButtons.map((btn, index) => (
              <Pressable
                key={index}
                style={[
                  styles.button,
                  btn.style === 'cancel' && styles.buttonCancel,
                  btn.style === 'destructive' && styles.buttonDestructive,
                  index > 0 && styles.buttonMarginTop
                ]}
                onPress={() => {
                  if (btn.onPress) btn.onPress();
                  hideAlert();
                }}
              >
                <Text style={[
                  styles.buttonText,
                  btn.style === 'cancel' && styles.buttonTextCancel
                ]}>
                  {btn.text.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Close affordance */}
          <Pressable style={styles.closeIcon} onPress={hideAlert}>
            <X color="rgba(255,255,255,0.3)" size={20} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  alertContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1A1A1B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 20,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
  },
  message: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonMarginTop: {
    marginTop: 12,
  },
  buttonCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buttonDestructive: {
    backgroundColor: '#FF4D4D',
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  buttonTextCancel: {
    color: '#FFF',
  },
  closeIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
});
