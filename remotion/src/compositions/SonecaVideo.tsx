import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SEQS, DEMO_2 } from "../constants/timing";
import { HeroSlide } from "../components/HeroSlide";
import { ProblemSlide } from "../components/ProblemSlide";
import { DemoSlide } from "../components/DemoSlide";
import { BenefitSlide } from "../components/BenefitSlide";
import { CTASlide } from "../components/CTASlide";

export const SonecaVideo: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={-1380}>
      <Audio src={staticFile("lado-a-lado-(single).mp3")} />
    </Sequence>
    <Sequence from={SEQS.hero.from} durationInFrames={SEQS.hero.dur}>
      <HeroSlide iconName="moon-outline" title="Sonecas do bebê" subtitle="Horários e duração" />
    </Sequence>

    <Sequence from={SEQS.problem.from} durationInFrames={SEQS.problem.dur}>
      <ProblemSlide
        emoji="😴"
        lines={["Quando foi a última soneca?", '"Dormiu quanto tempo?"', "Você também perdeu a conta 😅"]}
      />
    </Sequence>

    <Sequence from={SEQS.demo.from} durationInFrames={SEQS.demo.dur}>
      <DemoSlide
        screens={[
          { content: "screenshots/naps.png", label: "Registro de sonecas", startFrame: DEMO_2[0].start, endFrame: DEMO_2[0].end },
          { content: "screenshots/naps-report.png", label: "Relatório de sono", startFrame: DEMO_2[1].start, endFrame: DEMO_2[1].end },
        ]}
      />
    </Sequence>

    <Sequence from={SEQS.benefit.from} durationInFrames={SEQS.benefit.dur}>
      <BenefitSlide
        iconName="moon-outline"
        headline="Rotina de sono na palma da mão"
        bullets={["Registre em 2 toques", "Duração calculada automaticamente", "Histórico para a pediatra"]}
      />
    </Sequence>

    <Sequence from={SEQS.cta.from} durationInFrames={SEQS.cta.dur}>
      <CTASlide />
    </Sequence>
  </AbsoluteFill>
);
