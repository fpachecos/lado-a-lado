import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { SEQS, DEMO_2 } from "../constants/timing";
import { HeroSlide } from "../components/HeroSlide";
import { ProblemSlide } from "../components/ProblemSlide";
import { DemoSlide } from "../components/DemoSlide";
import { BenefitSlide } from "../components/BenefitSlide";
import { CTASlide } from "../components/CTASlide";

export const FraldasVideo: React.FC = () => (
  <AbsoluteFill>
    <Html5Audio src={staticFile("lado-a-lado-(single).mp3")} trimBefore={1350} />
    <Sequence from={SEQS.hero.from} durationInFrames={SEQS.hero.dur}>
      <HeroSlide iconName="diaper-outline" title="Controle de fraldas" subtitle="Saiba se está tudo bem" />
    </Sequence>

    <Sequence from={SEQS.problem.from} durationInFrames={SEQS.problem.dur}>
      <ProblemSlide
        emoji="😰"
        lines={["A pediatra perguntou:", '"Quantas fraldas por dia?"', "e você ficou em branco 😅"]}
      />
    </Sequence>

    <Sequence from={SEQS.demo.from} durationInFrames={SEQS.demo.dur}>
      <DemoSlide
        screens={[
          { content: "screenshots/diapers.png", label: "Registro de fraldas", startFrame: DEMO_2[0].start, endFrame: DEMO_2[0].end },
          { content: "screenshots/diapers-report.png", label: "Relatório", startFrame: DEMO_2[1].start, endFrame: DEMO_2[1].end },
        ]}
      />
    </Sequence>

    <Sequence from={SEQS.benefit.from} durationInFrames={SEQS.benefit.dur}>
      <BenefitSlide
        iconName="diaper-outline"
        headline="Sinal de saúde na ponta dos dedos"
        bullets={["Registre em 2 toques", "Média diária automática", "Histórico para as consultas"]}
      />
    </Sequence>

    <Sequence from={SEQS.cta.from} durationInFrames={SEQS.cta.dur}>
      <CTASlide />
    </Sequence>
  </AbsoluteFill>
);
