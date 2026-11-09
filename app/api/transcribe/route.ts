import "server-only";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB — Groq transcription limit.

const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/aac",
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  const limited = await rateLimit({
    action: "transkripsiyon",
    windowMs: 60 * 60 * 1000,
    max: 10,
  });
  if (!limited.ok) {
    return json(
      { error: "Saatte en fazla 10 ses dosyası yazıya dökebilirsin. Lütfen biraz sonra tekrar dene." },
      429,
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json({ error: "Transkripsiyon servisi geçici olarak kullanılamıyor." }, 503);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Geçersiz istek. Dosya 'audio' alanında multipart olarak gönderilmeli." }, 400);
  }

  const file = form.get("audio");
  if (!file || !(file instanceof Blob)) {
    return json({ error: "Ses dosyası bulunamadı." }, 400);
  }
  if (file.size === 0) {
    return json({ error: "Boş ses dosyası." }, 400);
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return json({ error: "Ses dosyası 25 MB'tan büyük olamaz." }, 413);
  }
  if (file.type && !ALLOWED_TYPES.has(file.type.toLowerCase())) {
    return json(
      { error: `Desteklenmeyen ses türü: ${file.type}. mp3, wav, m4a, webm, ogg veya flac kullan.` },
      415,
    );
  }

  const language = (form.get("language") as string | null) ?? "tr";

  const upstream = new FormData();
  upstream.set("file", file, (file as File).name || "recording.webm");
  upstream.set("model", "whisper-large-v3-turbo");
  upstream.set("response_format", "json");
  if (language) upstream.set("language", language);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[transcribe] groq upstream failed:", res.status, text.slice(0, 400));
      return json(
        {
          error: "Ses yazıya çevrilemedi. Dosyayı kontrol edip tekrar dene.",
          upstreamStatus: res.status,
        },
        502,
      );
    }
    const data = (await res.json()) as { text?: string };
    const transcript = (data.text ?? "").trim();
    if (!transcript) {
      return json({ error: "Ses dosyasından metin çıkarılamadı. Daha net bir kayıt dene." }, 422);
    }
    return json({ text: transcript });
  } catch (err) {
    console.error("[transcribe] fetch failed:", err);
    return json({ error: "Transkripsiyon servisine ulaşılamadı." }, 502);
  }
}
