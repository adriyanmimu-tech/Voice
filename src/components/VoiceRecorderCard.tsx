import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, Trash2, ShieldCheck, Music, Volume2 } from "lucide-react";
import { GUIDED_CALIBRATION_SCRIPTS } from "../types/voice";
import {
  extractPeaksFromBlob,
  isolateVocalsAndRemoveNoise,
} from "../utils/audioDsp";
import { WaveformPlayer } from "./WaveformPlayer";

interface VoiceRecorderCardProps {
  onSampleReady: (
    blob: Blob | null,
    url: string | null,
    peaks: number[],
    durationSec: number
  ) => void;
  showGuidedScript?: boolean;
  title?: string;
  subtitle?: string;
}

export const VoiceRecorderCard: React.FC<VoiceRecorderCardProps> = ({
  onSampleReady,
  showGuidedScript = true,
  title = "১. আপনার কণ্ঠের স্যাম্পল দিন (Record বা Upload)",
  subtitle = "ব্যাকগ্রাউন্ডে গান বা নয়েজ থাকলেও সমস্যা নেই — অটোমেটিক শুধু মানুষের কণ্ঠ আলাদা (Vocal Isolate) করে ক্লোন করা হবে।",
}) => {
  const [selectedScriptId, setSelectedScriptId] = useState(
    GUIDED_CALIBRATION_SCRIPTS[0].id
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [rawAudioUrl, setRawAudioUrl] = useState<string | null>(null);
  const [rawAudioBlob, setRawAudioBlob] = useState<Blob | null>(null);
  const [rawPeaks, setRawPeaks] = useState<number[]>([]);

  const [cleanAudioUrl, setCleanAudioUrl] = useState<string | null>(null);
  const [cleanAudioBlob, setCleanAudioBlob] = useState<Blob | null>(null);
  const [cleanPeaks, setCleanPeaks] = useState<number[]>([]);

  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isIsolatingVocal, setIsIsolatingVocal] = useState(false);
  const [noiseRemovedPct, setNoiseRemovedPct] = useState<number>(0);
  const [hadStereoMusic, setHadStereoMusic] = useState<boolean>(false);
  const [useCleanVocal, setUseCleanVocal] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activeScript =
    GUIDED_CALIBRATION_SCRIPTS.find((s) => s.id === selectedScriptId) ||
    GUIDED_CALIBRATION_SCRIPTS[0];

  useEffect(() => {
    return () => {
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (animFrameRef.current) window.cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const processIncomingAudio = async (blob: Blob) => {
    setIsIsolatingVocal(true);
    const rawUrl = URL.createObjectURL(blob);
    setRawAudioBlob(blob);
    setRawAudioUrl(rawUrl);

    const rawStats = await extractPeaksFromBlob(blob, 56);
    setRawPeaks(rawStats.peaks);

    // Run Mid-Side Background Music Separator + Adaptive Noise Gate
    const isolated = await isolateVocalsAndRemoveNoise(blob);
    setCleanAudioBlob(isolated.cleanBlob);
    setCleanAudioUrl(isolated.cleanUrl);
    setCleanPeaks(isolated.peaks);
    setAudioDuration(isolated.durationSec);
    setNoiseRemovedPct(isolated.noiseReductionPct);
    setHadStereoMusic(isolated.hadStereoMusicRemoved);
    setUseCleanVocal(true);
    setIsIsolatingVocal(false);

    onSampleReady(
      isolated.cleanBlob,
      isolated.cleanUrl,
      isolated.peaks,
      isolated.durationSec
    );
  };

  const handleToggleMode = (cleanMode: boolean) => {
    setUseCleanVocal(cleanMode);
    if (cleanMode && cleanAudioBlob && cleanAudioUrl) {
      onSampleReady(cleanAudioBlob, cleanAudioUrl, cleanPeaks, audioDuration);
    } else if (!cleanMode && rawAudioBlob && rawAudioUrl) {
      onSampleReady(rawAudioBlob, rawAudioUrl, rawPeaks, audioDuration);
    }
  };

  const drawLiveSpectrum = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const gap = 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * 2] || 0;
        const normalized = Math.max(0.08, value / 255);
        const barHeight = normalized * (height - 8);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = value > 140 ? "#F59E0B" : "#38BDF8";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    render();
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stopAllStreams();
        await processIncomingAudio(blob);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      setTimeout(() => drawLiveSpectrum(analyser), 50);
    } catch {
      setErrorMsg(
        "মাইক্রোফোন পারমিশন পাওয়া যায়নি। ব্রাউজারে মাইক্রোফোন Allow করুন অথবা সরাসরি অডিও/গান ফাইল আপলোড করুন।"
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    await processIncomingAudio(file);
  };

  const handleClearSample = () => {
    setRawAudioUrl(null);
    setRawAudioBlob(null);
    setCleanAudioUrl(null);
    setCleanAudioBlob(null);
    setCleanPeaks([]);
    setRawPeaks([]);
    setAudioDuration(0);
    onSampleReady(null, null, [], 0);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-xs text-amber-400 font-mono tabular-nums flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-4 h-4" />
          <span>Vocal Isolator সক্রিয়</span>
        </div>
      </div>

      {showGuidedScript && (
        <div className="border border-slate-800 bg-[#0B1120] rounded-xl p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">
              রেকর্ডিংয়ের সময় নিচের স্ক্রিপ্টটি পড়তে পারেন:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {GUIDED_CALIBRATION_SCRIPTS.map((script) => (
                <button
                  key={script.id}
                  type="button"
                  onClick={() => setSelectedScriptId(script.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedScriptId === script.id
                      ? "bg-amber-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {script.language === "Bengali"
                    ? script.label.split(" ")[1]
                    : "English"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed select-all">
            “{activeScript.text}”
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/70 text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      {isIsolatingVocal && (
        <div className="p-4 rounded-xl bg-[#0B1120] border border-amber-500/40 text-xs text-amber-300 flex items-center justify-between">
          <span>
            অডিও থেকে ব্যাকগ্রাউন্ড মিউজিক ও নয়েজ আলাদা করে শুধু কণ্ঠ (Clean Vocal) বের করা হচ্ছে...
          </span>
          <span className="font-mono tabular-nums">DSP Isolating...</span>
        </div>
      )}

      {/* Recording / Upload Controls */}
      {!cleanAudioUrl && !isIsolatingVocal ? (
        <div className="space-y-3">
          {isRecording ? (
            <div className="border border-amber-500/40 bg-[#0B1120] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400">
                  মাইক্রোফোনে ভয়েস রেকর্ড হচ্ছে... (নয়েজ অটো রিমুভ হবে)
                </span>
                <span className="font-mono text-sm font-semibold text-amber-300 tabular-nums">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>
              <canvas
                ref={canvasRef}
                width={520}
                height={56}
                className="w-full h-14 bg-slate-900/80 rounded-lg border border-slate-800"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>রেকর্ডিং সম্পন্ন করুন</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startRecording}
                className="py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>মাইক্রোফোনে কণ্ঠ রেকর্ড করুন</span>
              </button>

              <label className="py-3.5 px-4 bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shrink-0">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>অডিও বা গান আপলোড (.mp3 / .wav)</span>
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      ) : (
        cleanAudioUrl && (
          <div className="space-y-3">
            {/* Vocal Isolation Status & Mode Switcher */}
            <div className="p-3.5 rounded-xl bg-[#0B1120] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    ভোকাল আইসোলেশন সম্পন্ন ({noiseRemovedPct}% নয়েজ ও মিউজিক রিমুভড)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {hadStereoMusic
                    ? "স্টেরিও মিউজিক/গান থেকে মিড-সাইড ফিল্টারিংয়ের মাধ্যমে শুধু মূল কণ্ঠ আলাদা করা হয়েছে।"
                    : "অ্যাডাপ্টিভ নয়েজ গেট ও ফর্ম্যান্ট ফিল্টার দিয়ে ব্যাকগ্রাউন্ড শোরগোল পরিষ্কার করা হয়েছে।"}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleToggleMode(true)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      useCleanVocal
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>শুধু ভয়েস (Clean)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMode(false)}
                    className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      !useCleanVocal
                        ? "bg-sky-500 text-slate-950 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Music className="w-3 h-3" />
                    <span>মূল অডিও (Raw)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClearSample}
                  className="p-2 text-slate-400 hover:text-red-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="মুছে নতুন স্যাম্পল দিন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <WaveformPlayer
              audioUrl={useCleanVocal ? cleanAudioUrl : rawAudioUrl || cleanAudioUrl}
              peaks={useCleanVocal ? cleanPeaks : rawPeaks}
              durationSec={audioDuration}
              label={
                useCleanVocal
                  ? "আলাদা করা পরিষ্কার কণ্ঠ (Isolated Clean Vocal — ক্লোনিংয়ের জন্য প্রস্তুত)"
                  : "আপলোড করা মূল আনকাট অডিও (Original Audio with Background)"
              }
              accentColor={useCleanVocal ? "amber" : "sky"}
              downloadFilename={
                useCleanVocal
                  ? "isolated-clean-vocal.wav"
                  : "original-raw-sample.wav"
              }
              compact
            />
          </div>
        )
      )}
    </div>
  );
};
