import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "../constants/colors";

export const CTASlide: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 15], [0.88, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.coral, alignItems: "center", justifyContent: "center", opacity }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40, transform: `scale(${scale})` }}>
        <Img
          src={staticFile("app-icon.png")}
          style={{ width: 200, height: 200, borderRadius: 44, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}
        />
        <div style={{
          fontSize: 64, fontWeight: 800, color: C.white, textAlign: "center",
          lineHeight: 1.2, fontFamily: "system-ui, sans-serif", padding: "0 60px",
        }}>
          Lado a Lado
        </div>
        <div style={{
          fontSize: 40, color: "rgba(255,255,255,0.85)", fontFamily: "system-ui, sans-serif",
          textAlign: "center", padding: "0 80px", lineHeight: 1.4,
        }}>
          Organize as visitas ao seu bebê com carinho
        </div>
        <div style={{ marginTop: 20, background: C.white, borderRadius: 50, padding: "24px 72px" }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: C.coral, fontFamily: "system-ui, sans-serif" }}>
            Baixe grátis
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
