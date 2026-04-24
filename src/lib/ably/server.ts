import Ably from "ably"

let ablyRestInstance: Ably.Rest | null = null

function getAblyApiKey() {
  const apiKey = process.env.ABLY_API_KEY ?? process.env.NEXT_PUBLIC_ABLY_API_KEY

  if (!apiKey) {
    throw new Error("Thiếu ABLY_API_KEY")
  }

  return apiKey
}

export function getAblyRestClient() {
  if (!ablyRestInstance) {
    ablyRestInstance = new Ably.Rest({
      key: getAblyApiKey(),
    })
  }

  return ablyRestInstance
}
