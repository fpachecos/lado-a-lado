import React from "react";
import { Composition } from "remotion";
import { FPS, DURATION_F } from "./constants/timing";
import { AgendaVideo } from "./compositions/AgendaVideo";
import { MamadasVideo } from "./compositions/MamadasVideo";
import { PesoVideo } from "./compositions/PesoVideo";
import { FraldasVideo } from "./compositions/FraldasVideo";
import { AcompanhantesVideo } from "./compositions/AcompanhantesVideo";
import { SonecaVideo } from "./compositions/SonecaVideo";
import { TimelineVideo } from "./compositions/TimelineVideo";
import { TutorialFraldasReel } from "./compositions/TutorialFraldasReel";

const STORY = { width: 1080, height: 1920, fps: FPS, durationInFrames: DURATION_F };
const REEL_20S = { width: 1080, height: 1920, fps: FPS, durationInFrames: 600 };

export const Root: React.FC = () => (
  <>
    <Composition id="AgendaVideo"          component={AgendaVideo}          {...STORY} />
    <Composition id="MamadasVideo"         component={MamadasVideo}         {...STORY} />
    <Composition id="PesoVideo"            component={PesoVideo}            {...STORY} />
    <Composition id="FraldasVideo"         component={FraldasVideo}         {...STORY} />
    <Composition id="AcompanhantesVideo"   component={AcompanhantesVideo}   {...STORY} />
    <Composition id="SonecaVideo"          component={SonecaVideo}          {...STORY} />
    <Composition id="TimelineVideo"        component={TimelineVideo}        {...STORY} />
    <Composition id="TutorialFraldasReel"  component={TutorialFraldasReel}  {...REEL_20S} />
  </>
);
