import React from "react";
import { StoryTemplate } from "../StoryTemplate";
import { C } from "../colors";

export function Crescimento() {
  return (
    <StoryTemplate
      hook={"Seu bebê está\ncrescendo\nbem? 📈"}
      icon="📊"
      title="Curva de Crescimento"
      bullets={[
        "Registre peso e altura com facilidade",
        "Gráfico com as curvas oficiais da OMS",
        "Veja em qual percentil seu bebê está",
      ]}
      accentColor={C.primary}
    />
  );
}
