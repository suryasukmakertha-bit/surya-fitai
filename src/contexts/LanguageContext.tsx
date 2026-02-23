import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "id" | "zh";

const translations = {
  en: {
    // Common
    back: "Back",
    backToPrograms: "Back to Programs",
    home: "Home",

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
    allergies: "Food Allergies (optional)",
    allergiesPlaceholder: "E.g., nuts, dairy, gluten...",
    generatePlan: "Generate My AI Plan",
    generating: "Generating Your Plan...",
    fillRequired: "Please fill all required fields",
    trainingStartDate: "Training Start Date *",
    pickDate: "Pick a date",

    // Food Style
    foodStyleLabel: "Food Source Style *",
    foodStylePlaceholder: "Select food style",
    foodStyleLocal: "Local Traditional Foods (based on my country)",
    foodStyleWestern: "Western Style",
    foodStyleAsian: "Asian Style",
    foodStyleHighProtein: "High-Protein Fitness Style",
    foodStyleBudget: "Budget-Friendly Local Foods",
    foodStylePremium: "Premium / Whole Foods Focus",

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
    progressTab: "Progress",

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
    planRenamed: "Plan renamed",
    addPlan: "+ Add Plan",
    whatsappCta: "Get Personal Trainer Assistance from Coach Surya",
    occupation: "Occupation",
    occupationSelect: "Select occupation",
    occupationStudent: "Student",
    occupationOffice: "Office Worker (Mostly Sitting)",
    occupationField: "Field Worker (Physically Active)",
    occupationFreelancer: "Freelancer",
    occupationBusiness: "Business Owner",
    occupationOtherPlaceholder: "Enter your occupation",
    trainingFrequency: "Training Days / Week",
    freq2: "2 Days",
    freq3: "3 Days",
    freq4: "4 Days",
    freq5: "5 Days",
    freq6: "6 Days",
    freq7: "7 Days",
    downloadProgress: "Download Progress",
    shareProgress: "Share",
    delete: "Delete",
    confirmDelete: "Are you sure?",

    // Settings
    settingsLanguage: "Language",
    active: "Active",
    inactive: "Inactive",
    switchPlan: "Switch to this plan",
    createNewPlan: "Create New Plan",
    noPlansYet: "No plans yet. Create your first AI fitness plan!",
    planSwitched: "Plan switched!",
    languageChanged: "Language changed!",
    duration: "Duration",
    foodStyle: "Food Style",

    // ProgressDownloadCard
    progressReport: "Progress Report",
    nameLabel: "Name",
    programLabel: "Program",
    durationLabel: "Duration",
    weightLabelShort: "Weight",
    bmiLabel: "BMI",
    calorieTargetLabel: "Calorie Target",
    motCompleted: "You Built This. Discipline Wins. 🔥",
    motInProgress: "Keep pushing towards your goals! 💪",
    eliteCompleted: "🏆 ELITE COMPLETED",
    consistency: "Consistency",
    generatedBy: "Generated by Surya-FitAi",
    copied: "Copied!",
    copyCaption: "Copy Caption",
    failedToSave: "Failed to save",

    // NotFound
    notFoundTitle: "404",
    notFoundDesc: "Oops! Page not found",
    returnHome: "Return to Home",

    // Enhanced Form - Sections
    basicInfoSection: "Personal Information",
    trainingConfigSection: "Training Configuration",
    lifestyleSection: "Lifestyle & Recovery",
    nutritionSection: "Nutrition Preferences",

    // Enhanced Form - Session Duration
    sessionDurationLabel: "Session Duration (minutes)",
    whySessionDuration: "Helps us design workouts that fit your schedule and energy levels.",
    minutes: "min",

    // Enhanced Form - Equipment
    equipmentLabel: "Available Equipment",
    whyEquipment: "We'll only include exercises you can do with your available equipment.",
    equipBodyweight: "Bodyweight Only",
    equipDumbbell: "Dumbbell Only",
    equipFullGym: "Full Gym",
    equipHomeBarbell: "Home Gym + Barbell",
    equipBands: "Resistance Bands",
    equipNone: "None",

    // Enhanced Form - Daily Steps
    dailyStepsLabel: "Daily Steps / Activity Level",
    whyDailySteps: "Your daily activity affects calorie needs (NEAT). More steps = higher TDEE.",
    steps0: "< 4,000 steps (Sedentary)",
    steps1: "4,000 – 8,000 steps (Light)",
    steps2: "8,000 – 12,000 steps (Moderate)",
    steps3: "> 12,000 steps (Very Active)",
    stepsDesk: "Desk job 8+ hours",

    // Enhanced Form - Sleep
    sleepHoursLabel: "Average Sleep (hours)",
    whySleep: "Sleep quality affects recovery, hormone balance, and training capacity.",
    sleepQualityLabel: "Sleep Quality",

    // Enhanced Form - Stress
    stressLevelLabel: "Current Stress Level",
    whyStress: "High stress increases cortisol, requiring adjusted volume and recovery.",
    nightShiftLabel: "Night shift / overtime work",

    // Enhanced Form - Nutrition
    mealFrequencyLabel: "Preferred Meal Frequency",
    meals3: "3 meals/day",
    meals4: "4 meals/day",
    meals5: "5 meals/day",
    meals6: "6 meals/day",
    ifLabel: "16/8 Intermittent Fasting",
    whyIF: "Eating window 12:00 PM – 8:00 PM. Helps fat loss and insulin sensitivity.",

    // Enhanced Form - Live Metrics
    liveMetricsTitle: "Your Calculated Metrics",
    targetCalories: "Target Cal",
    carbsLabel: "Carbs",
    fatLabel: "Fat",
    bmiCatUnderweight: "Underweight",
    bmiCatNormal: "Normal",
    bmiCatOverweight: "Overweight",
    bmiCatObese: "Obese",
  },
  id: {
    // Common
    back: "Kembali",
    backToPrograms: "Kembali ke Program",
    home: "Beranda",

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
    allergies: "Alergi Makanan (opsional)",
    allergiesPlaceholder: "Contoh: kacang, susu, gluten...",
    generatePlan: "Buat Rencana AI Saya",
    generating: "Membuat Rencanamu...",
    fillRequired: "Harap isi semua kolom wajib",
    trainingStartDate: "Tanggal Mulai Latihan *",
    pickDate: "Pilih tanggal",

    // Food Style
    foodStyleLabel: "Gaya Sumber Makanan *",
    foodStylePlaceholder: "Pilih gaya makanan",
    foodStyleLocal: "Makanan Tradisional Lokal (sesuai negara saya)",
    foodStyleWestern: "Gaya Barat",
    foodStyleAsian: "Gaya Asia",
    foodStyleHighProtein: "Gaya Tinggi Protein Fitness",
    foodStyleBudget: "Makanan Lokal Hemat",
    foodStylePremium: "Premium / Fokus Whole Foods",

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
    progressTab: "Progres",

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
    planRenamed: "Rencana diganti nama",
    addPlan: "+ Tambah Rencana",
    whatsappCta: "Dapatkan Bantuan Pelatih Pribadi dari Coach Surya",
    occupation: "Pekerjaan",
    occupationSelect: "Pilih pekerjaan",
    occupationStudent: "Pelajar/Mahasiswa",
    occupationOffice: "Pekerja Kantoran (Banyak Duduk)",
    occupationField: "Pekerja Lapangan (Aktif Fisik)",
    occupationFreelancer: "Freelancer",
    occupationBusiness: "Pemilik Usaha",
    occupationOtherPlaceholder: "Masukkan pekerjaan Anda",
    trainingFrequency: "Hari Latihan / Minggu",
    freq2: "2 Hari",
    freq3: "3 Hari",
    freq4: "4 Hari",
    freq5: "5 Hari",
    freq6: "6 Hari",
    freq7: "7 Hari",
    downloadProgress: "Unduh Progres",
    shareProgress: "Bagikan",
    delete: "Hapus",
    confirmDelete: "Apakah Anda yakin?",

    // Settings
    settingsLanguage: "Bahasa",
    active: "Aktif",
    inactive: "Tidak Aktif",
    switchPlan: "Beralih ke rencana ini",
    createNewPlan: "Buat Rencana Baru",
    noPlansYet: "Belum ada rencana. Buat rencana kebugaran AI pertamamu!",
    planSwitched: "Rencana dialihkan!",
    languageChanged: "Bahasa diubah!",
    duration: "Durasi",
    foodStyle: "Gaya Makanan",

    // ProgressDownloadCard
    progressReport: "Laporan Progres",
    nameLabel: "Nama",
    programLabel: "Program",
    durationLabel: "Durasi",
    weightLabelShort: "Berat",
    bmiLabel: "IMT",
    calorieTargetLabel: "Target Kalori",
    motCompleted: "Kamu Membangun Ini. Disiplin Menang. 🔥",
    motInProgress: "Terus dorong menuju tujuanmu! 💪",
    eliteCompleted: "🏆 ELITE SELESAI",
    consistency: "Konsistensi",
    generatedBy: "Dibuat oleh Surya-FitAi",
    copied: "Tersalin!",
    copyCaption: "Salin Keterangan",
    failedToSave: "Gagal menyimpan",

    // NotFound
    notFoundTitle: "404",
    notFoundDesc: "Ups! Halaman tidak ditemukan",
    returnHome: "Kembali ke Beranda",

    // Enhanced Form - Sections
    basicInfoSection: "Informasi Pribadi",
    trainingConfigSection: "Konfigurasi Latihan",
    lifestyleSection: "Gaya Hidup & Pemulihan",
    nutritionSection: "Preferensi Nutrisi",

    // Enhanced Form - Session Duration
    sessionDurationLabel: "Durasi Sesi (menit)",
    whySessionDuration: "Membantu kami merancang latihan yang sesuai jadwal dan energi Anda.",
    minutes: "mnt",

    // Enhanced Form - Equipment
    equipmentLabel: "Peralatan Tersedia",
    whyEquipment: "Kami hanya akan memasukkan latihan yang bisa dilakukan dengan peralatan Anda.",
    equipBodyweight: "Berat Badan Saja",
    equipDumbbell: "Dumbbell Saja",
    equipFullGym: "Gym Lengkap",
    equipHomeBarbell: "Gym Rumah + Barbell",
    equipBands: "Resistance Band",
    equipNone: "Tidak Ada",

    // Enhanced Form - Daily Steps
    dailyStepsLabel: "Langkah Harian / Tingkat Aktivitas",
    whyDailySteps: "Aktivitas harian mempengaruhi kebutuhan kalori (NEAT). Lebih banyak langkah = TDEE lebih tinggi.",
    steps0: "< 4.000 langkah (Tidak Aktif)",
    steps1: "4.000 – 8.000 langkah (Ringan)",
    steps2: "8.000 – 12.000 langkah (Sedang)",
    steps3: "> 12.000 langkah (Sangat Aktif)",
    stepsDesk: "Kerja meja 8+ jam",

    // Enhanced Form - Sleep
    sleepHoursLabel: "Rata-rata Tidur (jam)",
    whySleep: "Kualitas tidur mempengaruhi pemulihan, keseimbangan hormon, dan kapasitas latihan.",
    sleepQualityLabel: "Kualitas Tidur",

    // Enhanced Form - Stress
    stressLevelLabel: "Tingkat Stres Saat Ini",
    whyStress: "Stres tinggi meningkatkan kortisol, memerlukan penyesuaian volume dan pemulihan.",
    nightShiftLabel: "Kerja shift malam / lembur",

    // Enhanced Form - Nutrition
    mealFrequencyLabel: "Frekuensi Makan Pilihan",
    meals3: "3 kali/hari",
    meals4: "4 kali/hari",
    meals5: "5 kali/hari",
    meals6: "6 kali/hari",
    ifLabel: "Puasa Intermiten 16/8",
    whyIF: "Jendela makan 12:00 – 20:00. Membantu pembakaran lemak dan sensitivitas insulin.",

    // Enhanced Form - Live Metrics
    liveMetricsTitle: "Metrik Terhitung Anda",
    targetCalories: "Target Kal",
    carbsLabel: "Karbo",
    fatLabel: "Lemak",
    bmiCatUnderweight: "Kurus",
    bmiCatNormal: "Normal",
    bmiCatOverweight: "Kelebihan Berat",
    bmiCatObese: "Obesitas",
  },
  zh: {
    // Common
    back: "返回",
    backToPrograms: "返回项目",
    home: "首页",

    // Nav
    myPlans: "我的计划",
    progress: "进度",
    signOut: "退出",
    signIn: "登录",

    // Hero
    aiPowered: "AI驱动训练",
    heroTitle1: "你的私人",
    heroTitle2: "AI教练",
    heroDesc: "获取完全个性化的锻炼计划、营养指南和采购清单——由AI在几秒内生成，根据你的身体和目标量身定制。",
    startProgram: "开始我的计划",

    // Features
    howItWorks: "如何",
    works: "运作",
    feature1Title: "选择你的项目",
    feature1Desc: "从初学者、增肌、减脂或老年健身项目中选择适合你的需求。",
    feature2Title: "AI分析你",
    feature2Desc: "我们的AI引擎处理你的身体数据、目标和限制，创建完美计划。",
    feature3Title: "获取你的计划",
    feature3Desc: "获得完整的锻炼时间表、饮食计划、采购清单和进度目标。",

    // CTA
    readyTransform: "准备好改变了吗？",
    ctaDesc: "加入数千名已经使用AI更快实现健身目标的人。",
    getStarted: "免费开始",

    // Footer
    rights: "© 2026 版权所有",

    // Programs page
    chooseYour: "选择你的",
    program: "项目",
    programsDesc: "选择与你健身目标匹配的项目。我们的AI将为你创建完全个性化的计划。",

    // Program cards
    beginnerTitle: "初学者计划",
    beginnerDesc: "适合刚接触健身和健康生活方式的人。通过指导练习建立坚实基础。",
    beginnerBenefits: ["学习正确姿势", "建立基础力量", "建立习惯", "营养基础"],
    beginnerGoal: "建立健身基础",
    bulkingTitle: "增肌计划",
    bulkingDesc: "通过高容量训练和热量盈余计划最大化肌肉增长。",
    bulkingBenefits: ["肌肉肥大", "渐进超负荷", "高蛋白饮食", "恢复优化"],
    bulkingGoal: "增加肌肉量",
    cuttingTitle: "减脂计划",
    cuttingDesc: "减少体脂同时保持肌肉。通过战略性训练和营养变得精瘦。",
    cuttingBenefits: ["聚焦减脂", "保持肌肉", "热量赤字饮食", "HIIT整合"],
    cuttingGoal: "减脂变精瘦",
    seniorTitle: "老年健身",
    seniorDesc: "为老年人设计的安全、适应性锻炼。专注于活动能力、平衡和功能性力量。",
    seniorBenefits: ["关节友好练习", "平衡训练", "柔韧性重点", "安全进阶"],
    seniorGoal: "提高活动能力和力量",

    // ProgramForm
    tellUs: "告诉我们关于你的信息，以便AI为你创建个性化计划。",
    fullName: "全名 *",
    age: "年龄 *",
    gender: "性别 *",
    genderSelect: "选择",
    male: "男",
    female: "女",
    other: "其他",
    weightKg: "体重 (kg) *",
    heightCm: "身高 (cm) *",
    fitnessGoal: "健身目标",
    trainingDuration: "训练时长",
    experienceLevel: "经验水平",
    beginner: "初学者",
    intermediate: "中级",
    advanced: "高级",
    weeks2: "2周",
    month1: "1个月",
    months3: "3个月",
    limitations: "身体限制或伤病（可选）",
    limitationsPlaceholder: "例如：膝盖受伤、腰痛...",
    allergies: "食物过敏（可选）",
    allergiesPlaceholder: "例如：坚果、乳制品、麸质...",
    generatePlan: "生成我的AI计划",
    generating: "正在生成你的计划...",
    fillRequired: "请填写所有必填项",
    trainingStartDate: "训练开始日期 *",
    pickDate: "选择日期",

    // Food Style
    foodStyleLabel: "食物来源风格 *",
    foodStylePlaceholder: "选择食物风格",
    foodStyleLocal: "当地传统食物（基于我的国家）",
    foodStyleWestern: "西式风格",
    foodStyleAsian: "亚洲风格",
    foodStyleHighProtein: "高蛋白健身风格",
    foodStyleBudget: "经济实惠的当地食物",
    foodStylePremium: "优质/全食物为主",

    // Results
    yourPersonalized: "你的个性化",
    aiPlan: "AI计划",
    heyUser: "你好 {name}！这是你的定制 {type} 计划。",
    hereCustom: "这是你的定制 {type} 计划。",
    dailyCalories: "每日热量",
    protein: "蛋白质",
    carbsFat: "碳水/脂肪",
    water: "水",
    exportPdf: "导出PDF",
    savePlan: "保存计划",
    saved: "已保存",
    signInToSave: "登录以保存计划",
    signInToSaveDesc: "创建账户以随时保存和访问你的计划。",
    planSaved: "计划已保存！",
    errorSaving: "保存计划出错",
    workoutPlan: "锻炼计划",
    mealPlan: "饮食计划",
    groceryList: "采购清单",
    infoSafety: "信息与安全",
    weeklyGrocery: "每周采购清单",
    progressProjection: "进度预测",
    safetyNotes: "安全注意事项",
    weeklySchedule: "每周时间表",
    estimatedCalories: "预计每次训练燃烧 {count} 卡路里",
    noPlanData: "未找到计划数据。",
    goBackPrograms: "返回项目",
    rest: "休息",
    done: "完成",
    progressTab: "进度",

    // Progress
    progressTracker: "进度",
    tracker: "追踪器",
    progressDesc: "记录每周体重并追踪你的变化。",
    start: "起始",
    current: "当前",
    change: "变化",
    weightOverTime: "体重趋势",
    logAtLeast2: "记录至少2次打卡查看进度图表。",
    logCheckIn: "记录打卡",
    date: "日期",
    weightLabel: "体重 (kg)",
    noteOptional: "备注（可选）",
    notePlaceholder: "感觉很棒！",
    addCheckIn: "添加打卡",
    checkInLogged: "打卡已记录！",
    validWeight: "请输入有效体重（20-500 kg）",
    history: "历史记录",

    // Workout Activity
    workoutActivity: "锻炼活动",
    today: "今天",
    exercises: "练习",
    streak: "连续",
    day: "天",
    days: "天",
    thisWeek: "本周",
    total: "总计",
    activeDays: "活跃天数",
    noCompletions: "还没有完成的锻炼。保存计划并开始勾选练习！",
    completed: "已完成",

    // Auth
    welcomeBack: "欢迎回来",
    createAccount: "创建账户",
    signInAccess: "登录以访问你的已保存计划",
    signUpSave: "注册以保存计划和追踪进度",
    displayName: "显示名称",
    email: "邮箱 *",
    password: "密码 *",
    signUp: "注册",
    dontHaveAccount: "没有账户？",
    alreadyHaveAccount: "已有账户？",
    welcomeBackToast: "欢迎回来！",
    accountCreated: "账户已创建！",
    checkEmail: "请查收邮件验证你的账户。",

    // Saved Plans
    savedPlans: "已保存",
    plans: "计划",
    savedPlansDesc: "你之前生成的AI健身计划。",
    noSavedPlans: "还没有保存的计划。",
    generateFirst: "生成你的第一个计划",
    view: "查看",
    planDeleted: "计划已删除",
    planRenamed: "计划已重命名",
    addPlan: "+ 添加计划",
    whatsappCta: "获取Surya教练的私人训练协助",
    occupation: "职业",
    occupationSelect: "选择职业",
    occupationStudent: "学生",
    occupationOffice: "办公室职员（久坐）",
    occupationField: "户外工作者（体力活跃）",
    occupationFreelancer: "自由职业者",
    occupationBusiness: "企业主",
    occupationOtherPlaceholder: "输入你的职业",
    trainingFrequency: "每周训练天数",
    freq2: "2天",
    freq3: "3天",
    freq4: "4天",
    freq5: "5天",
    freq6: "6天",
    freq7: "7天",
    downloadProgress: "下载进度",
    shareProgress: "分享",
    delete: "删除",
    confirmDelete: "你确定吗？",

    // Settings
    settingsLanguage: "语言",
    active: "活跃",
    inactive: "未活跃",
    switchPlan: "切换到此计划",
    createNewPlan: "创建新计划",
    noPlansYet: "还没有计划。创建你的第一个AI健身计划！",
    planSwitched: "计划已切换！",
    languageChanged: "语言已更改！",
    duration: "时长",
    foodStyle: "食物风格",

    // ProgressDownloadCard
    progressReport: "进度报告",
    nameLabel: "姓名",
    programLabel: "项目",
    durationLabel: "时长",
    weightLabelShort: "体重",
    bmiLabel: "BMI",
    calorieTargetLabel: "热量目标",
    motCompleted: "你成就了这一切。自律获胜。🔥",
    motInProgress: "继续朝着目标前进！💪",
    eliteCompleted: "🏆 精英完成",
    consistency: "坚持度",
    generatedBy: "由 Surya-FitAi 生成",
    copied: "已复制！",
    copyCaption: "复制文案",
    failedToSave: "保存失败",

    // NotFound
    notFoundTitle: "404",
    notFoundDesc: "哎呀！页面未找到",
    returnHome: "返回首页",

    // Enhanced Form - Sections
    basicInfoSection: "个人信息",
    trainingConfigSection: "训练配置",
    lifestyleSection: "生活方式与恢复",
    nutritionSection: "营养偏好",

    // Enhanced Form - Session Duration
    sessionDurationLabel: "训练时长（分钟）",
    whySessionDuration: "帮助我们设计适合您时间和精力的训练计划。",
    minutes: "分钟",

    // Enhanced Form - Equipment
    equipmentLabel: "可用器材",
    whyEquipment: "我们只会包含您可以用现有器材完成的练习。",
    equipBodyweight: "仅自重",
    equipDumbbell: "仅哑铃",
    equipFullGym: "完整健身房",
    equipHomeBarbell: "家庭健身房+杠铃",
    equipBands: "弹力带",
    equipNone: "无器材",

    // Enhanced Form - Daily Steps
    dailyStepsLabel: "每日步数 / 活动水平",
    whyDailySteps: "日常活动影响热量需求（NEAT）。步数越多 = TDEE越高。",
    steps0: "< 4,000 步（久坐）",
    steps1: "4,000 – 8,000 步（轻度）",
    steps2: "8,000 – 12,000 步（中度）",
    steps3: "> 12,000 步（非常活跃）",
    stepsDesk: "久坐办公 8+ 小时",

    // Enhanced Form - Sleep
    sleepHoursLabel: "平均睡眠（小时）",
    whySleep: "睡眠质量影响恢复、激素平衡和训练能力。",
    sleepQualityLabel: "睡眠质量",

    // Enhanced Form - Stress
    stressLevelLabel: "当前压力水平",
    whyStress: "高压力增加皮质醇，需要调整训练量和恢复。",
    nightShiftLabel: "夜班 / 加班工作",

    // Enhanced Form - Nutrition
    mealFrequencyLabel: "首选用餐频率",
    meals3: "每天3餐",
    meals4: "每天4餐",
    meals5: "每天5餐",
    meals6: "每天6餐",
    ifLabel: "16/8间歇性禁食",
    whyIF: "进食窗口12:00–20:00。有助于减脂和胰岛素敏感性。",

    // Enhanced Form - Live Metrics
    liveMetricsTitle: "您的计算指标",
    targetCalories: "目标热量",
    carbsLabel: "碳水",
    fatLabel: "脂肪",
    bmiCatUnderweight: "偏瘦",
    bmiCatNormal: "正常",
    bmiCatOverweight: "超重",
    bmiCatObese: "肥胖",
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
    if (saved === "id" || saved === "zh") return saved;
    return "en";
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
