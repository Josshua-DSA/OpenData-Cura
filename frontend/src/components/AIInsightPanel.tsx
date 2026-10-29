import { useState, useRef, useEffect } from "react";
import { BrainCircuit, X, Send } from "lucide-react";
import AiMessage from "./AiMessage";
import { apiRequest, type ApiEnvelope } from "../lib/api";

interface Message {
  role: "ai" | "user";
  text: string;
  animate?: boolean;
}

interface AIInsightPanelProps {
  onClose: () => void;
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: "ai",
    text: "Halo! Saya Tilik Jatim AI. Saya dapat membantu Anda menganalisis data kesehatan Jawa Timur. Ada yang ingin Anda ketahui?",
    animate: false,
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
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBusy = isLoading || isTyping;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    setIsLoading(true);
    const userMsg: Message = { role: "user", text: trimmed, animate: false };
    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, animate: false })),
      userMsg,
    ]);
    setInputValue("");

    try {
      const result = await apiRequest<ApiEnvelope<{ answer: string }>>("/api/v1/ask", {
        method: "POST",
        body: JSON.stringify({
          query: trimmed,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          include_context_domains: ["faskes", "indikator", "sdm"],
        }),
      });
      setIsLoading(false);
      setIsTyping(true);
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, animate: false })),
        { role: "ai", text: result.data.answer, animate: true },
      ]);
    } catch {
      setIsLoading(false);
      setIsTyping(true);
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, animate: false })),
        {
          role: "ai",
          text: "API belum dapat dihubungi. Pastikan server berjalan, lalu coba lagi.",
          animate: true,
        },
      ]);
    }
  }

  function handleSuggestedPrompt(prompt: string) {
    if (isBusy) return;
    setInputValue(prompt);
    sendMessage(prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !isBusy) {
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
              {msg.role === "ai" ? (
                <AiMessage
                  text={msg.text}
                  animate={msg.animate}
                  onUpdate={scrollToBottom}
                  onDone={() => {
                    setIsTyping(false);
                    setMessages((prev) =>
                      prev.map((m, idx) => (idx === i ? { ...m, animate: false } : m))
                    );
                  }}
                />
              ) : (
                msg.text
              )}
            </div>
          ))}

          {/* Indikator "sedang mengetik" saat menunggu respon API */}
          {isLoading && (
            <div className="cura-bubble cura-bubble-ai typing-bubble">
              <span className="typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </div>
          )}

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
                    disabled={isBusy}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    style={{ textAlign: "left", cursor: isBusy ? "not-allowed" : "pointer", opacity: isBusy ? 0.6 : 1 }}
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
            disabled={isBusy}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-body-sm)",
              opacity: isBusy ? 0.7 : 1,
            }}
          />
          <button
            className="cura-btn cura-btn-primary"
            disabled={isBusy}
            onClick={() => sendMessage(inputValue)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 1rem",
              opacity: isBusy ? 0.65 : 1,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            <Send size={16} />
            {isLoading ? "Memuat…" : isTyping ? "Mengetik…" : "Kirim"}
          </button>
        </div>
      </div>
    </>
  );
}
