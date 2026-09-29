import type { IncomingMessage, ServerResponse } from "node:http";

type ProviderId = "google" | "openrouter" | "azure" | "elevenlabs";
type Gender = "FEMALE" | "MALE";
type GoogleModel = "standard" | "wavenet" | "neural2" | "chirp3hd";

type RequestBody = {
  provider?: unknown;
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

const GOOGLE_VOICES: Record<GoogleModel, Record<Gender, readonly string[]>> = {
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
    FEMALE: ["Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome", "Gacrux", "Kore", "Laomedeia", "Leda", "Pulcherrima", "Sulafat", "Vindemiatrix", "Zephyr"].map((name) => `ko-KR-Chirp3-HD-${name}`),
    MALE: ["Achird", "Algenib", "Algieba", "Alnilam", "Charon", "Enceladus", "Fenrir", "Iapetus", "Orus", "Puck", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Umbriel", "Zubenelgenubi"].map((name) => `ko-KR-Chirp3-HD-${name}`),
  },
};

const GEMINI_VOICES: Record<Gender, readonly string[]> = {
  FEMALE: ["Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome", "Gacrux", "Kore", "Laomedeia", "Leda", "Pulcherrima", "Sulafat", "Vindemiatrix", "Zephyr"],
  MALE: ["Achird", "Algenib", "Algieba", "Alnilam", "Charon", "Enceladus", "Fenrir", "Iapetus", "Orus", "Puck", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Umbriel", "Zubenelgenubi"],
};

const AZURE_VOICES: Record<Gender, readonly string[]> = {
  FEMALE: ["ko-KR-SunHiNeural", "ko-KR-JiMinNeural", "ko-KR-SeoHyeonNeural", "ko-KR-SoonBokNeural", "ko-KR-YuJinNeural"],
  MALE: ["ko-KR-InJoonNeural", "ko-KR-BongJinNeural", "ko-KR-GookMinNeural", "ko-KR-HyunsuNeural"],
};

const GEMINI_TTS_MODELS = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"] as const;
const OPENROUTER_MODELS = [
  "fish-audio/s2.1-pro-free:free",
  "microsoft/mai-voice-2-flash",
] as const;
const OPENROUTER_VOICES: Record<string, Record<Gender, readonly string[]>> = {
  "fish-audio/s2.1-pro-free:free": {
    FEMALE: ["fish-default"],
    MALE: ["fish-default"],
  },
  "microsoft/mai-voice-2-flash": {
    FEMALE: ["ko-KR-Haena:MAI-Voice-2-Flash"],
    MALE: ["ko-KR-Junho:MAI-Voice-2-Flash"],
  },
};
const ELEVENLABS_MODELS = ["eleven_multilingual_v2", "eleven_flash_v2_5"] as const;
const CLOUD_PROVIDERS = new Set<ProviderId>(["google", "openrouter", "azure", "elevenlabs"]);

// Secondary per-instance throttle. Turnstile is required on Vercel deployments.
const recentRequests = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 200;
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

function sameSiteRequest(req: ApiRequest) {
  const origin = req.headers.origin;
  if (typeof origin !== "string") return true;

  const forwardedHost = req.headers["x-forwarded-host"];
  const host = typeof forwardedHost === "string"
    ? forwardedHost.split(",")[0].trim()
    : req.headers.host;
  if (typeof host !== "string") return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function escapeXml(text: string) {
  return text.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
    };
    return replacements[character];
  });
}

async function isPremadeVoiceAllowed(apiKey: string, voiceId: string, gender: Gender) {
  const query = new URLSearchParams({
    gender: gender.toLowerCase(),
    category: "premade",
    page_size: "100",
    include_total_count: "false",
  });
  const response = await fetch(`https://api.elevenlabs.io/v2/voices?${query.toString()}`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) return false;
  const result = (await response.json()) as {
    voices?: Array<{ voice_id?: string; labels?: Record<string, string> }>;
  };
  return (result.voices ?? []).some((voice) =>
    voice.voice_id === voiceId && voice.labels?.gender?.toLowerCase() === gender.toLowerCase(),
  );
}

async function sendAudio(upstream: Response, res: ApiResponse) {
  if (!upstream.ok) return fail(res, 502, "음성을 만들지 못했어요. 설정과 입력 문장을 확인해 주세요.");
  const audio = Buffer.from(await upstream.arrayBuffer());
  if (audio.byteLength === 0) return fail(res, 502, "음성 결과가 비어 있어요. 다시 시도해 주세요.");
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", audio.byteLength);
  res.setHeader("Content-Disposition", "inline; filename=voice.mp3");
  return res.status(200).send(audio);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "지원하지 않는 요청이에요.");
  }
  if (!sameSiteRequest(req)) return fail(res, 403, "이 사이트에서 보낸 요청만 처리할 수 있어요.");

  const ip = getClientIp(req);

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body) as RequestBody;
    } catch {
      return fail(res, 400, "요청 내용을 읽지 못했어요.");
    }
  }
  if (!body || typeof body !== "object") return fail(res, 400, "요청 내용을 확인해 주세요.");
  if (typeof body.website === "string" && body.website.trim()) return fail(res, 400, "요청을 처리할 수 없어요.");
  if (typeof body.elapsedMs !== "number" || !Number.isFinite(body.elapsedMs) || body.elapsedMs < 1200) {
    return fail(res, 400, "잠시 후 다시 시도해 주세요.");
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return fail(res, 400, "읽을 문장을 입력해 주세요.");
  if (Array.from(text).length > MAX_CHARACTERS || Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) {
    return fail(res, 400, `한 번에 ${MAX_CHARACTERS.toLocaleString()}자까지 만들 수 있어요.`);
  }

  const provider = body.provider as ProviderId;
  const model = typeof body.model === "string" ? body.model : "";
  const gender = body.gender as Gender;
  const voiceName = typeof body.voiceName === "string" ? body.voiceName : "";
  const speakingRate = body.speakingRate;
  if (!CLOUD_PROVIDERS.has(provider)) {
    return fail(res, 400, "선택한 음성 서비스를 사용할 수 없어요.");
  }
  if (!(gender === "FEMALE" || gender === "MALE")) return fail(res, 400, "음성 성별을 다시 확인해 주세요.");
  if (typeof speakingRate !== "number" || !Number.isFinite(speakingRate) || speakingRate < 0.7 || speakingRate > 1.2) {
    return fail(res, 400, "속도는 0.7배에서 1.2배 사이로 설정해 주세요.");
  }

  let voiceIsAllowed = false;
  if (provider === "google" && (GEMINI_TTS_MODELS as readonly string[]).includes(model)) {
    voiceIsAllowed = GEMINI_VOICES[gender].includes(voiceName);
  } else if (provider === "google" && Object.prototype.hasOwnProperty.call(GOOGLE_VOICES, model)) {
    voiceIsAllowed = GOOGLE_VOICES[model as GoogleModel][gender].includes(voiceName);
  } else if (provider === "openrouter" && (OPENROUTER_MODELS as readonly string[]).includes(model)) {
    voiceIsAllowed = OPENROUTER_VOICES[model][gender].includes(voiceName);
  } else if (provider === "azure" && model === "neural") {
    voiceIsAllowed = AZURE_VOICES[gender].includes(voiceName);
  } else if (provider === "elevenlabs" && (ELEVENLABS_MODELS as readonly string[]).includes(model)) {
    voiceIsAllowed = /^[A-Za-z0-9_-]{8,100}$/.test(voiceName);
  }
  if (!voiceIsAllowed) return fail(res, 400, "선택한 모델이나 음성을 사용할 수 없어요.");

  try {
    if (process.env.VERCEL && !process.env.TURNSTILE_SECRET_KEY) {
      return fail(res, 503, "보안 확인 설정이 필요해요. 운영자에게 문의해 주세요.");
    }
    const validTurnstile = await verifyTurnstile(
      typeof body.turnstileToken === "string" ? body.turnstileToken : "",
      ip,
    );
    if (!validTurnstile) return fail(res, 403, "보안 확인을 마친 뒤 다시 시도해 주세요.");
    if (!allowRequest(ip, Date.now())) {
      return fail(res, 429, "10분 동안 생성할 수 있는 횟수를 넘었어요. 잠시 뒤 다시 시도해 주세요.");
    }
  } catch {
    return fail(res, 503, "보안 확인을 할 수 없어요. 잠시 후 다시 시도해 주세요.");
  }

  try {
    if (provider === "google") {
      if ((GEMINI_TTS_MODELS as readonly string[]).includes(model)) {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_TTS_API_KEY;
        if (!apiKey) return fail(res, 503, "Google Gemini API (구글 제미나이 API) 키를 서버 설정에 등록해 주세요.");
        const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            model,
            input: [{
              type: "user_input",
              content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: "Read this Korean text naturally." }] }],
            }],
            response_format: { type: "audio", mime_type: "audio/wav" },
            generation_config: { speech_config: [{ voice: voiceName }] },
          }),
        });
        if (!geminiResponse.ok) return fail(res, 502, "Google Gemini (구글 제미나이)에서 음성을 만들지 못했어요. API 키와 모델 사용 권한을 확인해 주세요.");
        const result = (await geminiResponse.json()) as { output_audio?: { data?: string } };
        if (!result.output_audio?.data) return fail(res, 502, "Google Gemini (구글 제미나이) 음성 결과가 비어 있어요.");
        const audio = Buffer.from(result.output_audio.data, "base64");
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", audio.byteLength);
        res.setHeader("Content-Disposition", "inline; filename=voice.wav");
        return res.status(200).send(audio);
      }

      const apiKey = process.env.GOOGLE_TTS_API_KEY;
      if (!apiKey) return fail(res, 503, "Google Cloud (구글 클라우드) API 키를 서버 설정에 등록해 주세요.");
      const googleResponse = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "ko-KR", name: voiceName },
          audioConfig: { audioEncoding: "MP3", speakingRate },
        }),
      });
      if (!googleResponse.ok) return fail(res, 502, "Google Cloud (구글 클라우드)에서 음성을 만들지 못했어요.");
      const result = (await googleResponse.json()) as { audioContent?: string };
      if (!result.audioContent) return fail(res, 502, "Google Cloud (구글 클라우드) 음성 결과가 비어 있어요.");
      const audio = Buffer.from(result.audioContent, "base64");
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audio.byteLength);
      res.setHeader("Content-Disposition", "inline; filename=voice.mp3");
      return res.status(200).send(audio);
    }

    if (provider === "openrouter") {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return fail(res, 503, "OpenRouter (오픈라우터) API 키를 서버 설정에 등록해 주세요.");
      const usesDefaultVoice = model === "fish-audio/s2.1-pro-free:free";
      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          input: text,
          ...(!usesDefaultVoice && { voice: voiceName }),
          response_format: "mp3",
          ...(model === "microsoft/mai-voice-2-flash" && { speed: speakingRate }),
        }),
      });
      return await sendAudio(openRouterResponse, res);
    }

    if (provider === "azure") {
      const apiKey = process.env.AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_KEY2;
      if (!apiKey) return fail(res, 503, "Azure Speech (애저 음성) 키를 서버 설정에 등록해 주세요.");
      const region = (process.env.AZURE_SPEECH_REGION || "koreacentral").toLowerCase();
      if (!/^[a-z0-9-]+$/.test(region)) return fail(res, 500, "Azure Speech (애저 음성) 지역 설정을 확인해 주세요.");
      const ssml = `<speak version="1.0" xml:lang="ko-KR"><voice name="${voiceName}" xml:lang="ko-KR"><prosody rate="${Math.round((speakingRate - 1) * 100)}%">${escapeXml(text)}</prosody></voice></speak>`;
      const azureResponse = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "sorigyeol",
        },
        body: ssml,
      });
      return await sendAudio(azureResponse, res);
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return fail(res, 503, "ElevenLabs (일레븐랩스) API 키를 서버 설정에 등록해 주세요.");
    if (!await isPremadeVoiceAllowed(apiKey, voiceName, gender)) {
      return fail(res, 400, "선택한 성별의 기본 음성 목록에서 목소리를 골라 주세요.");
    }
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceName)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: { speed: speakingRate },
        }),
      },
    );
    return await sendAudio(elevenLabsResponse, res);
  } catch {
    return fail(res, 502, "음성 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
}
