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

  // Menu do bebê
  const [showBabyMenu, setShowBabyMenu] = useState(false);

  // Menu do acompanhante selecionado
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
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lado a Lado</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Card do bebê */}
        {baby ? (
          <View style={styles.babyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Informações do Bebê</Text>
                <Text style={styles.cardName}>{baby.name || 'Sem nome'}</Text>
                {baby.gender && (
                  <Text style={styles.cardSub}>
                    {baby.gender === 'male' ? '👶 Menino' : '👶 Menina'}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setShowBabyMenu(true)}
              >
                <Text style={styles.menuButtonText}>⋯</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.babyCard}>
            <Text style={styles.cardLabel}>Cadastre seu bebê</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/baby')}
            >
              <Text style={styles.primaryButtonText}>Cadastrar Bebê</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cards de acompanhantes */}
        {companions.map(companion => (
          <View key={companion.id} style={styles.companionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Acompanhante</Text>
                <Text style={styles.cardName}>{companion.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => {
                  setSelectedCompanion(companion);
                  setShowCompanionMenu(true);
                }}
              >
                <Text style={styles.menuButtonText}>⋯</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Botão adicionar acompanhante */}
        <TouchableOpacity
          style={styles.addCompanionButton}
          onPress={() => router.push('/(tabs)/companion/new')}
        >
          <Text style={styles.addCompanionText}>+ Adicionar Acompanhante</Text>
        </TouchableOpacity>

        {!isPremium && (
          <View style={styles.premiumCard}>
            <Text style={styles.premiumTitle}>Upgrade para Premium</Text>
            <Text style={styles.premiumText}>Crie agendas com múltiplos dias</Text>
            <TouchableOpacity style={styles.premiumButton} onPress={handlePurchase}>
              <Text style={styles.premiumButtonText}>Assinar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
              <Text style={styles.restoreButtonText}>Restaurar Compras</Text>
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowBabyMenu(false); router.push('/(tabs)/baby'); }}
            >
              <Text style={styles.menuItemText}>Editar Bebê</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowBabyMenu(false); router.push('/(tabs)/schedules/new'); }}
            >
              <Text style={styles.menuItemText}>Criar Agenda de Visitas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowBabyMenu(false); router.push('/(tabs)/schedules'); }}
            >
              <Text style={styles.menuItemText}>Ver Agendas Existentes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowBabyMenu(false); router.push('/(tabs)/visits'); }}
            >
              <Text style={styles.menuItemText}>Acompanhar Visitas</Text>
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowCompanionMenu(false);
                if (selectedCompanion) {
                  router.push(`/(tabs)/companion-activities/${selectedCompanion.id}`);
                }
              }}
            >
              <Text style={styles.menuItemText}>Atividades</Text>
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
              <Text style={styles.menuItemText}>Editar Acompanhante</Text>
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
              <Text style={styles.menuItemDangerText}>Excluir Acompanhante</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  babyCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  companionCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.secondary + '60',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  menuButtonText: {
    fontSize: 24,
    color: Colors.text,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  addCompanionButton: {
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
  },
  addCompanionText: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  premiumCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  premiumText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  premiumButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  premiumButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  restoreButtonText: {
    color: Colors.text,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: Colors.glassDark,
    borderRadius: 24,
    padding: 8,
    minWidth: 280,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 16,
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
    marginTop: 8,
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
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
