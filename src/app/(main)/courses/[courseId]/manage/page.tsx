import { redirect } from "next/navigation"

import { CommunityManageShell } from "@/components/communities/manage/community-manage-shell"
import { CommunityMembersPanel } from "@/components/communities/manage/community-members-panel"
import { CommunityPostsPanel } from "@/components/communities/manage/community-posts-panel"
import { CommunityReportsTable } from "@/components/communities/manage/community-reports-table"
import { CommunityRequestsTable } from "@/components/communities/manage/community-requests-table"
import { CommunityRulesPanel } from "@/components/communities/manage/community-rules-panel"
import {
  manageHeader,
  manageSurface,
} from "@/components/communities/manage/manage-ui"
import { Card, CardContent } from "@/components/ui/card"
import { buildCommunityPath } from "@/lib/communities/urls"
import { requireCourseManagementAccess } from "@/lib/courses/course-permissions"
import { prisma } from "@/lib/prisma/client"

import { AddStudentForm } from "./add-student-form"
import { CourseSettingsPanel } from "./course-settings-panel"

export const dynamic = "force-dynamic"

const MANAGE_TABS = [
  { value: "members", label: "Thành viên" },
  { value: "requests", label: "Yêu cầu tham gia" },
  { value: "pending-posts", label: "Bài chờ duyệt" },
  { value: "pinned", label: "Bài ghim" },
  { value: "reports", label: "Báo cáo" },
  { value: "rules", label: "Quy định" },
  { value: "chat", label: "Chat" },
  { value: "settings", label: "Cài đặt" },
] as const

type SearchParams = Record<string, string | string[] | undefined>

function getParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function normalizeTab(value: string) {
  return MANAGE_TABS.some((tab) => tab.value === value) ? value : "members"
}

export default async function ManageCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams?: Promise<SearchParams>
}) {
  const { courseId } = await params
  const [queryParams, accessResult] = await Promise.all([
    searchParams ?? Promise.resolve({}),
    requireCourseManagementAccess(courseId),
  ])
  const { context, course } = accessResult
  const canonicalPath = buildCommunityPath("COURSE", course.code, course.shortId, "manage")

  if (courseId !== course.id && canonicalPath !== `/courses/${courseId}/manage`) {
    redirect(canonicalPath)
  }

  const activeTab = normalizeTab(getParam(queryParams ?? {}, "tab"))
  const [rules, requests, reports, pendingPosts, pinnedPosts] = await Promise.all([
    prisma.communityRule.findMany({
      where: { targetType: "COURSE", targetId: course.id },
      orderBy: { position: "asc" },
      select: { id: true, title: true, description: true, position: true },
    }),
    prisma.communityJoinRequest.findMany({
      where: { targetType: "COURSE", targetId: course.id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { requester: { select: { displayName: true } } },
    }),
    prisma.communityReport.findMany({
      where: { targetType: "COURSE", targetId: course.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: { reporter: { select: { displayName: true } } },
    }),
    prisma.post.findMany({
      where: {
        courseId: course.id,
        communityStatus: "PENDING_APPROVAL",
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { displayName: true } } },
    }),
    prisma.pinnedPost.findMany({
      where: { targetType: "COURSE", targetId: course.id },
      orderBy: { position: "asc" },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            createdAt: true,
            author: { select: { displayName: true } },
          },
        },
      },
    }),
  ])

  const href = buildCommunityPath("COURSE", course.code, course.shortId)
  const tabs = MANAGE_TABS.map((tab) => ({
    ...tab,
    href: `${href}/manage?tab=${tab.value}`,
  }))

  return (
    <CommunityManageShell
      title="Quản lý lớp học"
      backHref={href}
      activeTab={activeTab}
      tabs={tabs}
    >
      {activeTab === "members" ? (
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className={`${manageSurface} gap-0 py-0`}>
            <CardContent className="space-y-0 p-0">
              <div className={`${manageHeader} space-y-1`}>
                <h2 className="text-lg font-semibold text-foreground">Thêm sinh viên</h2>
                <p className="text-sm text-muted-foreground">
                  Thêm một hoặc nhiều sinh viên vào lớp bằng mã sinh viên.
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <AddStudentForm courseId={course.id} courseHref={href} />
              </div>
            </CardContent>
          </Card>

          <CommunityMembersPanel
            title="Danh sách lớp"
            description={`Tổng ${course.members.length} sinh viên đã được thêm vào lớp học.`}
            countLabel="sinh viên"
            targetType="COURSE"
            slugId={courseId}
            managerId={context?.profile.userId ?? null}
            members={course.members.map((member) => ({
              userId: member.user.userId,
              displayName: member.user.displayName,
              avatarUrl: member.user.avatarUrl ?? null,
              email: member.user.email ?? "",
              studentId: member.user.studentId,
              role: "STUDENT",
              joinedAt: member.joinedAt,
            }))}
          />
        </div>
      ) : activeTab === "rules" ? (
        <CommunityRulesPanel rules={rules} targetType="COURSE" targetId={course.id} />
      ) : activeTab === "requests" ? (
        <CommunityRequestsTable
          requests={requests.map((request) => ({
            id: request.id,
            requesterName: request.requester.displayName,
            message: request.message,
            createdAt: request.createdAt,
          }))}
        />
      ) : activeTab === "reports" ? (
        <CommunityReportsTable
          targetType="COURSE"
          targetId={course.id}
          reports={reports.map((report) => ({
            id: report.id,
            reporterName: report.reporter.displayName,
            reason: report.reason,
            note: report.note,
            contentType: report.contentType,
            contentId: report.contentId,
            createdAt: report.createdAt,
          }))}
        />
      ) : activeTab === "pending-posts" ? (
        <CommunityPostsPanel
          title="Bài chờ duyệt"
          description="Các bài viết đang chờ giảng viên hoặc quản trị viên kiểm tra."
          emptyLabel="Không có bài viết nào đang chờ duyệt."
          targetType="COURSE"
          targetId={course.id}
          mode="pending"
          posts={pendingPosts.map((post) => ({
            id: post.id,
            content: post.content,
            authorName: post.author.displayName,
            imageUrl: post.imageUrl,
            createdAt: post.createdAt,
            badgeLabel: "Chờ duyệt",
          }))}
        />
      ) : activeTab === "pinned" ? (
        <CommunityPostsPanel
          title="Bài ghim"
          description="Các bài viết đang được ghim trong lớp học này."
          emptyLabel="Chưa có bài viết nào được ghim."
          targetType="COURSE"
          targetId={course.id}
          mode="pinned"
          posts={pinnedPosts.map((pinnedPost) => ({
            id: pinnedPost.post.id,
            content: pinnedPost.post.content,
            authorName: pinnedPost.post.author.displayName,
            imageUrl: pinnedPost.post.imageUrl,
            createdAt: pinnedPost.post.createdAt,
            badgeLabel: `#${pinnedPost.position + 1}`,
          }))}
        />
      ) : activeTab === "chat" || activeTab === "settings" ? (
        <CourseSettingsPanel
          courseId={course.id}
          name={course.name}
          code={course.code}
          description={course.description}
          requirePostApproval={course.requirePostApproval}
          chatEnabled={course.chatEnabled}
          chatMode={course.chatMode}
          memberCount={course.members.length}
          requestCount={requests.length}
          pendingPostCount={pendingPosts.length}
          reportCount={reports.length}
        />
      ) : null}
    </CommunityManageShell>
  )
}
