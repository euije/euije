import type { IncomingMessage, ServerResponse } from "node:http";

type ApiRequest = IncomingMessage & { url?: string };
type ApiResponse = ServerResponse & {
  status: (statusCode: number) => ApiResponse;
  json: (data: unknown) => ApiResponse;
};

function fail(res: ApiResponse, status: number, error: string) {
  return res.status(status).json({ error });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return fail(res, 405, "지원하지 않는 요청이에요.");
  }

  const origin = req.headers.origin;
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = typeof forwardedHost === "string"
    ? forwardedHost.split(",")[0].trim()
    : req.headers.host;
  if (typeof origin === "string") {
    try {
      if (typeof host !== "string" || new URL(origin).host !== host) {
        return fail(res, 403, "이 사이트에서 보낸 요청만 처리할 수 있어요.");
      }
    } catch {
      return fail(res, 403, "요청 주소를 확인할 수 없어요.");
    }
  }

  const url = new URL(req.url ?? "/api/voices", `https://${host || "localhost"}`);
  if (url.searchParams.get("provider") !== "elevenlabs") {
    return fail(res, 400, "선택한 음성 서비스를 사용할 수 없어요.");
  }
  const gender = url.searchParams.get("gender");
  if (gender !== "female" && gender !== "male") {
    return fail(res, 400, "음성 성별을 다시 확인해 주세요.");
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return fail(res, 503, "ElevenLabs API 키를 서버 환경 변수에 설정해 주세요.");

  try {
    const query = new URLSearchParams({
      language: "ko",
      gender,
      category: "premade",
      include_total_count: "false",
      page_size: "100",
    });
    const upstream = await fetch(`https://api.elevenlabs.io/v2/voices?${query.toString()}`, {
      headers: { "xi-api-key": apiKey },
    });
    if (!upstream.ok) return fail(res, 502, "ElevenLabs 음성 목록을 불러오지 못했어요.");

    const result = (await upstream.json()) as {
      voices?: Array<{ voice_id?: string; name?: string; labels?: Record<string, string> }>;
    };
    const voices = (result.voices ?? [])
      .filter((voice) => voice.voice_id && voice.name && voice.labels?.gender?.toLowerCase() === gender)
      .map((voice) => ({ id: voice.voice_id, name: voice.name }));
    return res.status(200).json({ voices });
  } catch {
    return fail(res, 502, "ElevenLabs 음성 목록을 불러오지 못했어요.");
  }
}
