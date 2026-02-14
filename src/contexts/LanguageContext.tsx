import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "id";

const translations = {
  en: {
    // Nav
    myPlans: "My Plans",
    progress: "Progress",
    signOut: "Sign Out",
    signIn: "Sign In",
    // Hero
    aiPowered: "AI-Powered Training",
    heroTitle1: "Your Personal",
    heroTitle2: "AI Trainer",
    heroDesc: "Get a fully personalized workout plan, nutrition guide, and grocery list — generated in seconds by AI, tailored to your body and goals.",
    startProgram: "Start My Program",
    // Features
    howItWorks: "How It",
    works: "Works",
    feature1Title: "Choose Your Program",
    feature1Desc: "Pick from Beginner, Bulking, Cutting, or Senior fitness programs tailored to your needs.",
    feature2Title: "AI Analyzes You",
    feature2Desc: "Our AI engine processes your body data, goals, and limitations to create the perfect plan.",
    feature3Title: "Get Your Plan",
    feature3Desc: "Receive a complete workout schedule, meal plan, grocery list, and progress targets.",
    // CTA
    readyTransform: "Ready to Transform?",
    ctaDesc: "Join thousands who already use AI to reach their fitness goals faster.",
    getStarted: "Get Started Free",
    // Footer
    rights: "© 2026 All rights reserved",
  },
  id: {
    // Nav
    myPlans: "Rencana Saya",
    progress: "Progres",
    signOut: "Keluar",
    signIn: "Masuk",
    // Hero
    aiPowered: "Latihan Berbasis AI",
    heroTitle1: "Pelatih Pribadi",
    heroTitle2: "AI Kamu",
    heroDesc: "Dapatkan rencana latihan, panduan nutrisi, dan daftar belanja yang sepenuhnya dipersonalisasi — dibuat dalam hitungan detik oleh AI, disesuaikan dengan tubuh dan tujuanmu.",
    startProgram: "Mulai Program",
    // Features
    howItWorks: "Cara",
    works: "Kerjanya",
    feature1Title: "Pilih Program",
    feature1Desc: "Pilih dari program Pemula, Bulking, Cutting, atau Lansia yang disesuaikan dengan kebutuhanmu.",
    feature2Title: "AI Menganalisis Kamu",
    feature2Desc: "Mesin AI kami memproses data tubuh, tujuan, dan batasanmu untuk membuat rencana yang sempurna.",
    feature3Title: "Dapatkan Rencanamu",
    feature3Desc: "Terima jadwal latihan lengkap, rencana makan, daftar belanja, dan target progres.",
    // CTA
    readyTransform: "Siap Berubah?",
    ctaDesc: "Bergabung dengan ribuan orang yang sudah menggunakan AI untuk mencapai tujuan kebugaran lebih cepat.",
    getStarted: "Mulai Gratis",
    // Footer
    rights: "© 2026 Hak cipta dilindungi",
  },
} as const;

type Translations = { [K in keyof typeof translations.en]: string };

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("fitai-lang");
    return (saved === "id" ? "id" : "en") as Lang;
  });

  const handleSetLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("fitai-lang", newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
