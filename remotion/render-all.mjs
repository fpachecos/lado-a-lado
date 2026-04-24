import { execSync } from "child_process";
import { mkdirSync } from "fs";

mkdirSync("out", { recursive: true });

const videos = [
  "AgendaVideo",
  "MamadasVideo",
  "PesoVideo",
  "FraldasVideo",
  "AcompanhantesVideo",
];

for (const id of videos) {
  const out = `out/${id.replace("Video", "").toLowerCase()}.mp4`;
  console.log(`\n🎬 Renderizando ${id} → ${out}`);
  execSync(`npx remotion render ${id} ${out} --log=verbose`, { stdio: "inherit" });
}

console.log("\n✅ Todos os vídeos gerados em ./out/");
