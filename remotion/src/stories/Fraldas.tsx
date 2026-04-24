import React from "react";
import { StoryTemplate } from "../StoryTemplate";
import { C } from "../colors";

export function Fraldas() {
  return (
    <StoryTemplate
      hook={"A cor da fralda\ndiz muito sobre\nseu bebê 🩺"}
      icon="👶"
      title="Controle de Fraldas"
      bullets={[
        "Registre xixi, cocô e a cor",
        "13 cores com validação automática",
        "Alertas para cores que precisam de atenção",
      ]}
      accentColor={C.mintDark}
    />
  );
}
