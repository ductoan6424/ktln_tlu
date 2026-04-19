import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

const USERS_RECORDS: AdminRecord[] = [
  {
    id: "user-001",
    title: "Nguyen Duc Toan",
    subtitle: "Student",
    status: "active",
    metadata: {
      email: "nguyenductoan@example.edu",
      faculty: "Computer Science",
    },
  },
  {
    id: "user-002",
    title: "Le Minh Anh",
    subtitle: "Lecturer",
    status: "pending",
    metadata: {
      email: "leminhanh@example.edu",
      faculty: "Information Systems",
    },
  },
  {
    id: "user-003",
    title: "Pham Gia Huy",
    subtitle: "Admin",
    status: "blocked",
    metadata: {
      email: "phamgiahuy@example.edu",
      faculty: "Administration",
    },
  },
]

const createSections: AdminFormSection[] = [
  {
    title: "Profile information",
    description: "Core identity and contact fields for a user account.",
    fields: [
      { name: "fullName", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "role", label: "Role", type: "select", required: true },
    ],
  },
  {
    title: "Account access",
    description: "Security and status controls for the account.",
    fields: [
      { name: "status", label: "Status", type: "select", required: true },
      { name: "temporaryPassword", label: "Temporary password", type: "password" },
      { name: "sendInvite", label: "Send invite", type: "toggle" },
    ],
  },
]

const editSections: AdminFormSection[] = [
  {
    title: "Identity",
    description: "Update the user profile and contact details.",
    fields: [
      { name: "fullName", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "faculty", label: "Faculty", type: "text" },
    ],
  },
  {
    title: "Permissions",
    description: "Control access level and operational status.",
    fields: [
      { name: "role", label: "Role", type: "select", required: true },
      { name: "status", label: "Status", type: "select", required: true },
      { name: "isVerified", label: "Verified", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Registration defaults",
    description: "Controls the default user onboarding flow.",
    items: [
      { name: "autoApprove", label: "Auto approve new users", value: "off", type: "toggle" },
      { name: "defaultRole", label: "Default role", value: "student", type: "select" },
    ],
  },
  {
    title: "Moderation rules",
    description: "Keep account quality and safety under control.",
    items: [
      { name: "requireEmail", label: "Require verified email", value: "on", type: "toggle" },
      { name: "blockNewAdmins", label: "Block direct admin creation", value: "on", type: "toggle" },
    ],
  },
  {
    title: "Invite workflow",
    description: "Fine-tune invitation handling.",
    items: [
      { name: "inviteExpires", label: "Invite expiry", value: "7 days", type: "text" },
      { name: "sendReminder", label: "Send reminder", value: "on", type: "toggle" },
    ],
  },
]

const detailSections: AdminDetailSection[] = [
  {
    title: "Basic information",
    items: [
      { label: "Name", value: "Nguyen Duc Toan" },
      { label: "Role", value: "Student" },
      { label: "Status", value: "Active" },
    ],
  },
  {
    title: "Academic context",
    items: [
      { label: "Faculty", value: "Computer Science" },
      { label: "Email", value: "nguyenductoan@example.edu" },
      { label: "Joined", value: "2025-09-01" },
    ],
  },
]

const stats = [
  { label: "Total users", value: "128" },
  { label: "Active", value: "94" },
  { label: "Pending verification", value: "18" },
  { label: "Blocked", value: "6" },
]

const tabs = [
  { label: "All", value: "all", active: true },
  { label: "Students", value: "students" },
  { label: "Lecturers", value: "lecturers" },
  { label: "Admins", value: "admins" },
]

const columns = [
  { key: "title", header: "Name" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  { key: "faculty", header: "Faculty" },
  { key: "status", header: "Status" },
  { key: "joinedAt", header: "Joined" },
]

export const USERS_ADMIN_MODULE: AdminModuleDefinition<string> = {
  key: "users",
  label: "Users",
  description: "Manage user accounts, roles, and moderation settings.",
  basePath: "/admin/users",
  icon: "Users",
  entityNameSingular: "user",
  entityNamePlural: "users",
  paths: createAdminModulePaths("/admin/users"),
  navItem: {
    label: "Users",
    href: "/admin/users",
    icon: "Users",
    description: "Manage accounts and access",
  },
  stats,
  tabs,
  columns,
  records: USERS_RECORDS,
  quickActions: [
    {
      label: "Invite user",
      href: "/admin/users/new",
      icon: "Users",
      description: "Start a new account invite",
    },
    {
      label: "Open settings",
      href: "/admin/users/settings",
      icon: "Users",
      description: "Review registration defaults",
    },
  ],
  detailSections,
  createSections,
  editSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/users/${id}`,
  buildEditPath: (id) => `/admin/users/${id}/edit`,
  buildNewPath: () => "/admin/users/new",
  buildSettingsPath: () => "/admin/users/settings",
  getRecord: (id) => USERS_RECORDS.find((record) => record.id === id),
}
