import Ably from "ably"

let ablyClient: Ably.Realtime | null = null

export function createAblyClient() {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl: "/api/ably/token",
      autoConnect: true,
      closeOnUnload: true,
      recover: (_, cb) => cb(false),
    })
  }

  return ablyClient
}
