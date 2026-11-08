import { z } from "zod";

export const MeetingKind = z.enum([
  "resmi",
  "proje",
  "ekip",
  "egitim",
  "veli-okul",
  "genel",
]);

export const MEETING_KIND_LABELS: Record<z.infer<typeof MeetingKind>, string> = {
  resmi: "Resmi / kurumsal",
  proje: "Proje toplantısı",
  ekip: "Ekip / stand-up",
  egitim: "Eğitim / atölye",
  "veli-okul": "Veli / okul toplantısı",
  genel: "Genel",
};

export const MinutesRequestSchema = z.object({
  meetingTitle: z.string().min(2).max(200),
  meetingDate: z.string().max(40).optional(),
  attendees: z.string().max(500).optional(),
  kind: MeetingKind,
  rawNotes: z.string().min(50).max(15000),
});

export const MinutesSchema = z.object({
  title: z.string(),
  date: z.string(),
  attendees: z.array(z.string()).max(40),
  agenda: z.array(z.string()).min(1).max(10),
  discussion: z
    .array(
      z.object({
        topic: z.string(),
        summary: z.string(),
      }),
    )
    .min(1)
    .max(12),
  decisions: z.array(z.string()).max(12),
  actionItems: z
    .array(
      z.object({
        task: z.string(),
        owner: z.string(),
        dueDate: z.string(),
        priority: z.enum(["dusuk", "orta", "yuksek"]),
      }),
    )
    .max(15),
  openQuestions: z.array(z.string()).max(8),
  nextMeeting: z.string(),
  signatureNote: z.string(),
});

export type Minutes = z.infer<typeof MinutesSchema>;
export type MinutesRequest = z.infer<typeof MinutesRequestSchema>;
