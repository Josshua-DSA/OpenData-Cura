import { useEffect } from "react";
import { useTypewriter } from "../hooks/useTypewriter";

interface AiMessageProps {
  text: string;
  animate?: boolean;
  onUpdate?: () => void;
  onDone?: () => void;
  className?: string;
}

export default function AiMessage({
  text,
  animate = false,
  onUpdate,
  onDone,
  className = "",
}: AiMessageProps) {
  // Animasi typewriter: 2 karakter setiap 12 ms
  const { displayed, done } = useTypewriter(text, 12, animate, 2, onUpdate);

  useEffect(() => {
    if (done && animate) {
      onDone?.();
    }
  }, [done, animate, onDone]);

  return (
    <span
      className={`ai-message-text ${className}`}
      style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, display: "inline" }}
    >
      {displayed}
      {!done && <span className="cursor">|</span>}
    </span>
  );
}
