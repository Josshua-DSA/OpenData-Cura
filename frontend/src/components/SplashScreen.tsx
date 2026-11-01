import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3, BedDouble, Building2, MapPinned, Stethoscope } from "lucide-react";
import tilikJatimLogo from "../assets/tilik-jatim-logo.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const INTRO_DURATION = 2600;
// Safety net: however the splash is reached, never trap the user on it.
const AUTO_COMPLETE_DURATION = 8000;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`splash-logo-crop${compact ? " is-compact" : ""}`}>
      <img src={tilikJatimLogo.src} alt="Logo Tilik Jatim" />
    </div>
  );
}

function PageIndicator({ activePage }: { activePage: 1 | 2 }) {
  return (
    <div className="splash-page-indicator" aria-label={`Halaman ${activePage} dari 2`}>
      <span className={activePage === 1 ? "is-active" : ""} />
      <span className={activePage === 2 ? "is-active" : ""} />
    </div>
  );
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [page, setPage] = useState<1 | 2>(1);

  // Remember when the intro actually started. `App` passes an inline
  // `onComplete` arrow, so that prop is a new function on every parent render.
  // Keeping the start time in a ref (which survives the effect re-runs caused by
  // that unstable prop) means the intro deadline is measured from the first
  // mount, not from the last re-render.
  const startedAtRef = useRef<number | null>(null);
  if (startedAtRef.current === null) startedAtRef.current = Date.now();

  // Always call the latest callback of the auto-complete fallback without making
  // it a dependency, so a changing `onComplete` can never restart that timer.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (page !== 1) return;
    // Derive the remaining time from the recorded start so a remount or a parent
    // re-render cannot push the page 1 -> 2 transition further into the future.
    const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
    const remaining = Math.max(0, INTRO_DURATION - elapsed);
    const timer = window.setTimeout(() => setPage(2), remaining);
    return () => window.clearTimeout(timer);
  }, [page]);

  // Fallback exit: if the user has not pressed anything after 8 s — Skip, "Mulai
  // Jelajahi", or a page transition — close the splash on their behalf. Keyed on
  // nothing but mount, so it fires exactly once per mounted splash.
  useEffect(() => {
    const timer = window.setTimeout(() => onCompleteRef.current(), AUTO_COMPLETE_DURATION);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="cura-splash" role="dialog" aria-modal="true" aria-label="Pengenalan Tilik Jatim">
      <div className="splash-orb splash-orb-primary" />
      <div className="splash-orb splash-orb-accent" />

      {page === 1 ? (
        <section className="splash-panel splash-branding-panel" key="branding">
          <button className="splash-skip-button" type="button" onClick={onComplete}>
            Lewati
          </button>

          <div className="splash-branding-content">
            <Logo />
            <div className="splash-eyebrow">Platform Kesehatan Publik Jawa Timur</div>
            <div className="splash-heading">Tilik Jatim</div>
            <div className="splash-tagline">
              Platform Informasi dan Pemetaan Fasilitas Kesehatan Jawa Timur
            </div>
            <PageIndicator activePage={1} />
          </div>
          <div className="splash-auto-progress" aria-hidden="true"><span /></div>
        </section>
      ) : (
        <section className="splash-panel splash-intro-panel" key="introduction">
          <button className="splash-skip-button" type="button" onClick={onComplete}>
            Lewati
          </button>

          <div className="splash-intro-copy">
            <Logo compact />
            <div className="splash-eyebrow">Data kesehatan dalam satu pandangan</div>
            <div className="splash-heading splash-intro-heading">
              Kenali Persebaran Fasilitas Kesehatan Jawa Timur
            </div>
            <div className="splash-description">
              Jelajahi data rumah sakit, puskesmas, tempat tidur, dan tenaga kesehatan melalui peta interaktif,
              visualisasi data, serta analisis perbandingan wilayah untuk mendukung pengambilan keputusan.
            </div>
            <div className="splash-actions">
              <PageIndicator activePage={2} />
              <button className="splash-primary-button" type="button" onClick={onComplete}>
                Mulai Jelajahi
              </button>
            </div>
          </div>

          <div className="splash-visual" aria-hidden="true">
            <div className="splash-map-card">
              <div className="splash-map-header">
                <span><MapPinned size={18} /> Peta Fasilitas Jawa Timur</span>
                <strong>38 wilayah</strong>
              </div>
              <div className="splash-map-canvas">
                <MapPinned className="splash-map-shape" size={132} strokeWidth={1.25} />
                <span className="splash-map-point point-one"><Building2 size={14} /></span>
                <span className="splash-map-point point-two"><Activity size={14} /></span>
                <span className="splash-map-point point-three"><Stethoscope size={14} /></span>
              </div>
            </div>
            <div className="splash-metric-grid">
              <div className="splash-metric-card">
                <Building2 size={18} />
                <span>Rumah Sakit</span>
                <strong>447</strong>
              </div>
              <div className="splash-metric-card">
                <BedDouble size={18} />
                <span>Tempat Tidur</span>
                <strong>38.420</strong>
              </div>
            </div>
            <div className="splash-chart-card">
              <div><BarChart3 size={18} /><span>Perbandingan Kapasitas Wilayah</span></div>
              <div className="splash-mini-bars">
                <span /><span /><span /><span /><span />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
