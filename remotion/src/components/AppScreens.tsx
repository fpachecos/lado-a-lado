import React from "react";
import { C } from "../constants/colors";

const Row: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 20px", borderBottom: `1px solid ${C.beige}`,
  }}>
    <span style={{ fontSize: 22, color: C.brown, fontFamily: "system-ui, sans-serif" }}>{label}</span>
    <span style={{ fontSize: 22, fontWeight: 600, color: accent || C.coral, fontFamily: "system-ui, sans-serif" }}>{value}</span>
  </div>
);

const AppBar: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    height: 60, background: C.coral, display: "flex", alignItems: "center",
    justifyContent: "center", paddingTop: 28,
  }}>
    <span style={{ color: C.white, fontSize: 26, fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>{title}</span>
  </div>
);

const Chip: React.FC<{ label: string; color?: string }> = ({ label, color }) => (
  <div style={{
    background: color || C.coral, borderRadius: 20, padding: "8px 20px", display: "inline-block",
  }}>
    <span style={{ color: C.white, fontSize: 20, fontWeight: 600, fontFamily: "system-ui, sans-serif" }}>{label}</span>
  </div>
);

// ── Agendas ──────────────────────────────────────────────────────────────
export const AgendaListScreen: React.FC = () => (
  <div style={{ background: C.cream, height: "100%", display: "flex", flexDirection: "column" }}>
    <AppBar title="Agendas de Visita" />
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
      {[
        { name: "Visita da Vovó", date: "Sáb, 26 Abr", slots: "3 horários" },
        { name: "Amigos do trabalho", date: "Dom, 27 Abr", slots: "5 horários" },
        { name: "Madrinha Ana", date: "Seg, 28 Abr", slots: "2 horários" },
      ].map((a, i) => (
        <div key={i} style={{
          background: C.white, borderRadius: 16, padding: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.brown, fontFamily: "system-ui, sans-serif", marginBottom: 8 }}>{a.name}</div>
          <div style={{ display: "flex", gap: 12 }}>
            <Chip label={a.date} />
            <Chip label={a.slots} color={C.mintDark} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AgendaShareScreen: React.FC = () => (
  <div style={{ background: C.cream, height: "100%", display: "flex", flexDirection: "column" }}>
    <AppBar title="Compartilhar" />
    <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
      <div style={{ fontSize: 80, marginTop: 20 }}>🔗</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.brown, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        Mande o link para a família escolher o horário!
      </div>
      <div style={{
        background: C.white, borderRadius: 16, padding: "16px 24px", width: "100%",
        border: `2px dashed ${C.coral}`,
      }}>
        <span style={{ fontSize: 20, color: "#888", fontFamily: "system-ui, sans-serif" }}>ladoalado.app/visita/abc123</span>
      </div>
      <div style={{
        background: C.coral, borderRadius: 40, padding: "20px 48px",
        display: "flex", gap: 12, alignItems: "center",
      }}>
        <span style={{ fontSize: 28 }}>📤</span>
        <span style={{ color: C.white, fontSize: 26, fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>Compartilhar no WhatsApp</span>
      </div>
    </div>
  </div>
);

// ── Mamadas ──────────────────────────────────────────────────────────────
export const FeedingScreen: React.FC = () => (
  <div style={{ background: C.cream, height: "100%", display: "flex", flexDirection: "column" }}>
    <AppBar title="Mamadas" />
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      {[
        { time: "14:32", side: "Direito", duration: "18 min" },
        { time: "11:15", side: "Esquerdo", duration: "22 min" },
        { time: "08:40", side: "Direito", duration: "15 min" },
      ].map((f, i) => (
        <div key={i} style={{
          background: C.white, borderRadius: 16, padding: 18,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.brown, fontFamily: "system-ui, sans-serif" }}>{f.time}</div>
            <div style={{ fontSize: 20, color: "#888", fontFamily: "system-ui, sans-serif" }}>{f.side}</div>
          </div>
          <Chip label={f.duration} />
        </div>
      ))}
      <div style={{
        background: C.coral, borderRadius: 40, padding: "18px 0",
        display: "flex", justifyContent: "center", gap: 12, alignItems: "center", marginTop: 10,
      }}>
        <span style={{ fontSize: 28 }}>➕</span>
        <span style={{ color: C.white, fontSize: 24, fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>Registrar mamada</span>
      </div>
    </div>
  </div>
);

export const FeedingReportScreen: React.FC = () => (
  <div style={{ background: C.cream, height: "100%", display: "flex", flexDirection: "column" }}>
    <AppBar title="Relatório Semanal" />
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Hoje", value: "5 mamadas" },
          { label: "Média", value: "4,8 / dia" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: i === 0 ? C.coral : C.mintDark, borderRadius: 16, padding: 18,
          }}>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.8)", fontFamily: "system-ui, sans-serif" }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.white, fontFamily: "system-ui, sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Bar chart mockup */}
      <div style={{ background: C.white, borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.brown, marginBottom: 14, fontFamily: "system-ui, sans-serif" }}>Últimos 7 dias</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 120 }}>
          {[3, 5, 4, 6, 5, 4, 5].map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: "100%", height: v * 18, background: i === 6 ? C.coral : C.mint,
                borderRadius: 6,
              }} />
              <div style={{ fontSize: 16, color: "#888", fontFamily: "system-ui, sans-serif" }}>
                {["S", "T", "Q", "Q", "S", "S", "D"][i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── Peso ─────────────────────────────────────────────────────────────────
export const WeightScreen: React.FC = () => (
  <div style={{ background: C.cream, height: "100%", display: "flex", flexDirection: "column" }}>
    <AppBar title="Crescimento" />
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[{ label: "Peso atual", value: "4,2 kg" }, { label: "Altura", value: "56 cm" }].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: i === 0 ? C.coral : C.mintDark, borderRadius: 16, padding: 18,
          }}>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", fontFamily: "system-ui, sans-serif" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.white, fontFamily: "system-ui, sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Weight curve mockup */}
      <div style={{ background: C.white, borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.brown, marginBottom: 14, fontFamily: "system-ui, sans-serif" }}>Curva de crescimento</div>
        <svg width="100%" height="140" viewBox="0 0 280 140">
          <polyline points="20,120 60,105 100,88 140,72 180,58 220,45 260,34"
            fill="none" stroke={C.mint} strokeWidth="3" strokeDasharray="6 3" />
          <polyline points="20,118 60,100 100,82 140,65 180,54 220,44 260,36"
            fill="none" stroke={C.coral} strokeWidth="3" />
          {[20, 60, 100, 140, 180, 220, 260].map((x, i) => (
            <circle key={i} cx={x} cy={[118, 100, 82, 65, 54, 44, 36][i]} r="5" fill={C.coral} />
          ))}
        </svg>
        <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 24, height: 3, background: C.coral }} />
            <span style={{ fontSize: 18, color: "#888", fontFamily: "system-ui, sans-serif" }}>Seu bebê</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 24, height: 3, background: C.mint, borderTop: "3px dashed" }} />
            <span style={{ fontSize: 18, color: "#888", fontFamily: "system-ui, sans-serif" }}>Percentil 50</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Fraldas ──────────────────────────────────────────────────────────────
export const DiaperScreen: React.FC = () => (
  <div style={{ background: C.cream, height: "100%", display: "flex", flexDirection: "column" }}>
    <AppBar title="Fraldas" />
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { emoji: "💛", label: "Hoje", value: "6 trocas" },
          { emoji: "📊", label: "Média", value: "7 / dia" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: i === 0 ? C.coral : C.mintDark, borderRadius: 16, padding: 18,
          }}>
            <div style={{ fontSize: 32 }}>{s.emoji}</div>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", fontFamily: "system-ui, sans-serif" }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.white, fontFamily: "system-ui, sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>
      {[
        { time: "15:10", type: "Xixi + Cocô", color: C.amber },
        { time: "13:45", type: "Xixi", color: C.mint },
        { time: "11:20", type: "Cocô", color: C.peach },
      ].map((d, i) => (
        <div key={i} style={{
          background: C.white, borderRadius: 16, padding: 18,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.brown, fontFamily: "system-ui, sans-serif" }}>{d.time}</div>
          </div>
          <Chip label={d.type} color={d.color === C.amber ? C.coral : C.mintDark} />
        </div>
      ))}
    </div>
  </div>
);

// ── Acompanhantes ─────────────────────────────────────────────────────────
export const CompanionScreen: React.FC = () => (
  <div style={{ background: C.cream, height: "100%", display: "flex", flexDirection: "column" }}>
    <AppBar title="Acompanhantes" />
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {[
        { name: "Vovó Maria", visits: "4 visitas", activities: "3 atividades", emoji: "👵" },
        { name: "Tia Clara", visits: "2 visitas", activities: "5 atividades", emoji: "👩" },
        { name: "Padrinho João", visits: "1 visita", activities: "2 atividades", emoji: "👨" },
      ].map((c, i) => (
        <div key={i} style={{
          background: C.white, borderRadius: 16, padding: 18,
          display: "flex", gap: 16, alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            width: 56, height: 56, background: C.peach, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0,
          }}>{c.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.brown, fontFamily: "system-ui, sans-serif" }}>{c.name}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Chip label={c.visits} />
              <Chip label={c.activities} color={C.mintDark} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
