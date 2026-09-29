import type { IncomingMessage, ServerResponse } from "node:http";

type ModelId = "standard" | "wavenet" | "neural2" | "chirp3hd";
type Gender = "FEMALE" | "MALE";

type RequestBody = {
  text?: unknown;
  model?: unknown;
  gender?: unknown;
  voiceName?: unknown;
  speakingRate?: unknown;
  website?: unknown;
  elapsedMs?: unknown;
  turnstileToken?: unknown;
};

type ApiRequest = IncomingMessage & { body?: RequestBody | string };
type ApiResponse = ServerResponse & {
  status: (statusCode: number) => ApiResponse;
  json: (data: unknown) => ApiResponse;
  send: (data: Buffer) => ApiResponse;
};

const VOICES: Record<ModelId, Record<Gender, readonly string[]>> = {
  standard: {
    FEMALE: ["ko-KR-Standard-A", "ko-KR-Standard-B"],
    MALE: ["ko-KR-Standard-C", "ko-KR-Standard-D"],
  },
  wavenet: {
    FEMALE: ["ko-KR-Wavenet-A", "ko-KR-Wavenet-B"],
    MALE: ["ko-KR-Wavenet-C", "ko-KR-Wavenet-D"],
  },
  neural2: {
    FEMALE: ["ko-KR-Neural2-A", "ko-KR-Neural2-B"],
    MALE: ["ko-KR-Neural2-C"],
  },
  chirp3hd: {
    FEMALE: [
      "ko-KR-Chirp3-HD-Achernar", "ko-KR-Chirp3-HD-Aoede",
      "ko-KR-Chirp3-HD-Autonoe", "ko-KR-Chirp3-HD-Callirrhoe",
      "ko-KR-Chirp3-HD-Despina", "ko-KR-Chirp3-HD-Erinome",
      "ko-KR-Chirp3-HD-Gacrux", "ko-KR-Chirp3-HD-Kore",
      "ko-KR-Chirp3-HD-Laomedeia", "ko-KR-Chirp3-HD-Leda",
      "ko-KR-Chirp3-HD-Pulcherrima", "ko-KR-Chirp3-HD-Sulafat",
      "ko-KR-Chirp3-HD-Vindemiatrix", "ko-KR-Chirp3-HD-Zephyr",
    ],
    MALE: [
      "ko-KR-Chirp3-HD-Achird", "ko-KR-Chirp3-HD-Algenib",
      "ko-KR-Chirp3-HD-Algieba", "ko-KR-Chirp3-HD-Alnilam",
      "ko-KR-Chirp3-HD-Charon", "ko-KR-Chirp3-HD-Enceladus",
      "ko-KR-Chirp3-HD-Fenrir", "ko-KR-Chirp3-HD-Iapetus",
      "ko-KR-Chirp3-HD-Orus", "ko-KR-Chirp3-HD-Puck",
      "ko-KR-Chirp3-HD-Rasalgethi", "ko-KR-Chirp3-HD-Sadachbia",
      "ko-KR-Chirp3-HD-Sadaltager", "ko-KR-Chirp3-HD-Schedar",
      "ko-KR-Chirp3-HD-Umbriel", "ko-KR-Chirp3-HD-Zubenelgenubi",
    ],
  },
};

// Secondary per-instance throttle. Turnstile is required for production deployments.
const recentRequests = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;
const MAX_CHARACTERS = 1200;
const MAX_TEXT_BYTES = 4900;

function fail(res: ApiResponse, status: number, error: string) {
  return res.status(status).json({ error });
}

function getClientIp(req: ApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim().slice(0, 64);
  }
  const realIp = req.headers["x-real-ip"];
  return typeof realIp === "string" ? realIp.slice(0, 64) : "unknown";
}

function allowRequest(ip: string, now: number) {
  const previous = recentRequests.get(ip) ?? [];
  const recent = previous.filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    recentRequests.set(ip, recent);
    return false;
  }

  recent.push(now);
  recentRequests.set(ip, recent);
  if (recentRequests.size > 5000) {
    const oldestIp = recentRequests.keys().next().value;
    if (oldestIp) recentRequests.delete(oldestIp);
  }
  return true;
}

async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const form = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "지원하지 않는 요청이에요.");
  }

  const originHeader = req.headers.origin;
  const forwardedHostHeader = req.headers["x-forwarded-host"];
  const hostHeader = typeof forwardedHostHeader === "string"
    ? forwardedHostHeader.split(",")[0].trim()
    : req.headers.host;

  if (typeof originHeader === "string" && typeof hostHeader !== "string") {
    return fail(res, 403, "요청 주소를 확인할 수 없어요.");
  }
  if (typeof originHeader === "string" && typeof hostHeader === "string") {
    try {
      if (new URL(originHeader).host !== hostHeader) {
        return fail(res, 403, "이 사이트에서 보낸 요청만 처리할 수 있어요.");
      }
    } catch {
      return fail(res, 403, "요청 주소를 확인할 수 없어요.");
    }
  }

  const ip = getClientIp(req);
  if (!allowRequest(ip, Date.now())) {
    return fail(res, 429, "요청이 잠시 몰렸어요. 10분 뒤 다시 시도해 주세요.");
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body) as RequestBody;
    } catch {
      return fail(res, 400, "요청 내용을 읽지 못했어요.");
    }
  }
  if (!body || typeof body !== "object") {
    return fail(res, 400, "요청 내용을 확인해 주세요.");
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return fail(res, 400, "요청을 처리할 수 없어요.");
  }

  if (typeof body.elapsedMs !== "number" || !Number.isFinite(body.elapsedMs) || body.elapsedMs < 1200) {
    return fail(res, 400, "잠시 후 다시 시도해 주세요.");
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return fail(res, 400, "읽을 문장을 입력해 주세요.");
  if (Array.from(text).length > MAX_CHARACTERS || Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) {
    return fail(res, 400, `한 번에 ${MAX_CHARACTERS.toLocaleString()}자까지 만들 수 있어요.`);
  }

  const model = body.model as ModelId;
  const gender = body.gender as Gender;
  const voiceName = typeof body.voiceName === "string" ? body.voiceName : "";
  const speakingRate = body.speakingRate;

  if (!Object.prototype.hasOwnProperty.call(VOICES, model) || !(gender === "FEMALE" || gender === "MALE")) {
    return fail(res, 400, "음성 설정을 다시 확인해 주세요.");
  }
  if (!VOICES[model][gender].includes(voiceName)) {
    return fail(res, 400, "선택한 음성을 사용할 수 없어요.");
  }
  if (typeof speakingRate !== "number" || !Number.isFinite(speakingRate) || speakingRate < 0.6 || speakingRate > 1.4) {
    return fail(res, 400, "속도는 0.6배에서 1.4배 사이로 설정해 주세요.");
  }

  try {
    if (process.env.VERCEL && !process.env.TURNSTILE_SECRET_KEY) {
      return fail(res, 503, "보안 확인 설정이 필요해요. 운영자에게 문의해 주세요.");
    }
    const validTurnstile = await verifyTurnstile(
      typeof body.turnstileToken === "string" ? body.turnstileToken : "",
      ip,
    );
    if (!validTurnstile) return fail(res, 403, "보안 확인을 마친 뒤 다시 시도해 주세요.");
  } catch {
    return fail(res, 503, "보안 확인을 할 수 없어요. 잠시 후 다시 시도해 주세요.");
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return fail(res, 503, "음성 서비스 설정이 필요해요. 운영자에게 문의해 주세요.");
  }

  try {
    const googleResponse = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "ko-KR", name: voiceName },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate,
        },
      }),
    });

    if (!googleResponse.ok) {
      return fail(res, 502, "음성을 만들지 못했어요. 모델이나 입력 문장을 확인해 주세요.");
    }

    const result = (await googleResponse.json()) as { audioContent?: string };
    if (!result.audioContent) return fail(res, 502, "음성 결과가 비어 있어요. 다시 시도해 주세요.");

    const audio = Buffer.from(result.audioContent, "base64");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audio.byteLength);
    res.setHeader("Content-Disposition", "inline; filename=voice.mp3");
    return res.status(200).send(audio);
  } catch {
    return fail(res, 502, "음성 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
}
