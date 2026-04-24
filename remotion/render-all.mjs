import { execSync } from "child_process";
import { mkdirSync } from "fs";

const stories = ["Agenda", "Mamadas", "Fraldas", "Crescimento", "Calendario", "Convite"];

mkdirSync("videos", { recursive: true });

for (const story of stories) {
  console.log(`\n🎬 Renderizando: ${story}...`);
  execSync(
    `npx remotion render src/index.ts ${story} videos/${story}.mp4 --codec=h264`,
    { stdio: "inherit" }
  );
  console.log(`✅ ${story}.mp4 gerado!`);
}

console.log("\n🎉 Todos os vídeos foram gerados em remotion/videos/");
