import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
}

export default function DatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  label,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  const [dayText, setDayText] = useState('');
  const [monthText, setMonthText] = useState('');
  const [yearText, setYearText] = useState('');
  const dayInputRef = useRef<TextInput>(null);
  const monthInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
    setDayText('');
    setMonthText('');
    setYearText('');
  };

  const handleCancel = () => {
    setTempDate(value);
    setShowPicker(false);
    setDayText('');
    setMonthText('');
    setYearText('');
  };

  const updateDateFromInputs = (newDay: string, newMonth: string, newYear: string) => {
    const day = parseInt(newDay) || tempDate.getDate();
    const month = parseInt(newMonth) || tempDate.getMonth() + 1;
    const year = parseInt(newYear) || tempDate.getFullYear();
    
    const newDate = new Date(year, month - 1, day);
    
    // Validar limites
    if (minimumDate && newDate < minimumDate) {
      setTempDate(new Date(minimumDate));
    } else if (maximumDate && newDate > maximumDate) {
      setTempDate(new Date(maximumDate));
    } else {
      setTempDate(newDate);
    }
  };

  // Para iOS, vamos usar um modal simples com inputs de data
  // Para Android, podemos usar um input de texto ou modal similar
  if (Platform.OS === 'ios') {
    return (
      <>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            setTempDate(value);
            setDayText(value.getDate().toString().padStart(2, '0'));
            setMonthText((value.getMonth() + 1).toString().padStart(2, '0'));
            setYearText(value.getFullYear().toString());
            setShowPicker(true);
          }}
        >
          <Text style={styles.dateButtonText}>
            {format(value, 'dd/MM/yyyy')}
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
                <Text style={styles.modalTitle}>Selecionar Data</Text>

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContent}
                  >
                    <View style={styles.dateInputs}>
                      <View style={styles.dateInputGroup}>
                        <Text style={styles.inputLabel}>Dia</Text>
                        <TextInput
                          ref={dayInputRef}
                          style={styles.dateInput}
                          value={dayText || tempDate.getDate().toString().padStart(2, '0')}
                          onChangeText={(text) => {
                            // Permitir apenas números
                            const numericText = text.replace(/[^0-9]/g, '');
                            setDayText(numericText);
                            if (numericText.length > 0) {
                              updateDateFromInputs(numericText, monthText || (tempDate.getMonth() + 1).toString().padStart(2, '0'), yearText || tempDate.getFullYear().toString());
                            }
                          }}
                          onFocus={() => {
                            setDayText(tempDate.getDate().toString().padStart(2, '0'));
                          }}
                          onBlur={() => {
                            if (dayText) {
                              const day = Math.min(Math.max(parseInt(dayText) || 1, 1), 31);
                              setDayText(day.toString().padStart(2, '0'));
                            } else {
                              setDayText('');
                            }
                          }}
                          selectTextOnFocus={true}
                          keyboardType="number-pad"
                          maxLength={2}
                        />
                      </View>

                      <View style={styles.dateInputGroup}>
                        <Text style={styles.inputLabel}>Mês</Text>
                        <TextInput
                          ref={monthInputRef}
                          style={styles.dateInput}
                          value={monthText || (tempDate.getMonth() + 1).toString().padStart(2, '0')}
                          onChangeText={(text) => {
                            // Permitir apenas números
                            const numericText = text.replace(/[^0-9]/g, '');
                            setMonthText(numericText);
                            if (numericText.length > 0) {
                              updateDateFromInputs(dayText || tempDate.getDate().toString().padStart(2, '0'), numericText, yearText || tempDate.getFullYear().toString());
                            }
                          }}
                          onFocus={() => {
                            setMonthText((tempDate.getMonth() + 1).toString().padStart(2, '0'));
                          }}
                          onBlur={() => {
                            if (monthText) {
                              const month = Math.min(Math.max(parseInt(monthText) || 1, 1), 12);
                              setMonthText(month.toString().padStart(2, '0'));
                            } else {
                              setMonthText('');
                            }
                          }}
                          selectTextOnFocus={true}
                          keyboardType="number-pad"
                          maxLength={2}
                        />
                      </View>

                      <View style={styles.dateInputGroup}>
                        <Text style={styles.inputLabel}>Ano</Text>
                        <TextInput
                          ref={yearInputRef}
                          style={styles.dateInput}
                          value={yearText || tempDate.getFullYear().toString()}
                          onChangeText={(text) => {
                            // Permitir apenas números
                            const numericText = text.replace(/[^0-9]/g, '');
                            setYearText(numericText);
                            if (numericText.length > 0) {
                              updateDateFromInputs(dayText || tempDate.getDate().toString().padStart(2, '0'), monthText || (tempDate.getMonth() + 1).toString().padStart(2, '0'), numericText);
                            }
                          }}
                          onFocus={() => {
                            setYearText(tempDate.getFullYear().toString());
                          }}
                          onBlur={() => {
                            if (yearText) {
                              const year = parseInt(yearText) || new Date().getFullYear();
                              setYearText(year.toString());
                            } else {
                              setYearText('');
                            }
                          }}
                          selectTextOnFocus={true}
                          keyboardType="number-pad"
                          maxLength={4}
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

  // Para Android, usar input de texto com formato de data
  return (
    <>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          setTempDate(value);
          setDayText(value.getDate().toString().padStart(2, '0'));
          setMonthText((value.getMonth() + 1).toString().padStart(2, '0'));
          setYearText(value.getFullYear().toString());
          setShowPicker(true);
        }}
      >
        <Text style={styles.dateButtonText}>
          {format(value, 'dd/MM/yyyy')}
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
                <Text style={styles.modalTitle}>Selecionar Data</Text>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scrollContent}
                >
                  <View style={styles.dateInputs}>
                    <View style={styles.dateInputGroup}>
                      <Text style={styles.inputLabel}>Dia</Text>
                      <TextInput
                        ref={dayInputRef}
                        style={styles.dateInput}
                        value={dayText || tempDate.getDate().toString().padStart(2, '0')}
                        onChangeText={(text) => {
                          // Permitir apenas números
                          const numericText = text.replace(/[^0-9]/g, '');
                          setDayText(numericText);
                          if (numericText.length > 0) {
                            updateDateFromInputs(numericText, monthText || (tempDate.getMonth() + 1).toString().padStart(2, '0'), yearText || tempDate.getFullYear().toString());
                          }
                        }}
                        onFocus={() => {
                          setDayText(tempDate.getDate().toString().padStart(2, '0'));
                        }}
                        onBlur={() => {
                          if (dayText) {
                            const day = Math.min(Math.max(parseInt(dayText) || 1, 1), 31);
                            setDayText(day.toString().padStart(2, '0'));
                          } else {
                            setDayText('');
                          }
                        }}
                        selectTextOnFocus={true}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>

                    <View style={styles.dateInputGroup}>
                      <Text style={styles.inputLabel}>Mês</Text>
                      <TextInput
                        ref={monthInputRef}
                        style={styles.dateInput}
                        value={monthText || (tempDate.getMonth() + 1).toString().padStart(2, '0')}
                        onChangeText={(text) => {
                          // Permitir apenas números
                          const numericText = text.replace(/[^0-9]/g, '');
                          setMonthText(numericText);
                          if (numericText.length > 0) {
                            updateDateFromInputs(dayText || tempDate.getDate().toString().padStart(2, '0'), numericText, yearText || tempDate.getFullYear().toString());
                          }
                        }}
                        onFocus={() => {
                          setMonthText((tempDate.getMonth() + 1).toString().padStart(2, '0'));
                        }}
                        onBlur={() => {
                          if (monthText) {
                            const month = Math.min(Math.max(parseInt(monthText) || 1, 1), 12);
                            setMonthText(month.toString().padStart(2, '0'));
                          } else {
                            setMonthText('');
                          }
                        }}
                        selectTextOnFocus={true}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>

                    <View style={styles.dateInputGroup}>
                      <Text style={styles.inputLabel}>Ano</Text>
                      <TextInput
                        ref={yearInputRef}
                        style={styles.dateInput}
                        value={yearText || tempDate.getFullYear().toString()}
                        onChangeText={(text) => {
                          // Permitir apenas números
                          const numericText = text.replace(/[^0-9]/g, '');
                          setYearText(numericText);
                          if (numericText.length > 0) {
                            updateDateFromInputs(dayText || tempDate.getDate().toString().padStart(2, '0'), monthText || (tempDate.getMonth() + 1).toString().padStart(2, '0'), numericText);
                          }
                        }}
                        onFocus={() => {
                          setYearText(tempDate.getFullYear().toString());
                        }}
                        onBlur={() => {
                          if (yearText) {
                            const year = parseInt(yearText) || new Date().getFullYear();
                            setYearText(year.toString());
                          } else {
                            setYearText('');
                          }
                        }}
                        selectTextOnFocus={true}
                        keyboardType="number-pad"
                        maxLength={4}
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
  dateButton: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  dateButtonText: {
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
  dateInputs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  dateInputGroup: {
    flex: 1,
    marginHorizontal: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  dateInput: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    textAlign: 'center',
    fontSize: 16,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
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

