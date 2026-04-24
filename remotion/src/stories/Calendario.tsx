import React from "react";
import { StoryTemplate } from "../StoryTemplate";
import { C } from "../colors";

export function Calendario() {
  return (
    <StoryTemplate
      hook={"Não perca\nnenhum marco\nimportante! 💉"}
      icon="🗓️"
      title="Calendário do Bebê"
      bullets={[
        "Vacinas com datas e referências",
        "Marcos de desenvolvimento semana a semana",
        "Notificações automáticas no momento certo",
      ]}
      accentColor={C.mintDark}
    />
  );
}
