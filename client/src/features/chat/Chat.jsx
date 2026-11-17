import React, { useState, useRef, useEffect } from 'react';

const QUICK_REACTIONS = ['👋 Halo', '✨ Seru', '☕ Ngopi', '😂 Haha', '🏕️ Musafir'];

/**
 * Komponen F6: Chat
 * Menampilkan daftar pesan (plain text anti-XSS), bar reaksi cepat, dan input teks.
 * Desain persis mengikuti Stitch "camelgle - Obrolan Video Langsung (In-Call Desktop)".
 */
export default function Chat({ messages = [], onSendMessage, disabled = false }) {
  const [inputText, setInputText] = useState('');
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const sessionStartTime = useRef(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );

  // Auto-scroll ke bawah setiap kali ada pesan baru
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled || !inputText.trim()) return;
    if (onSendMessage) {
      onSendMessage(inputText);
    }
    setInputText('');
  };

  const handleQuickReaction = (text) => {
    if (disabled) return;
    if (onSendMessage) {
      onSendMessage(text);
    }
  };

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <section className="col-span-12 lg:col-span-4 xl:col-span-4 flex flex-col rounded-lg bg-[#2A1E18] shadow-xl overflow-hidden h-[640px] lg:h-full">
      {/* Chat Panel Header */}
      <div className="px-5 py-4 bg-[#34241D] flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[20px]">
              forum
            </span>
            <h2 className="font-headline-sm text-headline-sm text-[#fff8f6]">
              Obrolan Teks Anonim
            </h2>
          </div>
          <div className="flex items-center gap-1 text-[#ffb599]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="font-label-sm text-label-sm">Musafir Aktif</span>
          </div>
        </div>
        {/* Auto-wipe Privacy Guarantee Banner */}
        <div className="flex items-center gap-1.5 text-secondary-fixed font-label-sm text-label-sm bg-secondary-fixed/10 px-2.5 py-1 rounded-md">
          <span className="material-symbols-outlined text-[14px]">auto_delete</span>
          <span className="truncate">Pesan otomatis dihapus saat sesi berakhir</span>
        </div>
      </div>

      {/* Chat Stream (Scrollable - Plain Text Anti-XSS) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-start no-scrollbar"
      >
        {/* System Welcome Timestamp */}
        <div className="flex justify-center my-1">
          <span className="font-label-sm text-label-sm text-[#d8c3ad]/50 bg-[#1E1410]/50 px-3 py-0.5 rounded-full">
            Sesi dimulai pukul {sessionStartTime.current} WIB
          </span>
        </div>

        {messages.length === 0 && (
          <div className="my-auto text-center px-4 py-8 text-[#d8c3ad]/60 space-y-1.5">
            <span className="material-symbols-outlined text-3xl text-primary-container/50">
              waving_hand
            </span>
            <p className="font-body-sm text-body-sm">
              Mulai sapaan ramah dengan mengetik pesan atau menekan tombol reaksi cepat di bawah!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          return isMe ? (
            <div key={msg.id} className="flex flex-col items-end max-w-[85%] self-end">
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="font-label-sm text-label-sm text-[#d8c3ad]/50">
                  {formatTime(msg.ts)}
                </span>
                <span className="font-label-sm text-label-sm text-primary-fixed-dim font-bold">
                  Anda
                </span>
              </div>
              <div className="bg-gradient-to-br from-primary-container to-amber-600 text-[#28180f] p-3.5 rounded-2xl rounded-tr-sm shadow-md font-medium leading-relaxed break-words">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex flex-col items-start max-w-[85%]">
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="font-label-sm text-label-sm text-[#ffddb8]/80 font-bold">
                  Teman Jalan (Anonim)
                </span>
                <span className="font-label-sm text-label-sm text-[#d8c3ad]/50">
                  {formatTime(msg.ts)}
                </span>
              </div>
              <div className="bg-[#1E1410]/80 backdrop-blur-sm text-[#fff8f6] p-3.5 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed break-words">
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Reaction Emoji Chips Bar */}
      <div className="px-4 py-2 bg-[#231812] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {QUICK_REACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => handleQuickReaction(label)}
            className="px-3 py-1 rounded-full bg-[#34241D] hover:bg-primary-container hover:text-[#28180f] text-[#ffddb8] font-label-sm text-label-sm transition-all whitespace-nowrap active:scale-95 cursor-pointer disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chat Input Footer Area */}
      <div className="p-4 bg-[#261A14] shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              maxLength={300}
              disabled={disabled}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan anonim..."
              autoComplete="off"
              className="w-full h-[50px] pl-4 pr-11 bg-[#1A110D] text-[#fff8f6] placeholder-[#867461] rounded-full focus:outline-none focus:ring-2 focus:ring-primary-container font-body-md text-body-md transition-all shadow-inner"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setInputText((prev) => `${prev} 😊`.slice(0, 300));
                inputRef.current?.focus();
              }}
              title="Sisipkan Emoji Senyum"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d8c3ad] hover:text-primary-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
            </button>
          </div>
          <button
            type="submit"
            disabled={disabled || !inputText.trim()}
            title="Kirim Pesan"
            className="w-[50px] h-[50px] rounded-full bg-primary-container hover:bg-amber-400 text-on-primary-container flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer shrink-0 disabled:opacity-40"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              send
            </span>
          </button>
        </form>
        <div className="mt-2 text-center">
          <span className="font-label-sm text-label-sm text-[#867461]">
            Tekan Enter untuk mengirim (maks 300 karakter) • Jaga kesopanan komunitas
          </span>
        </div>
      </div>
    </section>
  );
}
