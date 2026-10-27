export type PrebuiltVoiceName = "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr";

export type VoiceCategory =
  | "all"
  | "storytelling"
  | "creator"
  | "broadcast"
  | "podcast"
  | "international";

export interface ClonedVoiceProfile {
  id: string;
  name: string;
  category: VoiceCategory;
  genderLabel: string;
  isCustomClone: boolean;
  createdAt: string;
  baseVoice: PrebuiltVoiceName;
  pitchRegister: string;
  estimatedPitchHz: number;
  cadenceWpm: number;
  stylePrompt: string;
  summaryBn: string;
  timbreTraits: string[];
  recommendedPitchSemitones: number;
  recommendedSpeed: number;
  warmthDb: number;
  presenceDb: number;
  /** 10-band spectral energy profile (110Hz to 6500Hz) for 1:1 Formant & Timbre Transfer */
  spectralFingerprint?: number[];
  /** Similarity match score (e.g. 98%) */
  similarityScore?: number;
  sampleTranscript?: string;
  sampleAudioUrl?: string;
  samplePeaks?: number[];
}

export interface GeneratedAudioItem {
  id: string;
  voiceId: string;
  voiceName: string;
  mode: "single" | "dialogue" | "dubbing";
  scriptText: string;
  audioUrl: string;
  rawWavBase64: string;
  durationSec: number;
  peaks: number[];
  createdAt: string;
  pitchSemitones: number;
  speed: number;
}

export interface DialogueTurn {
  id: string;
  speaker: "A" | "B";
  text: string;
}

export const VOCAL_DNA_BANDS = [
  110, 175, 280, 450, 750, 1250, 2000, 3150, 4500, 6500,
] as const;

export const INITIAL_CLONED_VOICES: ClonedVoiceProfile[] = [
  {
    id: "clone-ayan-bn",
    name: "আয়ান রহমান (স্টোরিটেলার ও ইউটিউবার)",
    category: "storytelling",
    genderLabel: "পুরুষ · ঢাকা",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Charon",
    pitchRegister: "Warm Baritone",
    estimatedPitchHz: 118,
    cadenceWpm: 138,
    stylePrompt:
      "Ultra-realistic native Bangladeshi Bengali male narrator, warm close-mic baritone resonance (118Hz f0), natural conversational micro-pauses, soft dental consonants, authentic human breath before clauses, zero robotic monotone",
    summaryBn: "ভরাট, গম্ভীর ও স্বাভাবিক স্টুডিও কণ্ঠ — ডকুমেন্টারি, স্টোরিটেলিং এবং ইউটিউব ভয়েসওভারের জন্য আদর্শ।",
    timbreTraits: ["99% Human Match", "Deep Chest Warmth", "Studio Baritone"],
    recommendedPitchSemitones: -0.4,
    recommendedSpeed: 0.98,
    warmthDb: 2.6,
    presenceDb: 1.9,
    spectralFingerprint: [2.8, 3.1, 1.4, -0.5, 0.8, 1.9, 2.4, 2.1, 1.2, 0.6],
    similarityScore: 99,
    sampleTranscript:
      "স্বাগতম! <breath> আজ আমরা জানবো কীভাবে কৃত্রিম বুদ্ধিমত্তা মানুষের কণ্ঠের সূক্ষ্ম আবেগ ও শ্বাস-প্রশ্বাসকে নিখুঁতভাবে ফুটিয়ে তুলতে পারে।",
  },
  {
    id: "clone-nusrat-bn",
    name: "নুসরাত জাহান (রিলস ও নিউজ প্রেজেন্টার)",
    category: "creator",
    genderLabel: "নারী · ঢাকা",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Kore",
    pitchRegister: "Expressive Alto",
    estimatedPitchHz: 205,
    cadenceWpm: 146,
    stylePrompt:
      "Ultra-realistic native Bangladeshi Bengali female presenter, warm expressive alto register (205Hz f0), natural human smile in tone, crisp syllable articulation, organic breath transitions",
    summaryBn: "স্পষ্ট, প্রাণবন্ত ও মিষ্টি কণ্ঠস্বর — ফেসবুক রিলস, বিজ্ঞাপন, এবং সংবাদ উপস্থাপনার জন্য চমৎকার।",
    timbreTraits: ["99% Human Match", "Crisp Articulation", "Warm Alto"],
    recommendedPitchSemitones: 0.2,
    recommendedSpeed: 1.0,
    warmthDb: 1.4,
    presenceDb: 2.5,
    spectralFingerprint: [-1.2, 1.5, 2.6, 1.8, 1.2, 2.4, 2.9, 2.5, 1.8, 1.1],
    similarityScore: 99,
    sampleTranscript:
      "হ্যালো ভিউয়ার্স! <breath> মাত্র কয়েক সেকেন্ডের ভয়েস স্যাম্পল দিয়েই এখন তৈরি করে ফেলুন আপনার নিজের বাস্তবসম্মত ভয়েস ক্লোন।",
  },
  {
    id: "clone-tanvir-thriller",
    name: "তানভীর হাসান (থ্রিলার, রহস্য ও ডকুমেন্টারি)",
    category: "storytelling",
    genderLabel: "পুরুষ · গভীর কণ্ঠ",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Fenrir",
    pitchRegister: "Deep Bass-Baritone",
    estimatedPitchHz: 98,
    cadenceWpm: 124,
    stylePrompt:
      "Deep, cinematic, gravelly and suspenseful Bengali male narrator (98Hz bass-baritone), rich sub-chest resonance, subtle vocal fry on low endings, deliberate atmospheric pauses, true-crime documentary realism",
    summaryBn: "রহস্যময়, গভীর ও রোমাঞ্চকর কণ্ঠ — থ্রিলার গল্প, হরর অডিওবুক ও ক্রাইম ডকুমেন্টারির জন্য সেরা।",
    timbreTraits: ["Cinematic Bass", "Suspenseful Pauses", "Velvet Low-End"],
    recommendedPitchSemitones: -1.4,
    recommendedSpeed: 0.94,
    warmthDb: 3.8,
    presenceDb: 1.6,
    spectralFingerprint: [4.2, 3.6, 1.8, -1.2, 0.4, 1.5, 2.0, 1.7, 0.8, 0.3],
    similarityScore: 99,
    sampleTranscript:
      "রাত তখন ঠিক বারোটা। <breath> পুরোনো বাড়িটার করিডোর ধরে হাঁটতে হাঁটতে হঠাৎ মনে হলো, অন্ধকারের ভেতর থেকে কেউ একজন আমাকে লক্ষ্য করছে।",
  },
  {
    id: "clone-tasnia-vlog",
    name: "তাসনিয়া ফারিণ (ন্যাচারাল ভ্লগ ও লাইফস্টাইল)",
    category: "creator",
    genderLabel: "নারী · ক্যাজুয়াল",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Zephyr",
    pitchRegister: "Natural Conversational",
    estimatedPitchHz: 214,
    cadenceWpm: 150,
    stylePrompt:
      "Spontaneous, friendly and ultra-realistic young Bengali female vlogger voice, warm smile in the tone, natural breathing, effortless everyday conversational rhythm",
    summaryBn: "একদম পাশের বাড়ির মেয়ের মতো ঘরোয়া ও প্রাণবন্ত কণ্ঠ — ডেইলি ভ্লগ, লাইফস্টাইল ও রিভিউ ভিডিওর জন্য।",
    timbreTraits: ["Friendly Smile", "Effortless Flow", "Intimate Air"],
    recommendedPitchSemitones: 0.1,
    recommendedSpeed: 1.02,
    warmthDb: 1.8,
    presenceDb: 2.2,
    spectralFingerprint: [-1.0, 1.4, 2.4, 2.0, 1.4, 2.1, 2.6, 2.3, 2.0, 1.5],
    similarityScore: 98,
    sampleTranscript:
      "আজকে সকাল থেকেই আবহাওয়াটা এত সুন্দর ছিল যে ভাবলাম আপনাদের সাথে ছোট্ট একটা কফি আড্ডা শেয়ার করি! <breath> চলুন শুরু করা যাক।",
  },
  {
    id: "clone-rafsan-tech",
    name: "রাফসান কবির (হাই-এনার্জি রিলস ও টেক ক্রিয়েটর)",
    category: "creator",
    genderLabel: "পুরুষ · রিলস/শর্টস",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Puck",
    pitchRegister: "Bright Dynamic Tenor",
    estimatedPitchHz: 148,
    cadenceWpm: 162,
    stylePrompt:
      "Energetic, punchy and charismatic Bengali male YouTube & Reels creator, crisp fast-paced delivery, engaging vocal inflections, modern studio broadcast presence",
    summaryBn: "দ্রুত, আকর্ষণীয় ও এনার্জেটিক কণ্ঠ — ভাইরাল ফেসবুক রিলস, ইউটিউব শর্টস ও গ্যাজেট রিভিউয়ের জন্য।",
    timbreTraits: ["High Retention", "Crisp Transient", "Dynamic Tenor"],
    recommendedPitchSemitones: 0.3,
    recommendedSpeed: 1.05,
    warmthDb: 1.2,
    presenceDb: 3.1,
    spectralFingerprint: [1.0, 2.1, 1.6, 0.5, 1.5, 2.8, 3.2, 2.9, 1.8, 1.0],
    similarityScore: 99,
    sampleTranscript:
      "মাত্র তিরিশ সেকেন্ডে আপনার ভিডিওর ভিউ দ্বিগুণ করতে চান? <breath> তাহলে এই তিনটি গোপন কৌশল এখনই জেনে নিন!",
  },
  {
    id: "clone-sadia-news",
    name: "সাদিয়া ইসলাম (প্রাইমটাইম নিউজ ও কর্পোরেট)",
    category: "broadcast",
    genderLabel: "নারী · সংবাদ পাঠিকা",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Kore",
    pitchRegister: "Authoritative Alto",
    estimatedPitchHz: 188,
    cadenceWpm: 144,
    stylePrompt:
      "Polished, authoritative and crystal-clear Bangladeshi television news anchor female voice, standard pronunciation, balanced chest-head resonance, composed professional pacing",
    summaryBn: "প্রমিত উচ্চারণ ও আত্মবিশ্বাসী কণ্ঠ — টিভি নিউজ রিপোর্ট, কর্পোরেট প্রেজেন্টেশন এবং তথ্যচিত্রের জন্য।",
    timbreTraits: ["Broadcast Diction", "Balanced Alto", "Zero Sibilance"],
    recommendedPitchSemitones: -0.3,
    recommendedSpeed: 0.99,
    warmthDb: 2.0,
    presenceDb: 2.6,
    spectralFingerprint: [0.2, 2.0, 2.5, 1.4, 1.2, 2.5, 2.8, 2.4, 1.3, 0.7],
    similarityScore: 99,
    sampleTranscript:
      "সন্ধ্যা সাতটার প্রধান সংবাদে সবাইকে স্বাগত। <breath> আজ সারা দেশে প্রযুক্তিক্ষেত্রে নতুন বিনিয়োগ ও কর্মসংস্থান নিয়ে বিশেষ প্রতিবেদন থাকছে।",
  },
  {
    id: "clone-mahmud-motivational",
    name: "মাহমুদুর রহমান (ইসলামিক ও মোটিভেশনাল বক্তা)",
    category: "storytelling",
    genderLabel: "পুরুষ · শান্ত ও হৃদয়গ্রাহী",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Charon",
    pitchRegister: "Soulful Resonant Baritone",
    estimatedPitchHz: 112,
    cadenceWpm: 122,
    stylePrompt:
      "Calm, deeply compassionate and soulful Bengali male speaker, resonant warm baritone, gentle inspiring cadence with peaceful breathing and heartfelt emotional sincerity",
    summaryBn: "শান্ত, হৃদয়স্পর্শী ও গম্ভীর কণ্ঠ — ইসলামিক আলোচনা, মোটিভেশনাল ভিডিও এবং জীবনমুখী গল্পের জন্য।",
    timbreTraits: ["Heartfelt Warmth", "Peaceful Pace", "Rich Resonance"],
    recommendedPitchSemitones: -0.8,
    recommendedSpeed: 0.93,
    warmthDb: 3.2,
    presenceDb: 1.5,
    spectralFingerprint: [3.4, 3.2, 1.9, 0.2, 0.8, 1.6, 1.9, 1.5, 0.9, 0.4],
    similarityScore: 99,
    sampleTranscript:
      "জীবনে কখনো কখনো এমন সময় আসে যখন চারপাশের সব পথ বন্ধ মনে হয়। <breath> কিন্তু ধৈর্য আর বিশ্বাসের হাত ধরলে নতুন আলো ঠিকই দেখা দেয়।",
  },
  {
    id: "clone-rubaiyat-midnight",
    name: "রুবাইয়াত শারমিন (রাতের রেডিও ও ইমোশনাল স্টোরি)",
    category: "podcast",
    genderLabel: "নারী · রেডিও জকি স্টাইল",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Kore",
    pitchRegister: "Husky Intimate Alto",
    estimatedPitchHz: 176,
    cadenceWpm: 132,
    stylePrompt:
      "Warm, slightly husky late-night FM radio host female voice in Bengali, close-mic intimacy, expressive emotional micro-inflections and natural soft sighs",
    summaryBn: "রাতের এফএম রেডিওর মতো মায়াবী ও আবেগপূর্ণ কণ্ঠ — অডিও স্টোরি, চিঠি পাঠ ও পডকাস্টের জন্য।",
    timbreTraits: ["Late-Night FM Vibe", "Husky Warmth", "Close-Mic Intimacy"],
    recommendedPitchSemitones: -0.7,
    recommendedSpeed: 0.96,
    warmthDb: 2.8,
    presenceDb: 1.8,
    spectralFingerprint: [1.2, 2.6, 2.8, 1.5, 0.9, 1.8, 2.2, 1.9, 1.6, 1.2],
    similarityScore: 99,
    sampleTranscript:
      "শহরের সব আলো যখন একে একে নিভে আসে, <breath> তখন মাথার ভেতর পুরোনো স্মৃতিগুলো যেন নতুন করে কথা বলতে শুরু করে।",
  },
  {
    id: "clone-imran-commercial",
    name: "ইমরান চৌধুরী (বিজ্ঞাপন ও টিভি কমার্শিয়াল ভয়েস)",
    category: "broadcast",
    genderLabel: "পুরুষ · প্রোমো ভয়েস",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Fenrir",
    pitchRegister: "Punchy Studio Baritone",
    estimatedPitchHz: 124,
    cadenceWpm: 148,
    stylePrompt:
      "Confident, charismatic commercial voiceover artist in Bengali, rich broadcast baritone with crisp articulation, persuasive warmth, and dynamic agency-grade polish",
    summaryBn: "আকর্ষণীয় ও প্রফেশনাল বিজ্ঞাপন কণ্ঠ — ব্র্যান্ড প্রোমো, ফেসবুক অ্যাড এবং প্রোডাক্ট ভিডিওর জন্য।",
    timbreTraits: ["Agency Polish", "Punchy Midrange", "Persuasive Tone"],
    recommendedPitchSemitones: -0.2,
    recommendedSpeed: 1.01,
    warmthDb: 2.4,
    presenceDb: 3.0,
    spectralFingerprint: [2.5, 2.9, 1.5, -0.4, 1.4, 2.7, 3.1, 2.8, 1.6, 0.9],
    similarityScore: 98,
    sampleTranscript:
      "আপনার ব্যবসার ডিজিটাল প্রচারণাকে নিয়ে যান এক নতুন উচ্চতায়! <breath> আজই যুক্ত হোন আমাদের স্মার্ট প্ল্যাটফর্মে।",
  },
  {
    id: "clone-arnab-kolkata",
    name: "অর্ণব সেনগুপ্ত (সাহিত্য, আবৃত্তি ও অডিও নাটক)",
    category: "storytelling",
    genderLabel: "পুরুষ · প্রমিত সাহিত্য রীতি",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Charon",
    pitchRegister: "Theatrical Baritone",
    estimatedPitchHz: 121,
    cadenceWpm: 130,
    stylePrompt:
      "Cultured, literary Bengali male voice with classic Kolkata Sunday Suspense style articulation, expressive dramatic pauses, rich chest tone and refined diction",
    summaryBn: "সানডে সাসপেন্স ও সাহিত্য পাঠের মতো নাটকীয় কণ্ঠ — রবীন্দ্র-সাহিত্য, গোয়েন্দা গল্প ও অডিও ড্রামার জন্য।",
    timbreTraits: ["Audio Drama Style", "Refined Diction", "Dramatic Cadence"],
    recommendedPitchSemitones: -0.5,
    recommendedSpeed: 0.96,
    warmthDb: 2.7,
    presenceDb: 2.1,
    spectralFingerprint: [2.7, 3.0, 1.8, 0.1, 1.1, 2.2, 2.5, 2.1, 1.1, 0.5],
    similarityScore: 99,
    sampleTranscript:
      "দার্জিলিং মেইল যখন স্টেশন ছেড়ে কুয়াশার ভেতর হারিয়ে গেল, <breath> ফেলুদা তখন তার ডায়েরির পাতায় শেষ সূত্রটা মিলিয়ে নিচ্ছিল।",
  },
  {
    id: "clone-farhan-podcast",
    name: "ফারহান আহমেদ (পডকাস্ট ও টেক হোস্ট)",
    category: "podcast",
    genderLabel: "পুরুষ · পডকাস্ট",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Puck",
    pitchRegister: "Conversational Tenor",
    estimatedPitchHz: 142,
    cadenceWpm: 152,
    stylePrompt:
      "Friendly, spontaneous conversational male podcast host, natural tenor timbre, relaxed rhythm with subtle human warmth and realistic breath phrasing",
    summaryBn: "বন্ধুসুলভ ও ক্যাজুয়াল পডকাস্ট কণ্ঠ — টিউটোরিয়াল, পডকাস্ট আড্ডা ও রিভিউ ভিডিওর জন্য উপযুক্ত।",
    timbreTraits: ["Spontaneous Flow", "Balanced Tenor", "Conversational"],
    recommendedPitchSemitones: 0.0,
    recommendedSpeed: 1.02,
    warmthDb: 1.6,
    presenceDb: 2.0,
    spectralFingerprint: [1.4, 2.3, 1.8, 0.6, 1.2, 2.1, 2.4, 2.0, 1.3, 0.7],
    similarityScore: 98,
    sampleTranscript:
      "আসলে প্রযুক্তির এই পরিবর্তনটা আমাদের কন্টেন্ট ক্রিয়েশনের কাজকে অনেক সহজ করে দিয়েছে, |yeah| তাই না?",
  },
  {
    id: "clone-mehjabin-soft",
    name: "মেহজাবীন চৌধুরী (অডিওবুক ও কবিতা)",
    category: "storytelling",
    genderLabel: "নারী · কোমল কণ্ঠ",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Zephyr",
    pitchRegister: "Soft Acoustic Soprano",
    estimatedPitchHz: 224,
    cadenceWpm: 126,
    stylePrompt:
      "Gentle, emotive and intimate female voice with soft breathy texture, unhurried poetic cadence, and rich acoustic warmth for audiobooks",
    summaryBn: "কোমল ও আবেগপূর্ণ কণ্ঠস্বর — অডিওবুক, গল্প পাঠ ও ইমোশনাল ভয়েসওভারের জন্য সেরা।",
    timbreTraits: ["Soft Intimate Tone", "Poetic Pacing", "Gentle Air"],
    recommendedPitchSemitones: 0.3,
    recommendedSpeed: 0.95,
    warmthDb: 2.1,
    presenceDb: 1.4,
    spectralFingerprint: [-0.8, 1.6, 2.7, 2.1, 1.0, 1.7, 2.0, 1.8, 2.1, 1.7],
    similarityScore: 99,
    sampleTranscript:
      "বৃষ্টির সেই বিকেলে জানালার পাশে বসে থাকা মুহূর্তগুলো <breath> আজও মনের গভীরে নীরবে বেজে ওঠে।",
  },
  {
    id: "clone-anika-ivr",
    name: "আনিকা তাবাসসুম (কাস্টমার কেয়ার ও টিউটোরিয়াল)",
    category: "broadcast",
    genderLabel: "নারী · শুদ্ধ ও স্পষ্ট",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Zephyr",
    pitchRegister: "Clear Warm Soprano",
    estimatedPitchHz: 216,
    cadenceWpm: 140,
    stylePrompt:
      "Polite, reassuring and crystal-clear Bengali female voice for customer support, e-learning tutorials and guided onboarding, warm welcoming tone",
    summaryBn: "বিনয়ী, স্পষ্ট ও শিক্ষামূলক কণ্ঠ — টিউটোরিয়াল ভিডিও, অ্যাপ গাইড এবং অফিসিয়াল অটো-ভয়েসের জন্য।",
    timbreTraits: ["Welcoming Tone", "Crystal Clear", "Steady Rhythm"],
    recommendedPitchSemitones: 0.1,
    recommendedSpeed: 0.98,
    warmthDb: 1.5,
    presenceDb: 2.4,
    spectralFingerprint: [-0.6, 1.5, 2.3, 1.7, 1.3, 2.4, 2.7, 2.4, 1.5, 0.9],
    similarityScore: 98,
    sampleTranscript:
      "আমাদের সেবায় আপনাকে স্বাগতম। <breath> আপনার প্রয়োজনীয় তথ্য জানতে নিচের নির্দেশনাগুলো অনুসরণ করুন।",
  },
  {
    id: "clone-zayan-en",
    name: "Zayan Malik (Cinematic English Narrator)",
    category: "international",
    genderLabel: "Male · Studio English",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Fenrir",
    pitchRegister: "Deep Studio Baritone",
    estimatedPitchHz: 104,
    cadenceWpm: 136,
    stylePrompt:
      "Ultra-realistic deep cinematic English documentary narrator, rich chest resonance, subtle vocal fry on low notes, natural breath pauses, BBC/Netflix documentary microphone quality",
    summaryBn: "হলিউড ও ডকুমেন্টারি স্টাইলের গভীর ইংরেজি কণ্ঠ — গ্লোবাল ইউটিউব চ্যানেল ও ফিল্ম ন্যারেশনের জন্য।",
    timbreTraits: ["Netflix Doc Style", "Deep Baritone", "Close-Mic Realism"],
    recommendedPitchSemitones: -0.9,
    recommendedSpeed: 0.96,
    warmthDb: 3.4,
    presenceDb: 2.2,
    spectralFingerprint: [3.8, 3.4, 1.6, -0.8, 0.7, 2.1, 2.6, 2.3, 1.2, 0.6],
    similarityScore: 99,
    sampleTranscript:
      "Beneath the surface of our everyday world <breath> lies a hidden network of intelligence that is reshaping the future of human communication.",
  },
  {
    id: "clone-sophia-en",
    name: "Sophia Laurent (Natural English Creator & Host)",
    category: "international",
    genderLabel: "Female · Studio English",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Kore",
    pitchRegister: "Warm Conversational Alto",
    estimatedPitchHz: 196,
    cadenceWpm: 148,
    stylePrompt:
      "Authentic, expressive and natural American/International English female podcast host and creator, warm vocal presence, conversational micro-pauses and realistic breathing",
    summaryBn: "স্বাভাবিক ও প্রাণবন্ত ইংরেজি নারী কণ্ঠ — ইন্টারন্যাশনাল পডকাস্ট, অডিওবুক ও টেক ভিডিওর জন্য।",
    timbreTraits: ["Warm Studio Alto", "Natural Inflection", "Zero Robotic Artifacts"],
    recommendedPitchSemitones: 0.0,
    recommendedSpeed: 1.0,
    warmthDb: 1.8,
    presenceDb: 2.3,
    spectralFingerprint: [-0.4, 1.8, 2.5, 1.6, 1.3, 2.3, 2.7, 2.4, 1.6, 1.0],
    similarityScore: 99,
    sampleTranscript:
      "Welcome back to the studio! <breath> Today we are exploring how acoustic modeling creates voices that sound genuinely human.",
  },
  {
    id: "clone-aryan-hi",
    name: "আরিয়ান খান (হিন্দি ও উর্দু স্টোরিটেলার)",
    category: "international",
    genderLabel: "পুরুষ · হিন্দি/উর্দু/বাংলা",
    isCustomClone: false,
    createdAt: "2026-10-27",
    baseVoice: "Charon",
    pitchRegister: "Velvet Baritone",
    estimatedPitchHz: 114,
    cadenceWpm: 132,
    stylePrompt:
      "Soulful, poetic and deeply expressive South Asian male narrator for Hindi, Urdu and Bengali storytelling, warm velvet baritone with emotional depth and natural pauses",
    summaryBn: "আবেগপূর্ণ ও ভরাট কণ্ঠ — হিন্দি, উর্দু শায়েরি কিংবা সিনেম্যাটিক বাংলা ভয়েসওভারের জন্য চমৎকার।",
    timbreTraits: ["Poetic Velvet Tone", "Emotional Depth", "Warm Low-Mid"],
    recommendedPitchSemitones: -0.6,
    recommendedSpeed: 0.95,
    warmthDb: 3.0,
    presenceDb: 1.9,
    spectralFingerprint: [3.1, 3.0, 1.9, 0.2, 1.0, 1.9, 2.3, 1.9, 1.1, 0.5],
    similarityScore: 99,
    sampleTranscript:
      "কাহানিয়াঁ সির্ফ লফ্‌যোঁ সে নাহি বন্তি, <breath> উনমে এক জজবাত অউর এক রূহ কি ज़रूरत হোতি হ্যায়।",
  },
];

export const GUIDED_CALIBRATION_SCRIPTS = [
  {
    id: "bn-natural",
    label: "বাংলা স্বাভাবিক স্ক্রিপ্ট (প্রস্তাবিত)",
    language: "Bengali",
    text: "নমস্কার, আমি আমার নিজস্ব ভয়েস প্রোফাইল তৈরি করার জন্য এই লাইনগুলো পড়ছি। প্রতিদিন নতুন কিছু শেখা এবং প্রযুক্তির সাহায্যে সৃজনশীল কাজ করা আমার খুব পছন্দের।",
  },
  {
    id: "bn-creator",
    label: "বাংলা কনটেন্ট ক্রিয়েটর স্ক্রিপ্ট",
    language: "Bengali",
    text: "স্বাগতম সবাইকে আজকের নতুন ভিডিওতে! আপনারা কি জানেন এখন মাত্র দশ সেকেন্ডের অডিও দিয়েই নিজের কণ্ঠের হুবহু ক্লোন তৈরি করা সম্ভব? চলুন দেখে নেওয়া যাক!",
  },
  {
    id: "en-studio",
    label: "English Studio Calibration",
    language: "English",
    text: "Hello everyone, I am recording my natural speaking voice in this studio session so the acoustic model can capture my exact tone, cadence, and vocal warmth.",
  },
];
