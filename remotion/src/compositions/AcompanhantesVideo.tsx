import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { SEQS, DEMO_1 } from "../constants/timing";
import { HeroSlide } from "../components/HeroSlide";
import { ProblemSlide } from "../components/ProblemSlide";
import { DemoSlide } from "../components/DemoSlide";
import { BenefitSlide } from "../components/BenefitSlide";
import { CTASlide } from "../components/CTASlide";

export const AcompanhantesVideo: React.FC = () => (
  <AbsoluteFill>
    <Html5Audio src={staticFile("lado-a-lado-(single).mp3")} trimBefore={1800} />
    <Sequence from={SEQS.hero.from} durationInFrames={SEQS.hero.dur}>
      <HeroSlide iconName="people-outline" title="Quem visitou o bebê" subtitle="Tudo registrado" />
    </Sequence>

    <Sequence from={SEQS.problem.from} durationInFrames={SEQS.problem.dur}>
      <ProblemSlide
        emoji="💭"
        lines={["A vovó veio ontem ou anteontem?", "Quem brincou mais com o bebê?", "E as atividades que fizeram?"]}
      />
    </Sequence>

    <Sequence from={SEQS.demo.from} durationInFrames={SEQS.demo.dur}>
      <DemoSlide
        screens={[
          { content: "screenshots/visits.png", label: "Gestão de Visitas", startFrame: DEMO_1[0].start, endFrame: DEMO_1[0].end },
        ]}
      />
    </Sequence>

    <Sequence from={SEQS.benefit.from} durationInFrames={SEQS.benefit.dur}>
      <BenefitSlide
        iconName="people-outline"
        headline="Um diário de quem amou seu bebê"
        bullets={["Registro de cada visita", "Atividades e momentos especiais", "Memória para sempre"]}
      />
    </Sequence>

    <Sequence from={SEQS.cta.from} durationInFrames={SEQS.cta.dur}>
      <CTASlide />
    </Sequence>
  </AbsoluteFill>
);
