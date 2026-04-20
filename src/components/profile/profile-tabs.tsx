"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProfileTabsProps {
  infoContent: React.ReactNode
  postsContent: React.ReactNode
  postsCount: number
}

export function ProfileTabs({
  infoContent,
  postsContent,
  postsCount,
}: ProfileTabsProps) {
  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList
        variant="line"
        className="w-full justify-start border-b border-border bg-transparent p-0 text-sm"
      >
        <TabsTrigger value="posts">Bài viết ({postsCount})</TabsTrigger>
        <TabsTrigger value="info">Thông tin</TabsTrigger>
      </TabsList>
      <TabsContent value="posts" className="pt-4">
        {postsContent}
      </TabsContent>
      <TabsContent value="info" className="pt-4">
        {infoContent}
      </TabsContent>
    </Tabs>
  )
}
