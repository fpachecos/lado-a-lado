import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

export default function TimePicker({
  value,
  onChange,
  label,
}: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempHour, setTempHour] = useState(value.getHours().toString().padStart(2, '0'));
  const [tempMinute, setTempMinute] = useState(value.getMinutes().toString().padStart(2, '0'));
  const [hourText, setHourText] = useState('');
  const [minuteText, setMinuteText] = useState('');
  const hourInputRef = useRef<TextInput>(null);
  const minuteInputRef = useRef<TextInput>(null);

  const handleConfirm = () => {
    const newDate = new Date(value);
    newDate.setHours(parseInt(tempHour) || 0);
    newDate.setMinutes(parseInt(tempMinute) || 0);
    onChange(newDate);
    setShowPicker(false);
    setHourText('');
    setMinuteText('');
  };

  const handleCancel = () => {
    setTempHour(value.getHours().toString().padStart(2, '0'));
    setTempMinute(value.getMinutes().toString().padStart(2, '0'));
    setShowPicker(false);
    setHourText('');
    setMinuteText('');
  };

  return (
    <>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => {
          setTempHour(value.getHours().toString().padStart(2, '0'));
          setTempMinute(value.getMinutes().toString().padStart(2, '0'));
          setHourText(value.getHours().toString().padStart(2, '0'));
          setMinuteText(value.getMinutes().toString().padStart(2, '0'));
          setShowPicker(true);
        }}
      >
        <Text style={styles.timeButtonText}>
          {format(value, 'HH:mm')}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <BlurView intensity={80} tint="light" style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecionar Horário</Text>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scrollContent}
                >
                  <View style={styles.timeInputs}>
                    <View style={styles.timeInputGroup}>
                      <Text style={styles.inputLabel}>Hora</Text>
                      <TextInput
                        ref={hourInputRef}
                        style={styles.timeInput}
                        value={hourText || tempHour}
                        onChangeText={(text) => {
                          // Permitir apenas números
                          const numericText = text.replace(/[^0-9]/g, '');
                          setHourText(numericText);
                          if (numericText.length > 0) {
                            const hour = Math.min(Math.max(parseInt(numericText) || 0, 0), 23);
                            setTempHour(hour.toString().padStart(2, '0'));
                          }
                        }}
                        onFocus={() => {
                          setHourText(tempHour);
                        }}
                        onBlur={() => {
                          if (hourText) {
                            const hour = Math.min(Math.max(parseInt(hourText) || 0, 0), 23);
                            setTempHour(hour.toString().padStart(2, '0'));
                            setHourText(hour.toString().padStart(2, '0'));
                          } else {
                            setHourText('');
                          }
                        }}
                        selectTextOnFocus={true}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>

                    <Text style={styles.separator}>:</Text>

                    <View style={styles.timeInputGroup}>
                      <Text style={styles.inputLabel}>Minuto</Text>
                      <TextInput
                        ref={minuteInputRef}
                        style={styles.timeInput}
                        value={minuteText || tempMinute}
                        onChangeText={(text) => {
                          // Permitir apenas números
                          const numericText = text.replace(/[^0-9]/g, '');
                          setMinuteText(numericText);
                          if (numericText.length > 0) {
                            const minute = Math.min(Math.max(parseInt(numericText) || 0, 0), 59);
                            setTempMinute(minute.toString().padStart(2, '0'));
                          }
                        }}
                        onFocus={() => {
                          setMinuteText(tempMinute);
                        }}
                        onBlur={() => {
                          if (minuteText) {
                            const minute = Math.min(Math.max(parseInt(minuteText) || 0, 0), 59);
                            setTempMinute(minute.toString().padStart(2, '0'));
                            setMinuteText(minute.toString().padStart(2, '0'));
                          } else {
                            setMinuteText('');
                          }
                        }}
                        selectTextOnFocus={true}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleCancel();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleConfirm();
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  timeButton: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  timeButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.glassDark,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    maxHeight: '60%',
    minHeight: 300,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeInputGroup: {
    width: 100,
    marginHorizontal: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeInput: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    textAlign: 'center',
    fontSize: 24,
    color: Colors.text,
    fontWeight: '600',
  },
  separator: {
    fontSize: 32,
    color: Colors.text,
    marginTop: 20,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

