import "server-only";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";
import { rateLimit } from "@/lib/rate-limit";
import {
  MEETING_KIND_LABELS,
  MinutesRequestSchema,
  MinutesSchema,
} from "@/lib/minutes-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const limited = await rateLimit({
    action: "tutanak",
    windowMs: 60 * 60 * 1000,
    max: 15,
  });
  if (!limited.ok) {
    return json(
      { error: "Saatte en fazla 15 tutanak üretebilirsin. Lütfen biraz sonra tekrar dene." },
      429,
    );
  }

  let body;
  try {
    body = MinutesRequestSchema.parse(await req.json());
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, 400);
  }

  const system = [
    "Sen profesyonel bir toplantı sekreter asistanısın.",
    `Toplantı türü: ${MEETING_KIND_LABELS[body.kind]}.`,
    "Kullanıcı sana toplantının serbest notlarını veya konuşma metnini (transcript) verir.",
    "Senin görevin: (1) katılımcıları metinden çıkar (eğer kullanıcı ayrıca verdiyse onunla birleştir), (2) 1-10 gündem maddesi oluştur, (3) her gündem için 1-3 cümlelik tartışma özeti yaz, (4) net alınan kararları listele, (5) her 'aksiyon maddesi' için SORUMLU (isim) + HEDEF TARİH + ÖNCELİK (düşük/orta/yüksek) belirt, (6) açık kalan soruları ayrıca listele, (7) bir sonraki toplantı için öneri yaz.",
    "Aksiyon maddelerinde sorumlu ismi metinden çıkar; metinde geçmiyorsa 'Belirlenecek' yaz. Hedef tarih için 'DD.MM.YYYY' formatı veya 'Belirsiz' kullan. Metinde 'X bu haftaya kadar yapsın' gibi görev varsa buradan türet.",
    "Dil resmi Türkçe, kısa cümleler. Metinde olmayan karar/aksiyon uydurma; emin değilsen 'openQuestions' listesine at.",
    "signatureNote sonunda 'Tutanak Yapay Zekâ destekli taslaktır; katılımcılarca onaylanmalıdır' tarzı bir not olsun.",
    body.meetingDate ? `Toplantı tarihi (kullanıcı girdi): ${body.meetingDate}.` : "Tarih metinden çıkar veya 'Belirtilmedi' yaz.",
    body.attendees ? `Kullanıcının verdiği ön katılımcı listesi: ${body.attendees}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `Toplantı başlığı: ${body.meetingTitle}\n\nSerbest notlar / transcript:\n\n${body.rawNotes}\n\nTümünü JSON şemasına uygun yapılandırılmış tutanak olarak döndür.`;

  try {
    const { object } = await generateObject({
      model: groq("openai/gpt-oss-120b"),
      schema: MinutesSchema,
      system,
      prompt,
      temperature: 0.3,
    });
    return json(object);
  } catch (err) {
    console.error("[tutanak] failed:", err);
    return json(
      { error: "Tutanak üretilemedi. Lütfen biraz sonra tekrar dene." },
      502,
    );
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
