import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BrainCircuit, ArrowUp, ArrowDown, Minus } from "lucide-react";
import TopBar from "../components/TopBar";
import { regionHealth } from "../data/healthData";

interface CompareRegionPageProps {
  onAIPanel?: () => void;
  year?: string;
}

interface MetricConfig {
  key: "bedRatio" | "stuntingRate" | "facilityCount" | "aki";
  label: string;
  unit: string;
  lowerIsBetter: boolean;
  decimals: number;
}

const METRICS: MetricConfig[] = [
  { key: "bedRatio", label: "Rasio Tempat Tidur", unit: "/1k pop", lowerIsBetter: false, decimals: 2 },
  { key: "stuntingRate", label: "Tingkat Stunting", unit: "%", lowerIsBetter: true, decimals: 1 },
  { key: "facilityCount", label: "Jumlah Fasilitas", unit: "", lowerIsBetter: false, decimals: 0 },
  { key: "aki", label: "AKI", unit: "/100k", lowerIsBetter: true, decimals: 0 },
];

export default function CompareRegionPage({ onAIPanel }: CompareRegionPageProps) {
  const [regionAId, setRegionAId] = useState("surabaya");
  const [regionBId, setRegionBId] = useState("sampang");

  const regionA = regionHealth.find((r) => r.id === regionAId)!;
  const regionB = regionHealth.find((r) => r.id === regionBId)!;

  // Chart data
  const chartData = METRICS.map((m) => ({
    metric: m.label,
    [regionA.name]: regionA[m.key],
    [regionB.name]: regionB[m.key],
  }));

  // Determine which region needs more attention (higher priority level or worse avg score)
  const needsAttention =
    regionA.priorityLevel === "high" && regionB.priorityLevel !== "high"
      ? regionA
      : regionB.priorityLevel === "high" && regionA.priorityLevel !== "high"
      ? regionB
      : regionA.stuntingRate > regionB.stuntingRate
      ? regionA
      : regionB;

  return (
    <div className="cura-page">
      <TopBar title="Bandingkan Wilayah" onAIPanel={onAIPanel} />

      <div className="cura-page-content">
        {/* Region selectors */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-lg)", marginBottom: "var(--spacing-xl)", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>Wilayah A</label>
            <select
              className="cura-select"
              value={regionAId}
              onChange={(e) => setRegionAId(e.target.value)}
              style={{ minWidth: "200px", borderLeft: "3px solid #1677C8" }}
            >
              {regionHealth.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: "var(--font-size-heading)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)", marginTop: "16px" }}>vs</span>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>Wilayah B</label>
            <select
              className="cura-select"
              value={regionBId}
              onChange={(e) => setRegionBId(e.target.value)}
              style={{ minWidth: "200px", borderLeft: "3px solid #D94A4A" }}
            >
              {regionHealth.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison metric cards */}
        <div className="cura-compare-grid" style={{ marginBottom: "var(--spacing-xl)" }}>
          {METRICS.map((m) => {
            const aVal = regionA[m.key];
            const bVal = regionB[m.key];
            const aWins = m.lowerIsBetter ? aVal <= bVal : aVal >= bVal;
            const bWins = m.lowerIsBetter ? bVal <= aVal : bVal >= aVal;
            const tied = aVal === bVal;

            const formatVal = (v: number) =>
              m.decimals === 0 ? v.toLocaleString("id-ID") : v.toFixed(m.decimals);

            return (
              <div key={m.key} className="cura-card">
                <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-sm)" }}>
                  {m.label}
                  {m.unit && <span> ({m.unit})</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: "22px", fontWeight: "var(--font-weight-bold)", color: "#1677C8" }}>
                      {formatVal(aVal)}
                    </div>
                    <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                      {regionA.name}
                    </div>
                    {!tied && (
                      <div style={{ marginTop: "4px" }}>
                        {aWins ? (
                          <span style={{ color: "var(--color-safe)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                            <ArrowUp size={11} /> Lebih baik
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-critical)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                            <ArrowDown size={11} /> Perlu perhatian
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "0 var(--spacing-md)", color: "var(--color-text-secondary)" }}>
                    {tied ? <Minus size={16} /> : aWins ? (
                      <span style={{ color: "#1677C8", fontWeight: "bold" }}>{"<"}</span>
                    ) : (
                      <span style={{ color: "#D94A4A", fontWeight: "bold" }}>{">"}</span>
                    )}
                  </div>

                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: "22px", fontWeight: "var(--font-weight-bold)", color: "#D94A4A" }}>
                      {formatVal(bVal)}
                    </div>
                    <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                      {regionB.name}
                    </div>
                    {!tied && (
                      <div style={{ marginTop: "4px" }}>
                        {bWins ? (
                          <span style={{ color: "var(--color-safe)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                            <ArrowUp size={11} /> Lebih baik
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-critical)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                            <ArrowDown size={11} /> Perlu perhatian
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grouped Bar Chart */}
        <div className="cura-card" style={{ marginBottom: "var(--spacing-lg)" }}>
          <div className="cura-section-title" style={{ marginBottom: "var(--spacing-md)" }}>
            Perbandingan Visual — {regionA.name} vs {regionB.name}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey={regionA.name} fill="#1677C8" radius={[3, 3, 0, 0]} />
              <Bar dataKey={regionB.name} fill="#D94A4A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Insight */}
        <div className="cura-card" style={{ background: "#FEF5E4", border: "1px solid #E8A020", marginBottom: "var(--spacing-lg)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-sm)" }}>
            <div style={{ fontSize: "18px", marginTop: "2px" }}>⚠️</div>
            <div>
              <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-body-sm)", color: "var(--color-navy)", marginBottom: "4px" }}>
                Wilayah Prioritas Perhatian
              </div>
              <p style={{ fontSize: "var(--font-size-body-sm)", color: "var(--color-text-primary)", lineHeight: 1.6, margin: 0 }}>
                <strong>{needsAttention.name}</strong> memerlukan perhatian lebih dengan tingkat stunting{" "}
                <strong>{needsAttention.stuntingRate}%</strong>, rasio tempat tidur hanya{" "}
                <strong>{needsAttention.bedRatio.toFixed(2)}</strong> per 1.000 penduduk, dan AKI{" "}
                <strong>{needsAttention.aki}</strong> per 100.000 kelahiran hidup. Intervensi program kesehatan
                terpadu perlu diprioritaskan di wilayah ini untuk mempercepat perbaikan indikator.
              </p>
            </div>
          </div>
        </div>

        {/* AI Button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="cura-btn cura-btn-primary"
            onClick={onAIPanel}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 24px", fontSize: "var(--font-size-body-sm)" }}
          >
            <BrainCircuit size={16} />
            Tanya Tilik Jatim AI
          </button>
        </div>
      </div>
    </div>
  );
}
