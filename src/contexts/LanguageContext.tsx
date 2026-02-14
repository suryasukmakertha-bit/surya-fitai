import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "id";

const translations = {
  en: {
    // Common
    back: "Back",
    backToPrograms: "Back to Programs",

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

    // Programs page
    chooseYour: "Choose Your",
    program: "Program",
    programsDesc: "Select the program that matches your fitness goals. Our AI will create a fully personalized plan for you.",

    // Program cards
    beginnerTitle: "Beginner Program",
    beginnerDesc: "Perfect for those new to gym and healthy lifestyle. Build a solid foundation with guided exercises.",
    beginnerBenefits: ["Learn proper form", "Build basic strength", "Establish routine", "Nutrition basics"],
    beginnerGoal: "Build fitness foundation",
    bulkingTitle: "Bulking Program",
    bulkingDesc: "Maximize muscle gain and mass building with high-volume training and caloric surplus plans.",
    bulkingBenefits: ["Muscle hypertrophy", "Progressive overload", "High protein meals", "Recovery optimization"],
    bulkingGoal: "Build muscle mass",
    cuttingTitle: "Cutting Program",
    cuttingDesc: "Shed body fat while preserving muscle. Get defined and lean with strategic training and nutrition.",
    cuttingBenefits: ["Fat loss focus", "Maintain muscle", "Calorie deficit meals", "HIIT integration"],
    cuttingGoal: "Lose fat and get lean",
    seniorTitle: "Senior Fitness",
    seniorDesc: "Safe, adaptive workouts designed for older adults. Focus on mobility, balance, and functional strength.",
    seniorBenefits: ["Joint-friendly exercises", "Balance training", "Flexibility focus", "Safe progression"],
    seniorGoal: "Improve mobility and strength",

    // ProgramForm
    tellUs: "Tell us about yourself so our AI can create your personalized plan.",
    fullName: "Full Name *",
    age: "Age *",
    gender: "Gender *",
    genderSelect: "Select",
    male: "Male",
    female: "Female",
    other: "Other",
    weightKg: "Weight (kg) *",
    heightCm: "Height (cm) *",
    fitnessGoal: "Fitness Goal",
    trainingDuration: "Training Duration",
    experienceLevel: "Experience Level",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    weeks2: "2 Weeks",
    month1: "1 Month",
    months3: "3 Months",
    limitations: "Physical Limitations or Injuries (optional)",
    limitationsPlaceholder: "E.g., knee injury, lower back pain...",
    generatePlan: "Generate My AI Plan",
    generating: "Generating Your Plan...",
    fillRequired: "Please fill all required fields",

    // Results
    yourPersonalized: "Your Personalized",
    aiPlan: "AI Plan",
    heyUser: "Hey {name}! Here's your custom {type} program.",
    hereCustom: "Here's your custom {type} program.",
    dailyCalories: "Daily Calories",
    protein: "Protein",
    carbsFat: "Carbs / Fat",
    water: "Water",
    exportPdf: "Export PDF",
    savePlan: "Save Plan",
    saved: "Saved",
    signInToSave: "Sign in to save your plan",
    signInToSaveDesc: "Create an account to save and access your plans anytime.",
    planSaved: "Plan saved!",
    errorSaving: "Error saving plan",
    workoutPlan: "Workout Plan",
    mealPlan: "Meal Plan",
    groceryList: "Grocery List",
    infoSafety: "Info & Safety",
    weeklyGrocery: "Weekly Grocery List",
    progressProjection: "Progress Projection",
    safetyNotes: "Safety Notes",
    weeklySchedule: "Weekly Schedule Overview",
    estimatedCalories: "Estimated {count} calories burned per session",
    noPlanData: "No plan data found.",
    goBackPrograms: "Go back to programs",
    rest: "rest",
    done: "done",

    // Progress
    progressTracker: "Progress",
    tracker: "Tracker",
    progressDesc: "Log your weekly weigh-ins and track your transformation.",
    start: "Start",
    current: "Current",
    change: "Change",
    weightOverTime: "Weight Over Time",
    logAtLeast2: "Log at least 2 check-ins to see your progress chart.",
    logCheckIn: "Log Check-In",
    date: "Date",
    weightLabel: "Weight (kg)",
    noteOptional: "Note (optional)",
    notePlaceholder: "Feeling great!",
    addCheckIn: "Add Check-In",
    checkInLogged: "Check-in logged!",
    validWeight: "Enter a valid weight (20–500 kg)",
    history: "History",

    // Workout Activity
    workoutActivity: "Workout Activity",
    today: "Today",
    exercises: "exercises",
    streak: "Streak",
    day: "day",
    days: "days",
    thisWeek: "This Week",
    total: "total",
    activeDays: "Active Days",
    noCompletions: "No workout completions yet. Save a plan and start checking off exercises!",
    completed: "Completed",

    // Auth
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    signInAccess: "Sign in to access your saved plans",
    signUpSave: "Sign up to save your plans and track progress",
    displayName: "Display Name",
    email: "Email *",
    password: "Password *",
    signUp: "Sign Up",
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: "Already have an account?",
    welcomeBackToast: "Welcome back!",
    accountCreated: "Account created!",
    checkEmail: "Please check your email to verify your account.",

    // Saved Plans
    savedPlans: "Saved",
    plans: "Plans",
    savedPlansDesc: "Your previously generated AI fitness plans.",
    noSavedPlans: "No saved plans yet.",
    generateFirst: "Generate Your First Plan",
    view: "View",
    planDeleted: "Plan deleted",
  },
  id: {
    // Common
    back: "Kembali",
    backToPrograms: "Kembali ke Program",

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

    // Programs page
    chooseYour: "Pilih",
    program: "Program",
    programsDesc: "Pilih program yang sesuai dengan tujuan kebugaranmu. AI kami akan membuat rencana yang sepenuhnya dipersonalisasi untukmu.",

    // Program cards
    beginnerTitle: "Program Pemula",
    beginnerDesc: "Cocok untuk yang baru mengenal gym dan gaya hidup sehat. Bangun fondasi kuat dengan latihan terbimbing.",
    beginnerBenefits: ["Pelajari teknik benar", "Bangun kekuatan dasar", "Bangun rutinitas", "Dasar nutrisi"],
    beginnerGoal: "Bangun fondasi kebugaran",
    bulkingTitle: "Program Bulking",
    bulkingDesc: "Maksimalkan pertumbuhan otot dengan latihan volume tinggi dan rencana surplus kalori.",
    bulkingBenefits: ["Hipertrofi otot", "Beban progresif", "Makanan tinggi protein", "Optimasi pemulihan"],
    bulkingGoal: "Bangun massa otot",
    cuttingTitle: "Program Cutting",
    cuttingDesc: "Turunkan lemak tubuh sambil menjaga otot. Dapatkan tubuh ramping dengan latihan dan nutrisi strategis.",
    cuttingBenefits: ["Fokus pembakaran lemak", "Pertahankan otot", "Makanan defisit kalori", "Integrasi HIIT"],
    cuttingGoal: "Turunkan lemak dan jadi ramping",
    seniorTitle: "Kebugaran Lansia",
    seniorDesc: "Latihan aman dan adaptif untuk orang dewasa. Fokus pada mobilitas, keseimbangan, dan kekuatan fungsional.",
    seniorBenefits: ["Latihan ramah sendi", "Latihan keseimbangan", "Fokus fleksibilitas", "Progres aman"],
    seniorGoal: "Tingkatkan mobilitas dan kekuatan",

    // ProgramForm
    tellUs: "Ceritakan tentang dirimu agar AI kami bisa membuat rencana yang dipersonalisasi.",
    fullName: "Nama Lengkap *",
    age: "Usia *",
    gender: "Jenis Kelamin *",
    genderSelect: "Pilih",
    male: "Laki-laki",
    female: "Perempuan",
    other: "Lainnya",
    weightKg: "Berat Badan (kg) *",
    heightCm: "Tinggi Badan (cm) *",
    fitnessGoal: "Tujuan Kebugaran",
    trainingDuration: "Durasi Latihan",
    experienceLevel: "Tingkat Pengalaman",
    beginner: "Pemula",
    intermediate: "Menengah",
    advanced: "Mahir",
    weeks2: "2 Minggu",
    month1: "1 Bulan",
    months3: "3 Bulan",
    limitations: "Keterbatasan Fisik atau Cedera (opsional)",
    limitationsPlaceholder: "Contoh: cedera lutut, nyeri punggung bawah...",
    generatePlan: "Buat Rencana AI Saya",
    generating: "Membuat Rencanamu...",
    fillRequired: "Harap isi semua kolom wajib",

    // Results
    yourPersonalized: "Rencana",
    aiPlan: "AI Kamu",
    heyUser: "Hai {name}! Ini program {type} khususmu.",
    hereCustom: "Ini program {type} khususmu.",
    dailyCalories: "Kalori Harian",
    protein: "Protein",
    carbsFat: "Karbo / Lemak",
    water: "Air",
    exportPdf: "Ekspor PDF",
    savePlan: "Simpan Rencana",
    saved: "Tersimpan",
    signInToSave: "Masuk untuk menyimpan rencana",
    signInToSaveDesc: "Buat akun untuk menyimpan dan mengakses rencanamu kapan saja.",
    planSaved: "Rencana tersimpan!",
    errorSaving: "Gagal menyimpan rencana",
    workoutPlan: "Rencana Latihan",
    mealPlan: "Rencana Makan",
    groceryList: "Daftar Belanja",
    infoSafety: "Info & Keamanan",
    weeklyGrocery: "Daftar Belanja Mingguan",
    progressProjection: "Proyeksi Progres",
    safetyNotes: "Catatan Keamanan",
    weeklySchedule: "Jadwal Mingguan",
    estimatedCalories: "Estimasi {count} kalori terbakar per sesi",
    noPlanData: "Data rencana tidak ditemukan.",
    goBackPrograms: "Kembali ke program",
    rest: "istirahat",
    done: "selesai",

    // Progress
    progressTracker: "Progres",
    tracker: "Tracker",
    progressDesc: "Catat timbangan mingguanmu dan pantau transformasimu.",
    start: "Awal",
    current: "Saat Ini",
    change: "Perubahan",
    weightOverTime: "Berat Badan Seiring Waktu",
    logAtLeast2: "Catat minimal 2 check-in untuk melihat grafik progresmu.",
    logCheckIn: "Catat Check-In",
    date: "Tanggal",
    weightLabel: "Berat (kg)",
    noteOptional: "Catatan (opsional)",
    notePlaceholder: "Merasa luar biasa!",
    addCheckIn: "Tambah Check-In",
    checkInLogged: "Check-in tercatat!",
    validWeight: "Masukkan berat valid (20–500 kg)",
    history: "Riwayat",

    // Workout Activity
    workoutActivity: "Aktivitas Latihan",
    today: "Hari Ini",
    exercises: "latihan",
    streak: "Streak",
    day: "hari",
    days: "hari",
    thisWeek: "Minggu Ini",
    total: "total",
    activeDays: "Hari Aktif",
    noCompletions: "Belum ada latihan selesai. Simpan rencana dan mulai centang latihanmu!",
    completed: "Selesai",

    // Auth
    welcomeBack: "Selamat Datang Kembali",
    createAccount: "Buat Akun",
    signInAccess: "Masuk untuk mengakses rencana tersimpanmu",
    signUpSave: "Daftar untuk menyimpan rencana dan melacak progres",
    displayName: "Nama Tampilan",
    email: "Email *",
    password: "Kata Sandi *",
    signUp: "Daftar",
    dontHaveAccount: "Belum punya akun?",
    alreadyHaveAccount: "Sudah punya akun?",
    welcomeBackToast: "Selamat datang kembali!",
    accountCreated: "Akun dibuat!",
    checkEmail: "Silakan cek emailmu untuk verifikasi akun.",

    // Saved Plans
    savedPlans: "Rencana",
    plans: "Tersimpan",
    savedPlansDesc: "Rencana kebugaran AI yang telah kamu buat sebelumnya.",
    noSavedPlans: "Belum ada rencana tersimpan.",
    generateFirst: "Buat Rencana Pertamamu",
    view: "Lihat",
    planDeleted: "Rencana dihapus",
  },
};

type Translations = { [K in keyof typeof translations.en]: (typeof translations.en)[K] extends string[] ? string[] : string };

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
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] as Translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
