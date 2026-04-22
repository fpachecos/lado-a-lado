import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { differenceInDays, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { GradientBackground } from '@/components/GradientBackground';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/lib/user-context';
import { scheduleUpcomingMilestoneNotifications } from '@/lib/notifications';

type MarcoTipo = 'vacina' | 'salto' | 'desenvolvimento';
type GrupoStatus = 'passado' | 'atual' | 'futuro';

interface CalendarItem {
  id: string;
  age_group_id: string;
  age_group_label: string;
  age_group_sublabel: string;
  age_days_min: number;
  type: MarcoTipo;
  title: string;
  description: string;
  reference_text: string;
  reference_url: string;
  display_order: number;
}

interface GrupoIdade {
  id: string;
  label: string;
  sublabel: string;
  diasMin: number;
  marcos: CalendarItem[];
}

const TIPO_CONFIG: Record<
  MarcoTipo,
  { label: string; cor: string; corTexto: string; corFundo: string }
> = {
  vacina: {
    label: 'Vacina',
    cor: Colors.primary,
    corTexto: Colors.primary,
    corFundo: 'rgba(255, 111, 97, 0.10)',
  },
  salto: {
    label: 'Salto',
    cor: '#4A90D9',
    corTexto: '#2A6099',
    corFundo: 'rgba(74, 144, 217, 0.10)',
  },
  desenvolvimento: {
    label: 'Marco',
    cor: Colors.secondary,
    corTexto: '#2D6B45',
    corFundo: 'rgba(168, 213, 186, 0.20)',
  },
};

const FILTROS: { id: MarcoTipo | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'vacina', label: 'Vacinas' },
  { id: 'salto', label: 'Saltos' },
  { id: 'desenvolvimento', label: 'Marcos' },
];

function buildGrupos(items: CalendarItem[]): GrupoIdade[] {
  const map = new Map<string, GrupoIdade>();
  for (const item of items) {
    if (!map.has(item.age_group_id)) {
      map.set(item.age_group_id, {
        id: item.age_group_id,
        label: item.age_group_label,
        sublabel: item.age_group_sublabel,
        diasMin: item.age_days_min,
        marcos: [],
      });
    }
    map.get(item.age_group_id)!.marcos.push(item);
  }
  return Array.from(map.values()).sort((a, b) => a.diasMin - b.diasMin);
}

function calcularStatus(
  idadeEmDias: number | null,
  grupos: GrupoIdade[],
  grupoIndex: number,
): GrupoStatus {
  if (idadeEmDias === null) return 'futuro';
  const grupo = grupos[grupoIndex];
  const proximo = grupos[grupoIndex + 1];
  if (!proximo) return idadeEmDias >= grupo.diasMin ? 'atual' : 'futuro';
  if (idadeEmDias >= proximo.diasMin) return 'passado';
  if (idadeEmDias >= grupo.diasMin) return 'atual';
  return 'futuro';
}

export default function CalendarioScreen() {
  const { effectiveUserId } = useUserContext();
  const [filtro, setFiltro] = useState<MarcoTipo | 'todos'>('todos');
  const [idadeEmDias, setIdadeEmDias] = useState<number | null>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('calendar_items')
      .select('*')
      .eq('active', true)
      .order('age_days_min')
      .order('display_order')
      .then(({ data }) => {
        setItems((data as CalendarItem[]) ?? []);
        setLoading(false);
      });
  }, []);

  const grupos = useMemo(() => buildGrupos(items), [items]);

  useEffect(() => {
    if (!effectiveUserId || grupos.length === 0) return;
    supabase
      .from('babies')
      .select('birth_date, name, milestone_notification_enabled')
      .eq('user_id', effectiveUserId)
      .single()
      .then(({ data }) => {
        if (data?.birth_date) {
          const birthDate = parseISO(data.birth_date);
          setIdadeEmDias(differenceInDays(new Date(), birthDate));
          if (data.milestone_notification_enabled) {
            scheduleUpcomingMilestoneNotifications(
              birthDate,
              data.name ?? 'Seu bebê',
              grupos.map((g) => ({ id: g.id, label: g.label, diasMin: g.diasMin })),
            );
          }
        }
      });
  }, [effectiveUserId, grupos]);

  const gruposFiltrados = grupos
    .map((g) => ({
      ...g,
      marcos: filtro === 'todos' ? g.marcos : g.marcos.filter((m) => m.type === filtro),
    }))
    .filter((g) => g.marcos.length > 0);

  return (
    <GradientBackground>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(tabs)')
          }
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.eyebrow}>AGENDA</Text>
          <Text style={styles.title}>Calendário</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.introText}>
          Acompanhe os marcos previstos do desenvolvimento do bebê, os saltos
          cognitivos e o calendário nacional de vacinação.
        </Text>

        <View style={styles.legendaRow}>
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
            <View key={tipo} style={styles.legendaItem}>
              <View style={[styles.legendaDot, { backgroundColor: cfg.cor }]} />
              <Text style={styles.legendaText}>{cfg.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtrosScroll}
          contentContainerStyle={styles.filtrosContent}
        >
          {FILTROS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFiltro(f.id)}
              style={[styles.filtroBtn, filtro === f.id && styles.filtroBtnAtivo]}
            >
              <Text style={[styles.filtroText, filtro === f.id && styles.filtroTextAtivo]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: 48 }}
          />
        ) : (
          gruposFiltrados.map((grupo) => {
            const originalIndex = grupos.findIndex((g) => g.id === grupo.id);
            const status = calcularStatus(idadeEmDias, grupos, originalIndex);
            const isAtual = status === 'atual';
            const isPassado = status === 'passado';

            return (
              <View key={grupo.id} style={[styles.grupo, isPassado && styles.grupoPassado]}>
                <View style={styles.grupoHeader}>
                  <View style={[styles.grupoHeaderLine, isAtual && styles.grupoHeaderLineAtual]} />
                  <View style={styles.grupoHeaderLabelBox}>
                    {isAtual && (
                      <View style={styles.agoraBadge}>
                        <View style={styles.agoraBadgeInner}>
                          <Ionicons name="radio-button-on" size={11} color={Colors.primary} />
                          <Text style={styles.agoraBadgeText}>AGORA</Text>
                        </View>
                      </View>
                    )}
                    {isPassado && (
                      <View style={styles.passadoBadge}>
                        <View style={styles.agoraBadgeInner}>
                          <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
                          <Text style={styles.passadoBadgeText}>CONCLUÍDO</Text>
                        </View>
                      </View>
                    )}
                    <Text style={[styles.grupoLabel, isAtual && styles.grupoLabelAtual, isPassado && styles.grupoLabelPassado]}>
                      {grupo.label}
                    </Text>
                    <Text style={styles.grupoSublabel}>{grupo.sublabel}</Text>
                  </View>
                </View>

                <View style={styles.marcosContainer}>
                  {grupo.marcos.map((marco) => {
                    const cfg = TIPO_CONFIG[marco.type];
                    return (
                      <View
                        key={marco.id}
                        style={[
                          styles.marcoCard,
                          { backgroundColor: cfg.corFundo },
                          isPassado && styles.marcoCardPassado,
                        ]}
                      >
                        <View style={[styles.marcoSidebar, { backgroundColor: cfg.cor }]} />
                        <View style={styles.marcoBody}>
                          <View
                            style={[
                              styles.marcoBadge,
                              { borderColor: cfg.cor, backgroundColor: `${cfg.cor}18` },
                            ]}
                          >
                            <Text style={[styles.marcoBadgeText, { color: cfg.corTexto }]}>
                              {cfg.label.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.marcoTitulo, { color: cfg.corTexto }]}>
                            {marco.title}
                          </Text>
                          <Text style={styles.marcoDescricao}>{marco.description}</Text>
                          <TouchableOpacity
                            onPress={() => Linking.openURL(marco.reference_url)}
                            style={styles.fonteBtn}
                          >
                            <Text style={[styles.fonteBtnText, { color: cfg.cor }]}>
                              ↗ {marco.reference_text}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.rodape}>
          <Text style={styles.rodapeTitle}>FONTES</Text>
          <Text style={styles.rodapeText}>
            • Calendário Nacional de Vacinação 2026 — Ministério da Saúde / PNI
          </Text>
          <Text style={styles.rodapeText}>
            • Sociedade Brasileira de Pediatria (SBP) — Guias de Puericultura
          </Text>
          <Text style={styles.rodapeText}>
            • Wonder Weeks (Van de Rijt & Plooij) — Saltos do desenvolvimento
          </Text>
          <Text style={styles.rodapeText}>
            • OMS — Padrões de desenvolvimento motor e de linguagem
          </Text>
          <Text style={styles.rodapeNote}>
            Este calendário é informativo e pode não refletir atualizações
            recentes do PNI. Consulte sempre o pediatra e a UBS mais próxima.
          </Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '600',
  },
  headerTitles: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 48,
  },
  introText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  legendaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendaText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filtrosScroll: {
    marginHorizontal: -18,
    marginBottom: 20,
    marginTop: 12,
  },
  filtrosContent: {
    paddingHorizontal: 18,
    gap: 8,
  },
  filtroBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 99,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  filtroBtnAtivo: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filtroText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filtroTextAtivo: { color: '#fff' },
  grupo: { marginBottom: 24 },
  grupoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  grupoHeaderLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.borderWarm,
  },
  grupoHeaderLabelBox: { alignItems: 'flex-end' },
  grupoLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  grupoLabelAtual: {
    color: Colors.primary,
    fontSize: 19,
  },
  grupoLabelPassado: {
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  grupoPassado: { opacity: 0.65 },
  grupoHeaderLineAtual: {
    backgroundColor: Colors.primary,
    height: 2,
  },
  agoraBadge: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  agoraBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agoraBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },
  passadoBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(160,144,128,0.15)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  passadoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  marcoCardPassado: { opacity: 0.8 },
  grupoSublabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  marcosContainer: { gap: 10 },
  marcoCard: {
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  marcoSidebar: {
    width: 4,
    borderRadius: 2,
  },
  marcoBody: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  marcoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  marcoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  marcoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  marcoDescricao: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  fonteBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  fonteBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rodape: {
    marginTop: 12,
    padding: 16,
    backgroundColor: Colors.glassBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 4,
  },
  rodapeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rodapeText: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  rodapeNote: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 16,
  },
});
