import React from "react";
import { Composition } from "remotion";
import { Agenda } from "./stories/Agenda";
import { Mamadas } from "./stories/Mamadas";
import { Fraldas } from "./stories/Fraldas";
import { Crescimento } from "./stories/Crescimento";
import { Calendario } from "./stories/Calendario";
import { Convite } from "./stories/Convite";

// Instagram Stories: 1080x1920, 30fps, 15s
const STORY_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 450, // 15s
};

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="Agenda"
        component={Agenda}
        {...STORY_CONFIG}
      />
      <Composition
        id="Mamadas"
        component={Mamadas}
        {...STORY_CONFIG}
      />
      <Composition
        id="Fraldas"
        component={Fraldas}
        {...STORY_CONFIG}
      />
      <Composition
        id="Crescimento"
        component={Crescimento}
        {...STORY_CONFIG}
      />
      <Composition
        id="Calendario"
        component={Calendario}
        {...STORY_CONFIG}
      />
      <Composition
        id="Convite"
        component={Convite}
        {...STORY_CONFIG}
      />
    </>
  );
}
