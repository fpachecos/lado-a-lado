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

const STORY = { width: 1080, height: 1920, fps: FPS, durationInFrames: DURATION_F };

export const Root: React.FC = () => (
  <>
    <Composition id="AgendaVideo"        component={AgendaVideo}        {...STORY} />
    <Composition id="MamadasVideo"       component={MamadasVideo}       {...STORY} />
    <Composition id="PesoVideo"          component={PesoVideo}          {...STORY} />
    <Composition id="FraldasVideo"       component={FraldasVideo}       {...STORY} />
    <Composition id="AcompanhantesVideo" component={AcompanhantesVideo} {...STORY} />
    <Composition id="SonecaVideo"        component={SonecaVideo}        {...STORY} />
    <Composition id="TimelineVideo"      component={TimelineVideo}      {...STORY} />
  </>
);
