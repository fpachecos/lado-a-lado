import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { GradientBackground } from '@/components/GradientBackground';
import { getOfferings, purchasePackage, restorePurchases, isPremiumUser } from '@/lib/revenuecat';
import { PurchasesPackage, PACKAGE_TYPE } from 'react-native-purchases';

const FALLBACK_PRICES = {
  lifetime: 'R$ 129,90',
  annual: 'R$ 79,90/ano',
  monthly: 'R$ 14,90/mês',
};

const BENEFITS = [
  'Histórico ilimitado de mamadas e fraldas',
  'Relatórios completos com gráficos e médias',
  'Curva de crescimento com percentis OMS',
  'Agendas com múltiplos dias de visita',
  'Envio de convites para acompanhantes',
];

type PlanType = 'lifetime' | 'annual' | 'monthly';

interface Plan {
  type: PlanType;
  label: string;
  price: string;
  sublabel: string;
  highlighted: boolean;
  pkg: PurchasesPackage | null;
}

export default function PaywallScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<PlanType | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => { loadOfferings(); }, []);

  const loadOfferings = async () => {
    try {
      const offering = await getOfferings();
      const pkgs = offering?.availablePackages ?? [];

      const findPkg = (type: PACKAGE_TYPE) => pkgs.find(p => p.packageType === type) ?? null;

      const lifetimePkg = findPkg(PACKAGE_TYPE.LIFETIME);
      const annualPkg = findPkg(PACKAGE_TYPE.ANNUAL);
      const monthlyPkg = findPkg(PACKAGE_TYPE.MONTHLY);

      setPlans([
        {
          type: 'lifetime',
          label: 'Vitalício',
          price: lifetimePkg?.product.priceString ?? FALLBACK_PRICES.lifetime,
          sublabel: 'Pagamento único · acesso para sempre',
          highlighted: true,
          pkg: lifetimePkg,
        },
        {
          type: 'annual',
          label: 'Anual',
          price: annualPkg?.product.priceString ?? FALLBACK_PRICES.annual,
          sublabel: '~R$ 6,65/mês · economize 55%',
          highlighted: false,
          pkg: annualPkg,
        },
        {
          type: 'monthly',
          label: 'Mensal',
          price: monthlyPkg?.product.priceString ?? FALLBACK_PRICES.monthly,
          sublabel: 'Cancele quando quiser',
          highlighted: false,
          pkg: monthlyPkg,
        },
      ]);
    } catch {
      setPlans([
        { type: 'lifetime', label: 'Vitalício', price: FALLBACK_PRICES.lifetime, sublabel: 'Pagamento único · acesso para sempre', highlighted: true, pkg: null },
        { type: 'annual', label: 'Anual', price: FALLBACK_PRICES.annual, sublabel: '~R$ 6,65/mês · economize 55%', highlighted: false, pkg: null },
        { type: 'monthly', label: 'Mensal', price: FALLBACK_PRICES.monthly, sublabel: 'Cancele quando quiser', highlighted: false, pkg: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan: Plan) => {
    if (!plan.pkg) {
      Alert.alert('Indisponível', 'Este plano não está disponível no momento. Tente novamente mais tarde.');
      return;
    }
    setPurchasing(plan.type);
    try {
      await purchasePackage(plan.pkg);
      const premium = await isPremiumUser();
      if (premium) {
        Alert.alert('Bem-vindo ao Premium!', 'Todas as funcionalidades foram desbloqueadas.', [
          { text: 'OK', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)') },
        ]);
      }
    } catch (error: any) {
      if (error.message === 'Purchase cancelled') return;
      Alert.alert('Erro', error.message || 'Não foi possível processar a compra. Tente novamente.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      const premium = await isPremiumUser();
      if (premium) {
        Alert.alert('Compras restauradas!', 'Seu acesso Premium foi restaurado.', [
          { text: 'OK', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)') },
        ]);
      } else {
        Alert.alert('Nenhuma compra encontrada', 'Não encontramos compras para restaurar nesta conta.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível restaurar as compras. Tente novamente.');
    } finally {
      setRestoring(false);
    }
  };

  const busy = purchasing !== null || restoring;

  return (
    <GradientBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>PREMIUM</Text>
            </View>
            <Text style={styles.heroTitle}>Tudo do seu bebê,{'\n'}para sempre.</Text>
            <Text style={styles.heroSubtitle}>
              Registros completos, curvas de crescimento e relatórios para acompanhar cada momento.
            </Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 32 }} />
          ) : (
            <View style={styles.plans}>
              {plans.map(plan => (
                <TouchableOpacity
                  key={plan.type}
                  style={[styles.planCard, plan.highlighted && styles.planCardHighlighted]}
                  activeOpacity={0.85}
                  onPress={() => handlePurchase(plan)}
                  disabled={busy}
                >
                  {plan.highlighted && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>MAIS POPULAR</Text>
                    </View>
                  )}
                  <View style={styles.planInfo}>
                    <Text style={[styles.planLabel, plan.highlighted && styles.planLabelHighlighted]}>
                      {plan.label}
                    </Text>
                    <Text style={[styles.planSublabel, plan.highlighted && styles.planSublabelHighlighted]}>
                      {plan.sublabel}
                    </Text>
                  </View>
                  <View style={styles.planPriceBox}>
                    {purchasing === plan.type ? (
                      <ActivityIndicator color={plan.highlighted ? '#fff' : Colors.primary} size="small" />
                    ) : (
                      <Text style={[styles.planPrice, plan.highlighted && styles.planPriceHighlighted]}>
                        {plan.price}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={busy}
          >
            {restoring
              ? <ActivityIndicator color={Colors.textTertiary} size="small" />
              : <Text style={styles.restoreText}>Restaurar compras</Text>
            }
          </TouchableOpacity>

          <Text style={styles.legalText}>
            Ao assinar, você concorda com os Termos de Uso e a Política de Privacidade da Apple. A assinatura é renovada automaticamente, salvo cancelamento até 24h antes do vencimento.
          </Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 18,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Benefits ──
  benefits: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },

  // ── Plans ──
  plans: {
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.borderWarm,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  planCardHighlighted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  planBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  planInfo: { flex: 1 },
  planLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 3,
  },
  planLabelHighlighted: { color: '#fff' },
  planSublabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  planSublabelHighlighted: {
    color: 'rgba(255,255,255,0.75)',
  },
  planPriceBox: { alignItems: 'flex-end', minWidth: 96 },
  planPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'right',
  },
  planPriceHighlighted: { color: '#fff' },

  // ── Footer ──
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  legalText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
