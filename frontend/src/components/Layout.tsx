import React, { useState } from "react";
import {
  LayoutDashboard,
  Map,
  Building2,
  Activity,
  Layers,
  MapPinned,
  ClipboardList,
  BrainCircuit,
  Database,
  Info,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

interface LayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
  onAIPanel?: () => void;
  year?: string;
  onYearChange?: (y: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview",   label: "Overview",      icon: LayoutDashboard },
  { id: "healthmap",  label: "Health Map",    icon: Map },
  { id: "facilities", label: "Facilities",    icon: Building2 },
  { id: "disease",    label: "Disease & KIA", icon: Activity },
  { id: "compare",    label: "Compare Region",icon: Layers },
  { id: "regions",    label: "All Regions", icon: MapPinned },
  { id: "programs",   label: "Program Recommendation", icon: ClipboardList },
];

const TOOL_ITEMS: NavItem[] = [
  { id: "aiinsight", label: "AI Insight", icon: BrainCircuit },
  { id: "opendata",  label: "Open Data",  icon: Database },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: "about", label: "About Tilik Jatim", icon: Info },
];

export default function Layout({ currentPage, onNavigate, children, onAIPanel, year = "2024", onYearChange }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function handleNavClick(item: NavItem) {
    if (["overview","healthmap","facilities","disease","compare","regions","programs","aiinsight","opendata","about"].includes(item.id)) {
      onNavigate(item.id);
    }
    setMobileOpen(false);
  }

  const LogoMark = () => (
    <div className="cura-logo-mark">TJ</div>
  );

  function SidebarBtn({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return (
      <button
        className={`cura-sidebar-btn${active ? " active" : ""}`}
        onClick={() => handleNavClick(item)}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        title={item.label}
      >
        <span className="cura-sidebar-icon"><Icon size={18} /></span>
        <span className="cura-sidebar-menu-text">{item.label}</span>
      </button>
    );
  }

  const Divider = () => (
    <div className="cura-sidebar-divider" />
  );

  const SectionLabel = ({ label }: { label: string }) =>
    (
      <div className="cura-sidebar-label">
        {label}
      </div>
    );

  return (
    <div className="cura-layout-inner">

      {/* ── Desktop sidebar ── */}
      <aside
        className={`cura-sidebar cura-sidebar-desktop${sidebarCollapsed ? " is-collapsed" : ""}`}
      >
        <div className="cura-sidebar-sticky-content">
        {/* Logo row */}
        <div className="cura-sidebar-brand">
          <div className="cura-sidebar-brand-lockup">
            <LogoMark />
            <div className="cura-sidebar-brand-copy">
              <div className="cura-sidebar-brand-name">Tilik Jatim</div>
              <div className="cura-sidebar-brand-subtitle">HealthTrust Platform</div>
            </div>
          </div>
          <button
            className="cura-sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <div className="cura-sidebar-context">
          <MapPinned size={15} />
          <div>
            <span>Wilayah aktif</span>
            <strong>Jawa Timur · {year}</strong>
          </div>
        </div>

        {/* Nav */}
        <nav className="cura-sidebar-nav">
          <SectionLabel label="Menu Utama" />
          {NAV_ITEMS.map((item) => (
            <SidebarBtn key={item.id} item={item} active={currentPage === item.id} />
          ))}

          <Divider />
          <SectionLabel label="Analitik & Data" />
          {TOOL_ITEMS.map((item) => (
            <SidebarBtn key={item.id} item={item} active={currentPage === item.id} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="cura-sidebar-bottom">
          {BOTTOM_ITEMS.map((item) => (
            <SidebarBtn key={item.id} item={item} active={currentPage === item.id} />
          ))}
          <div className="cura-sidebar-status">
            <span className="cura-sidebar-status-dot" />
            <div>
              <strong>Data terhubung</strong>
              <span>Pembaruan sistem aktif</span>
            </div>
          </div>
        </div>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header className="cura-mobile-header">
        <div className="cura-mobile-brand">
          <LogoMark />
          <div>
            <div className="cura-mobile-brand-name">Tilik Jatim</div>
            <div className="cura-mobile-brand-region">Jawa Timur</div>
          </div>
        </div>
        <div className="cura-mobile-actions">
          <select
            className="cura-mobile-year"
            value={year}
            onChange={(e) => onYearChange?.(e.target.value)}
          >
            {["2024","2023","2022","2021"].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            className="cura-mobile-menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="cura-mobile-drawer-layer">
          <div className="cura-mobile-drawer-overlay" onClick={() => setMobileOpen(false)} />
          <nav className="cura-mobile-drawer">
            {/* Header */}
            <div className="cura-mobile-drawer-header">
              <div className="cura-mobile-brand">
                <LogoMark />
                <div>
                  <div className="cura-mobile-brand-name">Tilik Jatim</div>
                  <div className="cura-mobile-brand-region">HealthTrust Jatim</div>
                </div>
              </div>
              <button className="cura-mobile-menu-button" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi">
                <X size={20} />
              </button>
            </div>

            <div className="cura-mobile-drawer-nav">
              {[...NAV_ITEMS, null, ...TOOL_ITEMS, null, ...BOTTOM_ITEMS].map((item, i) => {
                if (!item) return <Divider key={`div-${i}`} />;
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={`cura-mobile-nav-button${active ? " active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={18} />{item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* ── Main content (width adjusts with sidebar) ── */}
      <main
        className="cura-main"
      >
        {children}
      </main>
    </div>
  );
}
