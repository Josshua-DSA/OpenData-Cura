import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TopBar from "../components/TopBar";
import { facilities, facilityTypes, facilityKelas, ownershipOptions, type Facility } from "../data/facilitiesData";
import EastJavaMarkerMap from "../components/EastJavaMarkerMap";

interface FacilitiesPageProps {
  onAIPanel?: () => void;
  year?: string;
}

const PAGE_SIZE = 5;
const CHART_COLORS = [
  "var(--color-palette-primary)",
  "var(--color-palette-medium)",
  "var(--color-palette-light)",
  "var(--color-palette-pale)",
];

export default function FacilitiesPage({ onAIPanel }: FacilitiesPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua Tipe");
  const [kelasFilter, setKelasFilter] = useState("Semua Kelas");
  const [ownershipFilter, setOwnershipFilter] = useState("Semua Kepemilikan");
  const [page, setPage] = useState(0);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const filtered = facilities.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.kabupaten.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "Semua Tipe" || f.type === typeFilter;
    const matchKelas = kelasFilter === "Semua Kelas" || f.kelas === kelasFilter;
    const matchOwnership = ownershipFilter === "Semua Kepemilikan" || f.ownership === ownershipFilter;
    return matchSearch && matchType && matchKelas && matchOwnership;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const facilityTypeData = facilityTypes
    .filter((type) => type !== "Semua Tipe")
    .map((type) => ({
      name: type,
      value: filtered.filter((facility) => facility.type === type).length,
    }))
    .filter((item) => item.value > 0);
  const regionFacilityData = Object.values(
    filtered.reduce<Record<string, { name: string; value: number }>>((regions, facility) => {
      const current = regions[facility.kabupaten] ?? { name: facility.kabupaten, value: 0 };
      current.value += 1;
      regions[facility.kabupaten] = current;
      return regions;
    }, {}),
  ).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "id"));

  const handleFilterChange = () => setPage(0);

  return (
    <div className="cura-page">
      <TopBar title="Fasilitas Kesehatan" onAIPanel={onAIPanel} />

      <div className="cura-page-content">
        <div className="facilities-kpi-grid">
          {[
            ["Rumah Sakit", "447"],
            ["Puskesmas", "977"],
            ["Tempat Tidur", "38.420"],
            ["Tenaga Kesehatan", "86.214"],
          ].map(([label, value]) => (
            <div className="cura-kpi-card" key={label}>
              <div className="cura-kpi-label">{label}</div>
              <div className="cura-kpi-value">{value}</div>
              <span className="cura-kpi-badge positive">Data aktif 2024</span>
            </div>
          ))}
        </div>

        {/* Filter row */}
        <div className="facilities-filter-row" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", flexWrap: "wrap", marginBottom: "var(--spacing-lg)" }}>
          <div className="cura-topbar-search" style={{ flex: "1", minWidth: "200px" }}>
            <Search size={15} />
            <input
              type="text"
              placeholder="Cari nama atau kabupaten..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange(); }}
            />
          </div>

          <div className="facilities-filter-icon" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)" }}>
            <Filter size={14} />
          </div>

          <select
            className="cura-select"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); handleFilterChange(); }}
          >
            {facilityTypes.map((t) => <option key={t}>{t}</option>)}
          </select>

          <select
            className="cura-select"
            value={kelasFilter}
            onChange={(e) => { setKelasFilter(e.target.value); handleFilterChange(); }}
          >
            {facilityKelas.map((k) => <option key={k}>{k}</option>)}
          </select>

          <select
            className="cura-select"
            value={ownershipFilter}
            onChange={(e) => { setOwnershipFilter(e.target.value); handleFilterChange(); }}
          >
            {ownershipOptions.map((o) => <option key={o}>{o}</option>)}
          </select>

          <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
            {filtered.length} fasilitas ditemukan
          </span>
        </div>

        <div className="facilities-visual-grid">
          <div className="cura-card facilities-chart-card facilities-donut-card">
            <div className="facilities-chart-heading">
              <div>
                <div className="cura-section-title">Komposisi fasilitas berdasarkan tipe</div>
                <div className="facilities-chart-subtitle">
                  Distribusi tipe pada hasil filter aktif.
                </div>
              </div>
              <span className="facilities-chart-total">{filtered.length} fasilitas</span>
            </div>
            <div className="facilities-chart-content">
              {facilityTypeData.length > 0 ? (
                <>
                  <div className="facilities-donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={facilityTypeData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="54%"
                          outerRadius="82%"
                          paddingAngle={3}
                          stroke="var(--color-white)"
                        >
                          {facilityTypeData.map((item, index) => (
                            <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value} fasilitas`, "Jumlah"]}
                          contentStyle={{
                            background: "var(--color-white)",
                            border: "var(--border-width) solid var(--border-color)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-text-primary)",
                            fontFamily: "var(--font-family-base)",
                            fontSize: "var(--font-size-caption)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="facilities-chart-legend">
                    {facilityTypeData.map((item, index) => (
                      <div className="facilities-chart-legend-item" key={item.name}>
                        <span
                          className="facilities-chart-legend-dot"
                          style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span>{item.name}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="facilities-chart-empty">Tidak ada data untuk filter aktif.</div>
              )}
            </div>
          </div>

          <div className="cura-card facilities-chart-card facilities-bar-card">
            <div className="facilities-chart-heading">
              <div>
                <div className="cura-section-title">Jumlah fasilitas per kabupaten/kota</div>
                <div className="facilities-chart-subtitle">
                  Perbandingan wilayah berdasarkan data fasilitas yang tersedia.
                </div>
              </div>
              <span className="facilities-chart-total">{regionFacilityData.length} wilayah</span>
            </div>
            <div className="facilities-bar-chart">
              {regionFacilityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionFacilityData}
                    layout="vertical"
                    margin={{ top: 8, right: 8, bottom: 28, left: 8 }}
                  >
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "var(--color-text-secondary)",
                        fontFamily: "var(--font-family-base)",
                        fontSize: "var(--font-size-caption)",
                      }}
                      label={{
                        value: "Jumlah fasilitas",
                        position: "insideBottom",
                        offset: -16,
                        fill: "var(--color-text-secondary)",
                        fontFamily: "var(--font-family-base)",
                        fontSize: "var(--font-size-caption)",
                      }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={108}
                      tick={{
                        fill: "var(--color-text-secondary)",
                        fontFamily: "var(--font-family-base)",
                        fontSize: "var(--font-size-caption)",
                      }}
                      label={{
                        value: "Kabupaten/Kota",
                        angle: -90,
                        position: "insideLeft",
                        fill: "var(--color-text-secondary)",
                        fontFamily: "var(--font-family-base)",
                        fontSize: "var(--font-size-caption)",
                      }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} fasilitas`, "Jumlah"]}
                      contentStyle={{
                        background: "var(--color-white)",
                        border: "var(--border-width) solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-family-base)",
                        fontSize: "var(--font-size-caption)",
                      }}
                    />
                    <Bar dataKey="value" name="Jumlah fasilitas" fill="var(--color-safe)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="facilities-chart-empty">Tidak ada data untuk filter aktif.</div>
              )}
            </div>
          </div>
        </div>

        <div className="facilities-data-grid">
          <div className="cura-card facilities-map-card">
            <div className="cura-section-title">Rasio tempat tidur per 1.000 penduduk menurut wilayah</div>
            <EastJavaMarkerMap metric="bedRatio" height={420} />
          </div>

        {/* Table — desktop */}
        <div className="cura-card cura-desktop-only facilities-table-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="facilities-table-scroll">
            <table className="cura-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Fasilitas</th>
                  <th>Kabupaten/Kota</th>
                  <th>Tipe</th>
                  <th>Kelas</th>
                  <th>Tempat Tidur</th>
                  <th>Kepemilikan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "var(--spacing-xl)", color: "var(--color-text-secondary)" }}>
                      Tidak ada data yang sesuai.
                    </td>
                  </tr>
                ) : (
                  paginated.map((f, idx) => (
                    <tr key={f.id}>
                      <td style={{ color: "var(--color-text-secondary)" }}>{page * PAGE_SIZE + idx + 1}</td>
                      <td style={{ fontWeight: "var(--font-weight-medium)" }}>{f.name}</td>
                      <td>{f.kabupaten}</td>
                      <td>{f.type}</td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: "4px",
                          fontSize: "var(--font-size-caption)",
                          background: f.kelas === "A" ? "var(--color-safe-subtle)" : f.kelas === "B" ? "var(--color-light-blue)" : f.kelas === "C" ? "var(--color-warning-subtle)" : "var(--color-page-bg)",
                          color: f.kelas === "A" ? "var(--color-safe)" : f.kelas === "B" ? "var(--color-medical-blue)" : f.kelas === "C" ? "var(--color-warning)" : "var(--color-text-secondary)",
                        }}>
                          {f.kelas}
                        </span>
                      </td>
                      <td>{f.beds.toLocaleString("id-ID")}</td>
                      <td>{f.ownership}</td>
                      <td>
                        <button
                          className="cura-btn cura-btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "var(--font-size-caption)", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => setSelectedFacility(f)}
                        >
                          <Eye size={13} />
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        {/* Cards — mobile */}
        <div className="cura-mobile-only" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          {paginated.length === 0 ? (
            <div className="cura-card" style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              Tidak ada data yang sesuai.
            </div>
          ) : paginated.map((f) => (
            <div key={f.id} className="cura-facility-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-body-sm)", color: "var(--color-navy)" }}>{f.name}</div>
                  <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 2 }}>{f.type} · Kelas {f.kelas}</div>
                  <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>{f.kabupaten}</div>
                </div>
                <span style={{
                  background: f.kelas === "A" ? "var(--color-safe-subtle)" : f.kelas === "B" ? "var(--color-light-blue)" : "var(--color-warning-subtle)",
                  color: f.kelas === "A" ? "var(--color-safe)" : f.kelas === "B" ? "var(--color-medical-blue)" : "var(--color-warning)",
                  padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  Kelas {f.kelas}
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--spacing-lg)", fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>
                <span>Tempat Tidur: <strong style={{ color: "var(--color-navy)" }}>{f.beds.toLocaleString("id-ID")}</strong></span>
                <span>{f.ownership}</span>
              </div>
              <button
                className="cura-btn cura-btn-secondary"
                style={{ alignSelf: "flex-start", padding: "8px 16px", minHeight: 44, display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => setSelectedFacility(f)}
              >
                <Eye size={14} /> Lihat Detail
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "var(--spacing-md)", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
          <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>
            Menampilkan {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length} fasilitas
          </span>
          <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
            <button
              className="cura-btn cura-btn-secondary"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <ChevronLeft size={14} />
              Sebelumnya
            </button>
            <span className="facilities-page-indicator">
              Halaman {page + 1} dari {Math.max(1, totalPages)}
            </span>
            <button
              className="cura-btn cura-btn-secondary"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              Berikutnya
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selectedFacility && (
        <>
          <div className="cura-drawer-overlay" onClick={() => setSelectedFacility(null)} />
          <div className="cura-drawer">
            <div className="cura-drawer-header">
              <span style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-body-sm)" }}>
                {selectedFacility.name}
              </span>
              <button
                className="cura-btn cura-btn-secondary"
                style={{ padding: "4px 8px" }}
                onClick={() => setSelectedFacility(null)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="cura-drawer-body">
              {[
                ["Nama Fasilitas", selectedFacility.name],
                ["Kabupaten/Kota", selectedFacility.kabupaten],
                ["Tipe", selectedFacility.type],
                ["Kelas", selectedFacility.kelas],
                ["Jumlah Tempat Tidur", selectedFacility.beds.toLocaleString("id-ID")],
                ["Kepemilikan", selectedFacility.ownership],
                ["Nomor Telepon", selectedFacility.phone],
                ["Alamat", selectedFacility.address],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "var(--spacing-md)" }}>
                  <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>{label}</span>
                  <span style={{ fontSize: "var(--font-size-body-sm)", color: "var(--color-text-primary)", fontWeight: "var(--font-weight-medium)" }}>{value}</span>
                  <div className="cura-divider" style={{ margin: "var(--spacing-sm) 0 0 0" }} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
