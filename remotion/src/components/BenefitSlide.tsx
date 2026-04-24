import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../constants/colors";
import { AppIcon } from "./AppIcon";

interface Props {
  iconName: React.ComponentProps<typeof AppIcon>["name"];
  headline: string;
  bullets: string[];
}

export const BenefitSlide: React.FC<Props> = ({ iconName, headline, bullets }) => {
  const frame = useCurrentFrame();
  const containerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.brown, opacity: containerOpacity, alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: "0 72px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 36 }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: C.coral,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AppIcon name={iconName} size={60} color={C.white} />
        </div>
        <div style={{ fontSize: 58, fontWeight: 800, color: C.white, fontFamily: "system-ui, sans-serif", lineHeight: 1.2 }}>
          {headline}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {bullets.map((b, i) => {
            const bOpacity = interpolate(frame, [20 + i * 12, 36 + i * 12], [0, 1], { extrapolateRight: "clamp" });
            const bX = interpolate(frame, [20 + i * 12, 36 + i * 12], [-30, 0], { extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ display: "flex", gap: 20, alignItems: "center", opacity: bOpacity, transform: `translateX(${bX}px)` }}>
                <div style={{ width: 12, height: 12, background: C.coral, borderRadius: "50%", flexShrink: 0 }} />
                <span style={{ fontSize: 42, color: C.cream, fontFamily: "system-ui, sans-serif", lineHeight: 1.3 }}>{b}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
