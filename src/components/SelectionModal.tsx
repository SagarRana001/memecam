import React from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  title: string;
}

export function SelectionModal({ visible, onClose, options, selected, onSelect, title }: SelectionModalProps) {
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
