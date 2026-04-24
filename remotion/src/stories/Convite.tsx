import React from "react";
import { StoryTemplate } from "../StoryTemplate";
import { C } from "../colors";

export function Convite() {
  return (
    <StoryTemplate
      hook={"A família toda\nquer acompanhar\no bebê! 👨‍👩‍👧"}
      icon="❤️"
      title="Acesso Familiar"
      bullets={[
        "Convide avós, parceiro e cuidadores",
        "Todos veem as mesmas informações",
        "Seus dados só com quem você escolher",
      ]}
      accentColor={C.primary}
    />
  );
}
