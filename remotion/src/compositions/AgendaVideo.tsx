import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { SEQS, DEMO_2 } from "../constants/timing";
import { HeroSlide } from "../components/HeroSlide";
import { ProblemSlide } from "../components/ProblemSlide";
import { DemoSlide } from "../components/DemoSlide";
import { BenefitSlide } from "../components/BenefitSlide";
import { CTASlide } from "../components/CTASlide";

export const AgendaVideo: React.FC = () => (
  <AbsoluteFill>
    <Html5Audio src={staticFile("lado-a-lado-(single).mp3")} trimBefore={0} />
    <Sequence from={SEQS.hero.from} durationInFrames={SEQS.hero.dur}>
      <HeroSlide iconName="home-outline" title="Organize as visitas ao bebê" subtitle="Sem confusão de horário" />
    </Sequence>

    <Sequence from={SEQS.problem.from} durationInFrames={SEQS.problem.dur}>
      <ProblemSlide
        emoji="😵"
        lines={["Todo mundo quer visitar...", "mas ninguém combina horário", "e a casa vira bagunça!"]}
      />
    </Sequence>

    <Sequence from={SEQS.demo.from} durationInFrames={SEQS.demo.dur}>
      <DemoSlide
        screens={[
          { content: "screenshots/schedules-list.png", label: "Agendas de Visita", startFrame: DEMO_2[0].start, endFrame: DEMO_2[0].end },
          { content: "screenshots/schedules-detail.png", label: "Escolha o horário", startFrame: DEMO_2[1].start, endFrame: DEMO_2[1].end },
        ]}
      />
    </Sequence>

    <Sequence from={SEQS.benefit.from} durationInFrames={SEQS.benefit.dur}>
      <BenefitSlide
        iconName="home-outline"
        headline="A família escolhe o horário. Você descansa."
        bullets={["Link único para compartilhar", "Cada visita no seu horário certo", "Sem ligar para todo mundo"]}
      />
    </Sequence>

    <Sequence from={SEQS.cta.from} durationInFrames={SEQS.cta.dur}>
      <CTASlide />
    </Sequence>
  </AbsoluteFill>
);
