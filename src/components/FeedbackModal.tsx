import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform, TextInput, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useAlert } from '../context/AlertContext';
import { submitFeedback } from '../services/feedbackService';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

export function FeedbackModal({ visible, onClose, userId }: FeedbackModalProps) {
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const success = await submitFeedback(trimmed, userId);
      if (success) {
        showAlert({
          title: 'SUCCESS',
          message: 'Thank you for your feedback! 🔥',
          type: 'success',
          autoDismiss: true,
        });
        setContent('');
        onClose();
      } else {
        showAlert({
          title: 'ERROR',
          message: 'Failed to submit feedback. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      showAlert({
        title: 'ERROR',
        message: 'Something went wrong. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setContent('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalOverlayClickable} onPress={handleClose}>
          <Pressable 
            style={[
              styles.modalContent, 
              { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === 'ios' ? 48 : 32) }
            ]} 
            onPress={(e) => e.stopPropagation()}
          >
            {/* Grab handle at the top */}
            <View style={styles.grabHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>FEEDBACK</Text>
              <Pressable onPress={handleClose} disabled={isSubmitting} style={styles.closeButton}>
                <X color="#FFF" size={24} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.description}>{"We'd love to hear your thoughts!"}</Text>

              <View style={styles.textareaContainer}>
                <TextInput
                  style={styles.textarea}
                  placeholder="Write your feedback here..."
                  placeholderTextColor="#A1A1AA"
                  value={content}
                  onChangeText={(text) => setContent(text.slice(0, 500))}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                  editable={!isSubmitting}
                />
              </View>

              <Text style={styles.charCount}>{content.length}/500</Text>

              <Pressable
                style={[
                  styles.submitButton,
                  (!content.trim() || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!content.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>SUBMIT</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayClickable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    width: '100%',
  },
  grabHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 0,
  },
  description: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  textareaContainer: {
    paddingHorizontal: 24,
  },
  textarea: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    height: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#A1A1AA',
    fontSize: 12,
    textAlign: 'right',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
    fontWeight: '500',
  },
  submitButton: {
    height: 52,
    backgroundColor: Colors.dark.accent,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 24,
    elevation: 4,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 102, 0.2)',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
