import { useState, useRef, useEffect } from "react";
import { BrainCircuit, X, Send } from "lucide-react";
import { apiRequest, type ApiEnvelope } from "../lib/api";

interface Message {
  role: "ai" | "user";
  text: string;
}

interface AIInsightPanelProps {
  onClose: () => void;
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: "ai",
    text: "Halo! Saya Tilik Jatim AI. Saya dapat membantu Anda menganalisis data kesehatan Jawa Timur. Ada yang ingin Anda ketahui?",
  },
];

const SUGGESTED_PROMPTS = [
  "Wilayah mana yang perlu prioritas?",
  "Tren stunting Jawa Timur",
  "Fasilitas di Madura",
];

export default function AIInsightPanel({ onClose }: AIInsightPanelProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setIsLoading(true);

    const userMsg: Message = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    try {
      const result = await apiRequest<ApiEnvelope<{ answer: string }>>("/api/v1/ask", {
        method: "POST",
        body: JSON.stringify({ query: trimmed, include_context_domains: ["faskes", "indikator", "sdm"] }),
      });
      setMessages((prev) => [...prev, { role: "ai", text: result.data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "API belum dapat dihubungi. Pastikan backend berjalan di http://localhost:8000." }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuggestedPrompt(prompt: string) {
    setInputValue(prompt);
    sendMessage(prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      sendMessage(inputValue);
    }
  }

  return (
    <>
      <div className="cura-drawer-overlay" onClick={onClose} />
      <div
        className="cura-ai-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cura-ai-header">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <BrainCircuit size={22} color="white" />
            <div>
              <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-body-sm)", color: "white" }}>
                Tilik Jatim AI
              </div>
              <div style={{ fontSize: "var(--font-size-caption)", color: "rgba(255,255,255,0.7)" }}>
                Asisten Kesehatan Jawa Timur
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              cursor: "pointer",
              color: "white",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
            }}
            aria-label="Tutup panel"
          >
            <X size={20} />
          </button>
        </div>

        <div className="cura-ai-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`cura-bubble ${msg.role === "ai" ? "cura-bubble-ai" : "cura-bubble-user"}`}
            >
              {msg.text}
            </div>
          ))}

          {messages.length === 1 && (
            <div style={{ marginTop: "0.75rem" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Pertanyaan Populer:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    className="cura-chip"
                    onClick={() => handleSuggestedPrompt(prompt)}
                    style={{ textAlign: "left", cursor: "pointer" }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="cura-ai-input">
          <input
            type="text"
            placeholder="Tanyakan tentang data kesehatan..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-text-primary)", fontSize: "var(--font-size-body-sm)" }}
          />
          <button
            className="cura-btn cura-btn-primary"
            onClick={() => sendMessage(inputValue)}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem" }}
          >
            <Send size={16} />
            {isLoading ? "Memuat…" : "Kirim"}
          </button>
        </div>
      </div>
    </>
  );
}
