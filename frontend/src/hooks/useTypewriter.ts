import { useState, useEffect, useRef } from "react";

/**
 * Custom hook untuk efek typewriter.
 * @param text Teks lengkap yang ingin ditampilkan.
 * @param speed Interval penambahan karakter dalam milidetik (default: 12ms).
 * @param enabled Menentukan apakah animasi aktif (hanya untuk pesan baru).
 * @param charsPerTick Jumlah karakter yang ditambahkan per interval (default: 2 karakter).
 * @param onUpdate Callback opsional yang dipanggil setiap kali teks bertambah (misal untuk auto-scroll).
 */
export function useTypewriter(
  text: string,
  speed: number = 12,
  enabled: boolean = true,
  charsPerTick: number = 2,
  onUpdate?: () => void
): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState<string>(() => (enabled ? "" : text));
  const [done, setDone] = useState<boolean>(!enabled);

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    // Jika animasi dinonaktifkan (pesan riwayat lama), langsung tampilkan penuh
    if (!enabled) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    let currentIndex = 0;
    setDisplayed("");
    setDone(false);

    const intervalId = setInterval(() => {
      currentIndex += charsPerTick;

      if (currentIndex >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(intervalId);
        onUpdateRef.current?.();
      } else {
        setDisplayed(text.slice(0, currentIndex));
        onUpdateRef.current?.();
      }
    }, speed);

    // Bersihkan timer saat unmount atau saat teks / dependensi berganti
    return () => {
      clearInterval(intervalId);
    };
  }, [text, speed, enabled, charsPerTick]);

  return { displayed, done };
}

