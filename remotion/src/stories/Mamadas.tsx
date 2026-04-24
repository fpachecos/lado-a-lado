import React from "react";
import { StoryTemplate } from "../StoryTemplate";
import { C } from "../colors";

export function Mamadas() {
  return (
    <StoryTemplate
      hook={"Perdeu a conta\nde quantas\nmamadas foram? 🤱"}
      icon="🍼"
      title="Registro de Mamadas"
      bullets={[
        "Registre seio, duração e horário",
        "Notificações para a próxima mamada",
        "Histórico completo sempre à mão",
      ]}
      accentColor={C.primary}
    />
  );
}
