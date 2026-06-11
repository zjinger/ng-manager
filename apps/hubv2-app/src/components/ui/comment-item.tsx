import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { Avatar } from './avatar';

interface CommentItemProps extends ViewProps {
  author: string;
  content: string;
  time: string;
  avatar?: string;
}

export function CommentItem({
  author,
  content,
  time,
  avatar,
  style,
  ...props
}: CommentItemProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          padding: 16,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.divider,
        },
        style,
      ]}
      {...props}
    >
      <Avatar name={author} size="sm" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{author}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>{time}</Text>
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4, lineHeight: 20 }}>
          {content}
        </Text>
      </View>
    </View>
  );
}
