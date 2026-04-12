import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { differenceInDays, parseISO } from 'date-fns';
import { Colors } from '@/constants/Colors';
import { GradientBackground } from '@/components/GradientBackground';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/lib/user-context';
import { scheduleUpcomingMilestoneNotifications } from '@/lib/notifications';

type MarcoTipo = 'vacina' | 'salto' | 'desenvolvimento';

interface Marco {
  tipo: MarcoTipo;
  titulo: string;
  descricao: string;
  fonte: { texto: string; url: string };
}

type GrupoStatus = 'passado' | 'atual' | 'futuro';

interface GrupoIdade {
  id: string;
  label: string;
  sublabel: string;
  diasMin: number; // idade mínima do bebê (em dias) para entrar nesta fase
  marcos: Marco[];
}

const PNI = {
  texto: 'Ministério da Saúde / PNI',
  url: 'https://www.gov.br/saude/pt-br/vacinacao/calendario',
};

const PNI_MENACWY = {
  texto: 'MS — Nota MenACWY 2025',
  url: 'https://www.gov.br/saude/pt-br/assuntos/noticias/2025/junho/pni-passa-oferecer-vacina-meningococica-acwy-aos-12-meses',
};

const SBP = {
  texto: 'SBP — Guia de Puericultura',
  url: 'https://www.sbp.com.br/puericultura/',
};

const SBP_ALIMENTACAO = {
  texto: 'SBP — Alimentação nos Primeiros Anos',
  url: 'https://www.sbp.com.br/revalidacoes/detalhe/news/manual-de-alimentacao-nutricao-do-lactente-ao-adolescente/',
};

const OMS = {
  texto: 'OMS — Child Growth Standards',
  url: 'https://www.who.int/tools/child-growth-standards',
};

const WW = (n: number) => ({
  texto: `Wonder Weeks — Salto ${n}`,
  url: `https://www.thewonderweeks.com/mental-leap-${n}/`,
});

const BUTANTAN = {
  texto: 'Instituto Butantan — Vacina Dengue',
  url: 'https://butantan.gov.br/noticias/instituto-butantan-dara-inicio-a-entrega-de-13-milhao-de-doses-da-vacina-contra-a-dengue-ao-ministerio-da-saude',
};

const GRUPOS: GrupoIdade[] = [
  {
    id: 'nascimento',
    label: 'Ao Nascer',
    sublabel: 'Primeiros dias de vida',
    diasMin: 0,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'BCG',
        descricao:
          'Vacina intradérmica contra tuberculose. Aplicada preferencialmente nas primeiras 12h de vida. Protege contra formas graves da doença, como meningite tuberculosa.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Hepatite B (1ª dose)',
        descricao:
          'Aplicada preferencialmente nas primeiras 12h de vida. Quanto mais cedo aplicada, maior a proteção contra a transmissão vertical (mãe → bebê).',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Nirsevimabe (RSV) — alto risco',
        descricao:
          'Anticorpo monoclonal contra o Vírus Sincicial Respiratório (VSR), incorporado ao PNI em 2025. Indicado para recém-nascidos prematuros (<36 semanas) e bebês de alto risco (cardiopatias, imunodeficiências). Dose única ao nascer ou no início da temporada de VSR. Disponível nos CIIEs.',
        fonte: PNI,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Reflexos primitivos',
        descricao:
          'Presentes ao nascer: reflexo de sucção, de Moro (susto ao barulho), preensão palmar e plantar, e rooting (vira a cabeça em busca do seio). Indicam integridade do sistema nervoso central.',
        fonte: SBP,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Visão e audição iniciais',
        descricao:
          'Enxerga melhor entre 20–30 cm de distância — exatamente o rosto de quem amamenta. Reage a sons altos e já reconhece a voz da mãe, ouvida durante toda a gestação.',
        fonte: OMS,
      },
    ],
  },
  {
    id: '1m',
    label: '1 Mês',
    sublabel: '4 semanas',
    diasMin: 21,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'Hepatite B (2ª dose)',
        descricao:
          'Segunda dose da vacina contra hepatite B. Reforça a proteção iniciada ao nascer.',
        fonte: PNI,
      },
      {
        tipo: 'salto',
        titulo: 'Salto 1 — Mudança nas Sensações (semana 5)',
        descricao:
          'O bebê passa a perceber o mundo de forma mais intensa: mais sensível a luz, sons e toque. Costuma ficar mais choroso e querer mais colo. Após o salto, fica visivelmente mais alerta e curioso com o ambiente.',
        fonte: WW(1),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Controle de cabeça',
        descricao:
          'Levanta a cabeça por breves instantes quando está de bruços (tummy time). Ainda precisa de apoio — a musculatura do pescoço está em formação.',
        fonte: OMS,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Primeiros sorrisos sociais',
        descricao:
          'Por volta de 6 semanas, surgem os primeiros sorrisos em resposta ao rosto e à voz de quem cuida. Marco importante do desenvolvimento social e emocional.',
        fonte: SBP,
      },
    ],
  },
  {
    id: '2m',
    label: '2 Meses',
    sublabel: '8 semanas',
    diasMin: 49,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'Pentavalente (DTP+Hib+HepB) — 1ª dose',
        descricao:
          'Protege contra difteria, tétano, coqueluche, Haemophilus influenzae tipo b e hepatite B. Uma das vacinas mais importantes do calendário infantil.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'VIP — Poliomielite Inativada — 1ª dose',
        descricao:
          'Vacina injetável contra poliomielite (paralisia infantil). Nas séries primárias, é preferida à vacina oral.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Rotavírus (VRH) — 1ª dose',
        descricao:
          'Vacina oral contra o rotavírus, principal causa de gastroenterite grave em lactentes. Deve ser administrada até os 3 meses e 15 dias.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Pneumocócica 10-valente (PCV10) — 1ª dose',
        descricao:
          'Protege contra 10 sorotipos de pneumococo, responsável por pneumonia, meningite e otite média aguda.',
        fonte: PNI,
      },
      {
        tipo: 'salto',
        titulo: 'Salto 2 — Padrões (semana 8)',
        descricao:
          'O bebê começa a identificar padrões: visuais, sonoros e de movimento. Fica fascinado por estampas de alto contraste e rostos humanos. Após o salto, sorri mais, vocaliza e acompanha objetos em movimento com os olhos por 180°.',
        fonte: WW(2),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Vocalizações e sorriso estabelecido',
        descricao:
          'Emite sons suaves (cooing): "aaah", "ooh". Sorri socialmente de forma consistente. Segue objetos com os olhos por 180°.',
        fonte: OMS,
      },
    ],
  },
  {
    id: '3m',
    label: '3 Meses',
    sublabel: '12 semanas',
    diasMin: 77,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'Pentavalente — 2ª dose',
        descricao: 'Segunda dose da vacina pentavalente (DTP+Hib+HepB).',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'VIP — Poliomielite Inativada — 2ª dose',
        descricao: 'Segunda dose da vacina contra poliomielite.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Rotavírus (VRH) — 2ª dose',
        descricao:
          'Segunda e última dose da vacina oral contra rotavírus. Deve ser aplicada até 3 meses e 15 dias — após essa idade, não é mais recomendada.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Meningocócica C — 1ª dose',
        descricao:
          'Vacina conjugada contra meningite e septicemia causada por Neisseria meningitidis sorogrupo C.',
        fonte: PNI,
      },
      {
        tipo: 'salto',
        titulo: 'Salto 3 — Transições Suaves (semana 12)',
        descricao:
          'O bebê passa a perceber transições suaves entre estados: de luz para sombra, de som para silêncio, de movimento lento para rápido. Entende que o mundo é feito de fluxos contínuos, não de eventos isolados. Fica fascinado por móbiles em movimento.',
        fonte: WW(3),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Cabeça firme e gargalhadas',
        descricao:
          'Sustenta a cabeça com firmeza quando sentado com apoio. Ri alto pela primeira vez. Abre as mãos voluntariamente e tenta alcançar objetos.',
        fonte: OMS,
      },
    ],
  },
  {
    id: '4m',
    label: '4 Meses',
    sublabel: '16 semanas',
    diasMin: 112,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'Pentavalente — 3ª dose',
        descricao:
          'Terceira e última dose da série primária da vacina pentavalente.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'VIP — Poliomielite Inativada — 3ª dose',
        descricao:
          'Terceira dose da série primária da vacina contra poliomielite.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Pneumocócica 10-valente (PCV10) — 2ª dose',
        descricao: 'Segunda dose da vacina pneumocócica.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Meningocócica C — 2ª dose',
        descricao:
          'Segunda dose da série primária da vacina conjugada contra meningite C.',
        fonte: PNI,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Rola e explora com as mãos',
        descricao:
          'Muitos bebês começam a rolar de bruços para a barriga (e vice-versa). Segura objetos com firmeza e os leva à boca para explorar. Reconhece rostos familiares e demonstra preferência por eles.',
        fonte: OMS,
      },
    ],
  },
  {
    id: '4m5',
    label: '4,5 Meses',
    sublabel: '19 semanas',
    diasMin: 126,
    marcos: [
      {
        tipo: 'salto',
        titulo: 'Salto 4 — Eventos (semana 19)',
        descricao:
          'Considerado um dos saltos mais intensos: o bebê percebe que o mundo é composto de eventos com início, meio e fim. Pode ser extremamente choroso, querer colo a todo momento e mamar quase continuamente. Após o salto, explora sequências de ações e relações de causa e efeito.',
        fonte: WW(4),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Senta com apoio',
        descricao:
          'Senta apoiado por almofadas ou pelas mãos do adulto. Demonstra interesse crescente por comida — pode ser sinal de prontidão emergente para a introdução alimentar.',
        fonte: SBP,
      },
    ],
  },
  {
    id: '6m',
    label: '6 Meses',
    sublabel: '24 semanas',
    diasMin: 168,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'Influenza (Gripe) — 1ª dose',
        descricao:
          'A partir de 6 meses, a vacina contra gripe deve ser aplicada anualmente. Na primeira vez (abaixo de 9 anos sem vacinação prévia), são duas doses com intervalo de 30 dias.',
        fonte: PNI,
      },
      {
        tipo: 'salto',
        titulo: 'Salto 5 — Relações (semana 26)',
        descricao:
          'O bebê compreende relações espaciais: dentro, fora, em cima, ao lado, longe, perto. Surge a angústia de separação — chora quando a mãe sai do campo visual. É normal e esperado. Após o salto, brinca de peek-a-boo e explora relações físicas entre objetos.',
        fonte: WW(5),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Senta sem apoio e balbucia',
        descricao:
          'Senta sozinho por períodos crescentes. Balbucia consoantes: "ba-ba", "da-da", "ma-ma" — ainda sem associar ao significado. Demonstra grande interesse por alimentos.',
        fonte: OMS,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Início da introdução alimentar',
        descricao:
          'A SBP e a OMS recomendam iniciar a alimentação complementar aos 6 meses completos, mantendo o aleitamento materno. Sinais de prontidão: senta com apoio, perdeu o reflexo de extrusão e demonstra interesse por comida.',
        fonte: SBP_ALIMENTACAO,
      },
    ],
  },
  {
    id: '7m',
    label: '7 Meses',
    sublabel: '28–32 semanas',
    diasMin: 196,
    marcos: [
      {
        tipo: 'desenvolvimento',
        titulo: 'Engatinha ou arrasta',
        descricao:
          'Muitos bebês começam a arrastar-se ou engatinhar. Alguns pulam essa etapa — variação normal. A mobilidade aumenta a exploração do ambiente e o aprendizado.',
        fonte: OMS,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Estranhamento',
        descricao:
          'A angústia de separação e o estranhamento com estranhos se intensificam. Chora ao ser pego por pessoas desconhecidas — sinal de que o vínculo de apego com os cuidadores principais está bem formado.',
        fonte: SBP,
      },
    ],
  },
  {
    id: '8m',
    label: '8–8,5 Meses',
    sublabel: '37 semanas',
    diasMin: 224,
    marcos: [
      {
        tipo: 'salto',
        titulo: 'Salto 6 — Categorias (semana 37)',
        descricao:
          'O bebê começa a organizar o mundo em categorias: animais, alimentos, objetos que se movem, coisas que fazem barulho. É um salto cognitivo enorme — a base do pensamento abstrato. Após o salto, demonstra muito mais curiosidade intelectual.',
        fonte: WW(6),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Fica de pé com apoio',
        descricao:
          'Puxa nos móveis para ficar de pé. Imita sons, gestos e expressões faciais. Responde ao próprio nome de forma consistente. Entende palavras simples como "não" e "tchau".',
        fonte: OMS,
      },
    ],
  },
  {
    id: '9m',
    label: '9 Meses',
    sublabel: '36–40 semanas',
    diasMin: 259,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'Febre Amarela (1ª dose)',
        descricao:
          'Aplicada aos 9 meses. Uma única dose já confere imunidade permanente na maioria das pessoas. Reforço único aos 4 anos.',
        fonte: PNI,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Pinça fina emergente',
        descricao:
          'Começa a desenvolver a pinça fina — pega objetos pequenos usando polegar e indicador. Marco neurológico importante, avaliado em consultas de puericultura.',
        fonte: SBP,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Comunicação intencional',
        descricao:
          'Pode dizer "mamã" ou "papá" com ou sem sentido. Acena tchau. Aponta para objetos de interesse (gesto proto-declarativo) — um dos preditores mais importantes do desenvolvimento de linguagem.',
        fonte: SBP,
      },
    ],
  },
  {
    id: '10m',
    label: '10–11 Meses',
    sublabel: '46 semanas',
    diasMin: 301,
    marcos: [
      {
        tipo: 'salto',
        titulo: 'Salto 7 — Sequências (semana 46)',
        descricao:
          'O bebê percebe que pode realizar sequências de ações para atingir um objetivo: empilhar, encaixar, colocar dentro. É o início do pensamento causal ("se eu fizer X, acontece Y"). Resolve problemas simples de forma independente.',
        fonte: WW(7),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Anda apoiado (cruising)',
        descricao:
          'Anda se apoiando em móveis. Os primeiros passos sozinhos costumam surgir entre 9 e 12 meses — variação normal até 18 meses.',
        fonte: OMS,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Primeiras palavras',
        descricao:
          'Alguns bebês dizem 1–3 palavras com sentido. Entende muito mais do que consegue expressar — compreende instruções simples de uma etapa.',
        fonte: SBP,
      },
    ],
  },
  {
    id: '12m',
    label: '12 Meses',
    sublabel: '1 ano',
    diasMin: 350,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'SCR — Sarampo, Caxumba, Rubéola (1ª dose)',
        descricao:
          'Vacina tríplice viral. Essencial para a proteção individual e para a imunidade coletiva que evita epidemias de sarampo.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Pneumocócica 10-valente — Reforço',
        descricao:
          'Dose de reforço da vacina pneumocócica. Garante proteção prolongada contra pneumococo.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Meningocócica ACWY — Reforço',
        descricao:
          'A partir de julho de 2025, o reforço dos 12 meses passou de Meningocócica C para Meningocócica ACWY (tetravalente). A mudança reflete o aumento dos sorogrupos W e Y no Brasil, especialmente no Sul. Protege contra os sorogrupos A, C, W e Y.',
        fonte: PNI_MENACWY,
      },
      {
        tipo: 'vacina',
        titulo: 'COVID-19',
        descricao:
          'Incorporada formalmente ao Calendário Nacional em 2025 para crianças de 6 meses a 4 anos. Consulte a UBS para o esquema e a vacina disponível na sua região.',
        fonte: PNI,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Primeiras palavras com sentido',
        descricao:
          'Vocabulário esperado de 1–5 palavras com significado. Anda sozinho ou está próximo disso. Usa objetos corretamente e aponta para mostrar algo interessante (atenção compartilhada).',
        fonte: SBP,
      },
    ],
  },
  {
    id: '13m',
    label: '13 Meses',
    sublabel: '55 semanas',
    diasMin: 385,
    marcos: [
      {
        tipo: 'salto',
        titulo: 'Salto 8 — Programas (semana 55)',
        descricao:
          'A criança começa a criar "programas" mentais: planos flexíveis com múltiplos passos. Entende que existem várias maneiras de atingir o mesmo objetivo. Surge forte desejo de independência e teimosia intensa — quer fazer tudo "ela mesma".',
        fonte: WW(8),
      },
    ],
  },
  {
    id: '15m',
    label: '15 Meses',
    sublabel: '1 ano e 3 meses',
    diasMin: 434,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'DTP — 1º Reforço',
        descricao:
          'Primeiro reforço da vacina contra difteria, tétano e coqueluche. Mantém a imunidade obtida na série primária.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'VIP — Poliomielite Inativada — 1º Reforço',
        descricao:
          'A partir de 2025, o reforço dos 15 meses passou a usar a vacina injetável (VIP) em vez das gotinhas orais (VOP). Encerra o uso rotineiro da vacina oral no calendário infantil.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Hepatite A (1ª dose)',
        descricao:
          'Protege contra hepatite A (doença fecal-oral). Aplicada aos 15 meses no calendário do SUS.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Varicela (Catapora) — 1ª dose',
        descricao:
          'Vacina contra varicela. Altamente eficaz na prevenção da doença e de suas complicações graves.',
        fonte: PNI,
      },
      {
        tipo: 'salto',
        titulo: 'Salto 9 — Princípios (semana 64)',
        descricao:
          'Por volta de 14–15 meses. A criança começa a entender princípios abstratos: o que é "meu" vs. "de outro", o conceito de compartilhar, de "certo" e "errado". Surgem as primeiras noções de empatia.',
        fonte: WW(9),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Anda bem e começa a correr',
        descricao:
          'Anda com firmeza e começa a correr (com quedas frequentes). Vocabulário de 5–15 palavras. Alimenta-se com colher com derramamentos. Empilha 2–4 blocos.',
        fonte: OMS,
      },
    ],
  },
  {
    id: '18m',
    label: '17–18 Meses',
    sublabel: '75 semanas',
    diasMin: 518,
    marcos: [
      {
        tipo: 'salto',
        titulo: 'Salto 10 — Sistemas (semana 75)',
        descricao:
          'O décimo e último salto descrito no livro Wonder Weeks. A criança começa a compreender sistemas complexos: hierarquias, relações de poder, valores, pertencimento a grupos. É o início da consciência de si mesma como indivíduo com valores próprios.',
        fonte: WW(10),
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Explosão de vocabulário',
        descricao:
          'Entre 18 e 24 meses ocorre a "explosão de vocabulário". Vocabulário esperado: 15–50+ palavras aos 18 meses. Alerta: se ainda não usa pelo menos 6 palavras com sentido aos 18 meses, comunicar ao pediatra.',
        fonte: SBP,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Jogo simbólico (faz de conta)',
        descricao:
          'Começa a brincar de faz de conta: alimenta uma boneca, fala ao telefone de brinquedo. Marco central do desenvolvimento cognitivo, linguístico e social — base para o aprendizado futuro.',
        fonte: SBP,
      },
    ],
  },
  {
    id: '24m',
    label: '2 Anos',
    sublabel: '24 meses',
    diasMin: 700,
    marcos: [
      {
        tipo: 'desenvolvimento',
        titulo: 'Frases de 2 palavras',
        descricao:
          'Combina duas palavras para comunicar ("mamã água", "mais bolo"). Vocabulário esperado: 50+ palavras. Alerta: se não combina duas palavras aos 24 meses, buscar avaliação de fala e audição.',
        fonte: SBP,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Autonomia e desfralde',
        descricao:
          'Corre bem, sobe e desce escadas. Quer fazer tudo sozinha. Entre 2 e 3 anos a maioria fica pronta para o desfralde — sinais: percebe que está molhada, fica seca por 1,5–2h, consegue comunicar a necessidade.',
        fonte: SBP,
      },
    ],
  },
  {
    id: '4a',
    label: '4 Anos',
    sublabel: '48 meses',
    diasMin: 1400,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'DTP — 2º Reforço',
        descricao:
          'Segundo reforço da vacina contra difteria, tétano e coqueluche.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'VOP — Poliomielite Oral — 2º Reforço',
        descricao:
          'Segunda dose de reforço contra poliomielite.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'SCR — Sarampo, Caxumba, Rubéola (2ª dose)',
        descricao:
          'Segunda dose da vacina tríplice viral. Garante cobertura imunológica de ~99% das crianças.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Varicela — 2ª dose',
        descricao:
          'Segunda dose da vacina contra catapora. Aumenta a proteção para ~98%.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Febre Amarela — Reforço',
        descricao:
          'Dose única de reforço da vacina contra febre amarela. Após esse reforço, a proteção é considerada vitalícia.',
        fonte: PNI,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Desenvolvimento cognitivo e social',
        descricao:
          'Fase do "por quê?" — faz perguntas constantes. Conta pequenas histórias com início, meio e fim. Brinca cooperativamente com outras crianças. Começa a entender e respeitar regras de jogos.',
        fonte: SBP,
      },
    ],
  },
  {
    id: '5a',
    label: '5 Anos',
    sublabel: '60 meses',
    diasMin: 1750,
    marcos: [
      {
        tipo: 'vacina',
        titulo: 'Influenza — Dose anual',
        descricao:
          'A partir dos 5 anos, a vacina contra gripe é administrada como dose única anual. Importante especialmente para crianças com comorbidades.',
        fonte: PNI,
      },
      {
        tipo: 'vacina',
        titulo: 'Dengue (Butantan-DV) — previsão 2026',
        descricao:
          'Vacina contra dengue desenvolvida pelo Instituto Butantan. Dose única. Incorporação ao PNI prevista a partir de 2026, com foco inicial em adolescentes (15+) e expansão gradual. Eficácia de ~75% contra dengue sintomática e >90% contra formas graves.',
        fonte: BUTANTAN,
      },
      {
        tipo: 'desenvolvimento',
        titulo: 'Pré-alfabetização',
        descricao:
          'A maioria das crianças está pronta para o aprendizado formal de leitura e escrita. Reconhece letras, conta 10+ objetos com correspondência um a um, faz desenhos reconhecíveis. Base consolidada para a alfabetização escolar.',
        fonte: SBP,
      },
    ],
  },
];

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

function calcularStatus(
  idadeEmDias: number | null,
  grupoIndex: number,
): GrupoStatus {
  if (idadeEmDias === null) return 'futuro';
  const grupo = GRUPOS[grupoIndex];
  const proximo = GRUPOS[grupoIndex + 1];
  if (!proximo) {
    return idadeEmDias >= grupo.diasMin ? 'atual' : 'futuro';
  }
  if (idadeEmDias >= proximo.diasMin) return 'passado';
  if (idadeEmDias >= grupo.diasMin) return 'atual';
  return 'futuro';
}

export default function CalendarioScreen() {
  const { effectiveUserId } = useUserContext();
  const [filtro, setFiltro] = useState<MarcoTipo | 'todos'>('todos');
  const [idadeEmDias, setIdadeEmDias] = useState<number | null>(null);

  useEffect(() => {
    if (!effectiveUserId) return;
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
              GRUPOS.map((g) => ({ id: g.id, label: g.label, diasMin: g.diasMin }))
            );
          }
        }
      });
  }, [effectiveUserId]);

  const gruposFiltrados = GRUPOS.map((g) => ({
    ...g,
    marcos:
      filtro === 'todos' ? g.marcos : g.marcos.filter((m) => m.tipo === filtro),
  })).filter((g) => g.marcos.length > 0);

  return (
    <GradientBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace('/(tabs)')
          }
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Calendário</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <Text style={styles.introText}>
          Acompanhe os marcos previstos do desenvolvimento do bebê, os saltos
          cognitivos e o calendário nacional de vacinação.
        </Text>

        {/* Legenda */}
        <View style={styles.legendaRow}>
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
            <View key={tipo} style={styles.legendaItem}>
              <View
                style={[styles.legendaDot, { backgroundColor: cfg.cor }]}
              />
              <Text style={styles.legendaText}>{cfg.label}</Text>
            </View>
          ))}
        </View>

        {/* Filtros */}
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
              style={[
                styles.filtroBtn,
                filtro === f.id && styles.filtroBtnAtivo,
              ]}
            >
              <Text
                style={[
                  styles.filtroText,
                  filtro === f.id && styles.filtroTextAtivo,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Timeline */}
        {gruposFiltrados.map((grupo) => {
          const originalIndex = GRUPOS.findIndex((g) => g.id === grupo.id);
          const status = calcularStatus(idadeEmDias, originalIndex);
          const isAtual = status === 'atual';
          const isPassado = status === 'passado';

          return (
          <View key={grupo.id} style={[styles.grupo, isPassado && styles.grupoPassado]}>
            {/* Cabeçalho do grupo */}
            <View style={styles.grupoHeader}>
              <View style={[styles.grupoHeaderLine, isAtual && styles.grupoHeaderLineAtual]} />
              <View style={styles.grupoHeaderLabelBox}>
                {isAtual && (
                  <View style={styles.agoraBadge}>
                    <Text style={styles.agoraBadgeText}>📍 AGORA</Text>
                  </View>
                )}
                {isPassado && (
                  <View style={styles.passadoBadge}>
                    <Text style={styles.passadoBadgeText}>✓ CONCLUÍDO</Text>
                  </View>
                )}
                <Text style={[styles.grupoLabel, isAtual && styles.grupoLabelAtual, isPassado && styles.grupoLabelPassado]}>{grupo.label}</Text>
                <Text style={styles.grupoSublabel}>{grupo.sublabel}</Text>
              </View>
            </View>

            {/* Marcos do grupo */}
            <View style={styles.marcosContainer}>
              {grupo.marcos.map((marco, mi) => {
                const cfg = TIPO_CONFIG[marco.tipo];
                return (
                  <View
                    key={mi}
                    style={[
                      styles.marcoCard,
                      { backgroundColor: cfg.corFundo },
                      isPassado && styles.marcoCardPassado,
                    ]}
                  >
                    {/* Barra lateral colorida */}
                    <View
                      style={[
                        styles.marcoSidebar,
                        { backgroundColor: cfg.cor },
                      ]}
                    />
                    <View style={styles.marcoBody}>
                      {/* Badge de tipo */}
                      <View
                        style={[
                          styles.marcoBadge,
                          {
                            borderColor: cfg.cor,
                            backgroundColor: `${cfg.cor}18`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.marcoBadgeText,
                            { color: cfg.corTexto },
                          ]}
                        >
                          {cfg.label.toUpperCase()}
                        </Text>
                      </View>
                      {/* Título */}
                      <Text
                        style={[styles.marcoTitulo, { color: cfg.corTexto }]}
                      >
                        {marco.titulo}
                      </Text>
                      {/* Descrição */}
                      <Text style={styles.marcoDescricao}>
                        {marco.descricao}
                      </Text>
                      {/* Fonte */}
                      <TouchableOpacity
                        onPress={() => Linking.openURL(marco.fonte.url)}
                        style={styles.fonteBtn}
                      >
                        <Text style={[styles.fonteBtnText, { color: cfg.cor }]}>
                          ↗ {marco.fonte.texto}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
          );
        })}

        {/* Rodapé */}
        <View style={styles.rodape}>
          <Text style={styles.rodapeTitle}>FONTES</Text>
          <Text style={styles.rodapeText}>
            • Calendário Nacional de Vacinação 2025 — Ministério da Saúde / PNI
          </Text>
          <Text style={styles.rodapeText}>
            • SBP/SBIm — Calendário de Vacinação 2025–2026
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
    paddingTop: 8,
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
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
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
  filtroTextAtivo: {
    color: '#fff',
  },
  grupo: {
    marginBottom: 24,
  },
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
  grupoHeaderLabelBox: {
    alignItems: 'flex-end',
  },
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
  grupoPassado: {
    opacity: 0.65,
  },
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
  marcoCardPassado: {
    opacity: 0.8,
  },
  grupoSublabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  marcosContainer: {
    gap: 10,
  },
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
