import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby, VisitSchedule, Companion } from '@/types/database';
import { isPremiumUser, getOfferings, purchasePackage, restorePurchases } from '@/lib/revenuecat';

export default function HomeScreen() {
  const [baby, setBaby] = useState<Baby | null>(null);
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showBabyMenu, setShowBabyMenu] = useState(false);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [showCompanionMenu, setShowCompanionMenu] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: babyData }, { data: schedulesData }, { data: companionsData }] =
        await Promise.all([
          supabase.from('babies').select('*').eq('user_id', user.id).single(),
          supabase
            .from('visit_schedules')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('companions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
        ]);

      setBaby(babyData);
      setSchedules(schedulesData || []);
      setCompanions(companionsData || []);

      const premium = await isPremiumUser();
      setIsPremium(premium);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Deseja realmente sair?')) {
        await supabase.auth.signOut();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert('Sair', 'Deseja realmente sair?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]);
    }
  };

  const handlePurchase = async () => {
    try {
      const offering = await getOfferings();

      if (!offering || !offering.availablePackages || offering.availablePackages.length === 0) {
        Alert.alert('Indisponível', 'Nenhuma oferta disponível no momento. Tente novamente mais tarde.');
        return;
      }

      const packageToPurchase = offering.availablePackages[0];

      Alert.alert(
        'Confirmar Assinatura',
        `Deseja assinar o plano Premium por ${packageToPurchase.product.priceString}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Assinar',
            onPress: async () => {
              try {
                await purchasePackage(packageToPurchase);
                const premium = await isPremiumUser();
                setIsPremium(premium);
                Alert.alert('Sucesso!', 'Sua assinatura Premium foi ativada com sucesso!', [{ text: 'OK' }]);
                await loadData();
              } catch (error: any) {
                if (error.message === 'Purchase cancelled') return;
                Alert.alert('Erro', error.message || 'Não foi possível processar a compra. Tente novamente.');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar as ofertas. Tente novamente.');
    }
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
      const premium = await isPremiumUser();
      setIsPremium(premium);

      if (premium) {
        Alert.alert('Sucesso', 'Suas compras foram restauradas!');
        await loadData();
      } else {
        Alert.alert('Nenhuma compra encontrada', 'Não encontramos compras para restaurar.');
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível restaurar as compras. Tente novamente.');
    }
  };

  const handleDeleteCompanion = (companion: Companion) => {
    const doDelete = async () => {
      try {
        const { error } = await supabase
          .from('companions')
          .delete()
          .eq('id', companion.id);
        if (error) throw error;
        setCompanions(prev => prev.filter(c => c.id !== companion.id));
      } catch (error: any) {
        Alert.alert('Erro', error.message || 'Não foi possível excluir o acompanhante');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja excluir o acompanhante "${companion.name}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Excluir Acompanhante',
        `Deseja excluir "${companion.name}"? Esta ação também excluirá todas as atividades cadastradas.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Bem-vindo ao</Text>
          <Text style={styles.title}>Lado a Lado</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>

        {/* Card do bebê */}
        {baby ? (
          <TouchableOpacity
            style={styles.babyCard}
            activeOpacity={0.92}
            onPress={() => setShowBabyMenu(true)}
          >
            <View style={styles.babyCardTop}>
              <View style={styles.babyAvatarContainer}>
                <Text style={styles.babyAvatarEmoji}>
                  {baby.gender === 'male' ? '👶' : baby.gender === 'female' ? '👧' : '🍼'}
                </Text>
              </View>
              <View style={styles.babyCardContent}>
                <Text style={styles.cardLabel}>Bebê</Text>
                <Text style={styles.babyName}>{baby.name || 'Sem nome'}</Text>
                {baby.gender && (
                  <Text style={styles.babyGender}>
                    {baby.gender === 'male' ? 'Menino' : 'Menina'}
                  </Text>
                )}
              </View>
              <View style={styles.menuButton}>
                <Text style={styles.menuButtonText}>⋯</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.babyCard}>
            <Text style={styles.cardLabel}>Cadastre seu bebê</Text>
            <Text style={styles.emptyCardText}>
              Adicione as informações do bebê para começar a criar agendas de visitas.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/baby')}
            >
              <Text style={styles.primaryButtonText}>Cadastrar Bebê</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Seção de acompanhantes */}
        {(companions.length > 0 || true) && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Acompanhantes</Text>
          </View>
        )}

        {companions.map(companion => (
          <TouchableOpacity
            key={companion.id}
            style={styles.companionCard}
            activeOpacity={0.88}
            onPress={() => {
              setSelectedCompanion(companion);
              setShowCompanionMenu(true);
            }}
          >
            <View style={styles.companionAvatar}>
              <Text style={styles.companionAvatarText}>
                {companion.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.companionInfo}>
              <Text style={styles.companionName}>{companion.name}</Text>
              <Text style={styles.companionSub}>Acompanhante</Text>
            </View>
            <Text style={styles.menuButtonText}>⋯</Text>
          </TouchableOpacity>
        ))}

        {/* Botão adicionar acompanhante */}
        <TouchableOpacity
          style={styles.addCompanionButton}
          onPress={() => router.push('/(tabs)/companion/new')}
          activeOpacity={0.7}
        >
          <Text style={styles.addCompanionPlus}>+</Text>
          <Text style={styles.addCompanionText}>Adicionar Acompanhante</Text>
        </TouchableOpacity>

        {/* Card premium */}
        {!isPremium && (
          <View style={styles.premiumCard}>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
            <Text style={styles.premiumTitle}>Agendas de múltiplos dias</Text>
            <Text style={styles.premiumText}>
              Crie agendas com vários dias de visita para cada acompanhante.
            </Text>
            <TouchableOpacity style={styles.premiumButton} onPress={handlePurchase}>
              <Text style={styles.premiumButtonText}>Assinar agora</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
              <Text style={styles.restoreButtonText}>Restaurar compras</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Menu do bebê */}
      <Modal
        visible={showBabyMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBabyMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowBabyMenu(false)}
        >
          <BlurView intensity={80} tint="light" style={styles.menuContent}>
            <View style={styles.menuHandle} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowBabyMenu(false); router.push('/(tabs)/baby'); }}
            >
              <Text style={styles.menuItemText}>Editar informações do bebê</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowBabyMenu(false); router.push('/(tabs)/schedules/new'); }}
            >
              <Text style={styles.menuItemText}>Criar agenda de visitas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowBabyMenu(false); router.push('/(tabs)/schedules'); }}
            >
              <Text style={styles.menuItemText}>Ver agendas existentes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowBabyMenu(false); router.push('/(tabs)/visits'); }}
            >
              <Text style={styles.menuItemText}>Acompanhar visitas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowBabyMenu(false)}
            >
              <Text style={styles.menuItemCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
      </Modal>

      {/* Menu do acompanhante */}
      <Modal
        visible={showCompanionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompanionMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowCompanionMenu(false)}
        >
          <BlurView intensity={80} tint="light" style={styles.menuContent}>
            <View style={styles.menuHandle} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowCompanionMenu(false);
                if (selectedCompanion) {
                  router.push(`/(tabs)/companion-activities/${selectedCompanion.id}`);
                }
              }}
            >
              <Text style={styles.menuItemText}>Ver atividades</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowCompanionMenu(false);
                if (selectedCompanion) {
                  router.push(`/(tabs)/companion/${selectedCompanion.id}`);
                }
              }}
            >
              <Text style={styles.menuItemText}>Editar acompanhante</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => {
                setShowCompanionMenu(false);
                if (selectedCompanion) {
                  handleDeleteCompanion(selectedCompanion);
                }
              }}
            >
              <Text style={styles.menuItemDangerText}>Excluir acompanhante</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowCompanionMenu(false)}
            >
              <Text style={styles.menuItemCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
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
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerEyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  logoutButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  logoutText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Content ──
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },

  // ── Baby Card ──
  babyCard: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  babyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  babyAvatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.cardPrimary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyAvatarEmoji: {
    fontSize: 26,
  },
  babyCardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  babyName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  babyGender: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyCardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginVertical: 10,
  },

  // ── Section Header ──
  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Companion Card ──
  companionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.cardMint,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderMint,
    shadowColor: Colors.shadowWarmLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  companionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  companionInfo: {
    flex: 1,
  },
  companionName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  companionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // ── Add Companion ──
  addCompanionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 20,
    paddingVertical: 13,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
  },
  addCompanionPlus: {
    fontSize: 20,
    color: Colors.secondary,
    fontWeight: '700',
    lineHeight: 22,
  },
  addCompanionText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Primary Button ──
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Premium Card ──
  premiumCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  premiumBadge: {
    backgroundColor: Colors.cardPrimary,
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    marginBottom: 14,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  premiumText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  premiumButton: {
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingVertical: 13,
    paddingHorizontal: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  restoreButton: {
    marginTop: 14,
    paddingVertical: 6,
  },
  restoreButtonText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // ── Menu Overlay ──
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: Colors.glassDark,
    borderRadius: 28,
    padding: 8,
    minWidth: 290,
    maxWidth: '88%',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  menuButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: '600',
    lineHeight: 24,
  },
  menuItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral,
  },
  menuItemDanger: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral,
  },
  menuItemCancel: {
    borderBottomWidth: 0,
    marginTop: 4,
    marginBottom: 4,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  menuItemDangerText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '500',
  },
  menuItemCancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
