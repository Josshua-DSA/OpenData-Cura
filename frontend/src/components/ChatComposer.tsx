import { useEffect, useRef } from "react";
import { Send } from "lucide-react";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  disabled: boolean;
  isLoading: boolean;
  isTyping: boolean;
  placeholder: string;
  className?: string;
}

export default function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  isLoading,
  isTyping,
  placeholder,
  className = "ai-chat-composer",
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 52), 160);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
  }

  return (
    <div className={className}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        aria-label="Pertanyaan untuk Tilik Jatim AI"
      />
      <button
        type="button"
        className="data-primary-action ai-composer-send"
        disabled={disabled || !value.trim()}
        onClick={submit}
      >
        <Send size={16} />
        {isLoading ? "Memuat..." : isTyping ? "Mengetik..." : "Kirim"}
      </button>
    </div>
  );
}
