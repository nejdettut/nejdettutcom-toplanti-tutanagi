"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  NotebookPen,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioCapture } from "@/components/audio-capture";

type Kind = "resmi" | "proje" | "ekip" | "egitim" | "veli-okul" | "genel";
type Priority = "dusuk" | "orta" | "yuksek";

type Minutes = {
  title: string;
  date: string;
  attendees: string[];
  agenda: string[];
  discussion: { topic: string; summary: string }[];
  decisions: string[];
  actionItems: {
    task: string;
    owner: string;
    dueDate: string;
    priority: Priority;
  }[];
  openQuestions: string[];
  nextMeeting: string;
  signatureNote: string;
};

const KINDS: { value: Kind; label: string }[] = [
  { value: "resmi", label: "Resmi / kurumsal" },
  { value: "proje", label: "Proje toplantısı" },
  { value: "ekip", label: "Ekip / stand-up" },
  { value: "egitim", label: "Eğitim / atölye" },
  { value: "veli-okul", label: "Veli / okul toplantısı" },
  { value: "genel", label: "Genel" },
];

const EXAMPLE = `Bugün proje ekibi toplandı. Katılan: Ahmet (ürün), Ayşe (geliştirici), Mehmet (tasarım), Fatma (QA).

Konular:
- Q4 lansman tarihi: Ayşe geliştirme bitişinin 2 hafta gecikebileceğini söyledi. Ahmet pazarlama ekibiyle görüşerek tarihi kaydıracağını belirtti.
- Tasarım revizyonları: Mehmet ana sayfa mockup'ının v2'sini pazartesiye kadar hazırlayacak.
- QA planı: Fatma test senaryolarını hazırlıyor, kararlaştırıldı ki sprint sonu teslim edilecek.
- Bütçe: Hosting masrafı arttığı için yeni bir CDN sağlayıcı araştırılacak.

Karar: Lansman 2 hafta erteleniyor, yeni tarih 15 Aralık.
Karar: Haftalık stand-up Pazartesi 10:00'da yapılacak.

Açık sorular: Yeni CDN kim araştıracak? Mobil versiyon kapsamı belirsiz.

Gelecek toplantı: 15 Kasım Çarşamba 14:00.`;

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sky focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-sky dark:text-white";

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur transition hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900";

const CARD =
  "rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60";

const MUTED_TEXT = "text-slate-500 dark:text-slate-400";

const PRIORITY_STYLE: Record<Priority, string> = {
  dusuk: "border-slate-400/40 bg-slate-400/10 text-slate-700 dark:text-slate-300",
  orta: "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  yuksek: "border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-300",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  dusuk: "Düşük",
  orta: "Orta",
  yuksek: "Yüksek",
};

export function ToplantiTutanagiApp() {
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [attendees, setAttendees] = useState("");
  const [kind, setKind] = useState<Kind>("proje");
  const [rawNotes, setRawNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Minutes | null>(null);

  async function run() {
    if (meetingTitle.trim().length < 2) {
      setError("Toplantı başlığı boş bırakılamaz.");
      return;
    }
    if (rawNotes.trim().length < 50) {
      setError("Notlar en az 50 karakter olmalı.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTitle,
          meetingDate: meetingDate || undefined,
          attendees: attendees || undefined,
          kind,
          rawNotes,
        }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "Bilinmeyen hata.");
      else setResult(data as Minutes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ağ hatası.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadDocx() {
    if (!result) return;
    setExporting(true);
    setError(null);
    try {
      const r = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!r.ok) {
        setError("Word belgesi üretilemedi.");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = result.title
        .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ _-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .slice(0, 40) || "tutanak";
      a.download = `${slug}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İndirme hatası.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Input column */}
      <div className="space-y-4 lg:col-span-2">
        <div className={CARD}>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <NotebookPen className="size-4 text-brand-sky" />
              Toplantı bilgisi &amp; notlar
            </h2>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                Toplantı başlığı
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="örn: Q4 Lansman Toplantısı"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                  Tarih
                </label>
                <input
                  type="text"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  placeholder="08.11.2026 14:00"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                  Tür
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as Kind)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                Katılımcılar (opsiyonel)
              </label>
              <input
                type="text"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="virgülle: Ahmet, Ayşe, Mehmet…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <p className={cn("mt-1 text-[11px]", MUTED_TEXT)}>
                Boş bırakırsan yapay zekâ notlardan çıkarmaya çalışır.
              </p>
            </div>

            <div className="space-y-2">
              <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                Serbest notlar / transcript
              </label>
              <AudioCapture
                disabled={loading}
                onTranscript={(text) =>
                  setRawNotes((prev) => (prev ? `${prev}\n\n${text}` : text))
                }
              />
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Toplantı sırasında aldığın notları, yapıştır ya da yukarıdan ses kaydı/dosya yükleyerek otomatik yazdır."
                className="block h-56 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={run}
                disabled={loading || meetingTitle.length < 2 || rawNotes.length < 50}
                className={BTN_PRIMARY}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Tutanak üretiliyor…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Tutanağı üret
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRawNotes(EXAMPLE)}
                disabled={loading}
                className={BTN_OUTLINE}
              >
                Örnek doldur
              </button>
            </div>

            <p className={cn("text-[11px]", MUTED_TEXT)}>
              Saatte 15 tutanak sınırı · maks. 15.000 karakter not. Çıktı Word
              (.docx) olarak indirilir.
            </p>
          </div>
        </div>
      </div>

      {/* Output column */}
      <div className="space-y-4 lg:col-span-3">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {!result && !loading && !error ? (
          <div
            className={cn(
              CARD,
              "flex flex-col items-center gap-3 border-dashed py-14 text-center",
            )}
          >
            <NotebookPen className="size-10 text-brand-sky" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Toplantı notlarını yapıştır, tutanağı üret
            </h3>
            <p className={cn("max-w-sm text-sm", MUTED_TEXT)}>
              Katılımcılar, gündem, tartışılan maddeler, alınan kararlar, aksiyon
              maddeleri (sorumlu + tarih) ve açık sorular bu sütunda belirir.
              Word belgesi olarak indir.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div
            className={cn(
              CARD,
              "flex flex-col items-center gap-3 py-14 text-center",
            )}
          >
            <Loader2 className="size-10 animate-spin text-brand-sky" />
            <p className={cn("text-sm", MUTED_TEXT)}>
              Tutanak hazırlanıyor… 15-30 saniye.
            </p>
          </div>
        ) : null}

        {result ? (
          <>
            <div className={cn(CARD, "px-5 py-5")}>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                {result.date}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {result.title}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadDocx}
                  disabled={exporting}
                  className={BTN_PRIMARY}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Word hazırlanıyor…
                    </>
                  ) : (
                    <>
                      <Download className="size-3.5" />
                      Word (.docx) olarak indir
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={BTN_OUTLINE}
                >
                  <FileText className="size-3.5" />
                  Yazdır / PDF
                </button>
              </div>
            </div>

            {result.attendees.length > 0 ? (
              <Section title="Katılımcılar" icon={<Users className="size-4 text-brand-sky" />}>
                <div className="flex flex-wrap gap-1.5">
                  {result.attendees.map((a, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-brand-sky/40 bg-brand-sky/10 px-2.5 py-1 text-xs font-medium text-brand-sky"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="Gündem">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                {result.agenda.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </Section>

            <Section title="Tartışılan Maddeler">
              <ul className="space-y-3">
                {result.discussion.map((d, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {d.topic}
                    </p>
                    <p className={cn("mt-1 text-xs leading-relaxed", MUTED_TEXT)}>
                      {d.summary}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            {result.decisions.length > 0 ? (
              <Section
                title="Alınan Kararlar"
                icon={<CheckCircle2 className="size-4 text-emerald-500" />}
              >
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                  {result.decisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {result.actionItems.length > 0 ? (
              <Section title="Aksiyon Maddeleri">
                <ul className="space-y-2">
                  {result.actionItems.map((a, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {a.task}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            PRIORITY_STYLE[a.priority],
                          )}
                        >
                          {PRIORITY_LABEL[a.priority]}
                        </span>
                      </div>
                      <div className={cn("mt-1 flex flex-wrap gap-4 text-xs", MUTED_TEXT)}>
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" />
                          {a.owner}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {a.dueDate}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {result.openQuestions.length > 0 ? (
              <Section title="Açık Sorular">
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                  {result.openQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {result.nextMeeting ? (
              <Section title="Sonraki Toplantı">
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {result.nextMeeting}
                </p>
              </Section>
            ) : null}

            {result.signatureNote ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs italic text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                {result.signatureNote}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn(CARD, "px-5 py-5")}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}
