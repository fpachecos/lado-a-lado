import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SEQS, DEMO_1 } from "../constants/timing";
import { HeroSlide } from "../components/HeroSlide";
import { ProblemSlide } from "../components/ProblemSlide";
import { DemoSlide } from "../components/DemoSlide";
import { BenefitSlide } from "../components/BenefitSlide";
import { CTASlide } from "../components/CTASlide";

export const TimelineVideo: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={-1380}>
      <Audio src={staticFile("lado-a-lado-(single).mp3")} />
    </Sequence>
    <Sequence from={SEQS.hero.from} durationInFrames={SEQS.hero.dur}>
      <HeroSlide iconName="time-outline" title="Linha do tempo" subtitle="Tudo em um lugar" />
    </Sequence>

    <Sequence from={SEQS.problem.from} durationInFrames={SEQS.problem.dur}>
      <ProblemSlide
        emoji="🤯"
        lines={["Mamada, fralda, soneca…", "tudo misturado na memória", "Qual veio primeiro? 😵"]}
      />
    </Sequence>

    <Sequence from={SEQS.demo.from} durationInFrames={SEQS.demo.dur}>
      <DemoSlide
        screens={[
          { content: "screenshots/timeline.png", label: "Linha do tempo", startFrame: DEMO_1[0].start, endFrame: DEMO_1[0].end },
        ]}
      />
    </Sequence>

    <Sequence from={SEQS.benefit.from} durationInFrames={SEQS.benefit.dur}>
      <BenefitSlide
        iconName="time-outline"
        headline="O dia do bebê em ordem cronológica"
        bullets={["Mamadas, fraldas e sonecas juntos", "Fácil de acompanhar de relance", "Compartilhe com quem cuida junto"]}
      />
    </Sequence>

    <Sequence from={SEQS.cta.from} durationInFrames={SEQS.cta.dur}>
      <CTASlide />
    </Sequence>
  </AbsoluteFill>
);
