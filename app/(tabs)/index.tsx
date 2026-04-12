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
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby, Companion } from '@/types/database';
import { isPremiumUser, getOfferings, purchasePackage, restorePurchases } from '@/lib/revenuecat';
import { GradientBackground } from '@/components/GradientBackground';
import { useUserContext } from '@/lib/user-context';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface BabyAction {
  icon: IoniconName;
  label: string;
  route: string;
}

const BABY_ACTIONS: BabyAction[] = [
  { icon: 'calendar-outline',       label: 'Agendas',     route: '/(tabs)/schedules' },
  { icon: 'trending-up-outline',    label: 'Crescimento', route: '/(tabs)/weight' },
  { icon: 'cafe-outline',           label: 'Mamadas',     route: '/(tabs)/feedings' },
  { icon: 'today-outline',          label: 'Calendário',  route: '/(tabs)/calendario' },
  { icon: 'home-outline',           label: 'Visitas',     route: '/(tabs)/visits' },
  { icon: 'person-outline',         label: 'Editar bebê', route: '/(tabs)/baby' },
];

export default function HomeScreen() {
  const { effectiveUserId } = useUserContext();

  const [baby, setBaby] = useState<Baby | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const [babyExpanded, setBabyExpanded] = useState(true);
  const [companionsExpanded, setCompanionsExpanded] = useState(false);

  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [showCompanionMenu, setShowCompanionMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (effectiveUserId) loadData();
  }, [effectiveUserId]);

  const loadData = async () => {
    if (!effectiveUserId) return;
    try {
      const [{ data: babyData }, { data: companionsData }] = await Promise.all([
        supabase.from('babies').select('*').eq('user_id', effectiveUserId).single(),
        supabase
          .from('companions')
          .select('*')
          .eq('user_id', effectiveUserId)
          .order('created_at', { ascending: true }),
      ]);

      setBaby(babyData);
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
        const { error } = await supabase.from('companions').delete().eq('id', companion.id);
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
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Bem-vindo ao</Text>
            <Text style={styles.title}>Lado a Lado</Text>
          </View>
          <TouchableOpacity onPress={() => setShowUserMenu(true)} style={styles.userMenuButton}>
            <Text style={styles.userMenuText}>⋯</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>

          {/* ── Seção Bebê ── */}
          {baby ? (
            <View style={styles.section}>
              {/* Cabeçalho da seção — toggle */}
              <TouchableOpacity
                style={styles.sectionToggle}
                activeOpacity={0.75}
                onPress={() => setBabyExpanded(v => !v)}
              >
                <View style={styles.sectionToggleLeft}>
                  <View style={styles.sectionAvatar}>
                    <Ionicons name="happy-outline" size={24} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.sectionEyebrow}>Bebê</Text>
                    <Text style={styles.sectionName}>{baby.name || 'Sem nome'}</Text>
                  </View>
                </View>
                <Ionicons
                  name={babyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textTertiary}
                />
              </TouchableOpacity>

              {/* Grid de ícones */}
              {babyExpanded && (
                <View style={styles.iconGrid}>
                  {BABY_ACTIONS.map(action => (
                    <TouchableOpacity
                      key={action.route}
                      style={styles.iconTile}
                      activeOpacity={0.8}
                      onPress={() => router.push(action.route as any)}
                    >
                      <View style={styles.iconBadge}>
                        <Ionicons name={action.icon} size={28} color={Colors.primary} />
                      </View>
                      <Text style={styles.iconTileLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyBabyCard}>
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

          {/* ── Seção Acompanhantes ── */}
          <View style={styles.section}>
            {/* Cabeçalho da seção — toggle */}
            <TouchableOpacity
              style={styles.sectionToggle}
              activeOpacity={0.75}
              onPress={() => setCompanionsExpanded(v => !v)}
            >
              <View style={styles.sectionToggleLeft}>
                <View style={[styles.sectionAvatar, styles.sectionAvatarMint]}>
                  <Ionicons name="people-outline" size={24} color={Colors.secondary} />
                </View>
                <View>
                  <Text style={styles.sectionEyebrow}>Seção</Text>
                  <Text style={[styles.sectionName, styles.sectionNameMint]}>Acompanhantes</Text>
                </View>
              </View>
              <Ionicons
                name={companionsExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>

            {/* Grid de acompanhantes */}
            {companionsExpanded && (
              <View style={styles.iconGrid}>
                {companions.map(companion => (
                  <TouchableOpacity
                    key={companion.id}
                    style={[styles.iconTile, styles.iconTileMint]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedCompanion(companion);
                      setShowCompanionMenu(true);
                    }}
                  >
                    <View style={styles.companionAvatarLarge}>
                      <Text style={styles.companionAvatarText}>
                        {companion.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.iconTileLabel} numberOfLines={2}>{companion.name}</Text>
                  </TouchableOpacity>
                ))}

                {/* Tile de adicionar */}
                <TouchableOpacity
                  style={[styles.iconTile, styles.iconTileAdd]}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/companion/new')}
                >
                  <View style={[styles.iconBadge, styles.iconBadgeMint]}>
                    <Ionicons name="add" size={28} color={Colors.secondary} />
                  </View>
                  <Text style={[styles.iconTileLabel, styles.iconTileAddLabel]}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

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

        {/* Menu do usuário */}
        <Modal
          visible={showUserMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUserMenu(false)}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setShowUserMenu(false)}
          >
            <BlurView intensity={80} tint="light" style={styles.menuContent}>
              <View style={styles.menuHandle} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => { setShowUserMenu(false); router.push('/(tabs)/profile'); }}
              >
                <Text style={styles.menuItemText}>Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={() => { setShowUserMenu(false); handleLogout(); }}
              >
                <Text style={styles.menuItemDangerText}>Sair</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemCancel]}
                onPress={() => setShowUserMenu(false)}
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  userMenuButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  userMenuText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Content ──
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 12,
  },

  // ── Section ──
  section: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    overflow: 'hidden',
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.cardPrimary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionAvatarMint: {
    backgroundColor: Colors.cardMint,
    borderColor: Colors.borderMint,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  sectionName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  // ── Icon Grid ──
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  iconTile: {
    width: '48%',
    height: 110,
    backgroundColor: Colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  iconTileMint: {
    backgroundColor: Colors.cardMint,
    borderColor: Colors.borderMint,
  },
  iconTileAdd: {
    borderStyle: 'dashed',
    borderColor: Colors.secondary,
    backgroundColor: 'transparent',
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.cardPrimary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadgeMint: {
    backgroundColor: Colors.cardMint,
    borderColor: Colors.borderMint,
  },
  iconTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  iconTileAddLabel: {
    color: Colors.secondary,
  },

  // ── Companion Avatar (large) ──
  companionAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },

  sectionNameMint: {
    color: Colors.secondary,
  },

  // ── Empty baby card ──
  emptyBabyCard: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyCardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
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
