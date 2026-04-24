import React from "react";
import { C } from "../constants/colors";

interface Props {
  children: React.ReactNode;
  scale?: number;
}

export const PhoneMockup: React.FC<Props> = ({ children, scale = 1 }) => {
  const W = 340;
  const H = 680;
  const R = 44;

  return (
    <div style={{
      width: W * scale, height: H * scale,
      borderRadius: R * scale,
      background: C.brown,
      padding: 3 * scale,
      boxShadow: `0 ${32 * scale}px ${80 * scale}px rgba(0,0,0,0.45), 0 ${8 * scale}px ${20 * scale}px rgba(0,0,0,0.3)`,
      transform: `scale(1)`,
      position: "relative",
    }}>
      {/* Status bar notch */}
      <div style={{
        position: "absolute", top: 3 * scale, left: "50%",
        transform: "translateX(-50%)",
        width: 110 * scale, height: 28 * scale,
        background: C.brown, borderRadius: 20 * scale, zIndex: 10,
      }} />
      <div style={{
        width: "100%", height: "100%",
        borderRadius: (R - 3) * scale,
        overflow: "hidden",
        background: C.cream,
      }}>
        {children}
      </div>
    </div>
  );
};
