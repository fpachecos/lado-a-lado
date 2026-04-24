import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, GRADIENT_BG } from "../constants/colors";

interface Props {
  lines: string[];
  emoji: string;
}

export const ProblemSlide: React.FC<Props> = ({ lines, emoji }) => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: GRADIENT_BG, opacity: bgOpacity, alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: "0 72px", display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        <div style={{ fontSize: 120 }}>{emoji}</div>
        {lines.map((line, i) => {
          const lineOpacity = interpolate(frame, [10 + i * 12, 25 + i * 12], [0, 1], { extrapolateRight: "clamp" });
          const lineY = interpolate(frame, [10 + i * 12, 25 + i * 12], [30, 0], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              fontSize: i === 0 ? 56 : 44,
              fontWeight: i === 0 ? 800 : 500,
              color: i === 0 ? C.brown : "#6B5744",
              fontFamily: "system-ui, -apple-system, sans-serif",
              textAlign: "center",
              lineHeight: 1.3,
              opacity: lineOpacity,
              transform: `translateY(${lineY}px)`,
            }}>
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
