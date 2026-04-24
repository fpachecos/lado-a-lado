import React from "react";
import { StoryTemplate } from "../StoryTemplate";

export function Agenda() {
  return (
    <StoryTemplate
      hook={"Chega de grupo\nde WhatsApp\nbagunçado! 😅"}
      icon="📅"
      title="Agenda de Visitas"
      bullets={[
        "Crie horários livres para visitar o bebê",
        "Compartilhe um link com a família",
        "Cada um escolhe o melhor horário",
      ]}
    />
  );
}
