import type { Lang } from "@/contexts/LanguageContext";

export type TourScenario = "intro" | "landing";
export type AdvanceTrigger = "lang-change" | "click" | "click-explore" | "continue" | "finish";

export interface TourStepDef {
  id: string;
  target: string;
  pathPattern: string;
  pathExact?: boolean;
  optional?: boolean;
  advanceOn: AdvanceTrigger;
  title: Record<Lang, string>;
  explanation: Record<Lang, string>;
  subHint?: Record<Lang, string>;
}

const SHARED_STEPS: TourStepDef[] = [
  {
    id: "select-program",
    target: "beginner-card",
    pathPattern: "/programs",
    advanceOn: "click",
    title: {
      en: "Start with Beginner Program",
      id: "Mulai dengan Program Pemula",
      zh: "从初学者计划开始",
    },
    explanation: {
      en: "We recommend starting here. Coach Surya will calibrate the program to your fitness level.",
      id: "Kami rekomendasikan mulai dari sini. Coach Surya akan menyesuaikan program dengan level kebugaran Anda.",
      zh: "我们建议从这里开始。Coach Surya将根据您的体能水平调整计划。",
    },
  },
  {
    id: "fill-form",
    target: "form-fields",
    pathPattern: "/program/",
    advanceOn: "continue",
    title: {
      en: "Tell Coach Surya About Yourself",
      id: "Ceritakan Tentang Diri Anda",
      zh: "告诉Coach Surya关于您自己",
    },
    explanation: {
      en: "Fill in your details so Coach Surya can create a plan that's truly personalized for you. Skip optional fields if you prefer.",
      id: "Isi data Anda agar Coach Surya bisa membuat program yang benar-benar personal. Lewati kolom opsional jika mau.",
      zh: "填写您的详细信息，让Coach Surya为您制定真正个性化的计划。可选字段可以跳过。",
    },
  },
  {
    id: "generate-plan",
    target: "generate-button",
    pathPattern: "/program/",
    advanceOn: "click",
    title: {
      en: "Generate Your Plan",
      id: "Buat Program Anda",
      zh: "生成您的计划",
    },
    explanation: {
      en: "Tap here when you're ready. Coach Surya will build your complete workout, meal plan, and grocery list in seconds.",
      id: "Tap di sini saat Anda siap. Coach Surya akan membuat program latihan, rencana makan, dan daftar belanja lengkap dalam hitungan detik.",
      zh: "准备好后点击这里。Coach Surya将在几秒内为您制定完整的训练、饮食计划和购物清单。",
    },
  },
  {
    id: "save-plan",
    target: "save-button",
    pathPattern: "/results",
    advanceOn: "click",
    title: {
      en: "Save Your Plan",
      id: "Simpan Program Anda",
      zh: "保存您的计划",
    },
    explanation: {
      en: "Save your plan so you can access it anytime from My Plans.",
      id: "Simpan program agar bisa diakses kapan saja dari Rencana Saya.",
      zh: "保存计划，以便随时从我的计划中访问。",
    },
  },
  {
    id: "workout-tab",
    target: "tab-workout",
    pathPattern: "/results",
    advanceOn: "click-explore",
    title: {
      en: "Explore Your Workout Plan",
      id: "Jelajahi Program Latihan Anda",
      zh: "探索您的训练计划",
    },
    explanation: {
      en: "Tap each day to see your exercises. Use Select Week to navigate through your program weeks.",
      id: "Tap setiap hari untuk melihat latihan. Gunakan Pilih Minggu untuk navigasi antar minggu program.",
      zh: "点击每天查看您的锻炼内容。使用选择周在计划的各周之间导航。",
    },
    subHint: {
      en: "Try tapping Select Week to navigate weeks",
      id: "Coba tap Pilih Minggu untuk navigasi minggu",
      zh: "尝试点击选择周来导航各周",
    },
  },
  {
    id: "meal-tab",
    target: "tab-meals",
    pathPattern: "/results",
    advanceOn: "click-explore",
    title: {
      en: "Your Personalized Meal Plan",
      id: "Rencana Makan Personal Anda",
      zh: "您的个性化饮食计划",
    },
    explanation: {
      en: "Coach Surya has prepared meals based on your dietary preferences and calorie targets.",
      id: "Coach Surya telah menyiapkan menu berdasarkan preferensi diet dan target kalori Anda.",
      zh: "Coach Surya根据您的饮食偏好和卡路里目标为您准备了餐食。",
    },
  },
  {
    id: "grocery-tab",
    target: "tab-grocery",
    pathPattern: "/results",
    advanceOn: "click",
    title: {
      en: "Your Grocery List",
      id: "Daftar Belanja Anda",
      zh: "您的购物清单",
    },
    explanation: {
      en: "Everything you need to buy for your meal plan — ready to screenshot or share.",
      id: "Semua yang perlu dibeli untuk rencana makan Anda — siap di-screenshot atau dibagikan.",
      zh: "您饮食计划所需购买的一切——可以截图或分享。",
    },
  },
  {
    id: "info-tab",
    target: "tab-info",
    pathPattern: "/results",
    advanceOn: "click",
    title: {
      en: "Important Safety Info",
      id: "Info & Keamanan Penting",
      zh: "重要安全信息",
    },
    explanation: {
      en: "Read this to understand how to train safely and get the most out of your program.",
      id: "Baca ini untuk memahami cara berlatih dengan aman dan memaksimalkan program Anda.",
      zh: "阅读此内容了解如何安全训练并充分利用您的计划。",
    },
  },
  {
    id: "progress-tab",
    target: "tab-progress",
    pathPattern: "/results",
    optional: true,
    advanceOn: "click-explore",
    title: {
      en: "Track Your Progress",
      id: "Pantau Perkembangan Anda",
      zh: "跟踪您的进度",
    },
    explanation: {
      en: "Log your weight and check-ins here. Coach Surya monitors your consistency over time.",
      id: "Catat berat badan dan check-in di sini. Coach Surya memantau konsistensi Anda dari waktu ke waktu.",
      zh: "在这里记录您的体重和打卡。Coach Surya会持续监测您的坚持情况。",
    },
    subHint: {
      en: "Scroll down to see all progress features",
      id: "Scroll ke bawah untuk melihat semua fitur progress",
      zh: "向下滚动查看所有进度功能",
    },
  },
  {
    id: "whatsapp-cta",
    target: "whatsapp-cta",
    pathPattern: "/results",
    advanceOn: "finish",
    title: {
      en: "Want Personal Coaching?",
      id: "Mau Pelatihan Personal?",
      zh: "想要个人辅导吗？",
    },
    explanation: {
      en: "Tap here to connect directly with Coach Surya on WhatsApp for real-life personal training sessions.",
      id: "Tap di sini untuk terhubung langsung dengan Coach Surya via WhatsApp untuk sesi pelatihan personal.",
      zh: "点击这里通过WhatsApp直接联系Coach Surya，获得真实的个人训练课程。",
    },
  },
];

export const INTRO_TOUR_STEPS: TourStepDef[] = [
  {
    id: "language-programs",
    target: "language-selector",
    pathPattern: "/programs",
    advanceOn: "lang-change",
    title: {
      en: "Choose Your Language",
      id: "Pilih Bahasa Anda",
      zh: "选择您的语言",
    },
    explanation: {
      en: "Select your preferred language so Coach Surya can communicate with you comfortably.",
      id: "Pilih bahasa yang Anda inginkan agar Coach Surya dapat berkomunikasi dengan nyaman.",
      zh: "选择您偏好的语言，让Coach Surya能够更好地与您沟通。",
    },
  },
  ...SHARED_STEPS,
];

export const LANDING_TOUR_STEPS: TourStepDef[] = [
  {
    id: "language-landing",
    target: "language-selector",
    pathPattern: "/",
    pathExact: true,
    advanceOn: "lang-change",
    title: {
      en: "Choose Your Language",
      id: "Pilih Bahasa Anda",
      zh: "选择您的语言",
    },
    explanation: {
      en: "Start by selecting your preferred language for the best experience.",
      id: "Mulai dengan memilih bahasa pilihan Anda untuk pengalaman terbaik.",
      zh: "首先选择您偏好的语言以获得最佳体验。",
    },
  },
  {
    id: "start-journey",
    target: "start-program",
    pathPattern: "/",
    pathExact: true,
    advanceOn: "click",
    title: {
      en: "Start Your Journey",
      id: "Mulai Perjalanan Anda",
      zh: "开始您的旅程",
    },
    explanation: {
      en: "Tap here to begin. Coach Surya will guide you through building your personalized fitness plan.",
      id: "Tap di sini untuk memulai. Coach Surya akan memandu Anda membuat program kebugaran yang personal.",
      zh: "点击这里开始。Coach Surya将引导您建立个性化的健身计划。",
    },
  },
  ...SHARED_STEPS,
];

export const TOUR_UI = {
  skip: { en: "Skip Tour", id: "Lewati Tur", zh: "跳过导览" } as Record<Lang, string>,
  done: { en: "Finish Tour", id: "Selesai", zh: "完成导览" } as Record<Lang, string>,
  continueTour: { en: "Continue Tour →", id: "Lanjutkan Tur →", zh: "继续导览 →" } as Record<Lang, string>,
  finishTour: { en: "Finish Tour", id: "Selesai Tur", zh: "完成导览" } as Record<Lang, string>,
};
