import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "./colors";

interface BulletProps {
  text: string;
  opacity: number;
  translateY: number;
}

function Bullet({ text, opacity, translateY }: BulletProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity,
        transform: `translateY(${translateY}px)`,
        marginBottom: 22,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: C.secondary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18, color: C.white }}>✓</span>
      </div>
      <span
        style={{
          fontFamily: "Nunito, system-ui, sans-serif",
          fontSize: 36,
          fontWeight: 600,
          color: C.text,
          lineHeight: 1.3,
        }}
      >
        {text}
      </span>
    </div>
  );
}

export interface StoryData {
  hook: string;
  icon: string;
  title: string;
  bullets: [string, string, string];
  accentColor?: string;
}

export function StoryTemplate({ hook, icon, title, bullets, accentColor = C.primary }: StoryData) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background
  const bgOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  // Top bar with app name
  const topOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" });

  // Hook text
  const hookOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const hookY = interpolate(frame, [20, 50], [40, 0], { extrapolateRight: "clamp" });

  // Icon
  const iconScale = spring({ frame: frame - 60, fps, config: { damping: 14, stiffness: 180 } });
  const iconOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });

  // Title
  const titleOpacity = interpolate(frame, [100, 130], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [100, 130], [30, 0], { extrapolateRight: "clamp" });

  // Bullets
  const b1o = interpolate(frame, [145, 170], [0, 1], { extrapolateRight: "clamp" });
  const b1y = interpolate(frame, [145, 170], [25, 0], { extrapolateRight: "clamp" });
  const b2o = interpolate(frame, [185, 210], [0, 1], { extrapolateRight: "clamp" });
  const b2y = interpolate(frame, [185, 210], [25, 0], { extrapolateRight: "clamp" });
  const b3o = interpolate(frame, [225, 250], [0, 1], { extrapolateRight: "clamp" });
  const b3y = interpolate(frame, [225, 250], [25, 0], { extrapolateRight: "clamp" });

  // CTA
  const ctaScale = spring({ frame: frame - 278, fps, config: { damping: 12, stiffness: 160 } });
  const ctaOpacity = interpolate(frame, [278, 305], [0, 1], { extrapolateRight: "clamp" });

  // Logo bottom
  const logoOpacity = interpolate(frame, [310, 335], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: bgOpacity }}>
      {/* Gradient background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(165deg, ${C.gradientStart} 0%, ${C.gradientMid} 55%, ${C.gradientEnd} 100%)`,
        }}
      />

      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -150,
          width: 600,
          height: 600,
          borderRadius: "50%",
          backgroundColor: accentColor,
          opacity: 0.08,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -200,
          width: 500,
          height: 500,
          borderRadius: "50%",
          backgroundColor: C.secondary,
          opacity: 0.1,
        }}
      />

      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "90px 70px 80px",
        }}
      >
        {/* Top app name badge */}
        <div
          style={{
            opacity: topOpacity,
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 60,
          }}
        >
          <div
            style={{
              backgroundColor: accentColor,
              borderRadius: 999,
              paddingTop: 10,
              paddingBottom: 10,
              paddingLeft: 28,
              paddingRight: 28,
            }}
          >
            <span
              style={{
                fontFamily: "Nunito, system-ui, sans-serif",
                fontSize: 28,
                fontWeight: 800,
                color: C.white,
                letterSpacing: 0.5,
              }}
            >
              Lado a Lado
            </span>
          </div>
        </div>

        {/* Hook text */}
        <div
          style={{
            opacity: hookOpacity,
            transform: `translateY(${hookY}px)`,
            marginBottom: 64,
          }}
        >
          <p
            style={{
              fontFamily: "Nunito, system-ui, sans-serif",
              fontSize: 54,
              fontWeight: 800,
              color: C.text,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {hook}
          </p>
        </div>

        {/* Icon */}
        <div
          style={{
            opacity: iconOpacity,
            transform: `scale(${iconScale})`,
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          <span style={{ fontSize: 150 }}>{icon}</span>
        </div>

        {/* Feature title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 44,
          }}
        >
          <p
            style={{
              fontFamily: "Nunito, system-ui, sans-serif",
              fontSize: 62,
              fontWeight: 900,
              color: accentColor,
              lineHeight: 1.1,
              margin: 0,
              textAlign: "center",
            }}
          >
            {title}
          </p>
        </div>

        {/* Separator */}
        <div
          style={{
            width: 80,
            height: 4,
            borderRadius: 2,
            backgroundColor: accentColor,
            opacity: titleOpacity * 0.4,
            alignSelf: "center",
            marginBottom: 44,
          }}
        />

        {/* Bullets */}
        <div style={{ flex: 1 }}>
          <Bullet text={bullets[0]} opacity={b1o} translateY={b1y} />
          <Bullet text={bullets[1]} opacity={b2o} translateY={b2y} />
          <Bullet text={bullets[2]} opacity={b3o} translateY={b3y} />
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            display: "flex",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              backgroundColor: accentColor,
              borderRadius: 999,
              paddingTop: 28,
              paddingBottom: 28,
              paddingLeft: 80,
              paddingRight: 80,
              boxShadow: `0 12px 40px ${accentColor}55`,
            }}
          >
            <span
              style={{
                fontFamily: "Nunito, system-ui, sans-serif",
                fontSize: 36,
                fontWeight: 800,
                color: C.white,
              }}
            >
              Baixe grátis 🍼
            </span>
          </div>
        </div>

        {/* Bottom app badge */}
        <div
          style={{
            opacity: logoOpacity,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Nunito, system-ui, sans-serif",
              fontSize: 26,
              fontWeight: 600,
              color: C.textSecondary,
            }}
          >
            @app.ladoalado
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
