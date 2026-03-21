import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { Colors } from '@/constants/Colors';

interface Props {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function MarkdownEditor({ value, onChange, placeholder, minHeight = 120 }: Props) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef<TextInput>(null);

  const wrapSelection = (before: string, after: string, defaultWord: string) => {
    const { start, end } = selection;
    const selected = value.substring(start, end);
    const replacement =
      selected.length > 0
        ? `${before}${selected}${after}`
        : `${before}${defaultWord}${after}`;
    const newText = value.substring(0, start) + replacement + value.substring(end);
    onChange(newText);
    inputRef.current?.focus();
  };

  const insertAtLineStart = (prefix: string) => {
    const { start } = selection;
    const beforeCursor = value.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const lineAlreadyHasPrefix = value.substring(lineStart).startsWith(prefix);
    if (lineAlreadyHasPrefix) {
      const newText = value.substring(0, lineStart) + value.substring(lineStart + prefix.length);
      onChange(newText);
    } else {
      const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
      onChange(newText);
    }
    inputRef.current?.focus();
  };

  return (
    <View>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => wrapSelection('**', '**', 'negrito')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toolbarButtonText, { fontWeight: 'bold' }]}>N</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => wrapSelection('*', '*', 'itálico')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toolbarButtonText, { fontStyle: 'italic' }]}>I</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => insertAtLineStart('- ')}
          activeOpacity={0.7}
        >
          <Text style={styles.toolbarButtonText}>• Lista</Text>
        </TouchableOpacity>
        <View style={styles.toolbarHint}>
          <Text style={styles.toolbarHintText}>Selecione texto e toque para formatar</Text>
        </View>
      </View>
      <TextInput
        ref={inputRef}
        style={[styles.input, { minHeight }]}
        value={value}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
          setSelection(e.nativeEvent.selection);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.glass,
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.glassBorder,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.glassDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  toolbarButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  toolbarHint: {
    flex: 1,
    alignItems: 'flex-end',
  },
  toolbarHintText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    color: Colors.text,
    fontFamily: undefined,
  },
});
