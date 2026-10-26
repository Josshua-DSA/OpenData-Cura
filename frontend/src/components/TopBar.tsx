import { Sparkles } from "lucide-react";

interface TopBarProps {
  title: string;
  year?: string;
  onYearChange?: (y: string) => void;
  onAIPanel?: () => void;
  showYear?: boolean;
}

export default function TopBar({
  title,
  year = "2024",
  onYearChange,
  onAIPanel,
  showYear = true,
}: TopBarProps) {
  return (
    <div className="cura-topbar">
      <span className="cura-topbar-title">{title}</span>

      <div className="cura-topbar-actions">
        {/* Static geographic context */}
        <span className="cura-topbar-context">
          Jawa Timur, Indonesia
        </span>

        {/* Year selector */}
        {showYear && (
          <select
            className="cura-select"
            value={year}
            onChange={(e) => onYearChange?.(e.target.value)}
            style={{ fontWeight: "var(--font-weight-semibold)", minWidth: 72 }}
          >
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
          </select>
        )}

        {/* AI Insight button */}
        <button
          className="cura-btn cura-btn-secondary"
          onClick={onAIPanel}
          aria-label="Buka AI Insight"
          title="AI Insight"
        >
          <Sparkles size={15} />
          <span className="cura-topbar-ai-label">AI Insight</span>
        </button>

        <div className="cura-avatar">Ad</div>
      </div>
    </div>
  );
}
