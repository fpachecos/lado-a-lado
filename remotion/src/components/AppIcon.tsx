import React from "react";
import { continueRender, delayRender, staticFile } from "remotion";

let fontsLoaded = false;
const loadFonts = () => {
  if (fontsLoaded || typeof document === "undefined") return;
  fontsLoaded = true;
  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: 'Ionicons';
      src: url('${staticFile("fonts/Ionicons.ttf")}') format('truetype');
    }
    @font-face {
      font-family: 'MaterialCommunityIcons';
      src: url('${staticFile("fonts/MaterialCommunityIcons.ttf")}') format('truetype');
    }
  `;
  document.head.appendChild(style);
};

// Codepoints from the app's actual icon libraries
const ICONS: Record<string, { codepoint: number; font: string }> = {
  // Ionicons outline — same icons used in app/(tabs)/index.tsx
  "home-outline":        { codepoint: 0xF383, font: "Ionicons" },
  "trending-up-outline": { codepoint: 0xF5FC, font: "Ionicons" },
  "people-outline":      { codepoint: 0xF4A3, font: "Ionicons" },
  "heart-outline":       { codepoint: 0xF377, font: "Ionicons" },
  "happy-outline":       { codepoint: 0xF362, font: "Ionicons" },
  "moon-outline":        { codepoint: 0xF461, font: "Ionicons" },
  "time-outline":        { codepoint: 0xF5DE, font: "Ionicons" },
  // MaterialCommunityIcons outline
  "baby-bottle-outline": { codepoint: 0xF0F3A, font: "MaterialCommunityIcons" },
  "diaper-outline":      { codepoint: 0xF1CCF, font: "MaterialCommunityIcons" },
};

interface Props {
  name: keyof typeof ICONS;
  size?: number;
  color?: string;
}

export const AppIcon: React.FC<Props> = ({ name, size = 80, color = "#FF6F61" }) => {
  const [handle] = React.useState(() => delayRender("load-icon-fonts"));

  React.useEffect(() => {
    loadFonts();
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);

  const icon = ICONS[name];
  if (!icon) return null;

  return (
    <span style={{
      fontFamily: icon.font,
      fontSize: size,
      color,
      lineHeight: 1,
      display: "inline-block",
    }}>
      {String.fromCodePoint(icon.codepoint)}
    </span>
  );
};
