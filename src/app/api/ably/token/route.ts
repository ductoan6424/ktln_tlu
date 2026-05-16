import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAblyRestClient } from "@/lib/ably/server"
import { getNotificationChannelName } from "@/lib/notifications/channels"
import { getUserInboxChannelName } from "@/lib/config/chat"
import { POLL_REALTIME_CHANNEL_PREFIX } from "@/lib/config/polls"
import { prisma } from "@/lib/prisma/client"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ người dùng" }, { status: 404 })
    }

    const ably = getAblyRestClient()
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: user.id,
      capability: JSON.stringify({
        ["chat:*"]: ["subscribe", "publish", "presence"],
        ["presence:users"]: ["subscribe", "presence"],
        [getNotificationChannelName(user.id)]: ["subscribe"],
        [getUserInboxChannelName(user.id)]: ["subscribe"],
        [`${POLL_REALTIME_CHANNEL_PREFIX}:*`]: ["subscribe"],
      }),
    })

    return NextResponse.json(tokenRequest)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Không thể cấp token Ably",
      },
      { status: 500 },
    )
  }
}
