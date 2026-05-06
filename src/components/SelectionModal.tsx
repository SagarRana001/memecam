import React, { useState } from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  title: string;
  allowAdd?: boolean;
  onAdd?: (newOption: string) => void;
  addPlaceholder?: string;
}

export function SelectionModal({ visible, onClose, options, selected, onSelect, title, allowAdd, onAdd, addPlaceholder = 'Add new...' }: SelectionModalProps) {
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newValue.trim() && onAdd) {
      onAdd(newValue.trim());
      setNewValue('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalOverlayClickable} onPress={onClose}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable onPress={onClose}>
                <X color="#FFF" size={24} />
              </Pressable>
            </View>
            
            {allowAdd && (
              <View style={styles.addInputContainer}>
                <TextInput
                  style={styles.addInput}
                  placeholder={addPlaceholder}
                  placeholderTextColor="#A1A1AA"
                  value={newValue}
                  onChangeText={setNewValue}
                  onSubmitEditing={handleAdd}
                  returnKeyType="done"
                />
                <Pressable 
                  style={[styles.addButton, !newValue.trim() && styles.addButtonDisabled]} 
                  onPress={handleAdd}
                  disabled={!newValue.trim()}
                >
                  <Plus color={newValue.trim() ? '#000' : '#A1A1AA'} size={20} />
                </Pressable>
              </View>
            )}

            <FlatList 
              data={options}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
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
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    maxHeight: '80%',
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
  addInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  addInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
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
