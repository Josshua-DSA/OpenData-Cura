import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingDown, TrendingUp, AlertCircle, Heart } from "lucide-react";
import TopBar from "../components/TopBar";
import { diseaseTrend, stuntingTrend, top10Diseases, priorityRegions } from "../data/healthData";

type Tab = "burden" | "kia" | "communicable";

interface DiseasePageProps {
  onAIPanel?: () => void;
  year?: string;
}

export default function DiseasePage({ onAIPanel }: DiseasePageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("burden");

  const tabs: { key: Tab; label: string }[] = [
    { key: "burden", label: "Beban Penyakit" },
    { key: "kia", label: "Kesehatan Ibu & Anak" },
    { key: "communicable", label: "Penyakit Menular" },
  ];

  // Top 5 priority regions for stunting
  const top5Stunting = [...priorityRegions]
    .sort((a, b) => b.stuntingRate - a.stuntingRate)
    .slice(0, 5);

  const maxStunting = Math.max(...top5Stunting.map((r) => r.stuntingRate));

  // Latest month communicable totals (December)
  const latestMonth = diseaseTrend[diseaseTrend.length - 1];
  const prevMonth = diseaseTrend[diseaseTrend.length - 2];

  return (
    <div className="cura-page">
      <TopBar title="Penyakit & KIA" onAIPanel={onAIPanel} />

      <div className="cura-page-content">
        {/* Tab strip */}
        <div className="cura-tabs" style={{ marginBottom: "var(--spacing-lg)" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`cura-tab${activeTab === t.key ? " active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Beban Penyakit */}
        {activeTab === "burden" && (
          <div>
            {/* KPI row */}
            <div className="responsive-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--spacing-lg)", marginBottom: "var(--spacing-lg)" }}>
              <div className="cura-kpi-card">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-xs)" }}>
                  <AlertCircle size={14} style={{ color: "var(--color-medical-blue)" }} />
                  <span className="cura-kpi-label">Total Kasus Aktif</span>
                </div>
                <div className="cura-kpi-value">847.320</div>
                <div className="cura-kpi-badge warning">Pemantauan</div>
              </div>
              <div className="cura-kpi-card">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-xs)" }}>
                  <TrendingUp size={14} style={{ color: "var(--color-warning)" }} />
                  <span className="cura-kpi-label">Kasus Baru Minggu Ini</span>
                </div>
                <div className="cura-kpi-value">3.245</div>
                <div className="cura-kpi-badge negative">+4.2% vs minggu lalu</div>
              </div>
              <div className="cura-kpi-card">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-xs)" }}>
                  <TrendingDown size={14} style={{ color: "var(--color-safe)" }} />
                  <span className="cura-kpi-label">Case Fatality Rate</span>
                </div>
                <div className="cura-kpi-value">1.8%</div>
                <div className="cura-kpi-badge positive">-0.3% vs tahun lalu</div>
              </div>
            </div>

            {/* Charts */}
            <div className="responsive-chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-lg)" }}>
              <div className="cura-card">
                <div className="cura-section-title" style={{ marginBottom: "var(--spacing-md)" }}>Tren Penyakit Utama (2024)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={diseaseTrend} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                    <Line type="monotone" dataKey="dbd" stroke="#D94A4A" strokeWidth={2} dot={false} name="DBD" />
                    <Line type="monotone" dataKey="tb" stroke="#E8A020" strokeWidth={2} dot={false} name="TB" />
                    <Line type="monotone" dataKey="pneumonia" stroke="#1677C8" strokeWidth={2} dot={false} name="Pneumonia" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="cura-card">
                <div className="cura-section-title" style={{ marginBottom: "var(--spacing-md)" }}>Top 10 Penyakit Terbanyak</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={top10Diseases}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                    <YAxis type="category" dataKey="disease" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v: number) => v.toLocaleString("id-ID")} />
                    <Bar dataKey="cases" fill="#1677C8" radius={[0, 3, 3, 0]} name="Kasus" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: KIA */}
        {activeTab === "kia" && (
          <div>
            {/* KPI row */}
            <div className="responsive-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--spacing-lg)", marginBottom: "var(--spacing-lg)" }}>
              <div className="cura-kpi-card">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-xs)" }}>
                  <Heart size={14} style={{ color: "var(--color-critical)" }} />
                  <span className="cura-kpi-label">Stunting</span>
                </div>
                <div className="cura-kpi-value">18.7%</div>
                <div className="cura-kpi-badge positive">-1.6% vs 2023</div>
              </div>
              <div className="cura-kpi-card">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-xs)" }}>
                  <TrendingDown size={14} style={{ color: "var(--color-safe)" }} />
                  <span className="cura-kpi-label">AKI</span>
                </div>
                <div className="cura-kpi-value" style={{ fontSize: "20px" }}>118/100k kelahiran</div>
                <div className="cura-kpi-badge warning">Di atas target nasional</div>
              </div>
              <div className="cura-kpi-card">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-xs)" }}>
                  <TrendingDown size={14} style={{ color: "var(--color-safe)" }} />
                  <span className="cura-kpi-label">AKB</span>
                </div>
                <div className="cura-kpi-value" style={{ fontSize: "20px" }}>7.8/1k kelahiran</div>
                <div className="cura-kpi-badge positive">-0.4 vs 2023</div>
              </div>
            </div>

            <div className="responsive-chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-lg)" }}>
              <div className="cura-card">
                <div className="cura-section-title" style={{ marginBottom: "var(--spacing-md)" }}>Tren Stunting Jawa Timur (%)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stuntingTrend} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis domain={[15, 30]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="rate" stroke="#2F9E72" strokeWidth={2.5} dot={{ r: 3, fill: "#2F9E72" }} name="Stunting Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="cura-card">
                <div className="cura-section-title" style={{ marginBottom: "var(--spacing-md)" }}>5 Wilayah Prioritas Stunting</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                  {top5Stunting.map((region, i) => (
                    <div key={region.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-primary)" }}>
                          {i + 1}. {region.name}
                        </span>
                        <span style={{ fontSize: "var(--font-size-caption)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-critical)" }}>
                          {region.stuntingRate}%
                        </span>
                      </div>
                      <div style={{ height: "6px", borderRadius: "3px", background: "var(--color-border)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          borderRadius: "3px",
                          background: "var(--color-critical)",
                          width: `${(region.stuntingRate / maxStunting) * 100}%`,
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Penyakit Menular */}
        {activeTab === "communicable" && (
          <div>
            {/* 3 metric cards */}
            <div className="responsive-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--spacing-lg)", marginBottom: "var(--spacing-lg)" }}>
              {[
                { label: "DBD", current: latestMonth.dbd, prev: prevMonth.dbd, color: "#D94A4A" },
                { label: "Tuberkulosis (TB)", current: latestMonth.tb, prev: prevMonth.tb, color: "#E8A020" },
                { label: "Pneumonia", current: latestMonth.pneumonia, prev: prevMonth.pneumonia, color: "#1677C8" },
              ].map(({ label, current, prev, color }) => {
                const delta = current - prev;
                const pct = ((delta / prev) * 100).toFixed(1);
                const up = delta >= 0;
                return (
                  <div key={label} className="cura-kpi-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "var(--spacing-xs)" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color }} />
                      <span className="cura-kpi-label">{label}</span>
                    </div>
                    <div className="cura-kpi-value">{current.toLocaleString("id-ID")}</div>
                    <div className={`cura-kpi-badge ${up ? "negative" : "positive"}`}>
                      {up ? <TrendingUp size={11} style={{ display: "inline" }} /> : <TrendingDown size={11} style={{ display: "inline" }} />}
                      {" "}{up ? "+" : ""}{pct}% vs bulan lalu
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cura-card">
              <div className="cura-section-title" style={{ marginBottom: "var(--spacing-md)" }}>Tren Penyakit Menular 2024</div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={diseaseTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="dbd" stroke="#D94A4A" strokeWidth={2} dot={false} name="DBD" />
                  <Line type="monotone" dataKey="tb" stroke="#E8A020" strokeWidth={2} dot={false} name="TB" />
                  <Line type="monotone" dataKey="pneumonia" stroke="#1677C8" strokeWidth={2} dot={false} name="Pneumonia" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
