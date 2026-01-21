import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby, VisitSchedule } from '@/types/database';
import { isPremiumUser, getOfferings, purchasePackage, restorePurchases } from '@/lib/revenuecat';

export default function HomeScreen() {
  const [baby, setBaby] = useState<Baby | null>(null);
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar bebê
      const { data: babyData } = await supabase
        .from('babies')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setBaby(babyData);

      // Carregar agendas
      const { data: schedulesData } = await supabase
        .from('visit_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setSchedules(schedulesData || []);

      // Verificar premium
      const premium = await isPremiumUser();
      setIsPremium(premium);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
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
  };

  const handlePurchase = async () => {
    try {
      // Buscar ofertas disponíveis
      const offering = await getOfferings();

      console.log('Offering:', offering);
      
      if (!offering || !offering.availablePackages || offering.availablePackages.length === 0) {
        Alert.alert(
          'Indisponível',
          'Nenhuma oferta disponível no momento. Tente novamente mais tarde.'
        );
        return;
      }

      // Usar o primeiro pacote disponível (geralmente o recomendado)
      const packageToPurchase = offering.availablePackages[0];

      // Mostrar confirmação antes de comprar
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
                
                // Atualizar status premium
                const premium = await isPremiumUser();
                setIsPremium(premium);
                
                Alert.alert(
                  'Sucesso!',
                  'Sua assinatura Premium foi ativada com sucesso!',
                  [{ text: 'OK' }]
                );
                
                // Recarregar dados para refletir mudanças
                await loadData();
              } catch (error: any) {
                if (error.message === 'Purchase cancelled') {
                  // Usuário cancelou, não precisa mostrar erro
                  return;
                }
                Alert.alert(
                  'Erro',
                  error.message || 'Não foi possível processar a compra. Tente novamente.'
                );
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error.message || 'Não foi possível carregar as ofertas. Tente novamente.'
      );
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
        {baby ? (
          <View style={styles.babyCard}>
            <View style={styles.babyCardHeader}>
              <View style={styles.babyCardContent}>
                <Text style={styles.babyTitle}>Informações do Bebê</Text>
                <Text style={styles.babyName}>{baby.name || 'Sem nome'}</Text>
                {baby.gender && (
                  <Text style={styles.babyGender}>
                    {baby.gender === 'male' ? '👶 Menino' : '👶 Menina'}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setShowMenu(true)}
              >
                <Text style={styles.menuButtonText}>⋯</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.babyCard}>
            <Text style={styles.babyTitle}>Cadastre seu bebê</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/baby')}
            >
              <Text style={styles.primaryButtonText}>Cadastrar Bebê</Text>
            </TouchableOpacity>
          </View>
        )}


        {!isPremium && (
          <View style={styles.premiumCard}>
            <Text style={styles.premiumTitle}>Upgrade para Premium</Text>
            <Text style={styles.premiumText}>
              Crie agendas com múltiplos dias
            </Text>
            <TouchableOpacity 
              style={styles.premiumButton}
              onPress={handlePurchase}
            >
              <Text style={styles.premiumButtonText}>Assinar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
            >
              <Text style={styles.restoreButtonText}>Restaurar Compras</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Menu de três pontos */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <BlurView intensity={80} tint="light" style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/(tabs)/baby');
              }}
            >
              <Text style={styles.menuItemText}>Editar Bebê</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/(tabs)/schedules/new');
              }}
            >
              <Text style={styles.menuItemText}>Criar Agenda de Visitas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/(tabs)/schedules');
              }}
            >
              <Text style={styles.menuItemText}>Ver Agendas Existentes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/(tabs)/visits');
              }}
            >
              <Text style={styles.menuItemText}>Acompanhar Visitas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowMenu(false)}
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  babyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  babyCardContent: {
    flex: 1,
  },
  babyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  babyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  babyGender: {
    fontSize: 16,
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  scheduleCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 6,
  },
  scheduleDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  scheduleGuid: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
  menuItemCancel: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  menuItemCancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

