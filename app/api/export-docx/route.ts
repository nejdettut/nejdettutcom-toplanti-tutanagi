import "server-only";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { MinutesSchema } from "@/lib/minutes-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

function para(text: string, opts: { bold?: boolean; italics?: boolean } = {}) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text })],
  });
}

function labeled(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value }),
    ],
  });
}

const PRIORITY_LABEL: Record<"dusuk" | "orta" | "yuksek", string> = {
  dusuk: "Düşük",
  orta: "Orta",
  yuksek: "Yüksek",
};

export async function POST(req: Request) {
  let minutes;
  try {
    minutes = MinutesSchema.parse(await req.json());
  } catch {
    return new Response("Geçersiz tutanak.", { status: 400 });
  }

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: minutes.title, bold: true })],
    }),
  );

  children.push(labeled("Tarih", minutes.date));

  if (minutes.attendees.length > 0) {
    children.push(heading("Katılımcılar"));
    minutes.attendees.forEach((a) => children.push(bullet(a)));
  }

  children.push(heading("Gündem"));
  minutes.agenda.forEach((a, i) => children.push(bullet(`${i + 1}. ${a}`)));

  children.push(heading("Tartışılan Maddeler"));
  minutes.discussion.forEach((d) => {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [new TextRun({ text: d.topic, bold: true })],
      }),
    );
    children.push(para(d.summary));
  });

  if (minutes.decisions.length > 0) {
    children.push(heading("Alınan Kararlar"));
    minutes.decisions.forEach((d) => children.push(bullet(d)));
  }

  if (minutes.actionItems.length > 0) {
    children.push(heading("Aksiyon Maddeleri"));
    minutes.actionItems.forEach((a) => {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [new TextRun({ text: a.task, bold: true })],
        }),
      );
      children.push(labeled("Sorumlu", a.owner));
      children.push(labeled("Hedef tarih", a.dueDate));
      children.push(labeled("Öncelik", PRIORITY_LABEL[a.priority]));
    });
  }

  if (minutes.openQuestions.length > 0) {
    children.push(heading("Açık Sorular"));
    minutes.openQuestions.forEach((q) => children.push(bullet(q)));
  }

  if (minutes.nextMeeting) {
    children.push(heading("Sonraki Toplantı"));
    children.push(para(minutes.nextMeeting));
  }

  if (minutes.signatureNote) {
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 60 },
        children: [new TextRun({ text: minutes.signatureNote, italics: true })],
      }),
    );
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const bytes = new Uint8Array(buffer);
  const slug = minutes.title
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40)
    .toLowerCase() || "tutanak";

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${slug}.docx"`,
    },
  });
}
