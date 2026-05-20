import { useState, useMemo } from "react";

const NUM_SIMULATIONS = 500;
const NUM_TRADES = 200;
const STARTING_BALANCE = 10;
const WIN_RATE = 0.70;
const BASE_RISK = 0.10;

function getRR(seed) {
  if (seed < 0.70) return 3;
  if (seed < 0.95) return 2;
  return 5;
}

function getRiskPct(tradeIndex, consecutiveLosses) {
  if (tradeIndex < 100) {
    if (consecutiveLosses === 0) return BASE_RISK;
    if (consecutiveLosses === 1) return 0.05;
    return 0.025;
  } else {
    if (consecutiveLosses === 0) return 0.025;
    if (consecutiveLosses === 1) return 0.015;
    return 0.01;
  }
}

function runSimulationDetailed() {
  let balance = STARTING_BALANCE;
  let consecutiveLosses = 0;
  let deficit = 0;
  const trades = [];

  for (let i = 0; i < NUM_TRADES; i++) {
    const startBalance = balance;
    const riskPct = getRiskPct(i, consecutiveLosses);
    const riskAmt = startBalance * riskPct;
    const win = Math.random() < WIN_RATE;
    let rr = null;
    let pnl = 0;

    if (win) {
      rr = getRR(Math.random());
      pnl = riskAmt * rr;
      balance += pnl;
      deficit = Math.max(0, deficit - pnl);
      if (deficit <= 0) { consecutiveLosses = 0; deficit = 0; }
      else consecutiveLosses = Math.min(consecutiveLosses, 1);
    } else {
      pnl = -riskAmt;
      deficit += riskAmt;
      balance -= riskAmt;
      consecutiveLosses = Math.min(consecutiveLosses + 1, 2);
    }

    trades.push({
      day: i + 1,
      startBalance,
      riskPct,
      riskAmt,
      win,
      rr,
      pnl,
      endBalance: balance,
      inRecovery: consecutiveLosses > 0 || deficit > 0,
    });
  }
  return { trades, finalBalance: balance };
}

function runSimpleFinal() {
  let balance = STARTING_BALANCE;
  let consecutiveLosses = 0;
  let deficit = 0;

  for (let i = 0; i < NUM_TRADES; i++) {
    const riskPct = getRiskPct(i, consecutiveLosses);
    const riskAmt = balance * riskPct;
    const win = Math.random() < WIN_RATE;

    if (win) {
      const rr = getRR(Math.random());
      const gained = riskAmt * rr;
      balance += gained;
      deficit = Math.max(0, deficit - gained);
      if (deficit <= 0) { consecutiveLosses = 0; deficit = 0; }
      else consecutiveLosses = Math.min(consecutiveLosses, 1);
    } else {
      deficit += riskAmt;
      balance -= riskAmt;
      consecutiveLosses = Math.min(consecutiveLosses + 1, 2);
    }
  }
  return balance;
}

function getMedianSim() {
  const finals = Array.from({ length: NUM_SIMULATIONS }, runSimpleFinal).sort((a, b) => a - b);
  const medianFinal = finals[Math.floor(finals.length / 2)];
  let bestSim = null;
  let bestDiff = Infinity;
  for (let i = 0; i < 200; i++) {
    const sim = runSimulationDetailed();
    const diff = Math.abs(sim.finalBalance - medianFinal);
    if (diff < bestDiff) { bestDiff = diff; bestSim = sim; }
    if (diff < 0.5) break;
  }
  return bestSim;
}

export default function App() {
  const [sim, setSim] = useState(null);
  const [filter, setFilter] = useState("all");

  function generate() { setSim(getMedianSim()); }

  const filtered = useMemo(() => {
    if (!sim) return [];
    if (filter === "wins") return sim.trades.filter(t => t.win);
    if (filter === "losses") return sim.trades.filter(t => !t.win);
    if (filter === "recovery") return sim.trades.filter(t => t.inRecovery);
    return sim.trades;
  }, [sim, filter]);

  const fmt  = v => "£" + Math.abs(v).toFixed(4);
  const fmtB = v => "£" + v.toFixed(4);

  const wins        = sim ? sim.trades.filter(t => t.win).length : 0;
  const losses      = sim ? sim.trades.filter(t => !t.win).length : 0;
  const recoveryDays = sim ? sim.trades.filter(t => t.inRecovery).length : 0;

  function riskColor(riskPct, day) {
    if (day <= 100) {
      if (riskPct === BASE_RISK) return "#f0e8e8";
      if (riskPct === 0.05)      return "#ffc832";
      return "#ff8c64";
    } else {
      if (riskPct === 0.025) return "#f0e8e8";
      if (riskPct === 0.015) return "#ffc832";
      return "#ff8c64";
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0000", color: "#f0e8e8", fontFamily: "'Courier New', monospace", padding: "28px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#cc2200", textTransform: "uppercase", marginBottom: 6 }}>
          Day-by-Day Breakdown
        </div>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "#fff" }}>
          Median Path · 200 Trades
        </h1>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>
          70% win rate · 1:3 (70%) / 1:2 (25%) / 1:5 (5%) · Tiered recovery risk · Phase shift at trade 100
        </div>

        <button onClick={generate} style={{ background: "rgba(180,20,20,0.9)", color: "#fff", border: "none", borderRadius: 4, padding: "10px 28px", fontSize: 13, fontFamily: "inherit", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", marginBottom: 24 }}>
          {sim ? "Regenerate" : "Generate Table"}
        </button>

        {sim && (<>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Start",      val: fmtB(STARTING_BALANCE),                                                               accent: "#fff" },
              { label: "End Balance",val: fmtB(sim.finalBalance),                                                               accent: sim.finalBalance >= STARTING_BALANCE ? "#00ffa0" : "#ff5050" },
              { label: "Total Gain", val: (sim.finalBalance >= STARTING_BALANCE ? "+" : "") + "£" + (sim.finalBalance - STARTING_BALANCE).toFixed(4), accent: sim.finalBalance >= STARTING_BALANCE ? "#00ffa0" : "#ff5050" },
              { label: "Return",     val: (((sim.finalBalance / STARTING_BALANCE) - 1) * 100).toFixed(1) + "%",                 accent: "#ffc832" },
            ].map(({ label, val, accent }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Mini stats */}
          <div style={{ display: "flex", gap: 16, fontSize: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ color: "#00ffa0" }}>✓ {wins} wins</span>
            <span style={{ color: "#ff5050" }}>✗ {losses} losses</span>
            <span style={{ color: "#ffc832" }}>⚠ {recoveryDays} days in recovery</span>
          </div>

          {/* Filter buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["all","wins","losses","recovery"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "rgba(180,20,20,0.8)" : "rgba(255,255,255,0.05)", color: filter === f ? "#fff" : "rgba(255,255,255,0.45)", border: "1px solid " + (filter === f ? "rgba(180,20,20,0.5)" : "rgba(255,255,255,0.1)"), borderRadius: 4, padding: "5px 14px", fontSize: 11, fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>
                {f}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {["Day","Start Balance","Risk %","Risk £","Result","R:R","P&L","End Balance"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "right", color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: 1, fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.day} style={{ background: t.win ? "rgba(0,255,160,0.03)" : "rgba(255,80,80,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", borderTop: t.day === 101 ? "2px solid rgba(180,20,20,0.5)" : "none" }}>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: t.day === 101 ? "#cc2200" : "rgba(255,255,255,0.4)", fontWeight: t.day === 101 ? 700 : 600 }}>{t.day}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "rgba(255,255,255,0.75)" }}>{fmtB(t.startBalance)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>
                      <span style={{ color: riskColor(t.riskPct, t.day), fontWeight: t.riskPct !== (t.day <= 100 ? BASE_RISK : 0.025) ? 700 : 400 }}>
                        {(t.riskPct * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "rgba(255,255,255,0.6)" }}>{fmt(t.riskAmt)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>
                      {t.win ? <span style={{ color: "#00ffa0", fontWeight: 700 }}>WIN</span> : <span style={{ color: "#ff5050", fontWeight: 700 }}>LOSS</span>}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "rgba(255,255,255,0.5)" }}>{t.win ? `1:${t.rr}` : "—"}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600 }}>
                      <span style={{ color: t.win ? "#00ffa0" : "#ff5050" }}>{t.win ? "+" : "-"}{fmt(t.pnl)}</span>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>{fmtB(t.endBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            <span>Trades 1–100: <b style={{color:"#f0e8e8"}}>10%</b> normal · <b style={{color:"#ffc832"}}>5%</b> after loss · <b style={{color:"#ff8c64"}}>2.5%</b> after 2 losses</span>
            <span>Trades 101–200: <b style={{color:"#f0e8e8"}}>2.5%</b> normal · <b style={{color:"#ffc832"}}>1.5%</b> after loss · <b style={{color:"#ff8c64"}}>1%</b> after 2 losses</span>
          </div>
        </>)}
      </div>
    </div>
  );
}
