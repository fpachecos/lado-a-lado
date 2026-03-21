import React from 'react';
import { Text, View, StyleSheet, TextStyle } from 'react-native';

interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

function parseInlineMarkdown(text: string): Segment[] {
  const segments: Segment[] = [];
  // Matches **bold** or *italic*
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true });
    } else {
      segments.push({ text: match[2], italic: true });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

interface Props {
  children: string;
  style?: TextStyle;
}

export default function MarkdownRenderer({ children, style }: Props) {
  const lines = children.split('\n');

  return (
    <View>
      {lines.map((line, lineIndex) => {
        const isBullet = line.startsWith('- ');
        const content = isBullet ? line.slice(2) : line;
        const segments = parseInlineMarkdown(content);

        if (line === '') {
          return <View key={lineIndex} style={styles.emptyLine} />;
        }

        return (
          <View key={lineIndex} style={isBullet ? styles.bulletRow : styles.lineRow}>
            {isBullet && <Text style={[styles.bullet, style]}>{'• '}</Text>}
            <Text style={[styles.lineText, style]}>
              {segments.map((seg, i) => (
                <Text
                  key={i}
                  style={[
                    style,
                    seg.bold ? styles.bold : undefined,
                    seg.italic ? styles.italic : undefined,
                  ]}
                >
                  {seg.text}
                </Text>
              ))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 14,
  },
  lineText: {
    flex: 1,
    fontSize: 14,
    flexWrap: 'wrap',
  },
  emptyLine: {
    height: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
});
