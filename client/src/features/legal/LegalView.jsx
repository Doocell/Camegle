import React, { useState } from 'react';

export default function LegalView({ initialTab = 'guidelines', onBack, onStartJourney }) {
  const [activeSection, setActiveSection] = useState(initialTab);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      {/* Sticky Top Header */}
      <header className="sticky top-0 left-0 right-0 w-full z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-margin-lg flex items-center justify-between gap-gutter">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-space-sm text-primary cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">terrain</span>
            </div>
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface lowercase font-bold">
              camelgle
            </span>
          </button>

          <nav className="hidden sm:flex items-center gap-space-xs">
            <button
              type="button"
              onClick={() => scrollToSection('guidelines')}
              className={`px-space-md py-space-sm rounded-full font-label-md text-label-md transition-all cursor-pointer ${
                activeSection === 'guidelines'
                  ? 'bg-surface-container-high text-on-surface font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Pedoman Komunitas
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('privacy')}
              className={`px-space-md py-space-sm rounded-full font-label-md text-label-md transition-all cursor-pointer ${
                activeSection === 'privacy'
                  ? 'bg-surface-container-high text-on-surface font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Kebijakan Privasi
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('terms')}
              className={`px-space-md py-space-sm rounded-full font-label-md text-label-md transition-all cursor-pointer ${
                activeSection === 'terms'
                  ? 'bg-surface-container-high text-on-surface font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Ketentuan Layanan
            </button>
          </nav>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Kembali</span>
          </button>
        </div>
      </header>

      {/* Main Content (Exact Stitch Layout from 01_pedoman_komunitas.html) */}
      <main className="max-w-[1240px] mx-auto px-margin-lg py-space-xl w-full">
        <div className="mb-space-xl flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="space-y-space-xs">
            <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container text-tertiary font-label-sm text-label-sm uppercase tracking-wider font-bold">
              <span
                className="material-symbols-outlined text-[15px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              Pusat Kepercayaan & Keselamatan
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Panduan lengkap tata krama pengembara digital, kebijakan privasi WebRTC P2P, serta ketentuan layanan camelgle.
            </p>
          </div>
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-full">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Dokumen Legal Resmi • Bahasa Indonesia
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Left Sticky Sidebar Navigation */}
          <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 space-y-space-lg">
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant/20">
              <span className="px-space-sm font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold block mb-space-sm">
                Daftar Isi Legal
              </span>
              <nav className="flex flex-col gap-1.5 font-label-md text-label-md">
                {[
                  { id: 'guidelines', label: '1. Pedoman Komunitas' },
                  { id: 'aturan-emas', label: '2. Larangan & Aturan Inti' },
                  { id: 'privacy', label: '3. Kebijakan Privasi & P2P' },
                  { id: 'terms', label: '4. Ketentuan Layanan (Terms)' },
                  { id: 'moderasi', label: '5. Moderasi & Sanksi Ban' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`flex items-center justify-between px-space-md py-space-sm rounded-full text-left transition-all cursor-pointer ${
                      activeSection === item.id
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-primary-fixed to-surface-container-high p-space-lg rounded-lg shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center mb-space-sm shadow-sm">
                <span className="material-symbols-outlined text-[20px]">videocam</span>
              </div>
              <h4 className="font-headline-sm text-headline-sm text-on-primary-fixed mb-space-xs">
                Siap Berkelana?
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                Temukan kawan mengobrol baru dengan rasa aman dan tenteram.
              </p>
              <button
                type="button"
                onClick={onStartJourney}
                className="inline-flex w-full items-center justify-center gap-space-xs px-space-lg py-space-sm bg-primary text-on-primary rounded-full font-label-lg text-label-lg shadow-md hover:bg-on-primary-fixed-variant transition-all cursor-pointer"
              >
                <span>Mulai Obrolan Sekarang</span>
                <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              </button>
            </div>
          </aside>

          {/* Right Article Content */}
          <article className="lg:col-span-8 xl:col-span-9 bg-surface-container-lowest p-space-xl sm:p-space-2xl rounded-lg shadow-sm border border-outline-variant/20 space-y-space-2xl">
            {/* Section 1: Pedoman Komunitas */}
            <section id="guidelines" className="space-y-space-md scroll-mt-24">
              <div className="flex items-center gap-space-sm">
                <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                  BAGIAN 01
                </span>
                <h1 className="font-headline-lg text-headline-lg text-on-surface">
                  Pedoman Komunitas (Community Guidelines)
                </h1>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Camelgle dirancang seperti tenda peristirahatan di tengah padang pasir luas: siapa pun yang berusia 18 tahun ke atas boleh berteduh, berbagi cerita, lalu melanjutkan petualangannya masing-masing dengan penuh kesantunan dan rasa hormat.
              </p>
            </section>

            {/* Section 2: Aturan Inti (Sesuai PRD F1) */}
            <section id="aturan-emas" className="space-y-space-lg scroll-mt-24">
              <div className="flex items-center gap-space-sm">
                <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                  BAGIAN 02
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  5 Larangan Mutlak di Camelgle
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="bg-surface-container-low p-space-lg rounded-DEFAULT space-y-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-error">block</span>
                    1. Konten Seksual & Ketelanjangan
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Dilarang keras menampilkan ketelanjangan, tindakan seksual eksplisit, atau eksibisionisme di depan kamera. Sistem pendeteksi otomatis (NSFWJS) dan laporan pengguna akan langsung memblokir akses Anda.
                  </p>
                </div>

                <div className="bg-surface-container-low p-space-lg rounded-DEFAULT space-y-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-error">gavel</span>
                    2. Kekerasan & Pelecehan
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Dilarang melakukan perundungan (bullying), ujaran kebencian SARA, ancaman fisik, maupun pelecehan verbal/seksual terhadap lawan bicara.
                  </p>
                </div>

                <div className="bg-surface-container-low p-space-lg rounded-DEFAULT space-y-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">videocam_off</span>
                    3. Merekam Tanpa Izin
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Dilarang mengambil tangkapan layar (screenshot) atau merekam layar percakapan lawan bicara lalu menyebarkannya tanpa persetujuan tertulis.
                  </p>
                </div>

                <div className="bg-surface-container-low p-space-lg rounded-DEFAULT space-y-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary">person_off</span>
                    4. Mengaku atau Berusia di Bawah 18 Tahun
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Platform ini khusus untuk pengguna dewasa (18+). Pengguna di bawah umur atau yang berpura-pura di bawah umur akan langsung diblokir permanen.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Kebijakan Privasi */}
            <section id="privacy" className="space-y-space-md scroll-mt-24">
              <div className="flex items-center gap-space-sm">
                <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                  BAGIAN 03
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  Kebijakan Privasi (Privacy Policy)
                </h2>
              </div>
              <div className="bg-surface-container p-space-lg rounded-DEFAULT space-y-space-sm">
                <ul className="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">
                      check_circle
                    </span>
                    <span>
                      <strong>Koneksi WebRTC Peer-to-Peer:</strong> Aliran video dan suara dikirim langsung antar browser pengguna. Kami tidak merekam atau menyimpan video panggilan Anda.
                    </span>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">
                      check_circle
                    </span>
                    <span>
                      <strong>Pesan Teks Sementara:</strong> Pesan obrolan teks tidak disimpan di database server dan langsung hilang begitu sesi berakhir atau tombol Next ditekan.
                    </span>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">
                      check_circle
                    </span>
                    <span>
                      <strong>Data Laporan Pelanggaran:</strong> Hanya jika terjadi laporan (Report), sistem menyimpan bukti terbatas (1 tangkapan frame terkompresi, 10 pesan terakhir, serta IP/Fingerprint terlapor) untuk penindakan keamanan dengan retensi maksimal 7 hari.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4: Ketentuan Layanan */}
            <section id="terms" className="space-y-space-md scroll-mt-24">
              <div className="flex items-center gap-space-sm">
                <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                  BAGIAN 04
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  Ketentuan Layanan (Terms of Service)
                </h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Dengan mengakses camelgle, Anda menyatakan bahwa Anda berusia minimal 18 tahun dan bertanggung jawab penuh atas seluruh ucapan serta tindakan Anda selama sesi panggilan berlangsung. Pengelola berhak membatasi atau memblokir akses perangkat/IP sewaktu-waktu apabila terdeteksi pelanggaran terhadap ketentuan ini.
              </p>
            </section>

            {/* Section 5: Moderasi */}
            <section id="moderasi" className="space-y-space-md scroll-mt-24">
              <div className="flex items-center gap-space-sm">
                <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                  BAGIAN 05
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  Moderasi Cerdas & Sanksi Pemblokiran
                </h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Untuk melindungi pengguna dari paparan visual tak pantas, 2 detik pertama video lawan bicara akan diburamkan otomatis (Blur Awal) sembari model TensorFlow.js di browser memeriksa keamanan visual. Identitas perangkat (Fingerprint/IP) yang dilaporkan oleh 3 pengguna berbeda dalam 24 jam akan diblokir secara otomatis.
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
