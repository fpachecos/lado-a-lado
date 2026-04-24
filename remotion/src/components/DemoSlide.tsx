import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, GRADIENT_BG } from "../constants/colors";
import { PhoneMockup } from "./PhoneMockup";

export interface DemoScreen {
  /** React component mockup OR path relative to public/ folder (e.g. "screenshots/foo.png") */
  content: React.ReactNode | string;
  label: string;
  /** Local frame (0 = start of Demo Sequence) */
  startFrame: number;
  endFrame: number;
}

interface Props {
  screens: DemoScreen[];
}

const ScreenContent: React.FC<{ content: React.ReactNode | string }> = ({ content }) => {
  if (typeof content === "string") {
    return (
      <Img
        src={staticFile(content)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  return <>{content}</>;
};

export const DemoSlide: React.FC<Props> = ({ screens }) => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: GRADIENT_BG, opacity: bgOpacity }}>
      {screens.map((screen, i) => {
        const opacity = interpolate(
          frame,
          [screen.startFrame, screen.startFrame + 15, screen.endFrame - 12, screen.endFrame],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const scale = interpolate(frame, [screen.startFrame, screen.startFrame + 20], [0.93, 1], { extrapolateRight: "clamp" });
        const y = interpolate(frame, [screen.startFrame, screen.startFrame + 20], [36, 0], { extrapolateRight: "clamp" });

        return (
          <AbsoluteFill key={i} style={{ opacity, alignItems: "center", justifyContent: "center" }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 40,
              transform: `scale(${scale}) translateY(${y}px)`,
            }}>
              <div style={{
                background: C.coral, borderRadius: 40, padding: "14px 40px",
                display: "flex", gap: 16, alignItems: "center",
              }}>
                <div style={{ width: 10, height: 10, background: "rgba(255,255,255,0.5)", borderRadius: "50%" }} />
                <span style={{ color: C.white, fontSize: 34, fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>
                  {screen.label}
                </span>
                <div style={{ width: 10, height: 10, background: "rgba(255,255,255,0.5)", borderRadius: "50%" }} />
              </div>
              <PhoneMockup scale={1.45}>
                <ScreenContent content={screen.content} />
              </PhoneMockup>
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
