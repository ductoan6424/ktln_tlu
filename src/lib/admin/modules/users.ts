import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

interface UserCells {
  title: string
  email: string
  role: string
  faculty: string
  status: string
  joinedAt: string
}

const USERS_RECORDS: AdminRecord<UserCells>[] = [
  {
    id: "user-001",
    title: "Nguyen Duc Toan",
    subtitle: "Student",
    status: "active",
    cells: {
      title: "Nguyen Duc Toan",
      email: "nguyenductoan@example.edu",
      role: "Student",
      faculty: "Computer Science",
      status: "Active",
      joinedAt: "2025-09-01",
    },
  },
  {
    id: "user-002",
    title: "Le Minh Anh",
    subtitle: "Lecturer",
    status: "pending",
    cells: {
      title: "Le Minh Anh",
      email: "leminhanh@example.edu",
      role: "Lecturer",
      faculty: "Information Systems",
      status: "Pending",
      joinedAt: "2025-09-18",
    },
  },
  {
    id: "user-003",
    title: "Pham Gia Huy",
    subtitle: "Admin",
    status: "blocked",
    cells: {
      title: "Pham Gia Huy",
      email: "phamgiahuy@example.edu",
      role: "Admin",
      faculty: "Administration",
      status: "Blocked",
      joinedAt: "2025-07-07",
    },
  },
]

const USER_ROLE_OPTIONS = [
  { label: "Student", value: "student" },
  { label: "Lecturer", value: "lecturer" },
  { label: "Admin", value: "admin" },
] as const

const USER_STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Blocked", value: "blocked" },
] as const

const createSections: AdminFormSection[] = [
  {
    title: "Profile information",
    description: "Core identity and contact fields for a user account.",
    fields: [
      { name: "fullName", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "role", label: "Role", type: "select", options: USER_ROLE_OPTIONS, required: true },
    ],
  },
  {
    title: "Account access",
    description: "Security and status controls for the account.",
    fields: [
      { name: "status", label: "Status", type: "select", options: USER_STATUS_OPTIONS, required: true },
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
      { name: "role", label: "Role", type: "select", options: USER_ROLE_OPTIONS, required: true },
      { name: "status", label: "Status", type: "select", options: USER_STATUS_OPTIONS, required: true },
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
      {
        name: "defaultRole",
        label: "Default role",
        value: "student",
        type: "select",
        options: USER_ROLE_OPTIONS,
      },
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

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "user-001": [
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
  ],
  "user-002": [
    {
      title: "Basic information",
      items: [
        { label: "Name", value: "Le Minh Anh" },
        { label: "Role", value: "Lecturer" },
        { label: "Status", value: "Pending" },
      ],
    },
    {
      title: "Teaching context",
      items: [
        { label: "Faculty", value: "Information Systems" },
        { label: "Email", value: "leminhanh@example.edu" },
        { label: "Joined", value: "2025-09-18" },
      ],
    },
  ],
  "user-003": [
    {
      title: "Basic information",
      items: [
        { label: "Name", value: "Pham Gia Huy" },
        { label: "Role", value: "Admin" },
        { label: "Status", value: "Blocked" },
      ],
    },
    {
      title: "Administration context",
      items: [
        { label: "Faculty", value: "Administration" },
        { label: "Email", value: "phamgiahuy@example.edu" },
        { label: "Joined", value: "2025-07-07" },
      ],
    },
  ],
}

export const USERS_ADMIN_MODULE: AdminModuleDefinition<UserCells> = {
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
  stats: [
    { label: "Total users", value: "128" },
    { label: "Active", value: "94" },
    { label: "Pending verification", value: "18" },
    { label: "Blocked", value: "6" },
  ],
  tabs: [
    { label: "All", value: "all", active: true },
    { label: "Students", value: "students" },
    { label: "Lecturers", value: "lecturers" },
    { label: "Admins", value: "admins" },
  ],
  columns: [
    { key: "title", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "faculty", header: "Faculty" },
    { key: "status", header: "Status" },
    { key: "joinedAt", header: "Joined" },
  ],
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
  getDetailSections: (id) => detailSectionsById[id],
  createSections,
  editSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/users/${id}`,
  buildEditPath: (id) => `/admin/users/${id}/edit`,
  buildNewPath: () => "/admin/users/new",
  buildSettingsPath: () => "/admin/users/settings",
  getRecord: (id) => USERS_RECORDS.find((record) => record.id === id),
}
