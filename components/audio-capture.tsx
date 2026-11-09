"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Mic, Square, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm backdrop-blur transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900";

const BTN_DANGER =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

type Phase = "idle" | "recording" | "uploading";

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function AudioCapture({ onTranscript, disabled }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function uploadBlob(blob: Blob, filename: string) {
    setError(null);
    setPhase("uploading");
    try {
      const form = new FormData();
      form.set("audio", blob, filename);
      form.set("language", "tr");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };
      if (!res.ok || !data.text) {
        setError(data.error || "Ses yazıya çevrilemedi.");
        setPhase("idle");
        return;
      }
      onTranscript(data.text);
      setPhase("idle");
    } catch {
      setError("Transkripsiyon servisine ulaşılamadı.");
      setPhase("idle");
    }
  }

  async function startRecording() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Bu tarayıcı mikrofon erişimini desteklemiyor.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (blob.size === 0) {
          setError("Kayıt boş görünüyor. Mikrofon izni verildiğinden emin ol.");
          setPhase("idle");
          return;
        }
        const ext = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
        uploadBlob(blob, `recording.${ext}`);
      };
      recorderRef.current = rec;
      rec.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 500);
      setPhase("recording");
    } catch {
      setError("Mikrofon erişimi reddedildi veya kullanılamıyor.");
      setPhase("idle");
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state !== "inactive") rec.stop();
    recorderRef.current = null;
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size === 0) {
      setError("Boş dosya.");
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError("Dosya 25 MB'tan büyük olamaz.");
      return;
    }
    uploadBlob(file, file.name);
  }

  const busy = phase !== "idle" || disabled;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "recording" ? (
          <button type="button" onClick={stopRecording} className={BTN_DANGER}>
            <Square className="size-3.5 fill-current" /> Durdur · {fmtTime(elapsed)}
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={busy}
            className={BTN_OUTLINE}
          >
            <Mic className="size-3.5" /> Mikrofondan kaydet
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className={BTN_OUTLINE}
        >
          <Upload className="size-3.5" /> Ses dosyası yükle
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={onFileChosen}
        />
        {phase === "uploading" ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="size-3.5 animate-spin" /> Yazıya çevriliyor…
          </span>
        ) : null}
      </div>
      {error ? (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-700 dark:text-rose-300",
          )}
        >
          <AlertCircle className="mt-0.5 size-3 shrink-0" /> <span>{error}</span>
        </div>
      ) : null}
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Groq Whisper · maks. 25 MB · önerilen uzunluk 15 dk · saatte 10 çağrı.
      </p>
    </div>
  );
}
