import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { SEQS, DEMO_1 } from "../constants/timing";
import { HeroSlide } from "../components/HeroSlide";
import { ProblemSlide } from "../components/ProblemSlide";
import { DemoSlide } from "../components/DemoSlide";
import { BenefitSlide } from "../components/BenefitSlide";
import { CTASlide } from "../components/CTASlide";

export const PesoVideo: React.FC = () => (
  <AbsoluteFill>
    <Html5Audio src={staticFile("lado-a-lado-(single).mp3")} trimBefore={900} />
    <Sequence from={SEQS.hero.from} durationInFrames={SEQS.hero.dur}>
      <HeroSlide iconName="trending-up-outline" title="Acompanhe o crescimento" subtitle="Curva sempre atualizada" />
    </Sequence>

    <Sequence from={SEQS.problem.from} durationInFrames={SEQS.problem.dur}>
      <ProblemSlide
        emoji="📋"
        lines={["Lembrar o peso de cada consulta", "é impossível na correria.", "O pediatra sempre pergunta!"]}
      />
    </Sequence>

    <Sequence from={SEQS.demo.from} durationInFrames={SEQS.demo.dur}>
      <DemoSlide
        screens={[
          { content: "screenshots/weight.png", label: "Curva de crescimento", startFrame: DEMO_1[0].start, endFrame: DEMO_1[0].end },
        ]}
      />
    </Sequence>

    <Sequence from={SEQS.benefit.from} durationInFrames={SEQS.benefit.dur}>
      <BenefitSlide
        iconName="trending-up-outline"
        headline="Cada graminho registrado com amor"
        bullets={["Peso e altura em um só lugar", "Curva de crescimento visual", "Histórico completo para o pediatra"]}
      />
    </Sequence>

    <Sequence from={SEQS.cta.from} durationInFrames={SEQS.cta.dur}>
      <CTASlide />
    </Sequence>
  </AbsoluteFill>
);
