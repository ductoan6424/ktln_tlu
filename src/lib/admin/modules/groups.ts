import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

const GROUP_RECORDS: AdminRecord[] = [
  {
    id: "group-001",
    title: "AI Study Circle",
    subtitle: "Study group",
    status: "active",
    metadata: {
      members: "24",
      privacy: "private",
    },
  },
  {
    id: "group-002",
    title: "Capstone Builders",
    subtitle: "Project group",
    status: "review",
    metadata: {
      members: "13",
      privacy: "public",
    },
  },
]

const formSections: AdminFormSection[] = [
  {
    title: "Group information",
    description: "Basic identity and ownership for the group.",
    fields: [
      { name: "name", label: "Group name", type: "text", required: true },
      { name: "type", label: "Group type", type: "select", required: true },
      { name: "owner", label: "Owner", type: "text", required: true },
    ],
  },
  {
    title: "Access",
    description: "Privacy and moderation controls.",
    fields: [
      { name: "privacy", label: "Privacy", type: "select", required: true },
      { name: "moderated", label: "Moderated", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Approval workflow",
    description: "Control how new groups are reviewed.",
    items: [
      { name: "requireApproval", label: "Require approval", value: "on", type: "toggle" },
      { name: "reviewerRole", label: "Reviewer role", value: "admin", type: "select" },
    ],
  },
  {
    title: "Member limits",
    description: "Set safe defaults for group growth.",
    items: [
      { name: "maxMembers", label: "Max members", value: "100", type: "number" },
      { name: "allowWaitlist", label: "Allow waitlist", value: "on", type: "toggle" },
    ],
  },
]

const detailSections: AdminDetailSection[] = [
  {
    title: "Group summary",
    items: [
      { label: "Name", value: "AI Study Circle" },
      { label: "Type", value: "Study group" },
      { label: "Members", value: "24" },
    ],
  },
  {
    title: "Related context",
    items: [
      { label: "Linked subject", value: "Database Systems" },
      { label: "Linked event", value: "Research workshop" },
      { label: "Privacy", value: "Private" },
    ],
  },
]

export const GROUPS_ADMIN_MODULE: AdminModuleDefinition<string> = {
  key: "groups",
  label: "Groups",
  description: "Manage collaboration groups and moderation settings.",
  basePath: "/admin/groups",
  icon: "UsersRound",
  entityNameSingular: "group",
  entityNamePlural: "groups",
  paths: createAdminModulePaths("/admin/groups"),
  navItem: {
    label: "Groups",
    href: "/admin/groups",
    icon: "UsersRound",
    description: "Manage groups and membership",
  },
  stats: [
    { label: "Total groups", value: "28" },
    { label: "Active", value: "19" },
    { label: "Private", value: "12" },
    { label: "Needs review", value: "4" },
  ],
  tabs: [
    { label: "All", value: "all", active: true },
    { label: "Study", value: "study" },
    { label: "Project", value: "project" },
    { label: "Community", value: "community" },
  ],
  columns: [
    { key: "title", header: "Group name" },
    { key: "type", header: "Type" },
    { key: "members", header: "Members" },
    { key: "owner", header: "Owner" },
    { key: "status", header: "Status" },
  ],
  records: GROUP_RECORDS,
  quickActions: [
    {
      label: "Create group",
      href: "/admin/groups/new",
      icon: "UsersRound",
      description: "Open a new group form",
    },
    {
      label: "Open settings",
      href: "/admin/groups/settings",
      icon: "UsersRound",
      description: "Review moderation defaults",
    },
  ],
  detailSections,
  createSections: formSections,
  editSections: formSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/groups/${id}`,
  buildEditPath: (id) => `/admin/groups/${id}/edit`,
  buildNewPath: () => "/admin/groups/new",
  buildSettingsPath: () => "/admin/groups/settings",
  getRecord: (id) => GROUP_RECORDS.find((record) => record.id === id),
}
