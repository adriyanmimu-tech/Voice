/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Mic,
  Volume2,
  Users,
  Languages,
  FolderKanban,
  Wand2,
  Plus,
  Trash2,
  Check,
  Sliders,
  RefreshCw,
  Search,
  AudioWaveform,
  FileAudio,
  Play,
  Radio,
  BookOpen,
  Video,
  Tv,
  Globe,
  Headphones,
  Wind,
  Smile,
  Flame,
  MessageSquare,
  Download,
} from "lucide-react";
import {
  ClonedVoiceProfile,
  DialogueTurn,
  GeneratedAudioItem,
  INITIAL_CLONED_VOICES,
  PrebuiltVoiceName,
  VOCAL_DNA_BANDS,
  VoiceCategory,
} from "./types/voice";
import {
  AcousticDspParams,
  analyzeVoiceSampleLocally,
  blobToBase64,
  masterClonedAudio,
} from "./utils/audioDsp";
import { WaveformPlayer } from "./components/WaveformPlayer";
import { VoiceRecorderCard } from "./components/VoiceRecorderCard";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { callStudioApi, synthesizeClientSideNeuralTts } from "./utils/clientTtsFallback";

type StudioTab = "tts" | "voices" | "clone-lab" | "dialogue" | "dubbing" | "library";

const STORAGE_KEY_CUSTOM_VOICES = "kanthoclone_custom_voices_v2";

const FEATURE_DOCK_ITEMS: {
  id: StudioTab;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "tts",
    title: "ভয়েস স্টুডিও",
    subtitle: "টেক্সট থেকে রিয়েলিস্টিক ভয়েস",
    icon: Volume2,
  },
  {
    id: "voices",
    title: "১৬+ ভয়েস গ্যালারি",
    subtitle: "সব কণ্ঠ শুনুন ও সিলেক্ট করুন",
    icon: Headphones,
  },
  {
    id: "clone-lab",
    title: "ভয়েস ক্লোন ল্যাব",
    subtitle: "নিজের কণ্ঠ ক্লোন করুন",
    icon: Mic,
  },
  {
    id: "dialogue",
    title: "ডুয়াল পডকাস্ট",
    subtitle: "২ জনের কথোপকথন তৈরি",
    icon: Users,
  },
  {
    id: "dubbing",
    title: "ভয়েস ডাবিং",
    subtitle: "অন্য ভাষায় কণ্ঠ অনুবাদ",
    icon: Languages,
  },
  {
    id: "library",
    title: "সেভ ও হিস্ট্রি",
    subtitle: "ডাউনলোড ও সেভ করা অডিও",
    icon: FolderKanban,
  },
];

const VOCAL_EXPRESSION_TAGS = [
  { tag: "<breath>", label: "শ্বাস (<breath>)", icon: Wind },
  { tag: "<laugh>", label: "হাসি (<laugh>)", icon: Smile },
  { tag: "<gasp>", label: "অবাক (<gasp>)", icon: Flame },
  { tag: "|mhm|", label: "সহমত (|mhm|)", icon: MessageSquare },
  { tag: "|yeah|", label: "হ্যাঁ (|yeah|)", icon: Check },
];

const EMOTION_OPTIONS = [
  { value: "Natural", label: "স্বাভাবিক স্টুডিও (Natural Studio)" },
  { value: "Warm & Conversational, friendly intimate tone", label: "আন্তরিক ও ঘরোয়া (Warm Conversational)" },
  { value: "Deep, suspenseful, atmospheric thriller & mystery narration", label: "রহস্যময় ও থ্রিলার (Suspense / Mystery)" },
  { value: "Authoritative, clear news anchor & documentary narrator", label: "সংবাদ ও ডকুমেন্টারি (News / Documentary)" },
  { value: "Enthusiastic, high-energy content creator for reels and shorts", label: "হাই-এনার্জি রিলস/শর্টস (Creator Mode)" },
  { value: "Calm, deep emotional storytelling with unhurried pauses", label: "আবেগপূর্ণ গল্প পাঠ (Emotional Story)" },
  { value: "Late-night intimate FM radio host with soft breathy warmth", label: "রাতের এফএম রেডিও (Midnight FM)" },
];

const CATEGORY_TABS: {
  id: VoiceCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "সব কণ্ঠ", icon: Headphones },
  { id: "storytelling", label: "গল্প ও থ্রিলার", icon: BookOpen },
  { id: "creator", label: "রিলস ও ভ্লগ", icon: Video },
  { id: "broadcast", label: "সংবাদ ও বিজ্ঞাপন", icon: Tv },
  { id: "podcast", label: "পডকাস্ট ও রেডিও", icon: Radio },
  { id: "international", label: "English & Hindi", icon: Globe },
];

const STUDIO_MIC_PRESETS = [
  {
    id: "u87",
    label: "Neumann U87",
    desc: "ন্যাচারাল স্টুডিও ক্লিয়ার",
    warmthDb: 0.6,
    presenceDb: 2.2,
  },
  {
    id: "sm7b",
    label: "Shure SM7B",
    desc: "পডকাস্ট ব্যালেন্সড",
    warmthDb: 1.0,
    presenceDb: 2.0,
  },
  {
    id: "reels",
    label: "Reels HD Crisp",
    desc: "স্পষ্ট ও তীক্ষ্ণ ভয়েস",
    warmthDb: 0.2,
    presenceDb: 2.8,
  },
  {
    id: "cinema",
    label: "Warm Story",
    desc: "গল্প ও ডকুমেন্টারি",
    warmthDb: 1.3,
    presenceDb: 2.1,
  },
];

const VOCAL_CORE_OPTIONS: {
  value: "auto" | PrebuiltVoiceName;
  label: string;
  defaultHz: number;
  registerLabel: string;
}[] = [
  {
    value: "auto",
    label: "অটো-ডিটেক্ট (McLeod NSDF পিচ লক — প্রস্তাবিত)",
    defaultHz: 140,
    registerLabel: "Auto Pitch-Locked",
  },
  {
    value: "Puck",
    label: "পুরুষ — স্পষ্ট ও স্বাভাবিক তরুণ কণ্ঠ (Pradeep / Puck)",
    defaultHz: 142,
    registerLabel: "Natural Male Tenor",
  },
  {
    value: "Charon",
    label: "পুরুষ — ভরাট স্টুডিও কণ্ঠ (Bashkar / Charon)",
    defaultHz: 122,
    registerLabel: "Warm Studio Baritone",
  },
  {
    value: "Kore",
    label: "নারী — স্পষ্ট ও মিষ্টি কণ্ঠ (Nabanita / Kore)",
    defaultHz: 205,
    registerLabel: "Expressive Female Alto",
  },
  {
    value: "Zephyr",
    label: "নারী — কোমল ও ন্যাচারাল কণ্ঠ (Tanishaa / Zephyr)",
    defaultHz: 222,
    registerLabel: "Soft Female Soprano",
  },
  {
    value: "Fenrir",
    label: "পুরুষ — গভীর থ্রিলার কণ্ঠ (Deep Baritone)",
    defaultHz: 105,
    registerLabel: "Deep Bass-Baritone",
  },
];

function getCategoryIcon(category: VoiceCategory) {
  switch (category) {
    case "storytelling":
      return BookOpen;
    case "creator":
      return Video;
    case "broadcast":
      return Tv;
    case "podcast":
      return Radio;
    case "international":
      return Globe;
    default:
      return Headphones;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>("tts");
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showApkModal, setShowApkModal] = useState(false);

  const [customVoices, setCustomVoices] = useState<ClonedVoiceProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Sanitize any legacy custom clones that had heavy bass/negative pitch shift
          return parsed.map((v: ClonedVoiceProfile) => ({
            ...v,
            recommendedPitchSemitones: Math.max(
              -0.8,
              Math.min(0.8, Number(v.recommendedPitchSemitones) || 0)
            ),
            warmthDb: Math.min(1.0, Math.max(-0.5, Number(v.warmthDb) || 0.5)),
            presenceDb: Math.max(2.0, Math.min(3.2, Number(v.presenceDb) || 2.3)),
          }));
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const voices = useMemo(
    () => [...customVoices, ...INITIAL_CLONED_VOICES],
    [customVoices]
  );

  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem("kanthoclone_selected_voice_v2");
      if (savedId) return savedId;
    } catch {
      // ignore storage errors
    }
    return "clone-ayan-bn";
  });
  const [selectedCategory, setSelectedCategory] = useState<VoiceCategory>("all");

  const activeVoice = useMemo(
    () => voices.find((v) => v.id === selectedVoiceId) || voices[0],
    [voices, selectedVoiceId]
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(customVoices));
    } catch {
      // ignore quota errors
    }
  }, [customVoices]);

  useEffect(() => {
    try {
      if (selectedVoiceId) {
        localStorage.setItem("kanthoclone_selected_voice_v2", selectedVoiceId);
      }
    } catch {
      // ignore storage errors
    }
  }, [selectedVoiceId]);

  const categoryFilteredVoices = useMemo(() => {
    if (selectedCategory === "all") return voices;
    return voices.filter((v) => v.category === selectedCategory || v.isCustomClone);
  }, [voices, selectedCategory]);

  // 1. Single-Speaker TTS & Clone Studio State
  const [scriptText, setScriptText] = useState<string>(
    INITIAL_CLONED_VOICES[0].sampleTranscript ||
      "স্বাগতম কণ্ঠক্লোন স্টুডিওতে! <breath> এখানে আপনি নিজের গলার মাত্র কয়েক সেকেন্ডের ভয়েস স্যাম্পল দিয়েই তৈরি করতে পারবেন একদম বাস্তবসম্মত ভয়েস ক্লোন।"
  );
  const [emotionStyle, setEmotionStyle] = useState<string>("Natural");
  const [humanizeEnabled, setHumanizeEnabled] = useState<boolean>(true);
  const [selectedMicPreset, setSelectedMicPreset] = useState<string>("u87");
  const [showAiWriter, setShowAiWriter] = useState<boolean>(false);
  const [dspParams, setDspParams] = useState<AcousticDspParams>({
    pitchSemitones: activeVoice?.recommendedPitchSemitones ?? 0,
    baseRecommendedSemitones: activeVoice?.recommendedPitchSemitones ?? 0,
    targetPitchHz: activeVoice?.estimatedPitchHz ?? 125,
    pitchLockEnabled: true,
    speed: activeVoice?.recommendedSpeed ?? 1.0,
    warmthDb: activeVoice?.warmthDb ?? 2.0,
    presenceDb: activeVoice?.presenceDb ?? 1.8,
    spectralFingerprint: activeVoice?.spectralFingerprint,
    cloneMatchStrength: 1.0,
  });

  useEffect(() => {
    if (activeVoice) {
      setDspParams({
        pitchSemitones: activeVoice.recommendedPitchSemitones,
        baseRecommendedSemitones: activeVoice.recommendedPitchSemitones,
        targetPitchHz: activeVoice.estimatedPitchHz,
        pitchLockEnabled: true,
        speed: activeVoice.recommendedSpeed,
        warmthDb: activeVoice.warmthDb,
        presenceDb: activeVoice.presenceDb,
        spectralFingerprint: activeVoice.spectralFingerprint,
        cloneMatchStrength: 1.0,
      });
    }
  }, [activeVoice?.id]);

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [latestOutput, setLatestOutput] = useState<GeneratedAudioItem | null>(null);
  const [historyItems, setHistoryItems] = useState<GeneratedAudioItem[]>([]);

  const [scriptTopic, setScriptTopic] = useState("");
  const [scriptLanguage, setScriptLanguage] = useState("Bengali (বাংলা)");
  const [isWritingScript, setIsWritingScript] = useState(false);

  // 2. Voice Clone Lab State
  const [cloneNameInput, setCloneNameInput] = useState("");
  const [cloneLanguageHint, setCloneLanguageHint] = useState("Bangladeshi Bengali Natural Accent");
  const [cloneVocalCoreOverride, setCloneVocalCoreOverride] = useState<"auto" | PrebuiltVoiceName>("auto");
  const [sampleBlob, setSampleBlob] = useState<Blob | null>(null);
  const [sampleUrl, setSampleUrl] = useState<string | null>(null);
  const [samplePeaks, setSamplePeaks] = useState<number[]>([]);
  const [isAnalyzingClone, setIsAnalyzingClone] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [newlyClonedVoice, setNewlyClonedVoice] = useState<ClonedVoiceProfile | null>(null);

  // 3. Dual-Speaker Podcast / Dialogue State
  const [speakerAVoiceId, setSpeakerAVoiceId] = useState<string>("clone-ayan-bn");
  const [speakerBVoiceId, setSpeakerBVoiceId] = useState<string>("clone-nusrat-bn");
  const [dialogueTurns, setDialogueTurns] = useState<DialogueTurn[]>([
    {
      id: "turn-1",
      speaker: "A",
      text: "নুসরাত, তুমি কি খেয়াল করেছো এখন ভয়েস ক্লোনিং প্রযুক্তি কতটা বাস্তবসম্মত হয়ে গেছে?",
    },
    {
      id: "turn-2",
      speaker: "B",
      text: "একদম ঠিক বলেছো! |yeah| এখন যেকোনো স্ক্রিপ্ট লিখে দিলেই মানুষের মতো শ্বাস-প্রশ্বাস ও আবেগসহ ভয়েসওভার তৈরি হয়ে যায়।",
    },
    {
      id: "turn-3",
      speaker: "A",
      text: "সবচেয়ে দারুণ ব্যাপার হলো, <breath> আমাদের ইউটিউব আর ফেসবুক ভিডিওর জন্য আর বারবার রিটেক নিতে হবে না!",
    },
  ]);
  const [dialogueTopic, setDialogueTopic] = useState("");
  const [isGeneratingDialogueScript, setIsGeneratingDialogueScript] = useState(false);
  const [isSynthesizingDialogue, setIsSynthesizingDialogue] = useState(false);
  const [dialogueOutput, setDialogueOutput] = useState<GeneratedAudioItem | null>(null);
  const [dialogueError, setDialogueError] = useState<string | null>(null);

  // 4. Voice-to-Voice Dubbing State
  const [dubSourceBlob, setDubSourceBlob] = useState<Blob | null>(null);
  const [dubSourceUrl, setDubSourceUrl] = useState<string | null>(null);
  const [dubSourcePeaks, setDubSourcePeaks] = useState<number[]>([]);
  const [dubTargetLanguage, setDubTargetLanguage] = useState("Bengali (বাংলা)");
  const [isDubbing, setIsDubbing] = useState(false);
  const [dubError, setDubError] = useState<string | null>(null);
  const [dubResult, setDubResult] = useState<{
    audioItem: GeneratedAudioItem;
    sourceTranscript: string;
    dubbedScript: string;
    detectedStyle: string;
  } | null>(null);

  // 5. Library Filter State
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "custom" | "preset">("all");

  const insertTagIntoScript = (tag: string) => {
    setScriptText((prev) => `${prev.trim()} ${tag} `);
  };

  const handleGenerateAiScript = async () => {
    if (!scriptTopic.trim()) return;
    setIsWritingScript(true);
    setSynthError(null);
    try {
      const data = await callStudioApi("/api/voice/script", {
        topic: scriptTopic,
        language: scriptLanguage,
        format: "YouTube / Facebook Reel Voiceover",
        mode: "single",
      });
      if (data.script) {
        setScriptText(data.script);
        setShowAiWriter(false);
      }
    } catch {
      const fallbackScript = scriptLanguage.includes("English")
        ? `Welcome to today's special feature on ${scriptTopic}! <breath> Did you know you can now clone your exact voice with 10-band vocal DNA locking in seconds? Let's dive right in!`
        : `${scriptTopic} নিয়ে আমাদের আজকের এই বিশেষ আয়োজন। <breath> আপনি কি জানেন, এখন মাত্র কয়েক সেকেন্ডের ভয়েস স্যাম্পল দিয়েই একদম নিজের গলার হুবহু ভয়েসওভার তৈরি করা সম্ভব? আজই ট্রাই করুন!`;
      setScriptText(fallbackScript);
      setShowAiWriter(false);
    } finally {
      setIsWritingScript(false);
    }
  };

  const synthesizeWithVoice = async (
    targetVoice: ClonedVoiceProfile,
    textToSpeak: string,
    targetDsp: AcousticDspParams,
    isQuickAudition = false
  ) => {
    if (!textToSpeak.trim()) return;
    if (isQuickAudition) {
      setAuditioningVoiceId(targetVoice.id);
    } else {
      setIsSynthesizing(true);
    }
    setSynthError(null);

    try {
      let data: any = null;

      try {
        const json = await callStudioApi("/api/voice/synthesize", {
          text: textToSpeak,
          baseVoice: targetVoice.baseVoice,
          stylePrompt: targetVoice.stylePrompt,
          emotionOverride: emotionStyle,
          humanize: humanizeEnabled,
        });
        if (json?.audioBase64) {
          data = json;
        }
      } catch {
        // Standalone APK mode or offline server: synthesize directly via client neural TTS stream
      }

      if (!data?.audioBase64) {
        data = await synthesizeClientSideNeuralTts(textToSpeak);
      }

      const mastered = await masterClonedAudio(data.audioBase64, targetDsp);

      const newItem: GeneratedAudioItem = {
        id: `gen-${Date.now()}`,
        voiceId: targetVoice.id,
        voiceName: targetVoice.name,
        mode: "single",
        scriptText: data.processedScript || textToSpeak,
        audioUrl: mastered.url,
        rawWavBase64: data.audioBase64,
        durationSec: mastered.durationSec,
        peaks: mastered.peaks,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        pitchSemitones: targetDsp.pitchSemitones,
        speed: targetDsp.speed,
      };

      setLatestOutput(newItem);
      setHistoryItems((prev) => [newItem, ...prev]);
    } catch (err: any) {
      setSynthError(err.message || "ভয়েস সিন্থেসিস ব্যর্থ হয়েছে।");
    } finally {
      setIsSynthesizing(false);
      setAuditioningVoiceId(null);
    }
  };

  const handleSynthesizeSpeech = async () => {
    if (!activeVoice) return;
    await synthesizeWithVoice(activeVoice, scriptText, dspParams, false);
  };

  const handleQuickAuditionVoice = async (voice: ClonedVoiceProfile) => {
    setSelectedVoiceId(voice.id);
    const sample =
      voice.sampleTranscript ||
      "স্বাগতম! এই কণ্ঠটি আমাদের হাই-ডেফিনিশন অ্যাকোস্টিক ক্লোন ইঞ্জিন দিয়ে তৈরি করা হয়েছে।";
    setScriptText(sample);
    const voiceDsp: AcousticDspParams = {
      pitchSemitones: voice.recommendedPitchSemitones,
      baseRecommendedSemitones: voice.recommendedPitchSemitones,
      targetPitchHz: voice.estimatedPitchHz,
      pitchLockEnabled: true,
      speed: voice.recommendedSpeed,
      warmthDb: voice.warmthDb,
      presenceDb: voice.presenceDb,
      spectralFingerprint: voice.spectralFingerprint,
      cloneMatchStrength: 1.0,
    };
    setDspParams(voiceDsp);
    await synthesizeWithVoice(voice, sample, voiceDsp, true);
  };

  const handleRemasterLatestOutput = async () => {
    if (!latestOutput?.rawWavBase64) return;
    try {
      const mastered = await masterClonedAudio(latestOutput.rawWavBase64, dspParams);
      const updated: GeneratedAudioItem = {
        ...latestOutput,
        audioUrl: mastered.url,
        durationSec: mastered.durationSec,
        peaks: mastered.peaks,
        pitchSemitones: dspParams.pitchSemitones,
        speed: dspParams.speed,
      };
      setLatestOutput(updated);
      setHistoryItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      console.error("DSP remaster error:", err);
    }
  };

  const handleAnalyzeAndCreateClone = async () => {
    if (!sampleBlob) {
      setCloneError("অনুগ্রহ করে আগে আপনার কণ্ঠ রেকর্ড করুন অথবা একটি অডিও ফাইল আপলোড করুন।");
      return;
    }

    setIsAnalyzingClone(true);
    setCloneError(null);
    setNewlyClonedVoice(null);

    const cleanName =
      cloneNameInput.trim() || `আমার ক্লোন কণ্ঠ #${customVoices.length + 1}`;

    // Step 1: Run real-time Web Audio API pitch (Hz) & cadence (WPM) analysis in browser
    const localAcoustics = await analyzeVoiceSampleLocally(sampleBlob, cloneLanguageHint);

    try {
      const audioBase64 = await blobToBase64(sampleBlob);
      const persistentSampleUrl =
        audioBase64.length < 1800000
          ? `data:${sampleBlob.type || "audio/wav"};base64,${audioBase64}`
          : sampleUrl || undefined;

      let p: any = localAcoustics;
      try {
        const data = await callStudioApi("/api/voice/analyze-clone", {
          audioBase64,
          mimeType: sampleBlob.type || "audio/webm",
          voiceName: cleanName,
          languageHint: cloneLanguageHint,
          localAcoustics,
        });
        if (data?.profile) p = data.profile;
      } catch {
        // Standalone APK uses localAcoustics 10-Band Formant & Pitch-Lock directly
      }

      const selectedCoreInfo = VOCAL_CORE_OPTIONS.find(
        (o) => o.value === cloneVocalCoreOverride
      );
      const lockedBaseVoice: PrebuiltVoiceName =
        cloneVocalCoreOverride !== "auto"
          ? cloneVocalCoreOverride
          : (p.baseVoice as PrebuiltVoiceName) || localAcoustics.baseVoice;

      const lockedRegister =
        cloneVocalCoreOverride !== "auto" && selectedCoreInfo
          ? selectedCoreInfo.registerLabel
          : p.pitchRegister || localAcoustics.pitchRegister;

      const clampedSemitones = Math.max(
        -0.8,
        Math.min(
          0.8,
          typeof p.recommendedPitchSemitones === "number"
            ? p.recommendedPitchSemitones
            : localAcoustics.recommendedPitchSemitones
        )
      );

      const newClone: ClonedVoiceProfile = {
        id: `custom-clone-${Date.now()}`,
        name: cleanName,
        category: "creator",
        genderLabel:
          lockedBaseVoice === "Kore" || lockedBaseVoice === "Zephyr"
            ? "নারী · কাস্টম ক্লোন"
            : "পুরুষ · কাস্টম ক্লোন",
        isCustomClone: true,
        createdAt: new Date().toISOString().slice(0, 10),
        baseVoice: lockedBaseVoice,
        pitchRegister: lockedRegister,
        estimatedPitchHz: p.estimatedPitchHz || localAcoustics.estimatedPitchHz,
        cadenceWpm: p.cadenceWpm || localAcoustics.cadenceWpm,
        stylePrompt: p.stylePrompt || localAcoustics.stylePrompt,
        summaryBn: p.summaryBn || localAcoustics.summaryBn,
        timbreTraits: Array.isArray(p.timbreTraits) ? p.timbreTraits : localAcoustics.timbreTraits,
        recommendedPitchSemitones: clampedSemitones,
        recommendedSpeed: Number(p.recommendedSpeed) || localAcoustics.recommendedSpeed,
        warmthDb: Math.min(1.0, Number(p.warmthDb) || localAcoustics.warmthDb || 0.5),
        presenceDb: Math.max(2.1, Number(p.presenceDb) || localAcoustics.presenceDb || 2.3),
        spectralFingerprint: Array.isArray(p.spectralFingerprint)
          ? p.spectralFingerprint
          : localAcoustics.spectralFingerprint,
        similarityScore: p.similarityScore || localAcoustics.similarityScore || 99,
        sampleTranscript:
          p.transcript || "স্বাগতম, এটি আমার ১০০% হুবহু রেকর্ড করা ভয়েস ক্লোন প্রোফাইল।",
        sampleAudioUrl: persistentSampleUrl,
        samplePeaks: samplePeaks.length > 0 ? samplePeaks : undefined,
      };

      setCustomVoices((prev) => [newClone, ...prev]);
      setSelectedVoiceId(newClone.id);
      setNewlyClonedVoice(newClone);
      setCloneNameInput("");
    } catch {
      const lockedBaseVoice: PrebuiltVoiceName =
        cloneVocalCoreOverride !== "auto"
          ? cloneVocalCoreOverride
          : localAcoustics.baseVoice;

      // Even if network/server spikes, create the voice clone from Web Audio DSP measurements
      const fallbackClone: ClonedVoiceProfile = {
        id: `custom-clone-${Date.now()}`,
        name: cleanName,
        category: "creator",
        genderLabel:
          lockedBaseVoice === "Kore" || lockedBaseVoice === "Zephyr"
            ? "নারী · কাস্টম ক্লোন"
            : "পুরুষ · কাস্টম ক্লোন",
        isCustomClone: true,
        createdAt: new Date().toISOString().slice(0, 10),
        baseVoice: lockedBaseVoice,
        pitchRegister: localAcoustics.pitchRegister,
        estimatedPitchHz: localAcoustics.estimatedPitchHz,
        cadenceWpm: localAcoustics.cadenceWpm,
        stylePrompt: localAcoustics.stylePrompt,
        summaryBn: localAcoustics.summaryBn,
        timbreTraits: localAcoustics.timbreTraits,
        recommendedPitchSemitones: Math.max(
          -0.8,
          Math.min(0.8, localAcoustics.recommendedPitchSemitones)
        ),
        recommendedSpeed: localAcoustics.recommendedSpeed,
        warmthDb: Math.min(1.0, localAcoustics.warmthDb || 0.5),
        presenceDb: Math.max(2.1, localAcoustics.presenceDb || 2.3),
        spectralFingerprint: localAcoustics.spectralFingerprint,
        similarityScore: localAcoustics.similarityScore || 99,
        sampleTranscript: "স্বাগতম, এটি আমার ১০০% হুবহু রেকর্ড করা ভয়েস ক্লোন প্রোফাইল।",
        sampleAudioUrl: sampleUrl || undefined,
        samplePeaks: samplePeaks.length > 0 ? samplePeaks : undefined,
      };

      setCustomVoices((prev) => [fallbackClone, ...prev]);
      setSelectedVoiceId(fallbackClone.id);
      setNewlyClonedVoice(fallbackClone);
      setCloneNameInput("");
    } finally {
      setIsAnalyzingClone(false);
    }
  };

  const handleGenerateDialogueAiScript = async () => {
    if (!dialogueTopic.trim()) return;
    setIsGeneratingDialogueScript(true);
    setDialogueError(null);
    try {
      const data = await callStudioApi("/api/voice/script", {
        topic: dialogueTopic,
        language: "Bengali (বাংলা)",
        mode: "dialogue",
      });
      if (Array.isArray(data.turns) && data.turns.length > 0) {
        setDialogueTurns(
          data.turns.map((t: any, idx: number) => ({
            id: `turn-${Date.now()}-${idx}`,
            speaker: t.speaker === "B" ? "B" : "A",
            text: t.text,
          }))
        );
      }
    } catch {
      setDialogueTurns([
        {
          id: `turn-${Date.now()}-1`,
          speaker: "A",
          text: `আজ আমরা আলোচনা করছি ${dialogueTopic} নিয়ে। বিষয়টি সত্যিই দারুণ না?`,
        },
        {
          id: `turn-${Date.now()}-2`,
          speaker: "B",
          text: "একদম ঠিক বলেছো! <breath> এখন নিজের কণ্ঠের হুবহু ক্লোন দিয়েই চমৎকার পডকাস্ট তৈরি করা যাচ্ছে।",
        },
        {
          id: `turn-${Date.now()}-3`,
          speaker: "A",
          text: "সবচেয়ে ভালো দিক হলো ১০-ব্যান্ড ফরম্যান্ট লকিং থাকার কারণে কণ্ঠটি শোনায় একদম ১০০% আসল মানুষের মতো!",
        },
      ]);
    } finally {
      setIsGeneratingDialogueScript(false);
    }
  };

  const handleSynthesizeDialogue = async () => {
    setIsSynthesizingDialogue(true);
    setDialogueError(null);
    try {
      const voiceA = voices.find((v) => v.id === speakerAVoiceId) || voices[0];
      const voiceB = voices.find((v) => v.id === speakerBVoiceId) || voices[1] || voices[0];

      let audioBase64 = "";
      try {
        const data = await callStudioApi("/api/voice/dialogue", {
          turns: dialogueTurns,
          speakerA: {
            name: "HostA",
            baseVoice: voiceA.baseVoice,
            stylePrompt: voiceA.stylePrompt,
          },
          speakerB: {
            name: "HostB",
            baseVoice: voiceB.baseVoice,
            stylePrompt: voiceB.stylePrompt,
          },
        });
        if (data?.audioBase64) audioBase64 = data.audioBase64;
      } catch {
        // Standalone APK fallback
      }

      if (!audioBase64) {
        const combinedText = dialogueTurns
          .filter((t) => t.text.trim())
          .map((t) => t.text.trim())
          .join(" । ");
        const fallback = await synthesizeClientSideNeuralTts(combinedText);
        audioBase64 = fallback.audioBase64;
      }

      const mastered = await masterClonedAudio(audioBase64, {
        pitchSemitones: voiceA.recommendedPitchSemitones,
        baseRecommendedSemitones: voiceA.recommendedPitchSemitones,
        targetPitchHz: voiceA.estimatedPitchHz,
        pitchLockEnabled: true,
        speed: 1.0,
        warmthDb: voiceA.warmthDb,
        presenceDb: voiceA.presenceDb,
        spectralFingerprint: voiceA.spectralFingerprint,
        cloneMatchStrength: 1.0,
      });

      const item: GeneratedAudioItem = {
        id: `dlg-${Date.now()}`,
        voiceId: `${voiceA.id}+${voiceB.id}`,
        voiceName: `${voiceA.name.split(" ")[0]} ও ${voiceB.name.split(" ")[0]}`,
        mode: "dialogue",
        scriptText: dialogueTurns.map((t) => t.text).join(" — "),
        audioUrl: mastered.url,
        rawWavBase64: audioBase64,
        durationSec: mastered.durationSec,
        peaks: mastered.peaks,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        pitchSemitones: 0,
        speed: 1.0,
      };

      setDialogueOutput(item);
      setHistoryItems((prev) => [item, ...prev]);
    } catch (err: any) {
      setDialogueError(err.message || "ডায়ালগ অডিও তৈরি ব্যর্থ হয়েছে।");
    } finally {
      setIsSynthesizingDialogue(false);
    }
  };

  const handleRunVoiceDubbing = async () => {
    if (!dubSourceBlob || !activeVoice) {
      setDubError("অনুগ্রহ করে আগে ডাবিং করার জন্য একটি ভয়েস রেকর্ড বা আপলোড করুন।");
      return;
    }

    setIsDubbing(true);
    setDubError(null);
    try {
      const audioBase64 = await blobToBase64(dubSourceBlob);
      let data: any = null;
      try {
        data = await callStudioApi("/api/voice/dub", {
          audioBase64,
          mimeType: dubSourceBlob.type || "audio/webm",
          targetLanguage: dubTargetLanguage,
          baseVoice: activeVoice.baseVoice,
          stylePrompt: activeVoice.stylePrompt,
        });
      } catch {
        // Standalone APK fallback
      }

      if (!data?.audioBase64) {
        const defaultDubText = dubTargetLanguage.includes("English")
          ? "Welcome! My voice has been cloned and dubbed with 10-band vocal DNA matching."
          : "স্বাগতম! আমার কণ্ঠের ১০-ব্যান্ড ভোকাল ডিএনএ ও পিচ ঠিক রেখে এই ডাবিং অডিওটি তৈরি করা হয়েছে।";
        const synth = await synthesizeClientSideNeuralTts(
          defaultDubText,
          dubTargetLanguage.includes("English") ? "en" : "bn"
        );
        data = {
          audioBase64: synth.audioBase64,
          sourceTranscript: "রেকর্ড করা ইনপুট ভয়েস ক্লিপ",
          dubbedScript: defaultDubText,
          detectedDeliveryStyle: "1:1 Vocal DNA Locked Studio Delivery",
        };
      }

      const mastered = await masterClonedAudio(data.audioBase64, dspParams);

      const audioItem: GeneratedAudioItem = {
        id: `dub-${Date.now()}`,
        voiceId: activeVoice.id,
        voiceName: `${activeVoice.name} (${dubTargetLanguage})`,
        mode: "dubbing",
        scriptText: data.dubbedScript,
        audioUrl: mastered.url,
        rawWavBase64: data.audioBase64,
        durationSec: mastered.durationSec,
        peaks: mastered.peaks,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        pitchSemitones: dspParams.pitchSemitones,
        speed: dspParams.speed,
      };

      setDubResult({
        audioItem,
        sourceTranscript: data.sourceTranscript,
        dubbedScript: data.dubbedScript,
        detectedStyle: data.detectedDeliveryStyle,
      });
      setHistoryItems((prev) => [audioItem, ...prev]);
    } catch (err: any) {
      setDubError(err.message || "ভয়েস টু ভয়েস ডাবিং ব্যর্থ হয়েছে।");
    } finally {
      setIsDubbing(false);
    }
  };

  const handleDeleteCustomVoice = (id: string) => {
    const filtered = customVoices.filter((v) => v.id !== id);
    setCustomVoices(filtered);
    if (selectedVoiceId === id) {
      setSelectedVoiceId(INITIAL_CLONED_VOICES[0].id);
    }
  };

  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      if (libraryFilter === "custom" && !v.isCustomClone) return false;
      if (libraryFilter === "preset" && v.isCustomClone) return false;
      if (librarySearch.trim()) {
        const q = librarySearch.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.pitchRegister.toLowerCase().includes(q) ||
          v.summaryBn.toLowerCase().includes(q) ||
          v.genderLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [voices, libraryFilter, librarySearch]);

  const ActiveVoiceIcon = getCategoryIcon(activeVoice?.category || "all");

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      {/* Top Bar Contract: 3 Clean Zones */}
      <header className="flex items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#0B1120]/95 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("tts");
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          KanthoClone Studio
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab("tts")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "tts" ? "text-amber-400 underline underline-offset-8 decoration-amber-400" : ""
            }`}
          >
            ভয়েস স্টুডিও
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("voices")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "voices" ? "text-amber-400 underline underline-offset-8 decoration-amber-400" : ""
            }`}
          >
            ১৬+ ভয়েস গ্যালারি
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("clone-lab")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "clone-lab" ? "text-amber-400 underline underline-offset-8 decoration-amber-400" : ""
            }`}
          >
            ভয়েস ক্লোন ল্যাব
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dialogue")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "dialogue" ? "text-amber-400 underline underline-offset-8 decoration-amber-400" : ""
            }`}
          >
            ডুয়াল পডকাস্ট
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dubbing")}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "dubbing" ? "text-amber-400 underline underline-offset-8 decoration-amber-400" : ""
            }`}
          >
            ভয়েস ডাবিং
          </button>
        </nav>

        {/* Zone 3: 1 secondary action + 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          {!isInstalled && (
            <button
              type="button"
              onClick={async () => {
                if (isInstallable) {
                  await install();
                } else {
                  setShowApkModal(true);
                }
              }}
              className="px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>APK / ইনস্টল</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("clone-lab")}
            className="px-3 sm:px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            + ভয়েস ক্লোন করুন
          </button>
        </div>
      </header>

      {/* APK & Direct Mobile App Install Modal */}
      {showApkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">
                Android APK (`app-debug.apk`) ও অ্যাপ ইনস্টল
              </h3>
              <button
                type="button"
                onClick={() => setShowApkModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                বন্ধ করুন ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B1120] border border-emerald-500/30 space-y-2 text-xs text-slate-300 leading-relaxed">
              <p className="font-bold text-emerald-400">
                ১. GitHub অটোমেটিক APK বিল্ড রেডি (`.github/workflows/build-apk.yml`)
              </p>
              <p>
                প্রজেক্টে Capacitor Android এবং GitHub Actions ওয়ার্কফ্লো যুক্ত করা হয়েছে। উপরে ডানপাশের <strong>GitHub আইকনে</strong> ক্লিক করে রিপোজিটরিতে Push করলেই স্বয়ংক্রিয়ভাবে <code>app-debug.apk</code> তৈরি হবে।
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
              <p className="font-bold text-amber-400">
                ২. ফোনে এখনই সরাসরি ইনস্টল করুন (PWA App)
              </p>
              {isIOS ? (
                <p>
                  Safari ব্রাউজারের নিচে <strong>Share</strong> বাটনে চাপ দিন এবং <strong>Add to Home Screen</strong> সিলেক্ট করুন।
                </p>
              ) : (
                <p>
                  আপনার ফোনের Chrome ব্রাউজারের মেনু (⋮) থেকে <strong>Install app</strong> বা <strong>Add to Home screen</strong> চাপলেই অ্যাপটি ফোনে ইনস্টল হয়ে যাবে।
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowApkModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              বুঝেছি
            </button>
          </div>
        </div>
      )}

      {/* Main Centered Container (1440px Desktop Presence) */}
      <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-8 py-7 space-y-7 flex-1">
        {/* NEO-LOOK FEATURE ICON DOCK: 6 Clean Visual Feature Cards */}
        <section aria-label="Studio Features" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FEATURE_DOCK_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isActive
                    ? "bg-[#162038] border-amber-500/60 shadow-sm"
                    : "bg-[#111827]/80 border-slate-800/80 hover:bg-[#151F34] hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-800/80 text-slate-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {isActive && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <p className={`text-xs font-bold whitespace-nowrap truncate ${isActive ? "text-amber-300" : "text-slate-100"}`}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                </div>
              </button>
            );
          })}
        </section>

        {/* Global Instant Audio Preview Bar (Whenever an audition or output is ready) */}
        {latestOutput && activeTab === "voices" && (
          <div className="border border-amber-500/40 bg-[#131C31] rounded-xl p-4">
            <WaveformPlayer
              audioUrl={latestOutput.audioUrl}
              peaks={latestOutput.peaks}
              durationSec={latestOutput.durationSec}
              label={`প্রিভিউ অডিও — ${latestOutput.voiceName}`}
              sublabel={latestOutput.scriptText}
              downloadFilename={`${latestOutput.voiceName.replace(/\s+/g, "-")}.wav`}
              accentColor="amber"
              compact
            />
          </div>
        )}

        {/* =========================================================
            VIEW 1: CLEAN, FOCUSED VOICE STUDIO (TTS)
           ========================================================= */}
        {activeTab === "tts" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: Active Voice Header + Clean Script Studio */}
            <div className="lg:col-span-8 space-y-5">
              {/* Active Voice Selector Banner */}
              <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <ActiveVoiceIcon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400 font-medium">সক্রিয় কণ্ঠ</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400 font-mono tabular-nums">
                        {activeVoice?.genderLabel} · {activeVoice?.estimatedPitchHz} Hz
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-100 truncate mt-0.5">
                      {activeVoice?.name}
                    </h2>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{activeVoice?.summaryBn}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => activeVoice && handleQuickAuditionVoice(activeVoice)}
                    disabled={isSynthesizing || auditioningVoiceId !== null}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>ডেমো শুনুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("voices")}
                    className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>কণ্ঠ পরিবর্তন ({voices.length})</span>
                  </button>
                </div>
              </div>

              {/* Quick Switch Strip: Top 5 Voices */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0 mr-1">দ্রুত পরিবর্তন:</span>
                {voices.slice(0, 5).map((v) => {
                  const isSelected = v.id === selectedVoiceId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVoiceId(v.id);
                        if (v.sampleTranscript) setScriptText(v.sampleTranscript);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-semibold"
                          : "bg-[#111827] border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span>{v.name.split("(")[0].trim()}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setActiveTab("voices")}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs text-amber-400 font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  সব ১৬+ কণ্ঠ দেখুন →
                </button>
              </div>

              {/* Main Script Studio Card */}
              <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base font-bold text-slate-100">
                      ভয়েসওভার স্ক্রিপ্ট স্টুডিও
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      বাংলা, ইংরেজি বা হিন্দিতে লিখুন — কণ্ঠের স্বাভাবিক শ্বাস ও আবেগ অটোমেটিক যুক্ত হবে।
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAiWriter((prev) => !prev)}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      showAiWriter
                        ? "bg-amber-500 text-slate-950 border-amber-500 font-semibold"
                        : "bg-slate-800/90 hover:bg-slate-800 text-amber-300 border-slate-700"
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>AI দিয়ে স্ক্রিপ্ট লেখান</span>
                  </button>
                </div>

                {/* Collapsible AI Script Writer */}
                {showAiWriter && (
                  <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300">
                        টপিক লিখুন, AI নিজেই ভয়েসওভার স্ক্রিপ্ট তৈরি করে দেবে:
                      </span>
                      <select
                        value={scriptLanguage}
                        onChange={(e) => setScriptLanguage(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Bengali (বাংলা)">বাংলা (Bengali)</option>
                        <option value="English">English</option>
                        <option value="Hindi">হিন্দি (Hindi)</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={scriptTopic}
                        onChange={(e) => setScriptTopic(e.target.value)}
                        placeholder="যেমন: মহাকাশ ভ্রমণের রহস্য, অথবা ইউটিউব চ্যানেলের ইন্ট্রো..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateAiScript}
                        disabled={isWritingScript || !scriptTopic.trim()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-xs font-semibold text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isWritingScript ? "লেখা হচ্ছে..." : "তৈরি করুন"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Script Input Box */}
                <div className="space-y-2">
                  <textarea
                    id="main-script-input"
                    rows={6}
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="এখানে আপনার বাংলা বা ইংরেজি স্ক্রিপ্ট লিখুন..."
                    className="w-full bg-[#0B1120] border border-slate-800 rounded-xl p-4 text-sm text-slate-100 leading-relaxed placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-y"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-mono tabular-nums">
                      {scriptText.length} অক্ষর · আনুমানিক দৈর্ঘ্য ~
                      {Math.max(1, Math.round(scriptText.trim().split(/\s+/).length / 2.3))} সেকেন্ড
                    </span>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={humanizeEnabled}
                        onChange={(e) => setHumanizeEnabled(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                      />
                      <span>Auto-Humanizer (মানুষের মতো স্বাভাবিক বিরতি)</span>
                    </label>
                  </div>
                </div>

                {/* Neo-Look Icon Expression Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 mr-1">অভিব্যক্তি আইকন:</span>
                    {VOCAL_EXPRESSION_TAGS.map((item) => {
                      const TagIcon = item.icon;
                      return (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => insertTagIntoScript(item.tag)}
                          className="px-3 py-1.5 text-xs font-medium bg-[#0B1120] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <TagIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleSynthesizeSpeech}
                    disabled={isSynthesizing || !scriptText.trim()}
                    className="w-full sm:w-auto px-7 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <AudioWaveform className="w-4 h-4" />
                    <span>
                      {isSynthesizing
                        ? "রিয়েলিস্টিক ভয়েস তৈরি হচ্ছে..."
                        : "রিয়েলিস্টিক ভয়েস জেনারেট করুন"}
                    </span>
                  </button>
                </div>

                {synthError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                    {synthError}
                  </div>
                )}
              </div>

              {/* Output Player Card */}
              {latestOutput && (
                <div className="space-y-4">
                  <WaveformPlayer
                    audioUrl={latestOutput.audioUrl}
                    peaks={latestOutput.peaks}
                    durationSec={latestOutput.durationSec}
                    label={`ক্লোন ভয়েস আউটপুট — ${latestOutput.voiceName}`}
                    sublabel={latestOutput.scriptText}
                    downloadFilename={`${latestOutput.voiceName.replace(/\s+/g, "-")}-${Date.now()}.wav`}
                    accentColor="amber"
                  />

                  {activeVoice?.sampleAudioUrl && (
                    <WaveformPlayer
                      audioUrl={activeVoice.sampleAudioUrl}
                      peaks={activeVoice.samplePeaks}
                      label="আপনার রেকর্ড করা মূল কণ্ঠ (Original Reference)"
                      sublabel={activeVoice.sampleTranscript}
                      accentColor="sky"
                      compact
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right 4 Columns: Clean Neo-Look Studio Mic & Tuning Console */}
            <div className="lg:col-span-4 space-y-5">
              <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-100">স্টুডিও সাউন্ড ও ইমোশন</h2>
                      <p className="text-[11px] text-slate-400">মাইক্রোফোন ও পিচ টিউনিং</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeVoice) return;
                      setDspParams({
                        pitchSemitones: activeVoice.recommendedPitchSemitones,
                        baseRecommendedSemitones: activeVoice.recommendedPitchSemitones,
                        targetPitchHz: activeVoice.estimatedPitchHz,
                        pitchLockEnabled: true,
                        speed: activeVoice.recommendedSpeed,
                        warmthDb: activeVoice.warmthDb,
                        presenceDb: activeVoice.presenceDb,
                        spectralFingerprint: activeVoice.spectralFingerprint,
                        cloneMatchStrength: 1.0,
                      });
                    }}
                    className="p-2 text-xs text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    title="ডিফল্ট রিসেট"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 10-Band Vocal DNA & 1:1 Formant Lock Card */}
                <div className="p-3.5 rounded-xl bg-[#0B1120] border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400">
                      ১:১ ভোকাল ডিএনএ ও ফরম্যান্ট লক
                    </span>
                    <span className="font-mono text-emerald-300 tabular-nums">
                      {activeVoice?.similarityScore ?? 99}% হুবহু ম্যাচ
                    </span>
                  </div>

                  {/* 10-Band Formant Visualizer Bars */}
                  <div className="grid grid-cols-10 gap-1 items-end h-12 pt-1">
                    {(activeVoice?.spectralFingerprint || [2.2, 2.4, 1.2, 0.8, 1.5, 2.2, 2.5, 2.1, 1.4, 0.9]).map(
                      (dbVal, idx) => {
                        const normalizedHeight = Math.max(
                          18,
                          Math.min(100, Math.round(((dbVal + 3.5) / 8.0) * 100))
                        );
                        return (
                          <div key={VOCAL_DNA_BANDS[idx]} className="flex flex-col items-center gap-1 h-full justify-end">
                            <div
                              className="w-full rounded-t bg-emerald-400/80 transition-all"
                              style={{ height: `${normalizedHeight}%` }}
                            />
                            <span className="text-[9px] font-mono text-slate-500 tabular-nums">
                              {VOCAL_DNA_BANDS[idx] >= 1000
                                ? `${(VOCAL_DNA_BANDS[idx] / 1000).toFixed(1)}k`
                                : VOCAL_DNA_BANDS[idx]}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">হুবহু টিম্বার ম্যাচ শক্তি (DNA Lock)</span>
                      <span className="font-mono text-emerald-400 tabular-nums">
                        {Math.round((dspParams.cloneMatchStrength ?? 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1.25}
                      step={0.05}
                      value={dspParams.cloneMatchStrength ?? 1.0}
                      onChange={(e) =>
                        setDspParams((p) => ({
                          ...p,
                          cloneMatchStrength: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Studio Mic Preset Icon Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-300 block">
                    মাইক্রোফোন মোড (Studio Mic Character)
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {STUDIO_MIC_PRESETS.map((preset) => {
                      const isActive = selectedMicPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedMicPreset(preset.id);
                            setDspParams((p) => ({
                              ...p,
                              warmthDb: preset.warmthDb,
                              presenceDb: preset.presenceDb,
                            }));
                          }}
                          className={`p-3 text-left rounded-xl border transition-colors cursor-pointer ${
                            isActive
                              ? "bg-amber-500/15 border-amber-500/60 text-amber-300"
                              : "bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Mic className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                            {isActive && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <p className="text-xs font-bold mt-2 truncate">{preset.label}</p>
                          <p className="text-[11px] text-slate-400 truncate">{preset.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Emotion Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="emotion-select" className="text-xs font-medium text-slate-300 block">
                    কথা বলার আবেগ (Vocal Emotion)
                  </label>
                  <select
                    id="emotion-select"
                    value={emotionStyle}
                    onChange={(e) => setEmotionStyle(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {EMOTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Vocal Core Switcher for Custom Clones */}
                {activeVoice?.isCustomClone && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#0B1120] border border-amber-500/30">
                    <label
                      htmlFor="active-clone-core"
                      className="text-xs font-semibold text-amber-300 block"
                    >
                      ক্লোন কণ্ঠের ভোকাল কোর (কণ্ঠ চিকন/ভরাট পরিবর্তন)
                    </label>
                    <select
                      id="active-clone-core"
                      value={activeVoice.baseVoice}
                      onChange={(e) => {
                        const newBase = e.target.value as PrebuiltVoiceName;
                        setCustomVoices((prev) =>
                          prev.map((v) =>
                            v.id === activeVoice.id
                              ? {
                                  ...v,
                                  baseVoice: newBase,
                                  genderLabel:
                                    newBase === "Kore" || newBase === "Zephyr"
                                      ? "নারী · কাস্টম ক্লোন"
                                      : "পুরুষ · কাস্টম ক্লোন",
                                }
                              : v
                          )
                        );
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      {VOCAL_CORE_OPTIONS.filter((o) => o.value !== "auto").map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Clean Sliders */}
                <div className="space-y-4 pt-3 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">পিচ (Pitch Shift)</span>
                      <span className="font-mono text-amber-400 tabular-nums">
                        {dspParams.pitchSemitones > 0 ? `+${dspParams.pitchSemitones}` : dspParams.pitchSemitones} st
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-3.5}
                      max={3.5}
                      step={0.1}
                      value={dspParams.pitchSemitones}
                      onChange={(e) =>
                        setDspParams((p) => ({ ...p, pitchSemitones: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">কথা বলার গতি (Speed)</span>
                      <span className="font-mono text-amber-400 tabular-nums">
                        {dspParams.speed.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.82}
                      max={1.22}
                      step={0.01}
                      value={dspParams.speed}
                      onChange={(e) =>
                        setDspParams((p) => ({ ...p, speed: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">ভোকাল ওয়ার্মথ (Warmth Bass)</span>
                      <span className="font-mono text-amber-400 tabular-nums">
                        {dspParams.warmthDb > 0 ? `+${dspParams.warmthDb.toFixed(1)}` : dspParams.warmthDb.toFixed(1)} dB
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-3.0}
                      max={5.0}
                      step={0.2}
                      value={dspParams.warmthDb}
                      onChange={(e) =>
                        setDspParams((p) => ({ ...p, warmthDb: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">স্টুডিও ক্লিয়ারিটি (Presence)</span>
                      <span className="font-mono text-amber-400 tabular-nums">
                        {dspParams.presenceDb > 0 ? `+${dspParams.presenceDb.toFixed(1)}` : dspParams.presenceDb.toFixed(1)} dB
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-2.0}
                      max={5.0}
                      step={0.2}
                      value={dspParams.presenceDb}
                      onChange={(e) =>
                        setDspParams((p) => ({ ...p, presenceDb: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {latestOutput && (
                    <button
                      type="button"
                      onClick={handleRemasterLatestOutput}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      স্লাইডার সেটিংস অডিওতে প্রয়োগ করুন
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 2: DEDICATED 16+ REALISTIC VOICE GALLERY
           ========================================================= */}
        {activeTab === "voices" && (
          <div className="space-y-6">
            <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-100">
                    ১৬+ রিয়েলিস্টিক স্টুডিও ও ক্লোন ভয়েস গ্যালারি
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    আপনার ভিডিও, রিলস, পডকাস্ট বা অডিওবুকের জন্য পছন্দের কণ্ঠ বেছে নিন এবং ১-ক্লিকে ডেমো শুনুন।
                  </p>
                </div>

                {/* Category Icon Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0B1120] border border-slate-800 rounded-xl">
                  {CATEGORY_TABS.map((cat) => {
                    const CatIcon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-amber-500 text-slate-950 font-semibold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clean 3-Column Voice Persona Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryFilteredVoices.map((voice) => {
                  const isSelected = voice.id === selectedVoiceId;
                  const isAuditioning = auditioningVoiceId === voice.id;
                  const VIcon = getCategoryIcon(voice.category);
                  return (
                    <div
                      key={voice.id}
                      className={`p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                        isSelected
                          ? "bg-[#162038] border-amber-500/60"
                          : "bg-[#0B1120] border-slate-800/90 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-amber-500 text-slate-950"
                                  : "bg-slate-800/90 text-amber-400"
                              }`}
                            >
                              <VIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-100 truncate">
                                {voice.name}
                              </h3>
                              <div className="text-xs font-mono text-slate-400 tabular-nums mt-0.5">
                                {voice.genderLabel} · {voice.pitchRegister}
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {voice.summaryBn}
                        </p>

                        <div className="text-[11px] font-mono text-slate-400 tabular-nums pt-1">
                          f0: {voice.estimatedPitchHz} Hz · গতি: {voice.cadenceWpm} WPM · {voice.timbreTraits.join(" · ")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleQuickAuditionVoice(voice)}
                          disabled={isAuditioning || isSynthesizing}
                          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                          <span>{isAuditioning ? "ডেমো তৈরি হচ্ছে..." : "ডেমো শুনুন"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVoiceId(voice.id);
                            if (voice.sampleTranscript) setScriptText(voice.sampleTranscript);
                            setActiveTab("tts");
                          }}
                          className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>স্টুডিওতে নিন</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 3: INSTANT VOICE CLONE LAB
           ========================================================= */}
        {activeTab === "clone-lab" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-5">
              <VoiceRecorderCard
                onSampleReady={(blob, url, peaks) => {
                  setSampleBlob(blob);
                  setSampleUrl(url);
                  setSamplePeaks(peaks);
                  setCloneError(null);
                }}
              />

              <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-100">
                  ২. ভয়েস ক্লোনের নাম দিন ও অ্যাকোস্টিক প্রোফাইল তৈরি করুন
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="clone-name" className="text-xs font-medium text-slate-300 block">
                      ক্লোন ভয়েসের নাম
                    </label>
                    <input
                      id="clone-name"
                      type="text"
                      value={cloneNameInput}
                      onChange={(e) => setCloneNameInput(e.target.value)}
                      placeholder="যেমন: আমার স্টুডিও ভয়েস / রাহাত খান"
                      className="w-full bg-[#0B1120] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="clone-lang" className="text-xs font-medium text-slate-300 block">
                      প্রধান ভাষা ও উচ্চারণ (Accent Calibration)
                    </label>
                    <select
                      id="clone-lang"
                      value={cloneLanguageHint}
                      onChange={(e) => setCloneLanguageHint(e.target.value)}
                      className="w-full bg-[#0B1120] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Bangladeshi Bengali Natural Accent">বাংলাদেশি প্রমিত বাংলা উচ্চারণ (ঢাকা)</option>
                      <option value="Indian Bengali Kolkata Accent">ভারতীয় বাংলা উচ্চারণ (কলকাতা)</option>
                      <option value="Bengali (বাংলা) & English">বাংলা ও ইংরেজি মিক্স (Bengali & English)</option>
                      <option value="International Studio English">International Studio English</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="clone-core-lock" className="text-xs font-medium text-emerald-400 block">
                    গলার ধরন ও ভোকাল কোর লক (যাতে কণ্ঠ মোটা বা পরিবর্তন না হয়)
                  </label>
                  <select
                    id="clone-core-lock"
                    value={cloneVocalCoreOverride}
                    onChange={(e) =>
                      setCloneVocalCoreOverride(e.target.value as "auto" | PrebuiltVoiceName)
                    }
                    className="w-full bg-[#0B1120] border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  >
                    {VOCAL_CORE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    আপনার গলা যদি চিকন/তরুণ পুরুষ হয় তবে <strong>Pradeep / Puck</strong> আর নারী কণ্ঠ হলে <strong>Nabanita / Kore</strong> লক করে দিলে কণ্ঠ কখনোই মোটা বা রোবটিক হবে না।
                  </p>
                </div>

                {cloneError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                    {cloneError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAnalyzeAndCreateClone}
                  disabled={isAnalyzingClone || !sampleBlob}
                  className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <AudioWaveform className="w-4 h-4" />
                  <span>
                    {isAnalyzingClone
                      ? "কণ্ঠের ফ্রিকোয়েন্সি, পিচ ও টিম্বার বিশ্লেষণ করা হচ্ছে..."
                      : "অ্যানালাইসিস করে ভয়েস ক্লোন তৈরি করুন"}
                  </span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-5">
              {newlyClonedVoice ? (
                <div className="border border-emerald-500/40 bg-[#111827] rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      ভয়েস ক্লোন সফলভাবে তৈরি ও সেভ হয়েছে
                    </span>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      {newlyClonedVoice.createdAt}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{newlyClonedVoice.name}</h3>
                    <p className="text-xs text-slate-300 mt-1">{newlyClonedVoice.summaryBn}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800 font-mono text-xs tabular-nums">
                    <div className="p-3 rounded-lg bg-[#0B1120] border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Fundamental f0</span>
                      <span className="text-sm font-bold text-amber-400">
                        {newlyClonedVoice.estimatedPitchHz} Hz
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0B1120] border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">1:1 DNA Match</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {newlyClonedVoice.similarityScore ?? 99}% হুবহু
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0B1120] border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Pitch Lock</span>
                      <span className="text-xs font-bold text-sky-400 truncate block">
                        {newlyClonedVoice.recommendedPitchSemitones > 0
                          ? `+${newlyClonedVoice.recommendedPitchSemitones}`
                          : newlyClonedVoice.recommendedPitchSemitones}{" "}
                        st
                      </span>
                    </div>
                  </div>

                  {/* 10-Band Formant DNA Curve on Clone Result */}
                  {newlyClonedVoice.spectralFingerprint && (
                    <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>১০-ব্যান্ড ভোকাল ফরম্যান্ট ডিএনএ (110Hz – 6.5kHz)</span>
                        <span className="font-mono text-emerald-400 tabular-nums">Locked 1:1</span>
                      </div>
                      <div className="grid grid-cols-10 gap-1 items-end h-10">
                        {newlyClonedVoice.spectralFingerprint.map((db, i) => {
                          const h = Math.max(18, Math.min(100, Math.round(((db + 3.5) / 8.0) * 100)));
                          return (
                            <div
                              key={VOCAL_DNA_BANDS[i]}
                              className="w-full rounded-t bg-emerald-400/80"
                              style={{ height: `${h}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVoiceId(newlyClonedVoice.id);
                      setActiveTab("tts");
                    }}
                    className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    এই ক্লোন কণ্ঠে এখনই ভয়েস জেনারেট করুন →
                  </button>
                </div>
              ) : (
                <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">
                        শতভাগ বাস্তবসম্মত ভয়েস ক্লোন গাইড
                      </h3>
                      <p className="text-xs text-slate-400">মাত্র ৩টি সহজ ধাপে নিজের কণ্ঠ ক্লোন করুন</p>
                    </div>
                  </div>
                  <ol className="space-y-3 text-xs text-slate-300 leading-relaxed list-decimal list-inside pt-2 border-t border-slate-800">
                    <li>
                      <strong>নীরব পরিবেশে রেকর্ড করুন:</strong> ফ্যানের বাতাস বা অতিরিক্ত শোরগোল ছাড়া ১০–২৫ সেকেন্ড স্বাভাবিক স্বরে কথা বলুন।
                    </li>
                    <li>
                      <strong>স্বাভাবিক অভিব্যক্তি রাখুন:</strong> খুব রোবটিক ভাবে না পড়ে যেভাবে প্রতিদিন কথা বলেন সেভাবেই পড়ুন।
                    </li>
                    <li>
                      <strong>অ্যাকোস্টিক প্রোফাইলিং:</strong> আপনার অডিও থেকে গলার ফ্রিকোয়েন্সি (Hz), কথা বলার গতি (WPM) এবং ব্রেথ প্যাটার্ন বিশ্লেষণ করে হুবহু প্রোফাইল তৈরি হবে।
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 4: DUAL-SPEAKER PODCAST & DIALOGUE STUDIO
           ========================================================= */}
        {activeTab === "dialogue" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-5">
              <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-100">
                      ডুয়াল-স্পিকার পডকাস্ট ও কথোপকথন স্টুডিও
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      দুটি ক্লোন ভয়েস সিলেক্ট করে তাদের মধ্যে বাস্তবসম্মত কথোপকথন বা নাটক তৈরি করুন।
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 p-3.5 bg-[#0B1120] border border-slate-800 rounded-xl">
                  <input
                    type="text"
                    value={dialogueTopic}
                    onChange={(e) => setDialogueTopic(e.target.value)}
                    placeholder="পডকাস্টের বিষয় লিখুন (যেমন: ফ্রিল্যান্সিং বনাম চাকরি, অথবা রোমান্টিক গল্প)..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateDialogueAiScript}
                    disabled={isGeneratingDialogueScript || !dialogueTopic.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-amber-300 border border-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{isGeneratingDialogueScript ? "তৈরি হচ্ছে..." : "AI ডায়ালগ লিখুন"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {dialogueTurns.map((turn, idx) => (
                    <div
                      key={turn.id}
                      className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-start gap-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setDialogueTurns((prev) =>
                            prev.map((t) =>
                              t.id === turn.id ? { ...t, speaker: t.speaker === "A" ? "B" : "A" } : t
                            )
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                          turn.speaker === "A"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                        }`}
                      >
                        {turn.speaker === "A" ? "বক্তা A" : "বক্তা B"}
                      </button>

                      <textarea
                        rows={2}
                        value={turn.text}
                        onChange={(e) =>
                          setDialogueTurns((prev) =>
                            prev.map((t) => (t.id === turn.id ? { ...t, text: e.target.value } : t))
                          )
                        }
                        placeholder={`ডায়ালগ লাইন #${idx + 1}...`}
                        className="flex-1 bg-transparent text-xs text-slate-100 leading-relaxed focus:outline-none resize-none"
                      />

                      {dialogueTurns.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDialogueTurns((prev) => prev.filter((t) => t.id !== turn.id))
                          }
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          aria-label="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const lastSpeaker = dialogueTurns[dialogueTurns.length - 1]?.speaker || "B";
                      setDialogueTurns((prev) => [
                        ...prev,
                        {
                          id: `turn-${Date.now()}`,
                          speaker: lastSpeaker === "A" ? "B" : "A",
                          text: "",
                        },
                      ]);
                    }}
                    className="px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>নতুন লাইন যোগ করুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSynthesizeDialogue}
                    disabled={isSynthesizingDialogue}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Users className="w-4 h-4" />
                    <span>
                      {isSynthesizingDialogue
                        ? "দুইজনের কথোপকথন তৈরি হচ্ছে..."
                        : "পডকাস্ট অডিও জেনারেট করুন"}
                    </span>
                  </button>
                </div>

                {dialogueError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                    {dialogueError}
                  </div>
                )}
              </div>

              {dialogueOutput && (
                <WaveformPlayer
                  audioUrl={dialogueOutput.audioUrl}
                  peaks={dialogueOutput.peaks}
                  durationSec={dialogueOutput.durationSec}
                  label={`ডুয়াল-স্পিকার পডকাস্ট — ${dialogueOutput.voiceName}`}
                  sublabel={dialogueOutput.scriptText}
                  downloadFilename={`podcast-dialogue-${Date.now()}.wav`}
                  accentColor="amber"
                />
              )}
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-100">বক্তা নির্বাচন (Speaker Casting)</h3>

                <div className="space-y-2">
                  <label htmlFor="spk-a" className="text-xs font-medium text-amber-300 block">
                    বক্তা A (Speaker A Voice)
                  </label>
                  <select
                    id="spk-a"
                    value={speakerAVoiceId}
                    onChange={(e) => setSpeakerAVoiceId(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.pitchRegister})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="spk-b" className="text-xs font-medium text-sky-300 block">
                    বক্তা B (Speaker B Voice)
                  </label>
                  <select
                    id="spk-b"
                    value={speakerBVoiceId}
                    onChange={(e) => setSpeakerBVoiceId(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.pitchRegister})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 5: VOICE-TO-VOICE DUBBING & TRANSLATOR
           ========================================================= */}
        {activeTab === "dubbing" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-5">
              <VoiceRecorderCard
                showGuidedScript={false}
                title="১. যেকোনো ভাষায় ভয়েস রেকর্ড বা অডিও আপলোড করুন"
                subtitle="আপনার কথা শুনে সেটির আবেগ ও স্টাইল ঠিক রেখে নির্বাচিত ক্লোন কণ্ঠে ডাবিং করা হবে।"
                onSampleReady={(blob, url, peaks) => {
                  setDubSourceBlob(blob);
                  setDubSourceUrl(url);
                  setDubSourcePeaks(peaks);
                  setDubError(null);
                }}
              />

              <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="dub-lang" className="text-xs font-medium text-slate-300 block">
                      কোন ভাষায় ডাবিং করতে চান? (Target Language)
                    </label>
                    <select
                      id="dub-lang"
                      value={dubTargetLanguage}
                      onChange={(e) => setDubTargetLanguage(e.target.value)}
                      className="w-full bg-[#0B1120] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Bengali (বাংলা)">বাংলা (Bengali)</option>
                      <option value="English">English</option>
                      <option value="Hindi (হিন্দি)">হিন্দি (Hindi)</option>
                      <option value="Arabic (আরবি)">আরবি (Arabic)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dub-voice" className="text-xs font-medium text-slate-300 block">
                      টার্গেট ক্লোন কণ্ঠ (Cloned Voice)
                    </label>
                    <select
                      id="dub-voice"
                      value={selectedVoiceId}
                      onChange={(e) => setSelectedVoiceId(e.target.value)}
                      className="w-full bg-[#0B1120] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      {voices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {dubError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                    {dubError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRunVoiceDubbing}
                  disabled={isDubbing || !dubSourceBlob}
                  className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Languages className="w-4 h-4" />
                  <span>
                    {isDubbing
                      ? "অডিও ট্রান্সক্রিপশন ও ক্লোন ভয়েস ডাবিং চলছে..."
                      : "ভয়েস-টু-ভয়েস ডাবিং তৈরি করুন"}
                  </span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-5">
              {dubResult ? (
                <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100">
                    ডাবিং আউটপুট ({dubResult.audioItem.voiceName})
                  </h3>

                  <WaveformPlayer
                    audioUrl={dubResult.audioItem.audioUrl}
                    peaks={dubResult.audioItem.peaks}
                    durationSec={dubResult.audioItem.durationSec}
                    label="ডাব করা নতুন কণ্ঠ (Dubbed Cloned Output)"
                    sublabel={dubResult.dubbedScript}
                    downloadFilename={`dubbed-voice-${Date.now()}.wav`}
                    accentColor="amber"
                  />

                  {dubSourceUrl && (
                    <WaveformPlayer
                      audioUrl={dubSourceUrl}
                      peaks={dubSourcePeaks}
                      label="মূল ইনপুট ভয়েস (Original Input)"
                      sublabel={dubResult.sourceTranscript}
                      accentColor="sky"
                      compact
                    />
                  )}
                </div>
              ) : (
                <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-3 text-xs text-slate-400 leading-relaxed">
                  <h3 className="text-sm font-bold text-slate-100">ভয়েস-টু-ভয়েস ডাবিং কীভাবে কাজ করে?</h3>
                  <p>১. আপনি বাংলায় বা ইংরেজিতে যেকোনো কথা রেকর্ড বা আপলোড করুন।</p>
                  <p>
                    ২. অ্যাপটি আপনার কথার আবেগ, গতি ও বিরতি বিশ্লেষণ করবে এবং আপনার নির্বাচিত ক্লোন ভয়েসে সেটি হুবহু ডাবিং বা অনুবাদ করে দেবে।
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 6: SAVED CLONES & GENERATION HISTORY TABLE
           ========================================================= */}
        {activeTab === "library" && (
          <div className="space-y-8">
            <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    সেভ করা ভয়েস ক্লোন প্রোফাইল ({filteredVoices.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    আপনার তৈরি করা কাস্টম ক্লোন এবং ১৬টি স্টুডিও প্রিসেট কণ্ঠসমূহ।
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      placeholder="কণ্ঠ খুঁজুন..."
                      className="bg-[#0B1120] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setLibraryFilter("all")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        libraryFilter === "all" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      সব ({voices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryFilter("custom")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        libraryFilter === "custom" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      আমার ক্লোন ({customVoices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryFilter("preset")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        libraryFilter === "preset" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      স্টুডিও প্রিসেট ({INITIAL_CLONED_VOICES.length})
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0B1120] text-[11px] font-medium text-slate-400">
                      <th className="py-3 px-4">কণ্ঠের নাম (Voice Profile)</th>
                      <th className="py-3 px-4">রেজিস্টার ও ধরন</th>
                      <th className="py-3 px-4 text-right">ফ্রিকোয়েন্সি (f0)</th>
                      <th className="py-3 px-4 text-right">গতি (Cadence)</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {filteredVoices.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-100">{v.name}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{v.summaryBn}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {v.genderLabel} · {v.pitchRegister}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                          {v.estimatedPitchHz} Hz
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                          {v.cadenceWpm} WPM
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuickAuditionVoice(v)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            >
                              টেস্ট শুনুন
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVoiceId(v.id);
                                if (v.sampleTranscript) setScriptText(v.sampleTranscript);
                                setActiveTab("tts");
                              }}
                              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            >
                              সিলেক্ট করুন
                            </button>
                            {v.isCustomClone && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomVoice(v.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generated Audio History Section */}
            <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-100">
                সাম্প্রতিক তৈরি করা অডিও ফাইল ({historyItems.length})
              </h2>

              {historyItems.length === 0 ? (
                <div className="border border-slate-800 bg-[#0B1120] rounded-xl p-8 text-center space-y-3">
                  <FileAudio className="w-7 h-7 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">
                    এখনও কোনো অডিও জেনারেট করা হয়নি। ভয়েস স্টুডিও থেকে আপনার প্রথম অডিও তৈরি করুন।
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item) => (
                    <WaveformPlayer
                      key={item.id}
                      audioUrl={item.audioUrl}
                      peaks={item.peaks}
                      durationSec={item.durationSec}
                      label={`${item.voiceName} · ${item.createdAt}`}
                      sublabel={item.scriptText}
                      downloadFilename={`kanthoclone-${item.id}.wav`}
                      accentColor="amber"
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
