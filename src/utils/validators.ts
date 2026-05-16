import { z } from "zod";
import { POST_DELETE_REASON_MAX } from "@/lib/config/posts";
import {
  ANNOUNCEMENT_TITLE_MAX,
  ANNOUNCEMENT_CONTENT_MAX,
} from "@/lib/config/announcements";
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
  pinToTop: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
  expiresAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal("")),
});

// Export inferred types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type PostDeleteReasonInput = z.infer<typeof postDeleteReasonSchema>;
export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
export type AnnouncementAudienceInput = z.infer<typeof announcementAudienceSchema>;
export type PollInput = z.infer<typeof pollInputSchema>;
export type PollOptionInput = z.infer<typeof pollOptionSchema>;
export type PollTypeInput = z.infer<typeof pollTypeSchema>;
export type PollDurationPresetInput = z.infer<typeof pollDurationPresetSchema>;
