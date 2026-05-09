export type LangCode = 'en' | 'id' | 'zh';

// ─── UI Labels ────────────────────────────────────────────────

export const UI = {
  en: {
    popupTitle: 'Terms & Privacy Policy',
    popupSubtitle: 'Please read and accept to continue using Surya-FitAi.',
    tabTerms: 'Terms of Service',
    tabPrivacy: 'Privacy Policy',
    scrollHint: 'Scroll down to read before accepting',
    acceptBtn: 'I Agree & Continue',
    agreementNote: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
    closeBtn: 'Close',
    menuItem: 'Terms & Privacy',
    readOnly: 'Terms of Service',
    readOnlyPrivacy: 'Privacy Policy',
  },
  id: {
    popupTitle: 'Syarat & Kebijakan Privasi',
    popupSubtitle: 'Harap baca dan setujui untuk melanjutkan menggunakan Surya-FitAi.',
    tabTerms: 'Syarat & Ketentuan',
    tabPrivacy: 'Kebijakan Privasi',
    scrollHint: 'Gulir ke bawah untuk membaca sebelum menyetujui',
    acceptBtn: 'Saya Setuju & Lanjutkan',
    agreementNote: 'Dengan melanjutkan, Anda menyetujui Syarat & Ketentuan dan Kebijakan Privasi kami.',
    closeBtn: 'Tutup',
    menuItem: 'Syarat & Privasi',
    readOnly: 'Syarat & Ketentuan',
    readOnlyPrivacy: 'Kebijakan Privasi',
  },
  zh: {
    popupTitle: '条款与隐私政策',
    popupSubtitle: '请阅读并同意以继续使用Surya-FitAi。',
    tabTerms: '服务条款',
    tabPrivacy: '隐私政策',
    scrollHint: '向下滚动阅读后方可接受',
    acceptBtn: '我同意并继续',
    agreementNote: '继续即表示您同意我们的服务条款和隐私政策。',
    closeBtn: '关闭',
    menuItem: '条款与隐私',
    readOnly: '服务条款',
    readOnlyPrivacy: '隐私政策',
  },
};

// ─── Section type ─────────────────────────────────────────────

export interface LegalSection {
  heading: string;
  body?: string;
  items?: { label: string; text: string; bullets?: string[] }[];
  bullets?: string[];
  highlight?: boolean;
  contact?: boolean;
}

// ─── Terms of Service ─────────────────────────────────────────

export const TERMS: Record<LangCode, { title: string; lastUpdated: string; sections: LegalSection[] }> = {
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: May 9, 2026',
    sections: [
      { heading: '1. Acceptance of Terms', body: 'By accessing or using Surya-FitAi at surya-fitai.com, you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.' },
      { heading: '2. Description of Service', body: 'Surya-FitAi is an AI-powered fitness application that generates personalized workout programs, meal plans, and grocery lists using Anthropic\'s Claude AI technology. The App also provides GPS tracking for running and cycling, daily challenges, a medal system, and progress tracking. The App is operated by Surya Sukmakertha.' },
      { heading: '3. User Accounts', body: 'You must provide accurate information when registering. You are responsible for maintaining your account security. You must be at least 13 years old to use this App. One account per person is allowed.' },
      { heading: '4. Subscription and Payments', items: [
        { label: 'Free Tier Access', text: 'Users who are not subscribed can still use the service with the following limitations:', bullets: [
          'Maximum 1 plan generation per calendar month',
          'Maximum 1 saved plan',
          'Access only to the most recent plan',
          'Some features and tabs are locked (Meal Plan, Grocery List, Info & Safety, Progress)',
          'GPS Tracker (Running & Cycling) remains free',
          'Daily challenges and medal system remain free',
        ]},
        { label: 'Free Trial (14 Days)', text: 'New users receive full access to all features for 14 days, including:', bullets: [
          'Up to 3 AI plan generations',
          'Up to 3 saved plans',
          'Full access to all features and content',
          'All new features included',
        ]},
        { label: 'Pro Subscription (Paid) — Rp 19,900/month', text: 'After the trial ends, full access requires a Pro subscription, which includes:', bullets: [
          'Up to 3 AI plan generations per subscription period',
          'Up to 3 saved plans',
          'Full access to all tabs: Workout Plan, Meal Plan, Grocery List, Info & Safety, Progress',
          'Complete workout progress tracking',
          'Extend program to the next month',
          'All new features included',
        ]},
        { label: 'Expired Status', text: 'When a trial or subscription ends, the account reverts to the Free Tier:', bullets: [
          'Only the most recent plan is accessible',
          'Other plans are locked',
        ]},
        { label: 'Payments', text: 'Payments are processed via Midtrans and support QRIS, GoPay, ShopeePay, Virtual Account, and other methods.' },
        { label: 'Refund Policy', text: 'Due to the digital nature of the service, all payments are non-refundable.' },
        { label: 'Cancellation', text: 'Users may cancel their subscription at any time. Access remains active until the end of the billing period.' },
      ]},
      { heading: '5. Acceptable Use', body: 'You agree not to use the App for unlawful purposes, reverse engineer it, share account credentials, or use it in ways that could harm others.' },
      { heading: '6. Health Disclaimer', highlight: true, body: 'The workout and nutrition plans generated by Surya-FitAi are for general informational purposes only and are NOT a substitute for professional medical advice. Always consult a qualified healthcare professional before starting any new exercise or diet program. Stop exercising and consult a doctor if you experience pain or discomfort. Surya-FitAi is not responsible for any injury or health issues resulting from following the generated plans.' },
      { heading: '7. Intellectual Property', body: 'All content and designs within the App are owned by Surya-FitAi. Generated plans are for your personal use only and may not be resold.' },
      { heading: '8. Limitation of Liability', body: 'Surya-FitAi shall not be liable for indirect or consequential damages. Total liability shall not exceed the amount paid in the past 30 days.' },
      { heading: '9. Governing Law', body: 'These Terms are governed by the laws of the Republic of Indonesia.' },
      { heading: '10. Contact', contact: true },
    ],
  },
  id: {
    title: 'Syarat & Ketentuan',
    lastUpdated: 'Terakhir diperbarui: 9 Mei 2026',
    sections: [
      { heading: '1. Penerimaan Syarat', body: 'Dengan mengakses atau menggunakan Surya-FitAi di surya-fitai.com, Anda setuju untuk terikat oleh Syarat & Ketentuan ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan Aplikasi ini.' },
      { heading: '2. Deskripsi Layanan', body: 'Surya-FitAi adalah aplikasi fitness berbasis AI yang menghasilkan program latihan, rencana makan, dan daftar belanja yang dipersonalisasi menggunakan teknologi Claude AI dari Anthropic. Aplikasi ini juga menyediakan fitur pelacakan lari dan bersepeda (GPS tracker), tantangan harian, sistem medali, dan pelacakan progres. Aplikasi dioperasikan oleh Surya Sukmakertha.' },
      { heading: '3. Akun Pengguna', body: 'Anda harus memberikan informasi yang akurat saat mendaftar. Anda bertanggung jawab menjaga keamanan akun Anda. Anda harus berusia minimal 13 tahun untuk menggunakan Aplikasi ini. Satu akun per orang diperbolehkan.' },
      { heading: '4. Langganan dan Pembayaran', items: [
        { label: 'Akses Gratis (Free Tier)', text: 'Pengguna yang belum berlangganan tetap dapat menggunakan layanan dengan batasan berikut:', bullets: [
          'Maksimal 1 generate program per bulan kalender',
          'Maksimal 1 program tersimpan',
          'Hanya dapat mengakses 1 program terbaru',
          'Beberapa fitur dan tab dikunci (Rencana Makan, Daftar Belanja, Info & Keamanan, Progress)',
          'Fitur GPS Tracker (Lari & Bersepeda) tetap tersedia gratis',
          'Tantangan harian dan sistem medali tersedia gratis',
        ]},
        { label: 'Uji Coba Gratis (14 Hari)', text: 'Pengguna baru mendapatkan akses penuh ke seluruh fitur selama 14 hari, termasuk:', bullets: [
          'Hingga 3 generate program AI',
          'Hingga 3 program tersimpan',
          'Akses penuh ke seluruh fitur dan konten',
          'Semua fitur baru termasuk',
        ]},
        { label: 'Langganan Pro (Berbayar) — Rp 19.900/bulan', text: 'Setelah masa trial berakhir, akses penuh memerlukan langganan Pro, dengan manfaat:', bullets: [
          'Hingga 3 generate program AI per periode langganan',
          'Hingga 3 program tersimpan',
          'Akses penuh ke semua tab: Rencana Latihan, Rencana Makan, Daftar Belanja, Info & Keamanan, Progress',
          'Pelacakan progres latihan lengkap',
          'Extend program ke bulan berikutnya',
          'Semua fitur baru termasuk',
        ]},
        { label: 'Status Berakhir (Expired)', text: 'Jika trial atau langganan berakhir, akun akan kembali ke akses gratis:', bullets: [
          'Hanya 1 program terbaru yang dapat diakses',
          'Program lainnya akan terkunci',
        ]},
        { label: 'Pembayaran', text: 'Pembayaran diproses melalui Midtrans dan mendukung QRIS, GoPay, ShopeePay, Virtual Account, dan metode lainnya.' },
        { label: 'Kebijakan Pengembalian Dana', text: 'Karena sifat digital layanan ini, pembayaran yang telah dilakukan tidak dapat dikembalikan.' },
        { label: 'Pembatalan', text: 'Pengguna dapat membatalkan langganan kapan saja. Akses tetap berlaku hingga akhir periode penagihan.' },
      ]},
      { heading: '5. Penggunaan yang Diperbolehkan', body: 'Anda setuju untuk tidak menggunakan Aplikasi untuk tujuan melanggar hukum, merekayasa balik, berbagi kredensial akun, atau menggunakannya dengan cara yang dapat merugikan orang lain.' },
      { heading: '6. Penafian Kesehatan', highlight: true, body: 'Program latihan dan nutrisi yang dihasilkan oleh Surya-FitAi hanya untuk tujuan informasi umum dan BUKAN pengganti saran medis profesional. Selalu konsultasikan dengan profesional kesehatan sebelum memulai program olahraga atau diet baru. Hentikan olahraga dan konsultasikan ke dokter jika Anda merasakan nyeri atau ketidaknyamanan. Surya-FitAi tidak bertanggung jawab atas cedera atau masalah kesehatan akibat mengikuti program yang dihasilkan.' },
      { heading: '7. Kekayaan Intelektual', body: 'Semua konten dan desain dalam Aplikasi dimiliki oleh Surya-FitAi. Program yang dihasilkan hanya untuk penggunaan pribadi Anda dan tidak boleh dijual kembali.' },
      { heading: '8. Batasan Tanggung Jawab', body: 'Surya-FitAi tidak bertanggung jawab atas kerugian tidak langsung atau konsekuensial. Total tanggung jawab tidak akan melebihi jumlah yang dibayarkan dalam 30 hari terakhir.' },
      { heading: '9. Hukum yang Berlaku', body: 'Syarat ini diatur oleh hukum Republik Indonesia.' },
      { heading: '10. Kontak', contact: true },
    ],
  },
  zh: {
    title: '服务条款',
    lastUpdated: '最后更新：2026年5月9日',
    sections: [
      { heading: '1. 接受条款', body: '通过访问或使用surya-fitai.com上的Surya-FitAi，即表示您同意受本服务条款的约束。如果您不同意，请勿使用本应用程序。' },
      { heading: '2. 服务描述', body: 'Surya-FitAi是一款AI驱动的健身应用程序，使用Anthropic的Claude AI技术生成个性化的训练计划、饮食计划和购物清单。本应用程序还提供跑步和骑行的GPS追踪、每日挑战、奖牌系统和进度追踪功能。本应用程序由Surya Sukmakertha运营。' },
      { heading: '3. 用户账户', body: '注册时您必须提供准确信息。您负责维护账户安全。您必须年满13岁才能使用本应用程序。每人限一个账户。' },
      { heading: '4. 订阅与付款', items: [
        { label: '免费账户（Free Tier）', text: '未订阅用户仍可使用服务，但有以下限制：', bullets: [
          '每月最多生成1次计划',
          '最多保存1个计划',
          '仅可访问最新的计划',
          '部分功能和页面将被锁定（饮食计划、购物清单、信息与安全、进度）',
          'GPS追踪功能（跑步和骑行）仍然免费',
          '每日挑战和奖牌系统仍然免费',
        ]},
        { label: '免费试用（14天）', text: '新用户可享受14天完整功能体验，包括：', bullets: [
          '最多3次AI计划生成',
          '最多保存3个计划',
          '完整访问所有功能与内容',
          '包含所有新功能',
        ]},
        { label: '付费订阅（Pro）— 每月Rp 19,900', text: '试用结束后，需订阅Pro版本以获得完整功能：', bullets: [
          '每个订阅周期最多3次AI计划生成',
          '最多保存3个计划',
          '完整访问所有页面：训练计划、饮食计划、购物清单、信息与安全、进度',
          '完整的训练进度追踪',
          '延长计划至下个月',
          '包含所有新功能',
        ]},
        { label: '过期状态（Expired）', text: '当试用或订阅结束后，账户将恢复为免费账户：', bullets: [
          '仅可访问最新的计划',
          '其他计划将被锁定',
        ]},
        { label: '支付方式', text: '支付通过Midtrans处理，支持QRIS、GoPay、ShopeePay、虚拟账户等方式。' },
        { label: '退款政策', text: '由于本服务为数字产品，所有已支付费用不予退款。' },
        { label: '取消订阅', text: '用户可随时取消订阅，权限将持续至当前计费周期结束。' },
      ]},
      { heading: '5. 可接受的使用', body: '您同意不将本应用程序用于违法目的、进行逆向工程、共享账户凭据或以可能损害他人的方式使用。' },
      { heading: '6. 健康免责声明', highlight: true, body: 'Surya-FitAi生成的训练和营养计划仅供一般参考，并非专业医疗建议的替代品。在开始任何新的运动或饮食计划之前，请务必咨询合格的医疗专业人员。如果您感到疼痛或不适，请立即停止运动并就医。Surya-FitAi不对因遵循所生成计划而导致的任何伤害或健康问题承担责任。' },
      { heading: '7. 知识产权', body: '应用程序内所有内容和设计归Surya-FitAi所有。生成的计划仅供您个人使用，不得转售。' },
      { heading: '8. 责任限制', body: 'Surya-FitAi不对间接或后果性损害承担责任。总责任不超过过去30天内支付的金额。' },
      { heading: '9. 适用法律', body: '本条款受印度尼西亚共和国法律管辖。' },
      { heading: '10. 联系我们', contact: true },
    ],
  },
};

// ─── Privacy Policy ───────────────────────────────────────────

export const PRIVACY: Record<LangCode, { title: string; lastUpdated: string; sections: LegalSection[] }> = {
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: May 9, 2026',
    sections: [
      { heading: '1. Introduction', body: 'Surya-FitAi ("we", "our", or "us") operates at surya-fitai.com. This Privacy Policy explains how we collect, use, and protect your personal information.' },
      { heading: '2. Information We Collect', items: [
        { label: 'Account Information', text: 'Your email address and name when you register.' },
        { label: 'Health & Fitness Data', text: 'Age, gender, height, weight, fitness goals, activity level, and health conditions you provide to generate your plan.' },
        { label: 'GPS Location Data', text: 'Used only during active running or cycling tracking sessions to compute your route, distance, pace, and elevation. Location is processed in real time and is not stored permanently outside the activity record you save.' },
        { label: 'Activity History', text: 'Saved running and cycling sessions including distance, duration, pace, calories, and the route polyline you completed.' },
        { label: 'Workout Completion Records', text: 'The exercises and dates you check off so we can show your progress and unlock medals.' },
        { label: 'Body Weight Check-ins', text: 'Weight values you log over time to track progress.' },
        { label: 'Push Notification Subscription', text: 'If you allow notifications, we store the browser push subscription endpoint, encryption keys, timezone, and language so we can send you reminders.' },
        { label: 'Payment Information', text: 'Payment is processed by Midtrans. We only store your subscription status — not your card or payment details.' },
        { label: 'Usage Data', text: 'How you use the App, to help us improve our service.' },
      ]},
      { heading: '3. How We Use Your Information', body: 'We use your data to: deliver personalized AI plans, track your workouts and activities, manage your account and subscription, process payments, send subscription and reminder notifications, and improve the App.' },
      { heading: '4. Data Sharing', body: 'We do not sell your data. We only share with:', bullets: ['Supabase — our secure database and authentication provider', 'Midtrans — our payment processor (subscription billing only)', 'AI providers — anonymized fitness data to generate your plans'] },
      { heading: '5. Data Security', body: 'We implement industry-standard security measures. Your data is stored on secure servers with restricted access, scoped per user.' },
      { heading: '6. Data Retention', body: 'We retain your data while your account is active. You may request deletion by emailing fitaisurya@gmail.com.' },
      { heading: '7. Your Rights', body: 'You have the right to access, correct, and delete your personal data. Contact us at fitaisurya@gmail.com to exercise these rights.' },
      { heading: "8. Children's Privacy", body: 'Our App is not intended for users under 13 years old. We do not knowingly collect data from children.' },
      { heading: '9. Changes to This Policy', body: 'We may update this policy periodically. We will notify you of significant changes through the App or via email.' },
      { heading: '10. Contact Us', contact: true },
    ],
  },
  id: {
    title: 'Kebijakan Privasi',
    lastUpdated: 'Terakhir diperbarui: 9 Mei 2026',
    sections: [
      { heading: '1. Pendahuluan', body: 'Surya-FitAi ("kami") beroperasi di surya-fitai.com. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.' },
      { heading: '2. Informasi yang Kami Kumpulkan', items: [
        { label: 'Informasi Akun', text: 'Alamat email dan nama Anda saat mendaftar.' },
        { label: 'Data Kesehatan & Kebugaran', text: 'Usia, jenis kelamin, tinggi, berat badan, tujuan kebugaran, tingkat aktivitas, dan kondisi kesehatan yang Anda berikan untuk membuat program.' },
        { label: 'Data Lokasi GPS', text: 'Digunakan hanya selama sesi pelacakan lari atau bersepeda aktif untuk menghitung rute, jarak, pace, dan elevasi. Lokasi diproses secara real-time dan tidak disimpan secara permanen di luar catatan aktivitas yang Anda simpan.' },
        { label: 'Riwayat Aktivitas', text: 'Sesi lari dan bersepeda yang tersimpan termasuk jarak, durasi, pace, kalori, dan jalur rute yang Anda selesaikan.' },
        { label: 'Catatan Penyelesaian Latihan', text: 'Latihan dan tanggal yang Anda centang agar kami dapat menampilkan progres dan membuka medali.' },
        { label: 'Check-in Berat Badan', text: 'Nilai berat badan yang Anda catat dari waktu ke waktu untuk memantau progres.' },
        { label: 'Langganan Notifikasi Push', text: 'Jika Anda mengizinkan notifikasi, kami menyimpan endpoint langganan push browser, kunci enkripsi, zona waktu, dan bahasa agar kami dapat mengirim pengingat.' },
        { label: 'Informasi Pembayaran', text: 'Pembayaran diproses oleh Midtrans. Kami hanya menyimpan status langganan Anda — bukan detail kartu atau pembayaran Anda.' },
        { label: 'Data Penggunaan', text: 'Cara Anda menggunakan Aplikasi, untuk membantu kami meningkatkan layanan.' },
      ]},
      { heading: '3. Cara Kami Menggunakan Informasi Anda', body: 'Kami menggunakan data Anda untuk: menyampaikan program AI yang dipersonalisasi, melacak latihan dan aktivitas Anda, mengelola akun dan langganan, memproses pembayaran, mengirim notifikasi langganan dan pengingat, serta meningkatkan Aplikasi.' },
      { heading: '4. Berbagi Data', body: 'Kami tidak menjual data Anda. Kami hanya berbagi dengan:', bullets: ['Supabase — penyedia database dan autentikasi aman kami', 'Midtrans — pemroses pembayaran kami (khusus penagihan langganan)', 'Penyedia AI — data kebugaran yang dianonimkan untuk membuat program Anda'] },
      { heading: '5. Keamanan Data', body: 'Kami menerapkan langkah-langkah keamanan standar industri. Data Anda disimpan di server yang aman dengan akses terbatas dan dipisahkan per pengguna.' },
      { heading: '6. Penyimpanan Data', body: 'Kami menyimpan data Anda selama akun Anda aktif. Anda dapat meminta penghapusan dengan menghubungi fitaisurya@gmail.com.' },
      { heading: '7. Hak Anda', body: 'Anda berhak mengakses, mengoreksi, dan menghapus data pribadi Anda. Hubungi kami di fitaisurya@gmail.com untuk menggunakan hak-hak ini.' },
      { heading: '8. Privasi Anak', body: 'Aplikasi kami tidak ditujukan untuk pengguna di bawah 13 tahun. Kami tidak secara sengaja mengumpulkan data dari anak-anak.' },
      { heading: '9. Perubahan Kebijakan', body: 'Kami dapat memperbarui kebijakan ini secara berkala. Kami akan memberi tahu Anda tentang perubahan signifikan melalui Aplikasi atau email.' },
      { heading: '10. Hubungi Kami', contact: true },
    ],
  },
  zh: {
    title: '隐私政策',
    lastUpdated: '最后更新：2026年5月9日',
    sections: [
      { heading: '1. 简介', body: 'Surya-FitAi（"我们"）在surya-fitai.com运营。本隐私政策说明我们如何收集、使用和保护您的个人信息。' },
      { heading: '2. 我们收集的信息', items: [
        { label: '账户信息', text: '注册时您的电子邮件地址和姓名。' },
        { label: '健康与健身数据', text: '您为生成计划而提供的年龄、性别、身高、体重、健身目标、活动水平和健康状况。' },
        { label: 'GPS位置数据', text: '仅在跑步或骑行追踪会话进行时使用，用于计算您的路线、距离、配速和海拔。位置数据实时处理，不会在您保存的活动记录之外永久存储。' },
        { label: '活动历史', text: '已保存的跑步和骑行会话，包括距离、时长、配速、卡路里以及您完成的路线轨迹。' },
        { label: '训练完成记录', text: '您勾选完成的训练和日期，用于显示您的进度并解锁奖牌。' },
        { label: '体重打卡', text: '您随时间记录的体重数值，用于追踪进度。' },
        { label: '推送通知订阅', text: '如果您允许通知，我们将存储浏览器推送订阅端点、加密密钥、时区和语言，以便向您发送提醒。' },
        { label: '付款信息', text: '付款由Midtrans处理。我们只存储您的订阅状态，不存储您的卡片或付款详细信息。' },
        { label: '使用数据', text: '您使用应用程序的方式，用于改善我们的服务。' },
      ]},
      { heading: '3. 我们如何使用您的信息', body: '我们使用您的数据：提供个性化AI计划、追踪您的训练和活动、管理您的账户和订阅、处理付款、发送订阅和提醒通知以及改善应用程序。' },
      { heading: '4. 数据共享', body: '我们不出售您的数据。我们仅与以下方共享：', bullets: ['Supabase — 我们的安全数据库和身份验证提供商', 'Midtrans — 我们的支付处理商（仅用于订阅计费）', 'AI提供商 — 用于生成计划的匿名化健身数据'] },
      { heading: '5. 数据安全', body: '我们实施行业标准安全措施。您的数据存储在访问受限的安全服务器上，并按用户分隔。' },
      { heading: '6. 数据保留', body: '在您的账户处于活跃状态时，我们会保留您的数据。您可以发送电子邮件至fitaisurya@gmail.com请求删除数据。' },
      { heading: '7. 您的权利', body: '您有权访问、更正和删除您的个人数据。请联系fitaisurya@gmail.com行使这些权利。' },
      { heading: '8. 儿童隐私', body: '我们的应用程序不适用于13岁以下的用户。我们不会故意收集儿童的数据。' },
      { heading: '9. 政策变更', body: '我们可能会定期更新本政策。我们将通过应用程序或电子邮件通知您重大变更。' },
      { heading: '10. 联系我们', contact: true },
    ],
  },
};
