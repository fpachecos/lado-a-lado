import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "../constants/colors";
import { PhoneMockup } from "../components/PhoneMockup";

const GRADIENT = `linear-gradient(160deg, #FFD4BF 0%, #F4E4BC 45%, #F0C87A 100%)`;
const PHONE_SCALE = 2.05;

// tapPos: percentages within the visible phone screen content (0-100)
// Calculated accounting for objectFit:cover crop of 390×844 image in 340×680 container
const STEPS: {
  screenshot: string;
  stepLabel: string;
  instruction: string[];
  from: number;
  dur: number;
  tapPos?: { leftPct: number; topPct: number };
}[] = [
  {
    screenshot: "screenshots/home-real.png",
    stepLabel: "PASSO 1",
    instruction: ["Abra o app e", "toque em Fraldas"],
    from: 0,
    dur: 175,
    // Fraldas card: col direita (~75%), linha 2 da grade (~43% da área visível)
    tapPos: { leftPct: 75, topPct: 43 },
  },
  {
    screenshot: "screenshots/diapers-list.png",
    stepLabel: "PASSO 2",
    instruction: ["Veja o resumo do dia", "e toque em Registrar"],
    from: 155,
    dur: 175,
    // Botão "Registrar fralda": centro (~50%), logo abaixo do resumo (~30%)
    tapPos: { leftPct: 50, topPct: 30 },
  },
  {
    screenshot: "screenshots/diapers-modal-ambos.png",
    stepLabel: "PASSO 3",
    instruction: ["Escolha a cor do cocô", "e toque em Salvar"],
    from: 310,
    dur: 155,
    // Botão "Salvar": col direita (~76%), rodapé do modal (~94%)
    tapPos: { leftPct: 76, topPct: 94 },
  },
  {
    screenshot: "screenshots/diapers-report.png",
    stepLabel: "PRONTO!",
    instruction: ["Relatório gerado", "automaticamente ✓"],
    from: 445,
    dur: 155,
  },
];

interface StepProps {
  step: (typeof STEPS)[number];
  localFrame: number;
  fps: number;
}

const TapIndicator: React.FC<{ leftPct: number; topPct: number; tapPulse: number; opacity: number }> = ({
  leftPct, topPct, tapPulse, opacity,
}) => (
  <div style={{
    position: "absolute",
    left: `${leftPct}%`,
    top: `${topPct}%`,
    transform: `translate(-50%, -50%) scale(${tapPulse})`,
    opacity,
    pointerEvents: "none",
  }}>
    {/* Anel externo pulsante */}
    <div style={{
      width: 68, height: 68, borderRadius: "50%",
      background: "rgba(255,111,97,0.22)",
      border: "3px solid rgba(255,111,97,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 0 6px rgba(255,111,97,0.1)",
    }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.coral }} />
    </div>
  </div>
);

const Step: React.FC<StepProps> = ({ step, localFrame, fps }) => {
  const dur = step.dur;

  const fadeIn  = interpolate(localFrame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(localFrame, [dur - 18, dur], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);

  const phoneSpring = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 90, mass: 0.9 } });
  const phoneY = interpolate(localFrame, [0, 20], [40, 0], { extrapolateRight: "clamp" });

  const badgeOpacity = interpolate(localFrame, [8, 22], [0, 1], { extrapolateRight: "clamp" });
  const badgeX = interpolate(localFrame, [8, 24], [-30, 0], { extrapolateRight: "clamp" });

  const textOpacity = interpolate(localFrame, [18, 35], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(localFrame, [18, 35], [20, 0], { extrapolateRight: "clamp" });

  // Pulso do indicador de toque (começa no frame 50, ciclo a cada 50 frames)
  const elapsed = Math.max(0, localFrame - 50);
  const cycle = elapsed % 50;
  const tapPulse = step.tapPos
    ? interpolate(cycle, [0, 15, 38, 50], [1, 1.28, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const tapOpacity = step.tapPos
    ? interpolate(localFrame, [45, 65, dur - 20, dur], [0, 1, 1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill style={{ opacity, background: GRADIENT }}>
      {/* Blobs decorativos */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "rgba(255,255,255,0.18)", top: -180, right: -180 }} />
      <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "rgba(255,111,97,0.07)", bottom: 200, left: -80 }} />

      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        width: "100%", height: "100%", paddingTop: 90, paddingBottom: 60,
      }}>
        {/* Badge do passo */}
        <div style={{
          opacity: badgeOpacity,
          transform: `translateX(${badgeX}px)`,
          background: C.coral,
          borderRadius: 40,
          padding: "14px 44px",
          marginBottom: 36,
        }}>
          <span style={{
            color: C.white, fontSize: 32, fontWeight: 800,
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: 3,
          }}>
            {step.stepLabel}
          </span>
        </div>

        {/* Texto de instrução */}
        <div style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: "center",
          marginBottom: 50,
          paddingLeft: 60,
          paddingRight: 60,
        }}>
          {step.instruction.map((line, i) => (
            <div key={i} style={{
              fontSize: 52,
              fontWeight: i === 0 ? 700 : 800,
              color: i === 0 ? "#5A3D28" : C.brown,
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: 1.25,
              letterSpacing: -0.5,
            }}>
              {line}
            </div>
          ))}
        </div>

        {/* Mockup com indicador sobreposto */}
        <div style={{ transform: `scale(${phoneSpring * 0.92}) translateY(${phoneY}px)` }}>
          <PhoneMockup scale={PHONE_SCALE}>
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <Img
                src={staticFile(step.screenshot)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {step.tapPos && (
                <TapIndicator
                  leftPct={step.tapPos.leftPct}
                  topPct={step.tapPos.topPct}
                  tapPulse={tapPulse}
                  opacity={tapOpacity}
                />
              )}
            </div>
          </PhoneMockup>
        </div>
      </div>

      {/* Dots de progresso */}
      <div style={{
        position: "absolute", bottom: 52, left: "50%",
        transform: "translateX(-50%)",
        display: "flex", gap: 14,
        opacity: textOpacity,
      }}>
        {STEPS.map((_, i) => {
          const stepIdx = STEPS.indexOf(step);
          const active = i === stepIdx;
          return (
            <div key={i} style={{
              width: active ? 32 : 10,
              height: 10,
              borderRadius: 5,
              background: active ? C.coral : "rgba(45,32,24,0.25)",
            }} />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const TutorialFraldasReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: GRADIENT }}>
      {STEPS.map((step) => {
        const localFrame = frame - step.from;
        if (localFrame < -18 || localFrame > step.dur + 5) return null;
        return (
          <Step key={step.screenshot} step={step} localFrame={localFrame} fps={fps} />
        );
      })}
    </AbsoluteFill>
  );
};
