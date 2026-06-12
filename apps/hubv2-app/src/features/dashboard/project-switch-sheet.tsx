import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useTheme } from '@/providers/theme-provider';
import type { MobileProjectSummary } from './dashboard-service';

type FeatherName = keyof typeof Feather.glyphMap;

export function ProjectSwitchSheet({
  isOpen,
  projects,
  selectedProjectId,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  projects: MobileProjectSummary[];
  selectedProjectId: string | null;
  onClose: () => void;
  onSelect: (projectId: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="48%">
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>切换项目</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              选择本次移动端关注的项目
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="关闭项目切换"
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.surfaceElevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="x" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            {projects.length === 0 && <InlineEmpty title="暂无可访问项目" icon="folder" />}
            {projects.map((project) => {
              const selected = project.id === selectedProjectId;
              const code = project.displayCode || project.projectKey.slice(0, 2).toUpperCase();

              return (
                <TouchableOpacity
                  key={project.id}
                  onPress={() => onSelect(project.id)}
                  activeOpacity={0.82}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primary + '10' : theme.surface,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: selected ? theme.primary : theme.surfaceElevated,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? theme.onPrimary : theme.textSecondary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {code}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {project.projectKey}
                    </Text>
                  </View>
                  {selected && <Feather name="check-circle" size={18} color={theme.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function InlineEmpty({ title, icon }: { title: string; icon: FeatherName }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Feather name={icon} size={22} color={theme.textMuted} />
      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{title}</Text>
    </View>
  );
}
