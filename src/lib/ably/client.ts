import Ably from "ably";

// Tạo Ably Realtime client cho phía browser
export function createAblyClient() {
  return new Ably.Realtime({
    key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
    clientId: "uniconnect-client",
  });
}
