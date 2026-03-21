import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
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
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
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
          <View style={styles.headerSpacer} />
        </View>

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
              <View key={activity.id} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityIndex}>#{index + 1}</Text>
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
                <MarkdownRenderer>{activity.content}</MarkdownRenderer>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Botão flutuante para nova atividade */}
      <TouchableOpacity style={styles.fab} onPress={openNewActivity}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal de edição */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
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

            <ScrollView style={styles.modalBody}>
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
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIndex: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
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
