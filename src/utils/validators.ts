import { z } from "zod";
import { POST_DELETE_REASON_MAX } from "@/lib/config/posts";
import {
  ANNOUNCEMENT_TITLE_MAX,
  ANNOUNCEMENT_CONTENT_MAX,
} from "@/lib/config/announcements";
import { TLU_LATEST_COHORT } from "@/lib/announcements/targeting";
import {
  EVENT_CAPACITY_MAX,
  EVENT_DESCRIPTION_MAX,
  EVENT_LOCATION_MAX,
  EVENT_ORGANIZER_MAX,
  EVENT_TITLE_MAX,
} from "@/lib/config/events";
import {
  POLL_OPTIONS_MAX_COUNT,
  POLL_OPTIONS_MIN_COUNT,
  POLL_OPTION_MAX_LENGTH,
  POLL_OPTION_MIN_LENGTH,
  POLL_QUESTION_MAX_LENGTH,
  POLL_QUESTION_MIN_LENGTH,
} from "@/lib/config/polls";

// Validation schema cho đăng nhập
export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

// Validation schema cho đăng ký
export const registerSchema = z.object({
  fullName: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

// Validation schema cho bài viết
export const postSchema = z.object({
  content: z.string().min(1, "Nội dung không được để trống").max(5000, "Nội dung tối đa 5000 ký tự"),
  imageUrl: z.string().url("URL ảnh không hợp lệ").optional().or(z.literal("")),
});

// Validation schema cho bình luận
export const commentSchema = z.object({
  content: z.string().min(1, "Nội dung bình luận không được để trống").max(2000, "Bình luận tối đa 2000 ký tự"),
});

// Validation schema cho lý do xoá bài (admin/club admin/group admin)
export const postDeleteReasonSchema = z.object({
  reason: z.string().trim().max(POST_DELETE_REASON_MAX, `Lý do tối đa ${POST_DELETE_REASON_MAX} ký tự`).optional(),
});

// Validation schema cho khảo sát (poll) đi kèm bài viết
export const pollTypeSchema = z.enum(["SINGLE", "MULTIPLE"]);

export const pollDurationPresetSchema = z.enum(["1h", "1d", "3d", "7d", "never"]);

export const pollOptionSchema = z.object({
  content: z
    .string()
    .trim()
    .min(
      POLL_OPTION_MIN_LENGTH,
      "Đáp án không được để trống",
    )
    .max(
      POLL_OPTION_MAX_LENGTH,
      `Đáp án tối đa ${POLL_OPTION_MAX_LENGTH} ký tự`,
    ),
});

export const pollInputSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(
        POLL_QUESTION_MIN_LENGTH,
        "Câu hỏi khảo sát không được để trống",
      )
      .max(
        POLL_QUESTION_MAX_LENGTH,
        `Câu hỏi khảo sát tối đa ${POLL_QUESTION_MAX_LENGTH} ký tự`,
      ),
    type: pollTypeSchema,
    durationPreset: pollDurationPresetSchema,
    options: z
      .array(pollOptionSchema)
      .min(
        POLL_OPTIONS_MIN_COUNT,
        `Khảo sát cần ít nhất ${POLL_OPTIONS_MIN_COUNT} đáp án`,
      )
      .max(
        POLL_OPTIONS_MAX_COUNT,
        `Khảo sát tối đa ${POLL_OPTIONS_MAX_COUNT} đáp án`,
      ),
  })
  .refine(
    (data) => {
      const lowered = data.options.map((option) => option.content.toLowerCase())
      return new Set(lowered).size === lowered.length
    },
    {
      message: "Các đáp án không được trùng nhau",
      path: ["options"],
    },
  );

// Validation schema cho thông báo chính thức
export const announcementAudienceSchema = z.enum(["ALL", "STUDENTS", "FACULTY"]);
export const announcementTargetTypeSchema = z.enum([
  "ROLE",
  "FACULTY",
  "COHORT",
  "COURSE",
  "CLUB",
  "GROUP",
  "USER",
]);

const announcementTargetValueSchema = z.string().trim().min(1, "Đối tượng nhận không hợp lệ");

export const announcementTargetInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ROLE"),
    value: z.enum(["STUDENT", "LECTURER", "ADMIN"], {
      message: "Vai trò nhận thông báo không hợp lệ",
    }),
  }),
  z.object({
    type: z.literal("COHORT"),
    value: announcementTargetValueSchema
      .regex(/^\d+$/, "Khoá nhận thông báo không hợp lệ")
      .refine(
        (value) => {
          const cohort = Number(value)
          return Number.isInteger(cohort) && cohort >= 1 && cohort <= TLU_LATEST_COHORT
        },
        `Khoá nhận thông báo phải từ K1 đến K${TLU_LATEST_COHORT}`,
      ),
  }),
  z.object({ type: z.literal("FACULTY"), value: announcementTargetValueSchema }),
  z.object({ type: z.literal("COURSE"), value: announcementTargetValueSchema }),
  z.object({ type: z.literal("CLUB"), value: announcementTargetValueSchema }),
  z.object({ type: z.literal("GROUP"), value: announcementTargetValueSchema }),
  z.object({ type: z.literal("USER"), value: announcementTargetValueSchema }),
]);

export const announcementInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Tiêu đề không được để trống")
    .max(ANNOUNCEMENT_TITLE_MAX, `Tiêu đề tối đa ${ANNOUNCEMENT_TITLE_MAX} ký tự`),
  content: z
    .string()
    .trim()
    .min(1, "Nội dung không được để trống")
    .max(ANNOUNCEMENT_CONTENT_MAX, `Nội dung tối đa ${ANNOUNCEMENT_CONTENT_MAX} ký tự`),
  audience: announcementAudienceSchema.default("ALL"),
  targets: z.array(announcementTargetInputSchema).default([]),
  pinToTop: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
  expiresAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal("")),
});

export const eventTypeSchema = z.enum([
  "ACADEMIC",
  "CLUB",
  "WORKSHOP",
  "INTERNAL",
  "SPORTS",
  "CULTURE",
  "CAREER",
  "OTHER",
]);

export const eventRegistrationStatusSchema = z.enum([
  "OPEN",
  "APPROVAL_REQUIRED",
  "CLOSED",
]);

export const eventInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Tiêu đề sự kiện không được để trống")
      .max(EVENT_TITLE_MAX, `Tiêu đề tối đa ${EVENT_TITLE_MAX} ký tự`),
    description: z
      .string()
      .trim()
      .min(1, "Mô tả sự kiện không được để trống")
      .max(EVENT_DESCRIPTION_MAX, `Mô tả tối đa ${EVENT_DESCRIPTION_MAX} ký tự`),
    type: eventTypeSchema.default("OTHER"),
    location: z
      .string()
      .trim()
      .min(1, "Địa điểm không được để trống")
      .max(EVENT_LOCATION_MAX, `Địa điểm tối đa ${EVENT_LOCATION_MAX} ký tự`),
    organizerName: z
      .string()
      .trim()
      .min(1, "Đơn vị tổ chức không được để trống")
      .max(EVENT_ORGANIZER_MAX, `Đơn vị tổ chức tối đa ${EVENT_ORGANIZER_MAX} ký tự`),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    capacity: z
      .number()
      .int("Sức chứa phải là số nguyên")
      .min(0, "Sức chứa không được âm")
      .max(EVENT_CAPACITY_MAX, `Sức chứa tối đa ${EVENT_CAPACITY_MAX}`)
      .nullable()
      .optional(),
    registrationStatus: eventRegistrationStatusSchema.default("OPEN"),
    featured: z.boolean().default(false),
    coverImageUrl: z.string().url("URL ảnh bìa không hợp lệ").optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endAt).getTime() > new Date(data.startAt).getTime(), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endAt"],
  });

// Export inferred types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type PostDeleteReasonInput = z.infer<typeof postDeleteReasonSchema>;
export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
export type AnnouncementAudienceInput = z.infer<typeof announcementAudienceSchema>;
export type AnnouncementTargetInput = z.infer<typeof announcementTargetInputSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
export type EventTypeInput = z.infer<typeof eventTypeSchema>;
export type EventRegistrationStatusInput = z.infer<typeof eventRegistrationStatusSchema>;
export type PollInput = z.infer<typeof pollInputSchema>;
export type PollOptionInput = z.infer<typeof pollOptionSchema>;
export type PollTypeInput = z.infer<typeof pollTypeSchema>;
export type PollDurationPresetInput = z.infer<typeof pollDurationPresetSchema>;
