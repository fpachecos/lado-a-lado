import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Svg, {
  Path, Circle, Line, Text as SvgText,
  Defs, LinearGradient, Stop, ClipPath, Rect, G,
} from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby, BabyWeight, BabyHeight } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import DatePicker from '@/components/DatePicker';
import { BlurView } from 'expo-blur';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Dados OMS: Peso por idade (0–24 meses) ───────────────────────────────────
// https://www.who.int/tools/child-growth-standards/standards/weight-for-age
const WHO_WEIGHT_BOYS = [
  { month: 0, p3: 2.5, p50: 3.3, p97: 4.3 }, { month: 1, p3: 3.4, p50: 4.5, p97: 5.7 },
  { month: 2, p3: 4.4, p50: 5.6, p97: 7.0 }, { month: 3, p3: 5.1, p50: 6.4, p97: 7.9 },
  { month: 4, p3: 5.6, p50: 7.0, p97: 8.6 }, { month: 5, p3: 6.1, p50: 7.5, p97: 9.2 },
  { month: 6, p3: 6.4, p50: 7.9, p97: 9.7 }, { month: 7, p3: 6.7, p50: 8.3, p97: 10.2 },
  { month: 8, p3: 7.0, p50: 8.6, p97: 10.5 }, { month: 9, p3: 7.2, p50: 8.9, p97: 10.9 },
  { month: 10, p3: 7.5, p50: 9.2, p97: 11.2 }, { month: 11, p3: 7.7, p50: 9.4, p97: 11.5 },
  { month: 12, p3: 7.8, p50: 9.6, p97: 11.8 }, { month: 13, p3: 8.0, p50: 9.9, p97: 12.1 },
  { month: 14, p3: 8.2, p50: 10.1, p97: 12.4 }, { month: 15, p3: 8.4, p50: 10.3, p97: 12.7 },
  { month: 16, p3: 8.5, p50: 10.5, p97: 12.9 }, { month: 17, p3: 8.7, p50: 10.7, p97: 13.2 },
  { month: 18, p3: 8.9, p50: 10.9, p97: 13.5 }, { month: 19, p3: 9.0, p50: 11.1, p97: 13.7 },
  { month: 20, p3: 9.2, p50: 11.3, p97: 14.0 }, { month: 21, p3: 9.3, p50: 11.5, p97: 14.3 },
  { month: 22, p3: 9.5, p50: 11.8, p97: 14.5 }, { month: 23, p3: 9.7, p50: 12.0, p97: 14.8 },
  { month: 24, p3: 9.8, p50: 12.2, p97: 15.1 },
];
const WHO_WEIGHT_GIRLS = [
  { month: 0, p3: 2.4, p50: 3.2, p97: 4.2 }, { month: 1, p3: 3.2, p50: 4.2, p97: 5.4 },
  { month: 2, p3: 4.0, p50: 5.1, p97: 6.5 }, { month: 3, p3: 4.6, p50: 5.8, p97: 7.4 },
  { month: 4, p3: 5.1, p50: 6.4, p97: 8.1 }, { month: 5, p3: 5.5, p50: 6.9, p97: 8.7 },
  { month: 6, p3: 5.8, p50: 7.3, p97: 9.2 }, { month: 7, p3: 6.1, p50: 7.6, p97: 9.6 },
  { month: 8, p3: 6.3, p50: 7.9, p97: 10.0 }, { month: 9, p3: 6.6, p50: 8.2, p97: 10.4 },
  { month: 10, p3: 6.8, p50: 8.5, p97: 10.7 }, { month: 11, p3: 7.0, p50: 8.7, p97: 11.0 },
  { month: 12, p3: 7.1, p50: 8.9, p97: 11.3 }, { month: 13, p3: 7.3, p50: 9.2, p97: 11.6 },
  { month: 14, p3: 7.5, p50: 9.4, p97: 11.9 }, { month: 15, p3: 7.7, p50: 9.6, p97: 12.2 },
  { month: 16, p3: 7.8, p50: 9.8, p97: 12.5 }, { month: 17, p3: 8.0, p50: 10.0, p97: 12.7 },
  { month: 18, p3: 8.2, p50: 10.2, p97: 13.0 }, { month: 19, p3: 8.3, p50: 10.4, p97: 13.3 },
  { month: 20, p3: 8.5, p50: 10.6, p97: 13.5 }, { month: 21, p3: 8.7, p50: 10.9, p97: 13.8 },
  { month: 22, p3: 8.8, p50: 11.1, p97: 14.1 }, { month: 23, p3: 9.0, p50: 11.3, p97: 14.3 },
  { month: 24, p3: 9.2, p50: 11.5, p97: 14.6 },
];

// ─── Dados OMS: Comprimento/Estatura por idade (0–24 meses) ──────────────────
// https://www.who.int/tools/child-growth-standards/standards/length-height-for-age
const WHO_HEIGHT_BOYS = [
  { month: 0, p3: 46.3, p50: 49.9, p97: 53.4 }, { month: 1, p3: 51.1, p50: 54.7, p97: 58.4 },
  { month: 2, p3: 54.7, p50: 58.4, p97: 62.2 }, { month: 3, p3: 57.6, p50: 61.4, p97: 65.3 },
  { month: 4, p3: 60.0, p50: 63.9, p97: 67.8 }, { month: 5, p3: 61.9, p50: 65.9, p97: 69.9 },
  { month: 6, p3: 63.6, p50: 67.6, p97: 71.6 }, { month: 7, p3: 65.1, p50: 69.2, p97: 73.2 },
  { month: 8, p3: 66.5, p50: 70.6, p97: 74.7 }, { month: 9, p3: 67.7, p50: 72.0, p97: 76.2 },
  { month: 10, p3: 69.0, p50: 73.3, p97: 77.6 }, { month: 11, p3: 70.2, p50: 74.5, p97: 78.9 },
  { month: 12, p3: 71.3, p50: 75.7, p97: 80.2 }, { month: 13, p3: 72.4, p50: 76.9, p97: 81.5 },
  { month: 14, p3: 73.4, p50: 78.0, p97: 82.7 }, { month: 15, p3: 74.4, p50: 79.1, p97: 83.9 },
  { month: 16, p3: 75.4, p50: 80.2, p97: 85.1 }, { month: 17, p3: 76.3, p50: 81.2, p97: 86.2 },
  { month: 18, p3: 77.2, p50: 82.3, p97: 87.3 }, { month: 19, p3: 78.1, p50: 83.2, p97: 88.4 },
  { month: 20, p3: 78.9, p50: 84.2, p97: 89.5 }, { month: 21, p3: 79.7, p50: 85.1, p97: 90.5 },
  { month: 22, p3: 80.5, p50: 86.0, p97: 91.6 }, { month: 23, p3: 81.3, p50: 86.9, p97: 92.6 },
  { month: 24, p3: 82.1, p50: 87.8, p97: 93.6 },
];
const WHO_HEIGHT_GIRLS = [
  { month: 0, p3: 45.6, p50: 49.1, p97: 52.7 }, { month: 1, p3: 50.0, p50: 53.7, p97: 57.4 },
  { month: 2, p3: 53.2, p50: 57.1, p97: 60.9 }, { month: 3, p3: 55.8, p50: 59.8, p97: 63.8 },
  { month: 4, p3: 58.0, p50: 62.1, p97: 66.2 }, { month: 5, p3: 59.9, p50: 64.0, p97: 68.2 },
  { month: 6, p3: 61.5, p50: 65.7, p97: 70.0 }, { month: 7, p3: 62.9, p50: 67.3, p97: 71.6 },
  { month: 8, p3: 64.3, p50: 68.7, p97: 73.2 }, { month: 9, p3: 65.6, p50: 70.1, p97: 74.7 },
  { month: 10, p3: 66.8, p50: 71.5, p97: 76.1 }, { month: 11, p3: 68.0, p50: 72.8, p97: 77.5 },
  { month: 12, p3: 69.2, p50: 74.0, p97: 78.9 }, { month: 13, p3: 70.3, p50: 75.2, p97: 80.2 },
  { month: 14, p3: 71.3, p50: 76.4, p97: 81.4 }, { month: 15, p3: 72.4, p50: 77.5, p97: 82.7 },
  { month: 16, p3: 73.3, p50: 78.6, p97: 83.9 }, { month: 17, p3: 74.3, p50: 79.7, p97: 85.0 },
  { month: 18, p3: 75.2, p50: 80.7, p97: 86.2 }, { month: 19, p3: 76.2, p50: 81.7, p97: 87.3 },
  { month: 20, p3: 77.0, p50: 82.7, p97: 88.4 }, { month: 21, p3: 77.9, p50: 83.7, p97: 89.4 },
  { month: 22, p3: 78.7, p50: 84.6, p97: 90.5 }, { month: 23, p3: 79.6, p50: 85.5, p97: 91.5 },
  { month: 24, p3: 80.3, p50: 86.4, p97: 92.5 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageInMonths(birthDate: Date, measuredAt: Date): number {
  return differenceInDays(measuredAt, birthDate) / 30.4375;
}

// ─── Componente de gráfico genérico ──────────────────────────────────────────

interface GrowthPoint { ageMonths: number; value: number; }
interface WhoRow { month: number; p3: number; p50: number; p97: number; }

interface GrowthChartProps {
  whoData: WhoRow[];
  points: GrowthPoint[];
  chartWidth: number;
  visibleStart: number;
  visibleEnd: number;
  /** Passo dos ticks do eixo Y (ex: 2 para peso em kg, 5 para altura em cm) */
  yTickStep: number;
  /** Se true, yMin é calculado a partir dos dados visíveis (útil para altura) */
  autoYMin?: boolean;
  /** Sufixo das unidades para labels (ex: 'kg', 'cm') */
  yUnit: string;
  /** Cor da linha e pontos do bebê */
  accentColor: string;
}

const CHART_H = 230;
const PAD = { top: 16, right: 16, bottom: 32, left: 46 };

function GrowthChart({
  whoData, points, chartWidth,
  visibleStart, visibleEnd,
  yTickStep, autoYMin = false,
  yUnit, accentColor,
}: GrowthChartProps) {
  const drawW = chartWidth - PAD.left - PAD.right;
  const drawH = CHART_H - PAD.top - PAD.bottom;
  const visibleRange = visibleEnd - visibleStart;

  // Y scale — adaptativo ao range visível se autoYMin
  const visibleWho = whoData.filter(
    d => d.month >= Math.floor(visibleStart) - 1 && d.month <= Math.ceil(visibleEnd) + 1
  );
  const visiblePts = points.filter(
    p => p.ageMonths >= visibleStart - 0.5 && p.ageMonths <= visibleEnd + 0.5
  );
  const allVals = [
    ...visibleWho.map(d => d.p97), ...visibleWho.map(d => d.p3),
    ...visiblePts.map(p => p.value),
  ];
  const rawMax = allVals.length > 0 ? Math.max(...allVals) : yTickStep * 5;
  const rawMin = allVals.length > 0 ? Math.min(...allVals) : 0;
  const yMax = Math.ceil(rawMax / yTickStep) * yTickStep + yTickStep;
  const yMin = autoYMin
    ? Math.max(0, Math.floor((rawMin - yTickStep) / yTickStep) * yTickStep)
    : 0;

  function xPos(month: number): number {
    return PAD.left + ((month - visibleStart) / visibleRange) * drawW;
  }
  function yPos(val: number): number {
    return PAD.top + (1 - (val - yMin) / (yMax - yMin)) * drawH;
  }
  function linePath(data: { month: number; value: number }[]): string {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(d.month)} ${yPos(d.value)}`).join(' ');
  }

  const bandPath = [
    ...whoData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(d.month)} ${yPos(d.p3)}`),
    ...[...whoData].reverse().map(d => `L ${xPos(d.month)} ${yPos(d.p97)}`),
    'Z',
  ].join(' ');
  const p50Path = linePath(whoData.map(d => ({ month: d.month, value: d.p50 })));
  const p3Path  = linePath(whoData.map(d => ({ month: d.month, value: d.p3 })));
  const p97Path = linePath(whoData.map(d => ({ month: d.month, value: d.p97 })));

  const sorted = [...points].sort((a, b) => a.ageMonths - b.ageMonths);
  const babyPath = sorted.length > 1
    ? sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.ageMonths)} ${yPos(p.value)}`).join(' ')
    : '';

  // Ticks Y
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += yTickStep) yTicks.push(v);

  // Ticks X (intervalo dinâmico)
  const tickInterval = visibleRange <= 3 ? 1 : visibleRange <= 7 ? 2 : visibleRange <= 14 ? 3 : 6;
  const xTicks: number[] = [];
  const firstTick = Math.ceil(visibleStart / tickInterval) * tickInterval;
  for (let m = firstTick; m <= Math.ceil(visibleEnd); m += tickInterval) xTicks.push(m);

  return (
    <Svg width={chartWidth} height={CHART_H}>
      <Defs>
        <LinearGradient id={`bg-${yUnit}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.secondary} stopOpacity="0.25" />
          <Stop offset="1" stopColor={Colors.secondary} stopOpacity="0.08" />
        </LinearGradient>
        <ClipPath id={`clip-${yUnit}`}>
          <Rect x={PAD.left} y={PAD.top} width={drawW} height={drawH} />
        </ClipPath>
      </Defs>

      {/* Grid horizontal */}
      {yTicks.map(v => (
        <Line key={`gy-${v}`} x1={PAD.left} y1={yPos(v)} x2={PAD.left + drawW} y2={yPos(v)}
          stroke={Colors.neutral} strokeWidth="0.8" strokeDasharray="4,4" />
      ))}

      {/* Conteúdo recortado */}
      <G clipPath={`url(#clip-${yUnit})`}>
        <Path d={bandPath} fill={`url(#bg-${yUnit})`} />
        <Path d={p3Path}  stroke={Colors.secondary} strokeWidth="1" strokeDasharray="4,3" fill="none" opacity="0.7" />
        <Path d={p97Path} stroke={Colors.secondary} strokeWidth="1" strokeDasharray="4,3" fill="none" opacity="0.7" />
        <Path d={p50Path} stroke={Colors.secondary} strokeWidth="1.5" strokeDasharray="6,4" fill="none" opacity="0.9" />
        {babyPath !== '' && (
          <Path d={babyPath} stroke={accentColor} strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {sorted.map((p, i) => (
          <Circle key={i} cx={xPos(p.ageMonths)} cy={yPos(p.value)} r="4"
            fill={accentColor} stroke={Colors.white} strokeWidth="1.5" />
        ))}
      </G>

      {/* Rótulos Y */}
      {yTicks.map(v => (
        <SvgText key={`ly-${v}`} x={PAD.left - 6} y={yPos(v) + 4}
          fontSize="9" fill={Colors.textTertiary} textAnchor="end">
          {v}
        </SvgText>
      ))}

      {/* Rótulos X */}
      {xTicks.map(m => (
        <SvgText key={`lx-${m}`} x={xPos(m)} y={CHART_H - 6}
          fontSize="9" fill={Colors.textTertiary} textAnchor="middle">
          {m}m
        </SvgText>
      ))}

      <Line x1={PAD.left} y1={PAD.top + drawH} x2={PAD.left + drawW} y2={PAD.top + drawH}
        stroke={Colors.neutral} strokeWidth="1" />
      <Line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + drawH}
        stroke={Colors.neutral} strokeWidth="1" />
    </Svg>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

const MAX_MONTH = 24;
const MIN_RANGE = 1;

type ActiveTab = 'weight' | 'height';

export default function GrowthScreen() {
  const { width } = useWindowDimensions();
  const chartWidth = width - 40;
  const drawW = chartWidth - PAD.left - PAD.right;

  const [baby, setBaby] = useState<Baby | null>(null);
  const [weights, setWeights] = useState<BabyWeight[]>([]);
  const [heights, setHeights] = useState<BabyHeight[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('weight');

  // Zoom — peso
  const [wStart, setWStart] = useState(0);
  const [wEnd, setWEnd] = useState(MAX_MONTH);
  const wSvStart = useSharedValue(0);
  const wSvEnd   = useSharedValue(MAX_MONTH);
  const wGStart  = useSharedValue(0);
  const wGEnd    = useSharedValue(MAX_MONTH);
  useEffect(() => { wSvStart.value = wStart; wSvEnd.value = wEnd; }, [wStart, wEnd]);

  const applyW = useCallback((s: number, e: number) => {
    'worklet';
    const range = Math.max(MIN_RANGE, Math.min(e - s, MAX_MONTH));
    const start = Math.max(0, Math.min(s, MAX_MONTH - range));
    wSvStart.value = start; wSvEnd.value = start + range;
    runOnJS(setWStart)(start); runOnJS(setWEnd)(start + range);
  }, [wSvStart, wSvEnd]);

  const wPinch = Gesture.Pinch()
    .onBegin(() => { wGStart.value = wSvStart.value; wGEnd.value = wSvEnd.value; })
    .onUpdate(e => {
      const range = wGEnd.value - wGStart.value;
      const fx = Math.max(0, Math.min(e.focalX - PAD.left, drawW));
      const fr = fx / drawW;
      const fm = wGStart.value + fr * range;
      const nr = range / e.scale;
      applyW(fm - fr * nr, fm - fr * nr + nr);
    });
  const wPan = Gesture.Pan()
    .onBegin(() => { wGStart.value = wSvStart.value; wGEnd.value = wSvEnd.value; })
    .onUpdate(e => {
      const mpp = (wGEnd.value - wGStart.value) / drawW;
      applyW(wGStart.value - e.translationX * mpp, wGEnd.value - e.translationX * mpp);
    });
  const wGesture = Gesture.Simultaneous(wPinch, wPan);

  // Zoom — altura
  const [hStart, setHStart] = useState(0);
  const [hEnd, setHEnd]   = useState(MAX_MONTH);
  const hSvStart = useSharedValue(0);
  const hSvEnd   = useSharedValue(MAX_MONTH);
  const hGStart  = useSharedValue(0);
  const hGEnd    = useSharedValue(MAX_MONTH);
  useEffect(() => { hSvStart.value = hStart; hSvEnd.value = hEnd; }, [hStart, hEnd]);

  const applyH = useCallback((s: number, e: number) => {
    'worklet';
    const range = Math.max(MIN_RANGE, Math.min(e - s, MAX_MONTH));
    const start = Math.max(0, Math.min(s, MAX_MONTH - range));
    hSvStart.value = start; hSvEnd.value = start + range;
    runOnJS(setHStart)(start); runOnJS(setHEnd)(start + range);
  }, [hSvStart, hSvEnd]);

  const hPinch = Gesture.Pinch()
    .onBegin(() => { hGStart.value = hSvStart.value; hGEnd.value = hSvEnd.value; })
    .onUpdate(e => {
      const range = hGEnd.value - hGStart.value;
      const fx = Math.max(0, Math.min(e.focalX - PAD.left, drawW));
      const fr = fx / drawW;
      const fm = hGStart.value + fr * range;
      const nr = range / e.scale;
      applyH(fm - fr * nr, fm - fr * nr + nr);
    });
  const hPan = Gesture.Pan()
    .onBegin(() => { hGStart.value = hSvStart.value; hGEnd.value = hSvEnd.value; })
    .onUpdate(e => {
      const mpp = (hGEnd.value - hGStart.value) / drawW;
      applyH(hGStart.value - e.translationX * mpp, hGEnd.value - e.translationX * mpp);
    });
  const hGesture = Gesture.Simultaneous(hPinch, hPan);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [valueInput, setValueInput] = useState('');
  const [unit, setUnit] = useState<string>('kg');
  const [measureDate, setMeasureDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const openAddModal = (tab: ActiveTab) => {
    setUnit(tab === 'weight' ? 'kg' : 'cm');
    setValueInput('');
    setMeasureDate(new Date());
    setShowAddModal(true);
  };

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: babyData, error: babyError } = await supabase
        .from('babies').select('*').eq('user_id', user.id).single();
      if (babyError && babyError.code !== 'PGRST116') throw babyError;
      if (!babyData) return;
      setBaby(babyData);

      const [{ data: wData }, { data: hData }] = await Promise.all([
        supabase.from('baby_weights').select('*').eq('baby_id', babyData.id).order('measured_at', { ascending: true }),
        supabase.from('baby_heights').select('*').eq('baby_id', babyData.id).order('measured_at', { ascending: true }),
      ]);
      setWeights(wData ?? []);
      setHeights(hData ?? []);
    } catch (err) {
      console.error('Erro ao carregar crescimento:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    const raw = parseFloat(valueInput.replace(',', '.'));
    if (isNaN(raw) || raw <= 0) {
      const msg = `Informe um valor válido de ${activeTab === 'weight' ? 'peso' : 'altura'}.`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Valor inválido', msg);
      return;
    }

    setSaving(true);
    try {
      const dateStr = measureDate.toISOString().split('T')[0];
      if (activeTab === 'weight') {
        const grams = unit === 'kg' ? Math.round(raw * 1000) : Math.round(raw);
        const { error } = await supabase.from('baby_weights').insert({
          baby_id: baby!.id, weight_grams: grams, measured_at: dateStr,
        });
        if (error) throw error;
      } else {
        const mm = unit === 'cm' ? Math.round(raw * 10) : Math.round(raw);
        const { error } = await supabase.from('baby_heights').insert({
          baby_id: baby!.id, height_mm: mm, measured_at: dateStr,
        });
        if (error) throw error;
      }
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      const msg = err.message ?? 'Erro ao salvar.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erro', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, label: string, table: 'baby_weights' | 'baby_heights') => {
    const doDelete = async () => {
      await supabase.from(table).delete().eq('id', id);
      await loadData();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remover ${label}?`)) doDelete();
    } else {
      Alert.alert('Remover', `Remover ${label}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Pontos do gráfico
  const birth = baby?.birth_date ? parseISO(baby.birth_date) : null;

  const weightPoints: GrowthPoint[] = birth
    ? weights.map(w => ({ ageMonths: ageInMonths(birth, parseISO(w.measured_at)), value: w.weight_grams / 1000 }))
    : [];
  const heightPoints: GrowthPoint[] = birth
    ? heights.map(h => ({ ageMonths: ageInMonths(birth, parseISO(h.measured_at)), value: h.height_mm / 10 }))
    : [];

  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const latestHeight = heights.length > 0 ? heights[heights.length - 1] : null;
  const noBirthDate = !baby?.birth_date;
  const whoGender = baby?.gender === 'female' ? 'meninas' : 'meninos';

  // Label de unidade para preview
  const previewKg = (() => {
    if (activeTab !== 'weight') return null;
    const raw = parseFloat(valueInput.replace(',', '.'));
    if (isNaN(raw) || raw <= 0) return null;
    const g = unit === 'kg' ? raw * 1000 : raw;
    return (g / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg';
  })();
  const previewCm = (() => {
    if (activeTab !== 'height') return null;
    const raw = parseFloat(valueInput.replace(',', '.'));
    if (isNaN(raw) || raw <= 0) return null;
    const mm = unit === 'cm' ? raw * 10 : raw;
    return (mm / 10).toFixed(1) + ' cm';
  })();

  if (initialLoading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}><ActivityIndicator color={Colors.primary} /></View>
      </GradientBackground>
    );
  }

  const isWZoomed = wStart > 0.01 || wEnd < MAX_MONTH - 0.01;
  const isHZoomed = hStart > 0.01 || hEnd < MAX_MONTH - 0.01;

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.eyebrow}>BEBÊ</Text>
            <Text style={styles.title}>Crescimento</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab toggle */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'weight' && styles.tabActiveWeight]}
            onPress={() => setActiveTab('weight')}>
            <Text style={[styles.tabText, activeTab === 'weight' && styles.tabTextActive]}>⚖️  Peso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'height' && styles.tabActiveHeight]}
            onPress={() => setActiveTab('height')}>
            <Text style={[styles.tabText, activeTab === 'height' && styles.tabTextActive]}>📏  Altura</Text>
          </TouchableOpacity>
        </View>

        {/* Aviso sem data de nascimento */}
        {noBirthDate && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Adicione a data de nascimento do bebê para visualizar o gráfico comparado com a OMS.
            </Text>
            <TouchableOpacity style={styles.warningButton} onPress={() => router.push('/(tabs)/baby')}>
              <Text style={styles.warningButtonText}>Editar informações</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── TAB PESO ── */}
        {activeTab === 'weight' && (
          <>
            {latestWeight && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>PESO ATUAL</Text>
                <Text style={[styles.summaryValue, { color: Colors.primary }]}>
                  {(latestWeight.weight_grams / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                </Text>
                <Text style={styles.summaryDate}>
                  {format(parseISO(latestWeight.measured_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Text>
              </View>
            )}

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Curva de peso</Text>
                  <Text style={styles.chartSubtitle}>
                    OMS ({whoGender}) · meses{isWZoomed ? ` · ${Math.round(wStart)}–${Math.round(wEnd)}m` : ''}
                  </Text>
                </View>
                {isWZoomed && (
                  <TouchableOpacity style={styles.resetBtn} onPress={() => { setWStart(0); setWEnd(MAX_MONTH); }}>
                    <Text style={styles.resetBtnText}>Resetar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {weights.length === 0 && !noBirthDate ? (
                <Text style={styles.emptyChartText}>Nenhum peso registrado ainda.</Text>
              ) : (
                <GestureDetector gesture={wGesture}>
                  <View style={styles.chartContainer}>
                    <GrowthChart
                      whoData={baby?.gender === 'female' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS}
                      points={weightPoints} chartWidth={chartWidth}
                      visibleStart={wStart} visibleEnd={wEnd}
                      yTickStep={2} autoYMin={false} yUnit="kg" accentColor={Colors.primary}
                    />
                  </View>
                </GestureDetector>
              )}

              <ChartLegend accentColor={Colors.primary} accentLabel="Peso do bebê" />
              <Text style={styles.zoomHint}>Pinça para zoom · arraste para navegar</Text>
            </View>

            <HistoryList
              entries={[...weights].reverse().map(w => ({
                id: w.id,
                valueLabel: (w.weight_grams / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg',
                date: w.measured_at,
                ageLabel: birth ? ageLabel(birth, w.measured_at) : '',
              }))}
              onDelete={id => {
                const w = weights.find(x => x.id === id)!;
                const label = `${(w.weight_grams / 1000).toFixed(3)} kg (${format(parseISO(w.measured_at), 'dd/MM/yyyy')})`;
                handleDelete(id, label, 'baby_weights');
              }}
            />
          </>
        )}

        {/* ── TAB ALTURA ── */}
        {activeTab === 'height' && (
          <>
            {latestHeight && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>ALTURA ATUAL</Text>
                <Text style={[styles.summaryValue, { color: Colors.secondary }]}>
                  {(latestHeight.height_mm / 10).toFixed(1)} cm
                </Text>
                <Text style={styles.summaryDate}>
                  {format(parseISO(latestHeight.measured_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Text>
              </View>
            )}

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Curva de altura</Text>
                  <Text style={styles.chartSubtitle}>
                    OMS ({whoGender}) · meses{isHZoomed ? ` · ${Math.round(hStart)}–${Math.round(hEnd)}m` : ''}
                  </Text>
                </View>
                {isHZoomed && (
                  <TouchableOpacity style={styles.resetBtn} onPress={() => { setHStart(0); setHEnd(MAX_MONTH); }}>
                    <Text style={styles.resetBtnText}>Resetar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {heights.length === 0 && !noBirthDate ? (
                <Text style={styles.emptyChartText}>Nenhuma altura registrada ainda.</Text>
              ) : (
                <GestureDetector gesture={hGesture}>
                  <View style={styles.chartContainer}>
                    <GrowthChart
                      whoData={baby?.gender === 'female' ? WHO_HEIGHT_GIRLS : WHO_HEIGHT_BOYS}
                      points={heightPoints} chartWidth={chartWidth}
                      visibleStart={hStart} visibleEnd={hEnd}
                      yTickStep={5} autoYMin={true} yUnit="cm" accentColor={Colors.secondary}
                    />
                  </View>
                </GestureDetector>
              )}

              <ChartLegend accentColor={Colors.secondary} accentLabel="Altura do bebê" />
              <Text style={styles.zoomHint}>Pinça para zoom · arraste para navegar</Text>
            </View>

            <HistoryList
              entries={[...heights].reverse().map(h => ({
                id: h.id,
                valueLabel: (h.height_mm / 10).toFixed(1) + ' cm',
                date: h.measured_at,
                ageLabel: birth ? ageLabel(birth, h.measured_at) : '',
              }))}
              onDelete={id => {
                const h = heights.find(x => x.id === id)!;
                const label = `${(h.height_mm / 10).toFixed(1)} cm (${format(parseISO(h.measured_at), 'dd/MM/yyyy')})`;
                handleDelete(id, label, 'baby_heights');
              }}
            />
          </>
        )}

        {/* Botão registrar */}
        <TouchableOpacity style={styles.addButton} onPress={() => openAddModal(activeTab)}>
          <Text style={styles.addButtonText}>
            {activeTab === 'weight' ? '+ Registrar peso' : '+ Registrar altura'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={showAddModal} transparent animationType="fade"
        onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <BlurView intensity={80} tint="light" style={styles.modalContent}>
                <View style={styles.menuHandle} />
                <Text style={styles.modalTitle}>
                  {activeTab === 'weight' ? 'Registrar peso' : 'Registrar altura'}
                </Text>

                <DatePicker value={measureDate} onChange={setMeasureDate}
                  maximumDate={new Date()} label="Data da medição" />

                <Text style={styles.inputLabel}>
                  {activeTab === 'weight' ? 'Peso' : 'Altura'}
                </Text>
                <View style={styles.weightRow}>
                  <TextInput
                    style={styles.weightInput}
                    placeholder={
                      activeTab === 'weight'
                        ? (unit === 'kg' ? 'Ex: 3.850' : 'Ex: 3850')
                        : (unit === 'cm' ? 'Ex: 50.5' : 'Ex: 505')
                    }
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={valueInput}
                    onChangeText={setValueInput}
                    autoFocus
                  />
                  <View style={styles.unitSelector}>
                    {activeTab === 'weight' ? (
                      <>
                        {['kg', 'g'].map(u => (
                          <TouchableOpacity key={u}
                            style={[styles.unitButton, unit === u && styles.unitButtonActive]}
                            onPress={() => setUnit(u)}>
                            <Text style={[styles.unitButtonText, unit === u && styles.unitButtonTextActive]}>{u}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : (
                      <>
                        {['cm', 'mm'].map(u => (
                          <TouchableOpacity key={u}
                            style={[styles.unitButton, unit === u && styles.unitButtonActive]}
                            onPress={() => setUnit(u)}>
                            <Text style={[styles.unitButtonText, unit === u && styles.unitButtonTextActive]}>{u}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                </View>

                {(previewKg || previewCm) && (
                  <Text style={styles.previewText}>= {previewKg ?? previewCm}</Text>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton}
                    onPress={() => setShowAddModal(false)}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.confirmButton, saving && { opacity: 0.6 }]}
                    onPress={handleSave} disabled={saving}>
                    <Text style={styles.confirmButtonText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </GradientBackground>
  );
}

// ─── Sub-componentes reutilizáveis ────────────────────────────────────────────

function ageLabel(birth: Date, measuredAt: string): string {
  const months = Math.floor(ageInMonths(birth, parseISO(measuredAt)));
  return months >= 0 ? ` · ${months} ${months === 1 ? 'mês' : 'meses'}` : '';
}

interface HistoryEntry { id: string; valueLabel: string; date: string; ageLabel: string; }
function HistoryList({ entries, onDelete }: { entries: HistoryEntry[]; onDelete: (id: string) => void }) {
  return (
    <View style={styles.listCard}>
      <Text style={styles.sectionTitle}>Histórico</Text>
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum registro encontrado.</Text>
      ) : (
        entries.map(e => (
          <View key={e.id} style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listValue}>{e.valueLabel}</Text>
              <Text style={styles.listDate}>{format(parseISO(e.date), 'dd/MM/yyyy')}{e.ageLabel}</Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(e.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

function ChartLegend({ accentColor, accentLabel }: { accentColor: string; accentLabel: string }) {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendLine, { backgroundColor: accentColor }]} />
        <Text style={styles.legendText}>{accentLabel}</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendLine, { backgroundColor: Colors.secondary, opacity: 0.9 }]} />
        <Text style={styles.legendText}>Mediana OMS (P50)</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendBand, { backgroundColor: Colors.secondary + '30' }]} />
        <Text style={styles.legendText}>Faixa normal (P3–P97)</Text>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { padding: 20, paddingTop: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 16 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backButtonText: { fontSize: 24, color: Colors.text, fontWeight: '600' },
  headerTitles: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  headerSpacer: { width: 40 },
  // Tabs
  tabRow: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
    backgroundColor: Colors.glass, borderRadius: 20, padding: 4,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 16, alignItems: 'center' },
  tabActiveWeight: { backgroundColor: Colors.primary },
  tabActiveHeight: { backgroundColor: Colors.secondary },
  tabText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  // Warning
  warningCard: {
    backgroundColor: Colors.cardWarm, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.borderWarm, marginBottom: 16, gap: 12,
  },
  warningText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  warningButton: { backgroundColor: Colors.primary, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' },
  warningButtonText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  // Summary
  summaryCard: {
    backgroundColor: Colors.cardWarm, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.borderWarm, marginBottom: 16,
    shadowColor: Colors.shadowWarm, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 3,
  },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 32, fontWeight: '800' },
  summaryDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  // Chart card
  chartCard: {
    backgroundColor: Colors.cardWarm, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: Colors.borderWarm, marginBottom: 16,
    shadowColor: Colors.shadowWarm, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 3,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  chartSubtitle: { fontSize: 11, color: Colors.textTertiary },
  resetBtn: { backgroundColor: Colors.primary + '20', borderRadius: 99, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.borderPrimary },
  resetBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  chartContainer: { marginHorizontal: -4, marginTop: 8 },
  emptyChartText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 32 },
  zoomHint: { fontSize: 10, color: Colors.textTertiary, textAlign: 'center', marginTop: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 20, height: 2.5, borderRadius: 2 },
  legendBand: { width: 20, height: 10, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.textSecondary },
  // List
  listCard: {
    backgroundColor: Colors.cardWarm, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: Colors.borderWarm, marginBottom: 16,
    shadowColor: Colors.shadowWarm, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 3,
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.neutral },
  listItemLeft: { flex: 1 },
  listValue: { fontSize: 17, fontWeight: '700', color: Colors.text },
  listDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  deleteButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  deleteButtonText: { fontSize: 12, color: Colors.error, fontWeight: '700' },
  // Add button
  addButton: {
    backgroundColor: Colors.primary, borderRadius: 99, paddingVertical: 15, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  addButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.glassDark, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden' },
  menuHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 16, marginBottom: 8 },
  weightRow: { flexDirection: 'row', gap: 10 },
  weightInput: { flex: 1, backgroundColor: Colors.glass, borderRadius: 16, padding: 14, fontSize: 18, borderWidth: 1, borderColor: Colors.glassBorder, color: Colors.text, fontWeight: '600' },
  unitSelector: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden' },
  unitButton: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center' },
  unitButtonActive: { backgroundColor: Colors.primary },
  unitButtonText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  unitButtonTextActive: { color: Colors.white },
  previewText: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, marginLeft: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass, alignItems: 'center' },
  cancelButtonText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: Colors.primary, borderRadius: 16, padding: 14, alignItems: 'center' },
  confirmButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
