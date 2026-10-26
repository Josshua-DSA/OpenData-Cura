import { useState } from "react";
import { BrainCircuit, Send, Sparkles, MapPinned, Activity, Building2, Baby, ClipboardList } from "lucide-react";
import TopBar from "../components/TopBar";
import { apiRequest, type ApiEnvelope } from "../lib/api";

interface AIInsightPageProps {
  onAIPanel?: () => void;
  year?: string;
}

interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

const prompts = [
  { icon: MapPinned, label: "Wilayah prioritas", question: "Wilayah mana yang menjadi prioritas intervensi?" },
  { icon: Activity, label: "Beban penyakit", question: "Apa tren penyakit yang paling perlu diperhatikan?" },
  { icon: Building2, label: "Fasilitas", question: "Wilayah mana yang kekurangan akses fasilitas kesehatan?" },
  { icon: Sparkles, label: "Skor kesehatan", question: "Jelaskan cara membaca skor kesehatan wilayah." },
  { icon: Baby, label: "Stunting", question: "Apa pola stunting di wilayah prioritas?" },
  { icon: ClipboardList, label: "Rekomendasi", question: "Program apa yang direkomendasikan untuk Kabupaten Probolinggo?" },
];

type AskResult = { answer: string };

export default function AIInsightPage({ onAIPanel, year = "2024" }: AIInsightPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: `Selamat datang di Tilik Jatim AI. Saya siap membantu membaca data kesehatan Jawa Timur tahun ${year}. Pilih pertanyaan analitik atau tuliskan pertanyaan Anda.` },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function ask(question: string) {
    const value = question.trim();
    if (!value || isLoading) return;
    setIsLoading(true);
    setInput("");
    setMessages((current) => [
      ...current,
      { role: "user", text: value },
    ]);
    try {
      const result = await apiRequest<ApiEnvelope<AskResult>>("/api/v1/ask", {
        method: "POST",
        body: JSON.stringify({ query: value, include_context_domains: ["faskes", "indikator", "sdm"] }),
      });
      setMessages((current) => [...current, { role: "ai", text: result.data.answer }]);
    } catch {
      setMessages((current) => [...current, { role: "ai", text: "API belum dapat dihubungi. Pastikan backend berjalan di http://localhost:8000, lalu coba lagi." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="cura-page ai-insight-page">
      <TopBar title="Tilik Jatim AI Insight" year={year} onAIPanel={onAIPanel} />
      <div className="cura-page-content ai-insight-content">
        <div className="data-page-heading">
          <div>
            <div className="data-page-title">Tanyakan Data Kesehatan Jawa Timur</div>
            <div className="data-page-subtitle">Asisten analitik untuk merangkum indikator, membandingkan wilayah, dan menerjemahkan temuan menjadi rekomendasi program.</div>
          </div>
          <div className="ai-live-badge"><span /> Data analitik {year}</div>
        </div>

        <div className="ai-workspace">
          <aside className="ai-prompt-panel">
            <div className="ai-prompt-heading">
              <div className="data-summary-icon tone-blue"><BrainCircuit size={20} /></div>
              <div>
                <strong>Mulai dari pertanyaan</strong>
                <span>Pilih topik yang ingin dianalisis</span>
              </div>
            </div>
            <div className="ai-prompt-list">
              {prompts.map(({ icon: Icon, label, question }) => (
                <button type="button" className="ai-prompt-button" key={label} onClick={() => ask(question)}>
                  <Icon size={18} />
                  <span><strong>{label}</strong><small>{question}</small></span>
                </button>
              ))}
            </div>
            <div className="ai-context-card">
              <span>Konteks aktif</span>
              <strong>Jawa Timur · {year}</strong>
              <small>38 kabupaten/kota · 6 kelompok indikator</small>
            </div>
          </aside>

          <section className="ai-chat-card">
            <div className="ai-chat-header">
              <div className="cura-splash-logo"><BrainCircuit size={22} /></div>
              <div><strong>Tilik Jatim AI</strong><span>Asisten analitik kesehatan</span></div>
            </div>
            <div className="ai-chat-messages">
              {messages.map((message, index) => (
                <div className={`ai-message ai-message-${message.role}`} key={`${message.role}-${index}`}>
                  {message.role === "ai" && <div className="ai-message-avatar"><Sparkles size={15} /></div>}
                  <div>
                    <span>{message.role === "ai" ? "Tilik Jatim AI" : "Anda"}</span>
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="ai-chat-composer">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && ask(input)}
                placeholder="Tanyakan wilayah, penyakit, fasilitas, skor, stunting, atau program..."
              />
              <button type="button" className="data-primary-action" onClick={() => ask(input)}>
                <Send size={16} /> {isLoading ? "Memuat…" : "Kirim"}
              </button>
            </div>
            <div className="ai-disclaimer">Insight merupakan dukungan keputusan berbasis data dan perlu divalidasi bersama konteks program daerah.</div>
          </section>
        </div>

        <section className="ai-capability-section">
          <div className="overview-section-heading">
            <div className="data-page-title">Kemampuan Analitik Tilik Jatim AI</div>
            <div className="data-page-subtitle">Dirancang untuk mempercepat eksplorasi data tanpa menggantikan verifikasi tenaga kesehatan dan pengelola program.</div>
          </div>
          <div className="ai-capability-grid">
            {[
              ["01", "Identifikasi prioritas", "Menemukan wilayah dan indikator yang membutuhkan perhatian lebih cepat."],
              ["02", "Perbandingan wilayah", "Membaca kesenjangan fasilitas, penyakit, KIA, stunting, dan cakupan program."],
              ["03", "Ringkasan pola", "Mengubah tabel dan grafik menjadi temuan singkat yang mudah ditindaklanjuti."],
              ["04", "Arah program", "Menghubungkan pola masalah dengan rekomendasi program yang relevan."],
            ].map(([number, title, description]) => (
              <article className="overview-program-card" key={number}>
                <span className="program-card-number">{number}</span>
                <div className="program-card-title">{title}</div>
                <div className="data-page-subtitle">{description}</div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
