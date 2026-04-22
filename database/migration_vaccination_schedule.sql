-- Calendário de desenvolvimento infantil: vacinas, marcos e saltos cognitivos
-- Fonte principal (vacinas): Calendário Nacional de Vacinação 2026 — Ministério da Saúde / PNI
-- https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca

CREATE TABLE IF NOT EXISTS ladoalado.calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id text NOT NULL,
  age_group_label text NOT NULL,
  age_group_sublabel text NOT NULL,
  age_days_min integer NOT NULL,
  type text NOT NULL CHECK (type IN ('vacina', 'salto', 'desenvolvimento')),
  title text NOT NULL,
  description text NOT NULL,
  reference_text text NOT NULL,
  reference_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ladoalado.calendar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read calendar_items"
  ON ladoalado.calendar_items FOR SELECT USING (true);

CREATE INDEX calendar_items_age_days_min_idx ON ladoalado.calendar_items (age_days_min, display_order);

-- =============================================================================
-- SEED: todos os itens do calendário
-- display_order: vacinas 10–90, saltos 100–190, desenvolvimento 200–290
-- =============================================================================

INSERT INTO ladoalado.calendar_items
  (age_group_id, age_group_label, age_group_sublabel, age_days_min, type, title, description, reference_text, reference_url, display_order)
VALUES

-- ===================== AO NASCER =====================
('nascimento', 'Ao Nascer', 'Primeiros dias de vida', 0,
 'vacina', 'Hepatite B — 1 dose',
 'Protege contra hepatite B e hepatite D. Aplicada preferencialmente nas primeiras 12h de vida. Quanto mais cedo, maior a proteção contra a transmissão vertical (mãe → bebê).',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('nascimento', 'Ao Nascer', 'Primeiros dias de vida', 0,
 'vacina', 'BCG — 1 dose',
 'Vacina intradérmica. Protege contra formas graves e disseminadas da tuberculose (como meningite tuberculosa) e tem efeito protetor contra a hanseníase. Aplicada preferencialmente nas primeiras 12h de vida.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 20),

('nascimento', 'Ao Nascer', 'Primeiros dias de vida', 0,
 'desenvolvimento', 'Reflexos primitivos',
 'Presentes ao nascer: reflexo de sucção, de Moro (susto ao barulho), preensão palmar e plantar, e rooting (vira a cabeça em busca do seio). Indicam integridade do sistema nervoso central.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 200),

('nascimento', 'Ao Nascer', 'Primeiros dias de vida', 0,
 'desenvolvimento', 'Visão e audição iniciais',
 'Enxerga melhor entre 20–30 cm de distância — exatamente o rosto de quem amamenta. Reage a sons altos e já reconhece a voz da mãe, ouvida durante toda a gestação.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 210),

-- ===================== 1 MÊS =====================
('1m', '1 Mês', '4 semanas', 21,
 'salto', 'Salto 1 — Mudança nas Sensações (semana 5)',
 'O bebê passa a perceber o mundo de forma mais intensa: mais sensível a luz, sons e toque. Costuma ficar mais choroso e querer mais colo. Após o salto, fica visivelmente mais alerta e curioso com o ambiente.',
 'Wonder Weeks — Salto 1',
 'https://www.thewonderweeks.com/mental-leap-1/',
 100),

('1m', '1 Mês', '4 semanas', 21,
 'desenvolvimento', 'Controle de cabeça',
 'Levanta a cabeça por breves instantes quando está de bruços (tummy time). Ainda precisa de apoio — a musculatura do pescoço está em formação.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

('1m', '1 Mês', '4 semanas', 21,
 'desenvolvimento', 'Primeiros sorrisos sociais',
 'Por volta de 6 semanas, surgem os primeiros sorrisos em resposta ao rosto e à voz de quem cuida. Marco importante do desenvolvimento social e emocional.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 210),

-- ===================== 2 MESES =====================
('2m', '2 Meses', '8 semanas', 49,
 'vacina', 'Penta (DTP+Hib+HB) — 1ª dose',
 'Protege contra difteria, tétano, coqueluche, infecções pelo H. influenzae tipo b e hepatite B. Uma das vacinas mais importantes do calendário infantil.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('2m', '2 Meses', '8 semanas', 49,
 'vacina', 'Poliomielite Inativada (VIP) — 1ª dose',
 'Vacina injetável contra poliomielite (paralisia infantil). Nas séries primárias, é preferida à vacina oral.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 20),

('2m', '2 Meses', '8 semanas', 49,
 'vacina', 'Pneumocócica 10-valente (PCV10) — 1ª dose',
 'Protege contra 10 sorotipos de pneumococo, responsável por pneumonia, meningite e otite média aguda.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 30),

('2m', '2 Meses', '8 semanas', 49,
 'vacina', 'Rotavírus Humano (VRH) — 1ª dose',
 'Vacina oral contra rotavírus, principal causa de gastroenterite grave em lactentes. A 1ª dose deve ser aplicada entre 1 mês 15 dias e 11 meses 29 dias. Se não recebida no período, perde-se a oportunidade de vacinação.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 40),

('2m', '2 Meses', '8 semanas', 49,
 'salto', 'Salto 2 — Padrões (semana 8)',
 'O bebê começa a identificar padrões: visuais, sonoros e de movimento. Fica fascinado por estampas de alto contraste e rostos humanos. Após o salto, sorri mais, vocaliza e acompanha objetos em movimento com os olhos por 180°.',
 'Wonder Weeks — Salto 2',
 'https://www.thewonderweeks.com/mental-leap-2/',
 100),

('2m', '2 Meses', '8 semanas', 49,
 'desenvolvimento', 'Vocalizações e sorriso estabelecido',
 'Emite sons suaves (cooing): "aaah", "ooh". Sorri socialmente de forma consistente. Segue objetos com os olhos por 180°.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

-- ===================== 3 MESES =====================
('3m', '3 Meses', '12 semanas', 77,
 'vacina', 'Meningocócica C — 1ª dose',
 'Vacina conjugada contra meningite e septicemia causada por Neisseria meningitidis sorogrupo C. Protege contra doenças meningocócicas (meningite, encefalite, meningoencefalite) pelo meningococo tipo C.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('3m', '3 Meses', '12 semanas', 77,
 'salto', 'Salto 3 — Transições Suaves (semana 12)',
 'O bebê passa a perceber transições suaves entre estados: de luz para sombra, de som para silêncio, de movimento lento para rápido. Entende que o mundo é feito de fluxos contínuos, não de eventos isolados. Fica fascinado por móbiles em movimento.',
 'Wonder Weeks — Salto 3',
 'https://www.thewonderweeks.com/mental-leap-3/',
 100),

('3m', '3 Meses', '12 semanas', 77,
 'desenvolvimento', 'Cabeça firme e gargalhadas',
 'Sustenta a cabeça com firmeza quando sentado com apoio. Ri alto pela primeira vez. Abre as mãos voluntariamente e tenta alcançar objetos.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

-- ===================== 4 MESES =====================
('4m', '4 Meses', '16 semanas', 112,
 'vacina', 'Penta (DTP+Hib+HB) — 2ª dose',
 'Segunda dose da vacina contra difteria, tétano, coqueluche, H. influenzae tipo b e hepatite B.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('4m', '4 Meses', '16 semanas', 112,
 'vacina', 'Poliomielite Inativada (VIP) — 2ª dose',
 'Segunda dose da série primária da vacina contra poliomielite (paralisia infantil).',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 20),

('4m', '4 Meses', '16 semanas', 112,
 'vacina', 'Pneumocócica 10-valente (PCV10) — 2ª dose',
 'Segunda dose da vacina pneumocócica. Reforça a proteção contra doenças pneumocócicas invasivas.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 30),

('4m', '4 Meses', '16 semanas', 112,
 'vacina', 'Rotavírus Humano (VRH) — 2ª dose',
 'Segunda e última dose da vacina oral contra rotavírus. A 2ª dose deve ser aplicada entre 3 meses 15 dias e 23 meses 29 dias de idade.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 40),

('4m', '4 Meses', '16 semanas', 112,
 'desenvolvimento', 'Rola e explora com as mãos',
 'Muitos bebês começam a rolar de bruços para a barriga (e vice-versa). Segura objetos com firmeza e os leva à boca para explorar. Reconhece rostos familiares e demonstra preferência por eles.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

-- ===================== 4,5 MESES =====================
('4m5', '4,5 Meses', '19 semanas', 126,
 'salto', 'Salto 4 — Eventos (semana 19)',
 'Considerado um dos saltos mais intensos: o bebê percebe que o mundo é composto de eventos com início, meio e fim. Pode ser extremamente choroso, querer colo a todo momento e mamar quase continuamente. Após o salto, explora sequências de ações e relações de causa e efeito.',
 'Wonder Weeks — Salto 4',
 'https://www.thewonderweeks.com/mental-leap-4/',
 100),

('4m5', '4,5 Meses', '19 semanas', 126,
 'desenvolvimento', 'Senta com apoio',
 'Senta apoiado por almofadas ou pelas mãos do adulto. Demonstra interesse crescente por comida — pode ser sinal de prontidão emergente para a introdução alimentar.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 200),

-- ===================== 5 MESES =====================
('5m', '5 Meses', '20 semanas', 140,
 'vacina', 'Meningocócica C — 2ª dose',
 'Segunda dose da vacina conjugada contra meningite e doenças meningocócicas pelo meningococo tipo C.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

-- ===================== 6 MESES =====================
('6m', '6 Meses', '24 semanas', 168,
 'vacina', 'Penta (DTP+Hib+HB) — 3ª dose',
 'Terceira e última dose da série primária da vacina contra difteria, tétano, coqueluche, H. influenzae tipo b e hepatite B.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('6m', '6 Meses', '24 semanas', 168,
 'vacina', 'Poliomielite Inativada (VIP) — 3ª dose',
 'Terceira dose da série primária da vacina contra poliomielite (paralisia infantil).',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 20),

('6m', '6 Meses', '24 semanas', 168,
 'vacina', 'Influenza Trivalente — 1ª dose',
 'Crianças de 6 meses a menores de 6 anos devem ser vacinadas todo ano. Quem recebe pela primeira vez toma 2 doses com 30 dias de intervalo. As que já tomaram em anos anteriores recebem 1 dose por ano.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 30),

('6m', '6 Meses', '24 semanas', 168,
 'vacina', 'COVID-19 — 1ª dose',
 'Recomenda-se 2 doses (Spikevax, aos 6 e 7 meses) ou 3 doses (Comirnaty, aos 6, 7 e 9 meses). Criança sem esquema completo até 9 meses pode vacinar até 4 anos 11 meses 29 dias.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 40),

('6m', '6 Meses', '24 semanas', 168,
 'salto', 'Salto 5 — Relações (semana 26)',
 'O bebê compreende relações espaciais: dentro, fora, em cima, ao lado, longe, perto. Surge a angústia de separação — chora quando a mãe sai do campo visual. É normal e esperado. Após o salto, brinca de peek-a-boo e explora relações físicas entre objetos.',
 'Wonder Weeks — Salto 5',
 'https://www.thewonderweeks.com/mental-leap-5/',
 100),

('6m', '6 Meses', '24 semanas', 168,
 'desenvolvimento', 'Senta sem apoio e balbucia',
 'Senta sozinho por períodos crescentes. Balbucia consoantes: "ba-ba", "da-da", "ma-ma" — ainda sem associar ao significado. Demonstra grande interesse por alimentos.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

('6m', '6 Meses', '24 semanas', 168,
 'desenvolvimento', 'Início da introdução alimentar',
 'A SBP e a OMS recomendam iniciar a alimentação complementar aos 6 meses completos, mantendo o aleitamento materno. Sinais de prontidão: senta com apoio, perdeu o reflexo de extrusão e demonstra interesse por comida.',
 'SBP — Alimentação nos Primeiros Anos',
 'https://www.sbp.com.br/revalidacoes/detalhe/news/manual-de-alimentacao-nutricao-do-lactente-ao-adolescente/',
 210),

-- ===================== 7 MESES =====================
('7m', '7 Meses', '28–32 semanas', 196,
 'vacina', 'COVID-19 — 2ª dose',
 'Segunda dose da vacina contra covid-19. Intervalo mínimo de 4 semanas entre 1ª e 2ª dose. Protege contra formas graves e óbitos causados pelo vírus SARS-CoV-2.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('7m', '7 Meses', '28–32 semanas', 196,
 'desenvolvimento', 'Engatinha ou arrasta',
 'Muitos bebês começam a arrastar-se ou engatinhar. Alguns pulam essa etapa — variação normal. A mobilidade aumenta a exploração do ambiente e o aprendizado.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

('7m', '7 Meses', '28–32 semanas', 196,
 'desenvolvimento', 'Estranhamento',
 'A angústia de separação e o estranhamento com estranhos se intensificam. Chora ao ser pego por pessoas desconhecidas — sinal de que o vínculo de apego com os cuidadores principais está bem formado.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 210),

-- ===================== 8–8,5 MESES =====================
('8m', '8–8,5 Meses', '37 semanas', 224,
 'salto', 'Salto 6 — Categorias (semana 37)',
 'O bebê começa a organizar o mundo em categorias: animais, alimentos, objetos que se movem, coisas que fazem barulho. É um salto cognitivo enorme — a base do pensamento abstrato. Após o salto, demonstra muito mais curiosidade intelectual.',
 'Wonder Weeks — Salto 6',
 'https://www.thewonderweeks.com/mental-leap-6/',
 100),

('8m', '8–8,5 Meses', '37 semanas', 224,
 'desenvolvimento', 'Fica de pé com apoio',
 'Puxa nos móveis para ficar de pé. Imita sons, gestos e expressões faciais. Responde ao próprio nome de forma consistente. Entende palavras simples como "não" e "tchau".',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

-- ===================== 9 MESES =====================
('9m', '9 Meses', '36–40 semanas', 259,
 'vacina', 'COVID-19 — 3ª dose',
 'Terceira dose da vacina contra covid-19. Intervalo mínimo de 8 semanas entre 2ª e 3ª dose. Para imunocomprometidos: 3 doses + reforços periódicos de 6/6 meses até 4 anos 11 meses 29 dias.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('9m', '9 Meses', '36–40 semanas', 259,
 'vacina', 'Febre Amarela — 1 dose',
 'Aplicada aos 9 meses. Confere imunidade duradoura. A vacina pode ser recomendada de 6 a 8 meses em casos excepcionais (alto risco de contrair a doença), sempre após avaliação do serviço de saúde. Reforço único aos 4 anos.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 20),

('9m', '9 Meses', '36–40 semanas', 259,
 'desenvolvimento', 'Pinça fina emergente',
 'Começa a desenvolver a pinça fina — pega objetos pequenos usando polegar e indicador. Marco neurológico importante, avaliado em consultas de puericultura.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 200),

('9m', '9 Meses', '36–40 semanas', 259,
 'desenvolvimento', 'Comunicação intencional',
 'Pode dizer "mamã" ou "papá" com ou sem sentido. Acena tchau. Aponta para objetos de interesse (gesto proto-declarativo) — um dos preditores mais importantes do desenvolvimento de linguagem.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 210),

-- ===================== 10–11 MESES =====================
('10m', '10–11 Meses', '46 semanas', 301,
 'salto', 'Salto 7 — Sequências (semana 46)',
 'O bebê percebe que pode realizar sequências de ações para atingir um objetivo: empilhar, encaixar, colocar dentro. É o início do pensamento causal ("se eu fizer X, acontece Y"). Resolve problemas simples de forma independente.',
 'Wonder Weeks — Salto 7',
 'https://www.thewonderweeks.com/mental-leap-7/',
 100),

('10m', '10–11 Meses', '46 semanas', 301,
 'desenvolvimento', 'Anda apoiado (cruising)',
 'Anda se apoiando em móveis. Os primeiros passos sozinhos costumam surgir entre 9 e 12 meses — variação normal até 18 meses.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

('10m', '10–11 Meses', '46 semanas', 301,
 'desenvolvimento', 'Primeiras palavras',
 'Alguns bebês dizem 1–3 palavras com sentido. Entende muito mais do que consegue expressar — compreende instruções simples de uma etapa.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 210),

-- ===================== 12 MESES =====================
('12m', '12 Meses', '1 ano', 350,
 'vacina', 'Pneumocócica 10-valente (PCV10) — 1 dose de reforço',
 'Dose de reforço da vacina pneumocócica. Garante proteção prolongada contra doenças pneumocócicas invasivas.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('12m', '12 Meses', '1 ano', 350,
 'vacina', 'Meningocócica ACWY — 1 dose',
 'A partir de 2025, o reforço dos 12 meses passou de Meningocócica C para a tetravalente ACWY. A mudança reflete o aumento dos sorogrupos W e Y no Brasil. Protege contra meningite por meningococos do tipo A, C, W e Y.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 20),

('12m', '12 Meses', '1 ano', 350,
 'vacina', 'Tríplice Viral SCR — 1ª dose',
 'Protege contra sarampo, caxumba e rubéola. Essencial para a proteção individual e para a imunidade coletiva que evita epidemias de sarampo.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 30),

('12m', '12 Meses', '1 ano', 350,
 'desenvolvimento', 'Primeiras palavras com sentido',
 'Vocabulário esperado de 1–5 palavras com significado. Anda sozinho ou está próximo disso. Usa objetos corretamente e aponta para mostrar algo interessante (atenção compartilhada).',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 200),

-- ===================== 13 MESES =====================
('13m', '13 Meses', '55 semanas', 385,
 'salto', 'Salto 8 — Programas (semana 55)',
 'A criança começa a criar "programas" mentais: planos flexíveis com múltiplos passos. Entende que existem várias maneiras de atingir o mesmo objetivo. Surge forte desejo de independência e teimosia intensa — quer fazer tudo "ela mesma".',
 'Wonder Weeks — Salto 8',
 'https://www.thewonderweeks.com/mental-leap-8/',
 100),

-- ===================== 15 MESES =====================
('15m', '15 Meses', '1 ano e 3 meses', 434,
 'vacina', 'DTP — 1ª dose reforço',
 'Primeiro reforço da vacina contra difteria, tétano e coqueluche. Mantém a imunidade obtida na série primária.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('15m', '15 Meses', '1 ano e 3 meses', 434,
 'vacina', 'Poliomielite Inativada (VIP) — 1 dose reforço',
 'A partir de 2025, o reforço dos 15 meses passou a usar a vacina injetável (VIP) em vez das gotinhas orais (VOP). Encerra o uso rotineiro da vacina oral no calendário infantil.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 20),

('15m', '15 Meses', '1 ano e 3 meses', 434,
 'vacina', 'Tríplice Viral SCR — 2ª dose',
 'Segunda dose da vacina contra sarampo, caxumba e rubéola. Garante cobertura imunológica de ~99% das crianças.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 30),

('15m', '15 Meses', '1 ano e 3 meses', 434,
 'vacina', 'Varicela (Catapora) — 1ª dose',
 'Vacina altamente eficaz na prevenção da varicela e de suas complicações graves. Em casos de indisponibilidade da monovalente, a vacina tetraviral poderá ser utilizada.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 40),

('15m', '15 Meses', '1 ano e 3 meses', 434,
 'vacina', 'Hepatite A — 1 dose',
 'Protege contra hepatite A (doença fecal-oral). Aplicada aos 15 meses no calendário do SUS.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 50),

('15m', '15 Meses', '1 ano e 3 meses', 434,
 'salto', 'Salto 9 — Princípios (semana 64)',
 'Por volta de 14–15 meses. A criança começa a entender princípios abstratos: o que é "meu" vs. "de outro", o conceito de compartilhar, de "certo" e "errado". Surgem as primeiras noções de empatia.',
 'Wonder Weeks — Salto 9',
 'https://www.thewonderweeks.com/mental-leap-9/',
 100),

('15m', '15 Meses', '1 ano e 3 meses', 434,
 'desenvolvimento', 'Anda bem e começa a correr',
 'Anda com firmeza e começa a correr (com quedas frequentes). Vocabulário de 5–15 palavras. Alimenta-se com colher com derramamentos. Empilha 2–4 blocos.',
 'OMS — Child Growth Standards',
 'https://www.who.int/tools/child-growth-standards',
 200),

-- ===================== 17–18 MESES =====================
('18m', '17–18 Meses', '75 semanas', 518,
 'salto', 'Salto 10 — Sistemas (semana 75)',
 'O décimo e último salto descrito no livro Wonder Weeks. A criança começa a compreender sistemas complexos: hierarquias, relações de poder, valores, pertencimento a grupos. É o início da consciência de si mesma como indivíduo com valores próprios.',
 'Wonder Weeks — Salto 10',
 'https://www.thewonderweeks.com/mental-leap-10/',
 100),

('18m', '17–18 Meses', '75 semanas', 518,
 'desenvolvimento', 'Explosão de vocabulário',
 'Entre 18 e 24 meses ocorre a "explosão de vocabulário". Vocabulário esperado: 15–50+ palavras aos 18 meses. Alerta: se ainda não usa pelo menos 6 palavras com sentido aos 18 meses, comunicar ao pediatra.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 200),

('18m', '17–18 Meses', '75 semanas', 518,
 'desenvolvimento', 'Jogo simbólico (faz de conta)',
 'Começa a brincar de faz de conta: alimenta uma boneca, fala ao telefone de brinquedo. Marco central do desenvolvimento cognitivo, linguístico e social — base para o aprendizado futuro.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 210),

-- ===================== 2 ANOS =====================
('24m', '2 Anos', '24 meses', 700,
 'desenvolvimento', 'Frases de 2 palavras',
 'Combina duas palavras para comunicar ("mamã água", "mais bolo"). Vocabulário esperado: 50+ palavras. Alerta: se não combina duas palavras aos 24 meses, buscar avaliação de fala e audição.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 200),

('24m', '2 Anos', '24 meses', 700,
 'desenvolvimento', 'Autonomia e desfralde',
 'Corre bem, sobe e desce escadas. Quer fazer tudo sozinha. Entre 2 e 3 anos a maioria fica pronta para o desfralde — sinais: percebe que está molhada, fica seca por 1,5–2h, consegue comunicar a necessidade.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 210),

-- ===================== 4 ANOS =====================
('4a', '4 Anos', '48 meses', 1400,
 'vacina', 'DTP — 2ª dose reforço',
 'Segundo reforço da vacina contra difteria, tétano e coqueluche.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

('4a', '4 Anos', '48 meses', 1400,
 'vacina', 'Febre Amarela — 1 dose de reforço',
 'Único reforço da vacina contra febre amarela. Após esse reforço, a proteção é considerada vitalícia.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 20),

('4a', '4 Anos', '48 meses', 1400,
 'vacina', 'Varicela (Catapora) — 2ª dose',
 'Segunda dose da vacina contra varicela. Aumenta a proteção para ~98%.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 30),

('4a', '4 Anos', '48 meses', 1400,
 'desenvolvimento', 'Desenvolvimento cognitivo e social',
 'Fase do "por quê?" — faz perguntas constantes. Conta pequenas histórias com início, meio e fim. Brinca cooperativamente com outras crianças. Começa a entender e respeitar regras de jogos.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 200),

-- ===================== 5 ANOS =====================
('5a', '5 Anos', '60 meses', 1750,
 'desenvolvimento', 'Pré-alfabetização',
 'A maioria das crianças está pronta para o aprendizado formal de leitura e escrita. Reconhece letras, conta 10+ objetos com correspondência um a um, faz desenhos reconhecíveis. Base consolidada para a alfabetização escolar.',
 'SBP — Guia de Puericultura',
 'https://www.sbp.com.br/puericultura/',
 200),

-- ===================== 5 ANOS (somente indígena) =====================
('5a-indigena', '5 Anos (somente indígena)', 'sem histórico vacinal com pneumo conjugada', 1750,
 'vacina', 'Pneumocócica 23-valente — 1 dose',
 'Apenas para crianças indígenas sem histórico vacinal com pneumocócica conjugada. Uma segunda dose deve ser administrada com intervalo de 5 anos após a 1ª dose.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

-- ===================== A PARTIR DE 7 ANOS =====================
('7a', 'A partir de 7 Anos', 'todas as idades', 2555,
 'vacina', 'dT — 3 doses (conforme histórico vacinal)',
 'Vacina contra difteria e tétano. Recomendada a partir de 7 anos para complementação de esquemas em atraso ou reforços.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10),

-- ===================== 9 A 14 ANOS =====================
('9a-14a', '9 a 14 Anos', '', 3285,
 'vacina', 'HPV4 — 1 dose',
 'Protege contra infecções causadas pelo papilomavírus humano. O HPV causa verrugas anogenitais e está relacionado ao desenvolvimento de câncer em colo de útero, vulva, vagina, ânus, pênis, boca e orofaringe.',
 'Ministério da Saúde / PNI',
 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca',
 10);
