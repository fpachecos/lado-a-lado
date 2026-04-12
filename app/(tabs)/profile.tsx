import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { UserInvite } from '@/types/database';

export default function ProfileScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Senha ──────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Convites ────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // ── Excluir conta ──────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');
      setName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      loadInvites(user.id);
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = useCallback(async (uid: string) => {
    setLoadingInvites(true);
    try {
      const { data } = await supabase
        .from('user_invites')
        .select('*')
        .eq('inviter_id', uid)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      setInvites((data as UserInvite[]) ?? []);
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  const handleSendInvite = async () => {
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      showAlert('E-mail inválido', 'Digite um endereço de e-mail válido.');
      return;
    }

    setSendingInvite(true);
    try {
      const { error } = await supabase.functions.invoke('send-invite', {
        body: { inviteeEmail: trimmed },
      });

      if (error) {
        // Edge Function errors come back as FunctionsHttpError with a JSON body
        let msg = 'Não foi possível enviar o convite.';
        try {
          const parsed = await (error as any).context?.json?.();
          if (parsed?.error) msg = parsed.error;
        } catch {
          if (error.message) msg = error.message;
        }
        throw new Error(msg);
      }

      setInviteEmail('');
      showAlert('Convite enviado!', `Um e-mail de convite foi enviado para ${trimmed}.`);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) loadInvites(user.id);
    } catch (err: any) {
      showAlert('Erro', err.message || 'Não foi possível enviar o convite.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (invite: UserInvite) => {
    setResendingInviteId(invite.id);
    try {
      const { error } = await supabase.functions.invoke('send-invite', {
        body: { inviteeEmail: invite.invitee_email },
      });

      if (error) {
        let msg = 'Não foi possível reenviar o convite.';
        try {
          const parsed = await (error as any).context?.json?.();
          if (parsed?.error) msg = parsed.error;
        } catch {
          if (error.message) msg = error.message;
        }
        throw new Error(msg);
      }

      showAlert('Convite reenviado!', `O convite foi reenviado para ${invite.invitee_email}.`);
    } catch (err: any) {
      showAlert('Erro', err.message || 'Não foi possível reenviar o convite.');
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleRevokeInvite = async (invite: UserInvite) => {
    const confirmRevoke = () => {
      revokeInvite(invite.id);
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Revogar acesso de ${invite.invitee_email}?\n\nEssa pessoa não poderá mais acessar os dados da conta.`,
      );
      if (confirmed) revokeInvite(invite.id);
    } else {
      Alert.alert(
        'Revogar acesso',
        `Revogar acesso de ${invite.invitee_email}?\n\nEssa pessoa não poderá mais acessar os dados da conta.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Revogar', style: 'destructive', onPress: confirmRevoke },
        ],
      );
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('user_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);

      if (error) throw error;

      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      showAlert('Erro', err.message || 'Não foi possível revogar o convite.');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showAlert('Senha inválida', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Senhas diferentes', 'A nova senha e a confirmação não coincidem.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      showAlert('Senha alterada', 'Sua senha foi atualizada com sucesso.');
    } catch (error: any) {
      showAlert('Erro', error.message || 'Não foi possível alterar a senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'excluir') {
      showAlert('Confirmação inválida', 'Digite "excluir" para confirmar.');
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase.schema('public').rpc('delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
      setShowDeleteModal(false);
      router.replace('/(auth)/login');
    } catch (error: any) {
      showAlert('Erro', error.message || 'Não foi possível excluir a conta.');
    } finally {
      setDeleting(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </View>
    );
  }

  const initials = name
    ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : email.charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.eyebrow}>CONFIGURAÇÕES</Text>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {name ? <Text style={styles.displayName}>{name}</Text> : null}
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Informações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações da conta</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{email}</Text>
          </View>

          {name ? (
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Nome</Text>
              <Text style={styles.infoValue}>{name}</Text>
            </View>
          ) : null}
        </View>

        {/* Convites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Convites</Text>
          <Text style={styles.inviteDescription}>
            Convide alguém pelo e-mail para acessar o app com os dados da sua conta.
          </Text>

          {/* Formulário de novo convite */}
          <View style={styles.inviteForm}>
            <TextInput
              style={styles.inviteInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="E-mail do convidado"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.inviteButton, sendingInvite && styles.inviteButtonDisabled]}
              onPress={handleSendInvite}
              disabled={sendingInvite}
            >
              {sendingInvite
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.inviteButtonText}>Convidar</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Lista de convites */}
          {loadingInvites ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
          ) : invites.length > 0 ? (
            <View style={styles.invitesList}>
              <Text style={styles.invitesListTitle}>Acessos ativos e pendentes</Text>
              {invites.map((invite) => (
                <View key={invite.id} style={styles.inviteItem}>
                  <View style={styles.inviteItemInfo}>
                    <Text style={styles.inviteItemEmail} numberOfLines={1}>
                      {invite.invitee_email}
                    </Text>
                    <View style={[
                      styles.inviteStatusBadge,
                      invite.status === 'accepted' && styles.inviteStatusAccepted,
                    ]}>
                      <Text style={[
                        styles.inviteStatusText,
                        invite.status === 'accepted' && styles.inviteStatusTextAccepted,
                      ]}>
                        {invite.status === 'accepted' ? 'Ativo' : 'Pendente'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inviteActions}>
                    {invite.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.resendButton}
                        onPress={() => handleResendInvite(invite)}
                        disabled={resendingInviteId === invite.id}
                      >
                        {resendingInviteId === invite.id
                          ? <ActivityIndicator color={Colors.primary} size="small" />
                          : <Text style={styles.resendButtonText}>Reenviar</Text>
                        }
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.revokeButton}
                      onPress={() => handleRevokeInvite(invite)}
                    >
                      <Text style={styles.revokeButtonText}>Revogar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Senha */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança</Text>

          {!showPasswordForm ? (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowPasswordForm(true)}
            >
              <Text style={styles.actionRowText}>Alterar senha</Text>
              <Text style={styles.actionRowChevron}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.passwordForm}>
              <Text style={styles.fieldLabel}>Nova senha</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Confirmar nova senha</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Repita a nova senha"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
              />

              <View style={styles.passwordActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, savingPassword && styles.saveButtonDisabled]}
                  onPress={handleChangePassword}
                  disabled={savingPassword}
                >
                  {savingPassword
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveButtonText}>Salvar senha</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Zona de perigo */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>Zona de perigo</Text>
          <Text style={styles.dangerDescription}>
            Excluir sua conta remove permanentemente todos os seus dados, incluindo bebê, agendas, visitas e acompanhantes. Esta ação não pode ser desfeita.
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteModal(true)}
          >
            <Text style={styles.deleteButtonText}>Excluir minha conta</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de confirmação de exclusão */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => !deleting && setShowDeleteModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <BlurView intensity={80} tint="light" style={styles.modalContent}>
                <View style={styles.modalHandle} />

                <Text style={styles.modalTitle}>Excluir conta</Text>
                <Text style={styles.modalDescription}>
                  Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.
                </Text>
                <Text style={styles.modalDescription}>
                  Para confirmar, digite{' '}
                  <Text style={styles.modalConfirmWord}>excluir</Text>
                  {' '}abaixo:
                </Text>

                <TextInput
                  style={styles.confirmInput}
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  placeholder="excluir"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[
                    styles.confirmDeleteButton,
                    (deleting || deleteConfirmText.toLowerCase() !== 'excluir') && styles.confirmDeleteButtonDisabled,
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText.toLowerCase() !== 'excluir'}
                >
                  {deleting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.confirmDeleteButtonText}>Excluir definitivamente</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={deleting}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </BlurView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '600',
  },
  headerTitles: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },

  // ── Content ──
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  // ── Avatar ──
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // ── Section ──
  section: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  dangerSection: {
    borderColor: 'rgba(224, 52, 40, 0.2)',
    backgroundColor: 'rgba(224, 52, 40, 0.04)',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },

  // ── Info rows ──
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderWarm,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },

  // ── Invites ──
  inviteDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  inviteForm: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inviteInput: {
    flex: 1,
    backgroundColor: Colors.glass,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  inviteButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  invitesList: {
    marginTop: 18,
  },
  invitesListTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderWarm,
    gap: 10,
  },
  inviteItemInfo: {
    flex: 1,
    gap: 4,
  },
  inviteItemEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  inviteStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: 'rgba(160, 144, 128, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(160, 144, 128, 0.3)',
  },
  inviteStatusAccepted: {
    backgroundColor: 'rgba(24, 133, 74, 0.1)',
    borderColor: 'rgba(24, 133, 74, 0.3)',
  },
  inviteStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
  },
  inviteStatusTextAccepted: {
    color: Colors.success,
  },
  inviteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    minWidth: 32,
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(224, 52, 40, 0.3)',
  },
  revokeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
  },

  // ── Action row ──
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionRowText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  actionRowChevron: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: '400',
  },

  // ── Password form ──
  passwordForm: {
    paddingTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: Colors.glass,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Danger zone ──
  dangerDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
  },

  // ── Delete modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.glassDark,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  modalConfirmWord: {
    fontWeight: '700',
    color: Colors.error,
  },
  confirmInput: {
    backgroundColor: Colors.glass,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: 'rgba(224, 52, 40, 0.3)',
    marginTop: 8,
    marginBottom: 16,
  },
  confirmDeleteButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmDeleteButtonDisabled: {
    opacity: 0.4,
  },
  confirmDeleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  modalCancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
