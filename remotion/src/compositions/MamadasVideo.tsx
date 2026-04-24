import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { SEQS, DEMO_2 } from "../constants/timing";
import { HeroSlide } from "../components/HeroSlide";
import { ProblemSlide } from "../components/ProblemSlide";
import { DemoSlide } from "../components/DemoSlide";
import { BenefitSlide } from "../components/BenefitSlide";
import { CTASlide } from "../components/CTASlide";

export const MamadasVideo: React.FC = () => (
  <AbsoluteFill>
    <Html5Audio src={staticFile("lado-a-lado-(single).mp3")} trimBefore={450} />
    <Sequence from={SEQS.hero.from} durationInFrames={SEQS.hero.dur}>
      <HeroSlide iconName="baby-bottle-outline" title="Acompanhe todas as mamadas" subtitle="Relatório na palma da mão" />
    </Sequence>

    <Sequence from={SEQS.problem.from} durationInFrames={SEQS.problem.dur}>
      <ProblemSlide
        emoji="🤔"
        lines={["Qual seio foi o último?", "Já faz quanto tempo?", "Tá mamando suficiente?"]}
      />
    </Sequence>

    <Sequence from={SEQS.demo.from} durationInFrames={SEQS.demo.dur}>
      <DemoSlide
        screens={[
          { content: "screenshots/feedings.png", label: "Registre cada mamada", startFrame: DEMO_2[0].start, endFrame: DEMO_2[0].end },
          { content: "screenshots/feedings-report.png", label: "Veja o relatório", startFrame: DEMO_2[1].start, endFrame: DEMO_2[1].end },
        ]}
      />
    </Sequence>

    <Sequence from={SEQS.benefit.from} durationInFrames={SEQS.benefit.dur}>
      <BenefitSlide
        iconName="baby-bottle-outline"
        headline="Saiba exatamente como seu bebê está mamando"
        bullets={["Tempo e qual seio em segundos", "Relatório diário e semanal", "Dados para o pediatra"]}
      />
    </Sequence>

    <Sequence from={SEQS.cta.from} durationInFrames={SEQS.cta.dur}>
      <CTASlide />
    </Sequence>
  </AbsoluteFill>
);
