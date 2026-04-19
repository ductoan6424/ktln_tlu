import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

interface SubjectCells {
  code: string
  title: string
  faculty: string
  credits: string
  status: string
}

const SUBJECT_RECORDS: AdminRecord<SubjectCells>[] = [
  {
    id: "subject-001",
    title: "Database Systems",
    subtitle: "CS204",
    status: "open",
    cells: {
      code: "CS204",
      title: "Database Systems",
      faculty: "Computer Science",
      credits: "3",
      status: "Open",
    },
  },
  {
    id: "subject-002",
    title: "Software Engineering",
    subtitle: "CS301",
    status: "review",
    cells: {
      code: "CS301",
      title: "Software Engineering",
      faculty: "Computer Science",
      credits: "4",
      status: "Under review",
    },
  },
]

const SUBJECT_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Open", value: "open" },
  { label: "Paused", value: "paused" },
] as const

const formSections: AdminFormSection[] = [
  {
    title: "Subject metadata",
    description: "Core information shown across the admin area.",
    fields: [
      { name: "code", label: "Subject code", type: "text", required: true },
      { name: "name", label: "Subject name", type: "text", required: true },
      { name: "credits", label: "Credits", type: "number", required: true },
    ],
  },
  {
    title: "Visibility",
    description: "Define how the subject is exposed to users.",
    fields: [
      { name: "status", label: "Status", type: "select", options: SUBJECT_STATUS_OPTIONS, required: true },
      { name: "isPublic", label: "Public listing", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Code conventions",
    description: "Shared naming defaults for new subjects.",
    items: [
      { name: "prefix", label: "Code prefix", value: "CS", type: "text" },
      { name: "autoNumber", label: "Auto number subjects", value: "on", type: "toggle" },
    ],
  },
  {
    title: "Visibility defaults",
    description: "Default visibility behavior for new entries.",
    items: [
      {
        name: "defaultStatus",
        label: "Default status",
        value: "draft",
        type: "select",
        options: SUBJECT_STATUS_OPTIONS,
      },
      { name: "showInCatalog", label: "Show in catalog", value: "on", type: "toggle" },
    ],
  },
]

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "subject-001": [
    {
      title: "Subject information",
      items: [
        { label: "Code", value: "CS204" },
        { label: "Name", value: "Database Systems" },
        { label: "Credits", value: "3" },
      ],
    },
    {
      title: "Related admin context",
      items: [
        { label: "Lecturer group", value: "Database Team" },
        { label: "Linked groups", value: "2" },
        { label: "Linked events", value: "1" },
      ],
    },
  ],
  "subject-002": [
    {
      title: "Subject information",
      items: [
        { label: "Code", value: "CS301" },
        { label: "Name", value: "Software Engineering" },
        { label: "Credits", value: "4" },
      ],
    },
    {
      title: "Related admin context",
      items: [
        { label: "Lecturer group", value: "Software Team" },
        { label: "Linked groups", value: "3" },
        { label: "Linked events", value: "2" },
      ],
    },
  ],
}

export const SUBJECTS_ADMIN_MODULE: AdminModuleDefinition<SubjectCells> = {
  key: "subjects",
  label: "Subjects",
  description: "Manage academic subjects and subject-level defaults.",
  basePath: "/admin/subjects",
  icon: "BookOpen",
  entityNameSingular: "subject",
  entityNamePlural: "subjects",
  paths: createAdminModulePaths("/admin/subjects"),
  navItem: {
    label: "Subjects",
    href: "/admin/subjects",
    icon: "BookOpen",
    description: "Manage subject metadata",
  },
  stats: [
    { label: "Total subjects", value: "42" },
    { label: "Open", value: "31" },
    { label: "Paused", value: "8" },
    { label: "Needs update", value: "3" },
  ],
  tabs: [
    { label: "All", value: "all", active: true },
    { label: "Core", value: "core" },
    { label: "Major", value: "major" },
    { label: "Practice", value: "practice" },
  ],
  columns: [
    { key: "code", header: "Code" },
    { key: "title", header: "Name" },
    { key: "faculty", header: "Faculty" },
    { key: "credits", header: "Credits" },
    { key: "status", header: "Status" },
  ],
  records: SUBJECT_RECORDS,
  quickActions: [
    {
      label: "Create subject",
      href: "/admin/subjects/new",
      icon: "BookOpen",
      description: "Add a new subject record",
    },
    {
      label: "Open settings",
      href: "/admin/subjects/settings",
      icon: "BookOpen",
      description: "Edit subject defaults",
    },
  ],
  getDetailSections: (id) => detailSectionsById[id],
  createSections: formSections,
  editSections: formSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/subjects/${id}`,
  buildEditPath: (id) => `/admin/subjects/${id}/edit`,
  buildNewPath: () => "/admin/subjects/new",
  buildSettingsPath: () => "/admin/subjects/settings",
  getRecord: (id) => SUBJECT_RECORDS.find((record) => record.id === id),
}
