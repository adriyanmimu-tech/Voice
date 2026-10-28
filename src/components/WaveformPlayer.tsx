import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Download, RotateCcw, Volume2, Subtitles, Share2 } from "lucide-react";
import { generateSrtSubtitles } from "../utils/studioStorage";

interface WaveformPlayerProps {
  audioUrl: string;
  peaks?: number[];
  durationSec?: number;
  label?: string;
  sublabel?: string;
  downloadFilename?: string;
  accentColor?: "amber" | "sky";
  compact?: boolean;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  peaks = [],
  durationSec = 0,
  label,
  sublabel,
  downloadFilename = "kanthoclone-voice.wav",
  accentColor = "amber",
  compact = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationSec || 0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (durationSec) setTotalDuration(durationSec);
  }, [audioUrl, durationSec]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => console.error("Playback error:", err));
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().catch(() => {});
  };

  const handleBarClick = (index: number, totalBars: number) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration) return;
    const targetTime = (index / totalBars) * totalDuration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleDownloadSrt = () => {
    if (!sublabel) return;
    const srtContent = generateSrtSubtitles(sublabel, totalDuration || durationSec || 5);
    if (!srtContent) return;
    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFilename.replace(/\.(wav|mp3)$/i, "") + ".srt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareAudio = async () => {
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const file = new File([blob], downloadFilename, { type: blob.type || "audio/wav" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: label || "KanthoClone Studio Audio",
          text: sublabel || "KanthoClone Studio দিয়ে তৈরি ভয়েসওভার",
          files: [file],
        });
        return;
      }
    } catch {
      // Fallback to direct download if Web Share API is not supported
    }
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return "00:00.0";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
  };

  const displayPeaks =
    peaks.length > 0
      ? peaks
      : Array.from({ length: 48 }, (_, i) => 0.2 + 0.55 * Math.abs(Math.sin(i * 0.42)));

  const progressRatio = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  return (
    <div className="border border-slate-800/90 bg-[#131C31] rounded-xl p-4 space-y-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (Number.isFinite(dur) && dur > 0) {
            setTotalDuration(dur);
          }
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />

      {label && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                accentColor === "amber"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-sky-500/15 text-sky-400"
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">{label}</p>
              {sublabel && <p className="text-xs text-slate-400 truncate mt-0.5">{sublabel}</p>}
            </div>
          </div>
          <div className="font-mono text-xs text-slate-300 tabular-nums shrink-0">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
            accentColor === "amber"
              ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
              : "bg-sky-500 hover:bg-sky-400 text-slate-950"
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Interactive Studio Bar Waveform */}
        <div
          className={`flex-1 min-w-[140px] flex items-center gap-[3px] ${
            compact ? "h-10" : "h-12"
          } px-3 bg-[#0B1120] border border-slate-800/80 rounded-lg overflow-hidden select-none`}
        >
          {displayPeaks.map((peak, idx) => {
            const barRatio = idx / displayPeaks.length;
            const isPlayed = barRatio <= progressRatio;
            const heightPct = Math.max(16, Math.round(peak * 90));
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleBarClick(idx, displayPeaks.length)}
                aria-label={`Seek to ${Math.round(barRatio * 100)}%`}
                className="flex-1 h-full flex items-center justify-center group cursor-pointer"
              >
                <span
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-sm transition-colors duration-100 ${
                    isPlayed
                      ? accentColor === "amber"
                        ? "bg-amber-400"
                        : "bg-sky-400"
                      : "bg-slate-700/80 group-hover:bg-slate-500"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {!label && (
          <div className="font-mono text-xs text-slate-300 tabular-nums shrink-0">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRestart}
            title="শুরু থেকে বাজান (Restart)"
            className="p-2.5 text-slate-400 hover:text-slate-100 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {sublabel && !compact && (
            <button
              type="button"
              onClick={handleDownloadSrt}
              title="CapCut / YouTube এর জন্য .SRT সাবটাইটেল ডাউনলোড"
              className="px-2.5 py-2.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>.SRT ক্যাপশন</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareAudio}
            title="শেয়ার করুন"
            className="p-2.5 text-slate-300 hover:text-amber-300 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <a
            href={audioUrl}
            download={downloadFilename}
            className="px-3 py-2.5 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>WAV</span>
          </a>
        </div>
      </div>
    </div>
  );
};
