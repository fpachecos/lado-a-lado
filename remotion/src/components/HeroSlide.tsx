import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, GRADIENT_HERO } from "../constants/colors";
import { AppIcon } from "./AppIcon";

interface Props {
  iconName: React.ComponentProps<typeof AppIcon>["name"];
  title: string;
  subtitle: string;
}

export const HeroSlide: React.FC<Props> = ({ iconName, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [10, 30], [40, 0], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: GRADIENT_HERO, alignItems: "center", justifyContent: "center" }}>
      {/* Background circles */}
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)", top: -200, right: -200,
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)", bottom: 100, left: -100,
      }} />

      <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 40 }}>
        {/* Icon circle */}
        <div style={{
          width: 220, height: 220,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${iconScale})`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
        }}>
          <AppIcon name={iconName} size={110} color={C.white} />
        </div>

        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center", padding: "0 60px" }}>
          <div style={{
            fontSize: 72, fontWeight: 800, color: C.white, lineHeight: 1.1,
            fontFamily: "system-ui, -apple-system, sans-serif", letterSpacing: -1,
          }}>
            {title}
          </div>
        </div>

        <div style={{ opacity: subtitleOpacity, background: "rgba(255,255,255,0.2)", borderRadius: 40, padding: "16px 48px" }}>
          <div style={{ fontSize: 38, color: C.white, fontFamily: "system-ui, sans-serif", fontWeight: 500 }}>
            {subtitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
