import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

interface EventCells {
  title: string
  type: string
  location: string
  registration: string
  schedule: string
  organizer: string
  participants: string
  status: string
}

const EVENT_RECORDS: AdminRecord<EventCells>[] = [
  {
    id: "event-001",
    title: "Orientation Day",
    subtitle: "Campus event",
    status: "upcoming",
    cells: {
      title: "Orientation Day",
      type: "Internal",
      location: "Main Hall",
      registration: "Open",
      schedule: "2026-08-20 09:00",
      organizer: "Student Affairs",
      participants: "240",
      status: "Upcoming",
    },
  },
  {
    id: "event-002",
    title: "Research Showcase",
    subtitle: "Academic event",
    status: "open",
    cells: {
      title: "Research Showcase",
      type: "Academic",
      location: "Innovation Hub",
      registration: "Approval required",
      schedule: "2026-09-02 13:30",
      organizer: "Faculty Board",
      participants: "180",
      status: "Open",
    },
  },
]

const EVENT_TYPE_OPTIONS = [
  { label: "Academic", value: "academic" },
  { label: "Club", value: "club" },
  { label: "Workshop", value: "workshop" },
  { label: "Internal", value: "internal" },
] as const

const EVENT_REGISTRATION_OPTIONS = [
  { label: "Open", value: "open" },
  { label: "Approval required", value: "approval-required" },
  { label: "Closed", value: "closed" },
] as const

const formSections: AdminFormSection[] = [
  {
    title: "Event basics",
    description: "Core identity and scheduling information.",
    fields: [
      { name: "title", label: "Event title", type: "text", required: true },
      { name: "type", label: "Event type", type: "select", options: EVENT_TYPE_OPTIONS, required: true },
      { name: "location", label: "Location", type: "text", required: true },
    ],
  },
  {
    title: "Registration",
    description: "Define the registration workflow and visibility.",
    fields: [
      {
        name: "registration",
        label: "Registration",
        type: "select",
        options: EVENT_REGISTRATION_OPTIONS,
        required: true,
      },
      { name: "featured", label: "Featured", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Registration defaults",
    description: "Shared settings for new event drafts.",
    items: [
      { name: "requireApproval", label: "Require approval", value: "on", type: "toggle" },
      { name: "allowGuest", label: "Allow guests", value: "on", type: "toggle" },
    ],
  },
  {
    title: "Reminder rules",
    description: "Automated reminders for upcoming events.",
    items: [
      { name: "firstReminder", label: "First reminder", value: "3 days", type: "text" },
      { name: "secondReminder", label: "Second reminder", value: "1 day", type: "text" },
    ],
  },
  {
    title: "Visibility rules",
    description: "How events appear to the community.",
    items: [
      { name: "showInFeed", label: "Show in feed", value: "on", type: "toggle" },
      { name: "showOrganizer", label: "Show organizer", value: "on", type: "toggle" },
    ],
  },
]

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "event-001": [
    {
      title: "Event overview",
      items: [
        { label: "Name", value: "Orientation Day" },
        { label: "Type", value: "Campus event" },
        { label: "Status", value: "Upcoming" },
      ],
    },
    {
      title: "Event context",
      items: [
        { label: "Organizer", value: "Student Affairs" },
        { label: "Linked group", value: "Student Leaders" },
        { label: "Linked subject", value: "Freshman Seminar" },
      ],
    },
  ],
  "event-002": [
    {
      title: "Event overview",
      items: [
        { label: "Name", value: "Research Showcase" },
        { label: "Type", value: "Academic event" },
        { label: "Status", value: "Open" },
      ],
    },
    {
      title: "Event context",
      items: [
        { label: "Organizer", value: "Faculty Board" },
        { label: "Linked group", value: "Research Lab" },
        { label: "Linked subject", value: "Research Methods" },
      ],
    },
  ],
}

export const EVENTS_ADMIN_MODULE: AdminModuleDefinition<EventCells> = {
  key: "events",
  label: "Events",
  description: "Manage event announcements, registration, and visibility rules.",
  basePath: "/admin/events",
  icon: "CalendarDays",
  entityNameSingular: "event",
  entityNamePlural: "events",
  paths: createAdminModulePaths("/admin/events"),
  navItem: {
    label: "Events",
    href: "/admin/events",
    icon: "CalendarDays",
    description: "Manage events and reminders",
  },
  stats: [
    { label: "Total events", value: "36" },
    { label: "Upcoming", value: "14" },
    { label: "Open registration", value: "9" },
    { label: "Completed", value: "13" },
  ],
  tabs: [
    { label: "All", value: "all", active: true },
    { label: "Academic", value: "academic" },
    { label: "Club", value: "club" },
    { label: "Workshop", value: "workshop" },
    { label: "Internal", value: "internal" },
  ],
  columns: [
    { key: "title", header: "Event name" },
    { key: "schedule", header: "Time" },
    { key: "organizer", header: "Organizer" },
    { key: "participants", header: "Participants" },
    { key: "status", header: "Status" },
  ],
  records: EVENT_RECORDS,
  quickActions: [
    {
      label: "Create event",
      href: "/admin/events/new",
      icon: "CalendarDays",
      description: "Open the event builder",
    },
    {
      label: "Open settings",
      href: "/admin/events/settings",
      icon: "CalendarDays",
      description: "Review registration defaults",
    },
  ],
  getDetailSections: (id) => detailSectionsById[id],
  createSections: formSections,
  editSections: formSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/events/${id}`,
  buildEditPath: (id) => `/admin/events/${id}/edit`,
  buildNewPath: () => "/admin/events/new",
  buildSettingsPath: () => "/admin/events/settings",
  getRecord: (id) => EVENT_RECORDS.find((record) => record.id === id),
}
