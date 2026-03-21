import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Companion, CompanionActivity } from '@/types/database';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function CompanionActivitiesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [activities, setActivities] = useState<CompanionActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de edição/criação
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CompanionActivity | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modo de reordenação
  const [reorderMode, setReorderMode] = useState(false);
  const [movingIndex, setMovingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [{ data: companionData, error: companionError }, { data: activitiesData, error: activitiesError }] =
        await Promise.all([
          supabase.from('companions').select('*').eq('id', id).single(),
          supabase
            .from('companion_activities')
            .select('*')
            .eq('companion_id', id)
            .order('position', { ascending: true }),
        ]);

      if (companionError) throw companionError;
      if (activitiesError) throw activitiesError;

      setCompanion(companionData);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      Alert.alert('Erro', 'Não foi possível carregar as atividades');
    } finally {
      setLoading(false);
    }
  };

  const openNewActivity = () => {
    setEditingActivity(null);
    setEditContent('');
    setShowModal(true);
  };

  const openEditActivity = (activity: CompanionActivity) => {
    setEditingActivity(activity);
    setEditContent(activity.content);
    setShowModal(true);
  };

  const handleSaveActivity = async () => {
    if (!editContent.trim()) {
      Alert.alert('Erro', 'A atividade não pode estar vazia');
      return;
    }

    setSaving(true);
    try {
      if (editingActivity) {
        const { error } = await supabase
          .from('companion_activities')
          .update({ content: editContent.trim() })
          .eq('id', editingActivity.id);

        if (error) throw error;
      } else {
        const nextPosition = activities.length > 0
          ? Math.max(...activities.map(a => a.position)) + 1
          : 0;

        const { error } = await supabase
          .from('companion_activities')
          .insert({
            companion_id: id,
            content: editContent.trim(),
            position: nextPosition,
          });

        if (error) throw error;
      }

      setShowModal(false);
      await loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar a atividade');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompleted = async (activity: CompanionActivity) => {
    setTogglingId(activity.id);
    setActivities(prev =>
      prev.map(a => a.id === activity.id ? { ...a, completed: !a.completed } : a)
    );
    try {
      const { error } = await supabase
        .from('companion_activities')
        .update({ completed: !activity.completed })
        .eq('id', activity.id);

      if (error) {
        setActivities(prev =>
          prev.map(a => a.id === activity.id ? { ...a, completed: activity.completed } : a)
        );
        throw error;
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível atualizar a atividade');
    } finally {
      setTogglingId(null);
    }
  };

  const moveActivity = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= activities.length) return;
    setMovingIndex(fromIndex);

    const newActivities = [...activities];
    const [moved] = newActivities.splice(fromIndex, 1);
    newActivities.splice(toIndex, 0, moved);

    // Reatribui positions sequencialmente
    const updated = newActivities.map((a, i) => ({ ...a, position: i }));
    setActivities(updated);

    try {
      await Promise.all(
        updated.map(a =>
          supabase
            .from('companion_activities')
            .update({ position: a.position })
            .eq('id', a.id)
        )
      );
    } catch (error: any) {
      // Reverte em caso de erro
      setActivities(activities);
      Alert.alert('Erro', 'Não foi possível reordenar as atividades');
    } finally {
      setMovingIndex(null);
    }
  };

  const handleDeleteActivity = (activity: CompanionActivity) => {
    const doDelete = async () => {
      try {
        const { error } = await supabase
          .from('companion_activities')
          .delete()
          .eq('id', activity.id);

        if (error) throw error;
        await loadData();
      } catch (error: any) {
        Alert.alert('Erro', error.message || 'Não foi possível excluir a atividade');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja excluir esta atividade?')) {
        doDelete();
      }
    } else {
      Alert.alert('Excluir Atividade', 'Deseja excluir esta atividade?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (reorderMode) {
                setReorderMode(false);
              } else {
                router.canGoBack() ? router.back() : router.replace('/(tabs)');
              }
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Atividades</Text>
            {companion && (
              <Text style={styles.subtitle}>{companion.name}</Text>
            )}
          </View>

          {activities.length >= 2 && (
            <TouchableOpacity
              style={[styles.reorderToggleButton, reorderMode && styles.reorderToggleButtonActive]}
              onPress={() => setReorderMode(prev => !prev)}
            >
              <Text style={[styles.reorderToggleText, reorderMode && styles.reorderToggleTextActive]}>
                {reorderMode ? 'Concluído' : '⇅ Ordenar'}
              </Text>
            </TouchableOpacity>
          )}

          {!reorderMode && activities.length < 2 && <View style={styles.headerSpacer} />}
        </View>

        {reorderMode && (
          <View style={styles.reorderHint}>
            <Text style={styles.reorderHintText}>
              Use as setas para reordenar as atividades
            </Text>
          </View>
        )}

        <View style={styles.content}>
          {activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nenhuma atividade cadastrada</Text>
              <Text style={styles.emptyHint}>
                Adicione atividades usando o botão abaixo
              </Text>
            </View>
          ) : (
            activities.map((activity, index) => (
              <View
                key={activity.id}
                style={[
                  styles.activityCard,
                  activity.completed && !reorderMode && styles.activityCardCompleted,
                  reorderMode && styles.activityCardReorder,
                ]}
              >
                {reorderMode ? (
                  // --- Modo reordenação ---
                  <View style={styles.reorderRow}>
                    <View style={styles.reorderArrows}>
                      <TouchableOpacity
                        style={[styles.arrowButton, index === 0 && styles.arrowButtonDisabled]}
                        onPress={() => moveActivity(index, index - 1)}
                        disabled={index === 0 || movingIndex !== null}
                      >
                        <Text style={[styles.arrowText, index === 0 && styles.arrowTextDisabled]}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.arrowButton, index === activities.length - 1 && styles.arrowButtonDisabled]}
                        onPress={() => moveActivity(index, index + 1)}
                        disabled={index === activities.length - 1 || movingIndex !== null}
                      >
                        <Text style={[styles.arrowText, index === activities.length - 1 && styles.arrowTextDisabled]}>↓</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.reorderContent}>
                      <Text style={styles.reorderIndex}>#{index + 1}</Text>
                      <MarkdownRenderer>{activity.content}</MarkdownRenderer>
                    </View>
                    <Text style={styles.dragHandle}>≡</Text>
                  </View>
                ) : (
                  // --- Modo normal ---
                  <>
                    <View style={styles.activityHeader}>
                      <TouchableOpacity
                        style={[styles.checkbox, activity.completed && styles.checkboxChecked]}
                        onPress={() => handleToggleCompleted(activity)}
                        disabled={togglingId === activity.id}
                      >
                        {activity.completed && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                      <Text style={[styles.activityIndex, activity.completed && styles.activityIndexCompleted]}>
                        #{index + 1}
                      </Text>
                      <View style={styles.activityActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openEditActivity(activity)}
                        >
                          <Text style={styles.actionButtonText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonDanger]}
                          onPress={() => handleDeleteActivity(activity)}
                        >
                          <Text style={styles.actionButtonDangerText}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={activity.completed ? styles.completedContentWrapper : undefined}>
                      <MarkdownRenderer style={activity.completed ? styles.completedText : undefined}>
                        {activity.content}
                      </MarkdownRenderer>
                      {activity.completed && (
                        <Text style={styles.completedLabel}>Concluída ✓</Text>
                      )}
                    </View>
                  </>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Botão flutuante para nova atividade — oculto no modo reordenação */}
      {!reorderMode && (
        <TouchableOpacity style={styles.fab} onPress={openNewActivity}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Modal de edição */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="light" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingActivity ? 'Editar Atividade' : 'Nova Atividade'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalLabel}>Conteúdo</Text>
                <MarkdownEditor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Descreva a atividade... (suporta **negrito**, *itálico*, listas)"
                  minHeight={200}
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveActivity}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.text,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  reorderToggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  reorderToggleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  reorderToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  reorderToggleTextActive: {
    color: Colors.white,
  },
  reorderHint: {
    marginHorizontal: 20,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.glassBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  reorderHintText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  emptyCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  activityCardCompleted: {
    backgroundColor: 'rgba(168, 213, 186, 0.2)',
    borderColor: Colors.secondary,
  },
  activityCardReorder: {
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.glass,
  },
  checkboxChecked: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  checkmark: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '700',
    lineHeight: 16,
  },
  activityIndex: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  activityIndexCompleted: {
    color: Colors.secondary,
  },
  completedContentWrapper: {
    opacity: 0.6,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  completedLabel: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 6,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  actionButtonDanger: {
    backgroundColor: Colors.error + '15',
    borderColor: Colors.error + '40',
  },
  actionButtonText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  actionButtonDangerText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '500',
  },
  // Reorder mode styles
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reorderArrows: {
    gap: 4,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonDisabled: {
    backgroundColor: Colors.glass,
    borderColor: Colors.glassBorder,
  },
  arrowText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
    lineHeight: 22,
  },
  arrowTextDisabled: {
    color: Colors.textSecondary,
  },
  reorderContent: {
    flex: 1,
  },
  reorderIndex: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  dragHandle: {
    fontSize: 22,
    color: Colors.textSecondary,
    paddingHorizontal: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: Colors.white,
    lineHeight: 32,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  modalKeyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.glassDark,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalClose: {
    fontSize: 20,
    color: Colors.textSecondary,
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
});
