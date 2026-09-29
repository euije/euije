import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { addId3Metadata, createMp3Filename } from "./mp3-metadata";
import "./App.css";

type ProviderId = "google" | "openrouter" | "azure" | "elevenlabs" | "supertonic";
type Gender = "FEMALE" | "MALE";

type Voice = {
  id: string;
  name: string;
};

const VOICE_NAME_TRANSLATIONS: Record<string, string> = {
  "Standard A": "표준 A", "Standard B": "표준 B", "Standard C": "표준 C", "Standard D": "표준 D",
  "WaveNet A": "웨이브넷 A", "WaveNet B": "웨이브넷 B", "WaveNet C": "웨이브넷 C", "WaveNet D": "웨이브넷 D",
  "Neural2 A": "뉴럴 2 A", "Neural2 B": "뉴럴 2 B", "Neural2 C": "뉴럴 2 C",
  Achernar: "아케르나르", Aoede: "아오이데", Autonoe: "아우토노에", Callirrhoe: "칼리로에",
  Despina: "데스피나", Erinome: "에리노메", Gacrux: "가크럭스", Kore: "코레",
  Laomedeia: "라오메데이아", Leda: "레다", Pulcherrima: "풀케리마", Sulafat: "술라파트",
  Vindemiatrix: "빈데미아트릭스", Zephyr: "제퍼", Achird: "아키르드", Algenib: "알게니브",
  Algieba: "알기에바", Alnilam: "알닐람", Charon: "카론", Enceladus: "엔셀라두스",
  Fenrir: "펜리르", Iapetus: "이아페투스", Orus: "오루스", Puck: "퍽",
  Rasalgethi: "라살게티", Sadachbia: "사다크비아", Sadaltager: "사달타게르",
  Schedar: "스케다르", Umbriel: "엄브리엘", Zubenelgenubi: "주벤엘게누비",
  SunHi: "선희", JiMin: "지민", SeoHyeon: "서현", SoonBok: "순복", YuJin: "유진",
  InJoon: "인준", BongJin: "봉진", GookMin: "국민", Hyunsu: "현수",
  Haena: "해나", Junho: "준호", F1: "여성 음성 1번", F2: "여성 음성 2번",
  F3: "여성 음성 3번", F4: "여성 음성 4번", F5: "여성 음성 5번",
  M1: "남성 음성 1번", M2: "남성 음성 2번", M3: "남성 음성 3번",
  M4: "남성 음성 4번", M5: "남성 음성 5번",
  Adam: "애덤", Alice: "앨리스", Aria: "아리아", Bella: "벨라", Bill: "빌",
  Brian: "브라이언", Callum: "캘럼", Charlie: "찰리", Charlotte: "샬럿", Chris: "크리스",
  Daniel: "다니엘", Eric: "에릭", George: "조지", Grace: "그레이스", Harry: "해리",
  Jessica: "제시카", Laura: "로라", Liam: "리암", Lily: "릴리", Matilda: "마틸다",
  Nicole: "니콜", Patrick: "패트릭", Rachel: "레이첼", Roger: "로저", Sam: "샘",
  Sarah: "사라", Will: "윌",
};

function voiceLabel(name: string) {
  const shortName = name.split(" - ")[0].trim();
  return `${shortName} (${VOICE_NAME_TRANSLATIONS[shortName] ?? "한국어 음성"})`;
}

const GOOGLE_VOICES: Record<"standard" | "wavenet" | "neural2" | "chirp3hd", Record<Gender, Voice[]>> = {
  standard: {
    FEMALE: [{ id: "ko-KR-Standard-A", name: voiceLabel("Standard A") }, { id: "ko-KR-Standard-B", name: voiceLabel("Standard B") }],
    MALE: [{ id: "ko-KR-Standard-C", name: voiceLabel("Standard C") }, { id: "ko-KR-Standard-D", name: voiceLabel("Standard D") }],
  },
  wavenet: {
    FEMALE: [{ id: "ko-KR-Wavenet-A", name: voiceLabel("WaveNet A") }, { id: "ko-KR-Wavenet-B", name: voiceLabel("WaveNet B") }],
    MALE: [{ id: "ko-KR-Wavenet-C", name: voiceLabel("WaveNet C") }, { id: "ko-KR-Wavenet-D", name: voiceLabel("WaveNet D") }],
  },
  neural2: {
    FEMALE: [{ id: "ko-KR-Neural2-A", name: voiceLabel("Neural2 A") }, { id: "ko-KR-Neural2-B", name: voiceLabel("Neural2 B") }],
    MALE: [{ id: "ko-KR-Neural2-C", name: voiceLabel("Neural2 C") }],
  },
  chirp3hd: {
    FEMALE: ["Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome", "Gacrux", "Kore", "Laomedeia", "Leda", "Pulcherrima", "Sulafat", "Vindemiatrix", "Zephyr"].map((name) => ({ id: `ko-KR-Chirp3-HD-${name}`, name: voiceLabel(name) })),
    MALE: ["Achird", "Algenib", "Algieba", "Alnilam", "Charon", "Enceladus", "Fenrir", "Iapetus", "Orus", "Puck", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Umbriel", "Zubenelgenubi"].map((name) => ({ id: `ko-KR-Chirp3-HD-${name}`, name: voiceLabel(name) })),
  },
};

const GEMINI_VOICES: Record<Gender, Voice[]> = {
  FEMALE: ["Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome", "Gacrux", "Kore", "Laomedeia", "Leda", "Pulcherrima", "Sulafat", "Vindemiatrix", "Zephyr"].map((name) => ({ id: name, name: voiceLabel(name) })),
  MALE: ["Achird", "Algenib", "Algieba", "Alnilam", "Charon", "Enceladus", "Fenrir", "Iapetus", "Orus", "Puck", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Umbriel", "Zubenelgenubi"].map((name) => ({ id: name, name: voiceLabel(name) })),
};

const AZURE_VOICES: Record<Gender, Voice[]> = {
  FEMALE: ["SunHi", "JiMin", "SeoHyeon", "SoonBok", "YuJin"].map((name) => ({ id: `ko-KR-${name}Neural`, name: voiceLabel(name) })),
  MALE: ["InJoon", "BongJin", "GookMin", "Hyunsu"].map((name) => ({ id: `ko-KR-${name}Neural`, name: voiceLabel(name) })),
};

type ModelChoice = {
  id: string;
  label: string;
  detail: string;
  price: string;
  supportsSpeed?: boolean;
  speedMin?: number;
  speedMax?: number;
  speedStep?: number;
};

type ScriptPart = {
  id: string;
  text: string;
  audioUrl: string | null;
  downloadUrl: string | null;
  isLoading: boolean;
  error: string;
};

type ScriptGroup = {
  id: string;
  sourceName: string;
  kind: "manual" | "file" | "sample";
  sourceText: string;
  parts: ScriptPart[];
};

const OPENROUTER_VOICES: Record<string, Record<Gender, Voice[]>> = {
  "google/gemini-3.8-flash-tts": GEMINI_VOICES,
  "google/gemini-3.8-flash-lite-tts": GEMINI_VOICES,
  "fish-audio/s2.1-pro-free:free": {
    FEMALE: [{ id: "fish-default", name: "모델 기본 음성" }],
    MALE: [{ id: "fish-default", name: "모델 기본 음성" }],
  },
  "microsoft/mai-voice-2-flash": {
    FEMALE: [{ id: "ko-KR-Haena:MAI-Voice-2-Flash", name: voiceLabel("Haena") }],
    MALE: [{ id: "ko-KR-Junho:MAI-Voice-2-Flash", name: voiceLabel("Junho") }],
  },
};

const MODEL_OPTIONS: Record<ProviderId, ModelChoice[]> = {
  google: [
    { id: "standard", label: "Standard (표준 음성)", detail: "가볍게 시작", price: "월 400만 자 무료 · 이후 100만 자당 미화 4달러", speedMin: 0.25, speedMax: 2 },
    { id: "neural2", label: "Neural2 (뉴럴 2)", detail: "균형 잡힌 음성", price: "월 100만 자 무료 · 이후 100만 자당 미화 16달러", speedMin: 0.25, speedMax: 2 },
    { id: "wavenet", label: "WaveNet (웨이브넷)", detail: "자연스러운 합성 음성", price: "월 100만 자 무료 · 이후 100만 자당 미화 16달러", speedMin: 0.25, speedMax: 2 },
    { id: "chirp3hd", label: "Chirp 3 HD (처프 3 고음질)", detail: "생성형 음성", price: "월 100만 자 무료 · 이후 100만 자당 미화 30달러", speedMin: 0.25, speedMax: 2 },
  ],
  openrouter: [
    { id: "google/gemini-3.8-flash-lite-tts", label: "Gemini 3.8 Flash-Lite TTS (제미나이 고속·경량 음성)", detail: "빠르고 비용 효율적", price: "입력 100만 토큰당 미화 0.50달러 · 음성 출력 100만 토큰당 미화 6달러", supportsSpeed: false },
    { id: "google/gemini-3.8-flash-tts", label: "Gemini 3.8 Flash TTS (제미나이 고음질 음성)", detail: "표현력과 음성 품질 중심", price: "입력 100만 토큰당 미화 0.50달러 · 음성 출력 100만 토큰당 미화 9달러", supportsSpeed: false },
    { id: "fish-audio/s2.1-pro-free:free", label: "Fish Audio S2.1 Pro Free (피시 오디오 S2.1 프로 무료 모델)", detail: "무료 · 한국어 포함 83개 언어", price: "무료 · 사용량 정책 적용", supportsSpeed: false },
    { id: "microsoft/mai-voice-2-flash", label: "MAI Voice-2 Flash (마이 음성 2 플래시)", detail: "한국어 Haena (해나) · Junho (준호)", price: "100만 자당 미화 15달러", speedMin: 0.5, speedMax: 2 },
  ],
  azure: [
    { id: "neural", label: "Azure Neural (애저 신경망 음성)", detail: "한국어 신경망 음성", price: "Azure (애저) 사용량 기준 · 지역별 요금", speedMin: 0.5, speedMax: 2 },
  ],
  elevenlabs: [
    { id: "eleven_multilingual_v2", label: "Multilingual v2 (다국어 버전 2)", detail: "다국어 음성", price: "계정에 남은 크레딧에서 차감", speedMin: 0.7, speedMax: 1.2 },
    { id: "eleven_flash_v2_5", label: "Flash v2.5 (빠른 합성 버전 2.5)", detail: "빠른 합성", price: "계정에 남은 크레딧에서 차감", speedMin: 0.7, speedMax: 1.2 },
  ],
  supertonic: [
    { id: "supertonic-3", label: "Supertonic 3 (수퍼토닉 3)", detail: "기기에서 직접 생성", price: "최초 다운로드 약 400MB (400메가바이트) · 이후 저장된 모델 사용" },
  ],
};

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "google", label: "Google Cloud (구글 클라우드)" },
  { id: "openrouter", label: "OpenRouter (오픈라우터)" },
  { id: "azure", label: "Azure Speech (애저 음성)" },
  { id: "elevenlabs", label: "ElevenLabs (일레븐랩스)" },
];

const SUPERTONIC_VOICES: Record<Gender, Voice[]> = {
  FEMALE: ["F1", "F2", "F3", "F4", "F5"].map((name) => ({ id: name, name: voiceLabel(name) })),
  MALE: ["M1", "M2", "M3", "M4", "M5"].map((name) => ({ id: name, name: voiceLabel(name) })),
};

const DEFAULT_MODELS: Record<ProviderId, string> = {
  google: "neural2",
  openrouter: "microsoft/mai-voice-2-flash",
  azure: "neural",
  elevenlabs: "eleven_multilingual_v2",
  supertonic: "supertonic-3",
};

const MAX_CHARACTERS = 5000;
const GOOGLE_CLOUD_MAX_TEXT_BYTES = 5000;
const UTF8_ENCODER = new TextEncoder();
const SAMPLE_SENTENCES = [
  "안녕하세요. 오늘도 천천히, 편안한 하루 보내세요.",
  "따뜻한 차 한 잔과 함께 잠시 쉬어 가도 괜찮아요.",
  "오늘 할 일을 하나씩 마치면 하루가 한결 가벼워질 거예요.",
];
const SPLIT_TEST_TEXT = Array.from({ length: 180 }, (_, index) =>
  `${index + 1}번째 문장입니다. 편안한 목소리로 읽을 수 있도록 긴 문장 분할을 확인합니다.`,
).join(" ");
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
const TURNSTILE_SESSION_STORAGE_KEY = "tts-turnstile-session-expires";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createScriptPart(text: string): ScriptPart {
  return { id: createId("part"), text, audioUrl: null, downloadUrl: null, isLoading: false, error: "" };
}

function splitTextIntoChunks(text: string, provider: ProviderId) {
  const characters = Array.from(text.replace(/\r\n?/g, "\n").trim());
  if (!characters.length) return [""];

  const maxBytes = provider === "google" ? GOOGLE_CLOUD_MAX_TEXT_BYTES : Number.POSITIVE_INFINITY;
  const byteLengths = characters.map((character) => UTF8_ENCODER.encode(character).length);
  const chunks: string[] = [];
  let start = 0;

  while (start < characters.length) {
    let end = start;
    let bytes = 0;
    while (end < characters.length && end - start < MAX_CHARACTERS && bytes + byteLengths[end] <= maxBytes) {
      bytes += byteLengths[end];
      end += 1;
    }
    if (end === start) end += 1;
    let cut = end;

    if (end < characters.length) {
      for (let index = end - 1; index > start; index -= 1) {
        if (/[.!?。！？\n]/.test(characters[index])) {
          cut = index + 1;
          break;
        }
      }
      if (cut === end) {
        for (let index = end - 1; index > start; index -= 1) {
          if (/\s/.test(characters[index])) {
            cut = index;
            break;
          }
        }
      }
      if (cut <= start) cut = end;
    }

    const chunk = characters.slice(start, cut).join("").trim();
    if (chunk) chunks.push(chunk);
    start = cut;
    while (start < characters.length && /\s/.test(characters[start])) start += 1;
  }

  return chunks.length ? chunks : [""];
}

function createScriptGroup(sourceName: string, kind: ScriptGroup["kind"], sourceText: string, provider: ProviderId): ScriptGroup {
  return {
    id: createId(kind),
    sourceName,
    kind,
    sourceText,
    parts: splitTextIntoChunks(sourceText, provider).map(createScriptPart),
  };
}

function textExceedsLimit(text: string, provider: ProviderId) {
  const trimmed = text.trim();
  return Array.from(trimmed).length > MAX_CHARACTERS || (
    provider === "google" && UTF8_ENCODER.encode(trimmed).length > GOOGLE_CLOUD_MAX_TEXT_BYTES
  );
}

async function readTextFile(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let text: string;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    text = new TextDecoder("utf-16le").decode(bytes.subarray(2));
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    text = new TextDecoder("utf-16be").decode(bytes.subarray(2));
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder("euc-kr").decode(buffer);
    }
  }
  return text.replace(/^\uFEFF/, "");
}

function readTurnstileSessionExpiry() {
  try {
    const expiresAt = Number(window.sessionStorage.getItem(TURNSTILE_SESSION_STORAGE_KEY));
    return Number.isFinite(expiresAt) && expiresAt > Date.now() ? expiresAt : 0;
  } catch {
    return 0;
  }
}

function storeTurnstileSessionExpiry(expiresAt: number) {
  try {
    window.sessionStorage.setItem(TURNSTILE_SESSION_STORAGE_KEY, String(expiresAt));
  } catch {
    // The signed server cookie still works if session storage is unavailable.
  }
}

function clearTurnstileSessionExpiry() {
  try {
    window.sessionStorage.removeItem(TURNSTILE_SESSION_STORAGE_KEY);
  } catch {
    // The session will expire on the server even if local storage is unavailable.
  }
}

function getStaticVoices(provider: ProviderId, model: string, gender: Gender) {
  if (provider === "google") {
    return GOOGLE_VOICES[model as keyof typeof GOOGLE_VOICES][gender];
  }
  if (provider === "openrouter") return OPENROUTER_VOICES[model]?.[gender] ?? [];
  if (provider === "azure") return AZURE_VOICES[gender];
  if (provider === "supertonic") return SUPERTONIC_VOICES[gender];
  return [];
}

function providerInfoLabel(provider: ProviderId) {
  if (provider === "supertonic") return "Supertonic 3 (수퍼토닉 3) · 이 기기";
  return PROVIDERS.find((item) => item.id === provider)?.label ?? "음성 서비스";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          language?: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (errorCode?: number | string) => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

function Icon({ name }: { name: "spark" | "download" | "play" | "arrow" }) {
  if (name === "download") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2.75v9.5m0 0 3.5-3.5M10 12.25l-3.5-3.5M3.5 14.75v1.5h13v-1.5" />
      </svg>
    );
  }
  if (name === "play") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="m7 4.5 8 5.5-8 5.5v-11Z" />
      </svg>
    );
  }
  if (name === "arrow") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4.5 10h10m-4-4 4 4-4 4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m10 2.5 1.45 4.55L16 8.5l-4.55 1.45L10 14.5l-1.45-4.55L4 8.5l4.55-1.45L10 2.5Z" />
      <path d="m15.5 13 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
    </svg>
  );
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/tts") {
    return (
      <main className="route-not-found">
        <h1>페이지를 찾을 수 없습니다.</h1>
        <a href="/tts">텍스트-스피치 열기</a>
      </main>
    );
  }
  return <TtsApp />;
}

function TtsApp() {
  const [scriptGroups, setScriptGroups] = useState<ScriptGroup[]>(() => [createScriptGroup("", "manual", "", "google")]);
  const [provider, setProvider] = useState<ProviderId>("google");
  const [model, setModel] = useState(DEFAULT_MODELS.google);
  const [gender, setGender] = useState<Gender>("FEMALE");
  const [voiceName, setVoiceName] = useState(GOOGLE_VOICES.neural2.FEMALE[0].id);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [generationNote, setGenerationNote] = useState("");
  const [error, setError] = useState("");
  const [elevenVoices, setElevenVoices] = useState<Voice[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(() => performance.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileSessionExpiresAt, setTurnstileSessionExpiresAt] = useState(readTurnstileSessionExpiry);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const turnstileWidgetIdRef = useRef<string | undefined>(undefined);
  const objectUrlsRef = useRef(new Set<string>());
  const modelOptions = MODEL_OPTIONS[provider];
  const modelInfo = modelOptions.find((item) => item.id === model) ?? modelOptions[0];
  const speedSupported = modelInfo.supportsSpeed !== false;
  const speedMin = speedSupported ? (modelInfo.speedMin ?? 0.7) : 1;
  const speedMax = speedSupported ? (modelInfo.speedMax ?? 1.2) : 1;
  const speedStep = modelInfo.speedStep ?? 0.05;
  const genderSupported = !(provider === "openrouter" && model === "fish-audio/s2.1-pro-free:free");
  const hasTurnstileSession = turnstileSessionExpiresAt > Date.now();
  const voices = provider === "elevenlabs" ? elevenVoices : getStaticVoices(provider, model, gender);
  const characterLimit = MAX_CHARACTERS;
  const hasGoogleCloudByteLimit = provider === "google";
  const selectedVoiceLabel = voices.find((voice) => voice.id === voiceName)?.name ?? voiceName;

  useEffect(() => {
    if (turnstileSessionExpiresAt <= 0) return;
    const delay = Math.max(0, turnstileSessionExpiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setTurnstileSessionExpiresAt(0);
      clearTurnstileSessionExpiry();
      setTurnstileToken("");
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [turnstileSessionExpiresAt]);

  useEffect(() => {
    setSpeed((current) => Math.min(speedMax, Math.max(speedMin, current)));
  }, [speedMin, speedMax]);

  useEffect(() => () => {
    Array.from(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  const createTrackedUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  };

  const revokeTrackedUrl = (url: string | null) => {
    if (!url || !objectUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  };

  const clearPartAudio = (part: ScriptPart) => {
    revokeTrackedUrl(part.audioUrl);
    revokeTrackedUrl(part.downloadUrl);
  };

  const clearAudio = () => {
    for (const group of scriptGroups) {
      for (const part of group.parts) clearPartAudio(part);
    }
    setScriptGroups((current) => current.map((group) => ({
      ...group,
      parts: group.parts.map((part) => ({ ...part, audioUrl: null, downloadUrl: null, error: "" })),
    })));
  };

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;
    const container = turnstileRef.current;
    let widgetId: string | undefined;
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");

    const renderWidget = () => {
      if (!window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        language: "ko",
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": (errorCode) => {
          setTurnstileToken("");
          setError(errorCode === 110200 || errorCode === "110200"
            ? "현재 웹사이트 주소가 보안 확인 허용 목록에 없습니다. 관리자에게 문의해 주세요."
            : "보안 확인을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.");
        },
      });
      turnstileWidgetIdRef.current = widgetId;
    };

    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      script.addEventListener("load", renderWidget);
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      script.addEventListener("load", renderWidget);
    }

    return () => {
      script?.removeEventListener("load", renderWidget);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      turnstileWidgetIdRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (provider !== "elevenlabs") {
      setElevenVoices([]);
      setVoiceLoading(false);
      return;
    }

    let active = true;
    setVoiceLoading(true);
    setError("");
    fetch(`/api/voices?provider=elevenlabs&gender=${gender.toLowerCase()}`)
      .then(async (response) => {
        const result = (await response.json()) as { voices?: Voice[]; error?: string };
        if (!response.ok) throw new Error(result.error || "ElevenLabs (일레븐랩스) 음성을 불러오지 못했어요.");
        return result.voices ?? [];
      })
      .then((items) => {
        if (!active) return;
        setElevenVoices(items.map((voice) => ({ ...voice, name: voiceLabel(voice.name) })));
        setVoiceName((current) => items.some((voice) => voice.id === current) ? current : items[0]?.id ?? "");
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "ElevenLabs (일레븐랩스) 음성을 불러오지 못했어요.");
      })
      .finally(() => {
        if (active) setVoiceLoading(false);
      });

    return () => { active = false; };
  }, [provider, gender]);

  const updatePart = (groupId: string, partId: string, update: (part: ScriptPart) => ScriptPart) => {
    setScriptGroups((current) => current.map((group) => group.id !== groupId ? group : {
      ...group,
      parts: group.parts.map((part) => part.id === partId ? update(part) : part),
    }));
  };

  const updatePartText = (groupId: string, partId: string, value: string) => {
    const oldPart = scriptGroups.find((group) => group.id === groupId)?.parts.find((part) => part.id === partId);
    if (oldPart) clearPartAudio(oldPart);
    setScriptGroups((current) => current.map((group) => {
      if (group.id !== groupId) return group;
      const parts = group.parts.map((part) => part.id === partId
        ? { ...part, text: value, audioUrl: null, downloadUrl: null, error: "" }
        : part);
      return { ...group, sourceText: parts.map((part) => part.text).join("\n\n"), parts };
    }));
    setError("");
  };

  const addManualGroup = () => {
    setScriptGroups((current) => [...current, createScriptGroup("", "manual", "", provider)]);
  };

  const insertTestSentence = (number: number, sampleText: string) => {
    clearAudio();
    const group = createScriptGroup(`테스트 문장 ${number}.txt`, "sample", sampleText, provider);
    setScriptGroups((current) => {
      const replaceIndex = current.findIndex((item) => item.kind === "sample") >= 0
        ? current.findIndex((item) => item.kind === "sample")
        : current.findIndex((item) => item.kind === "manual" && !item.sourceText.trim() && item.parts.every((part) => !part.text.trim()));
      if (replaceIndex < 0) return [...current, group];
      return current.map((item, index) => index === replaceIndex ? group : item);
    });
    setError("");
  };

  const handleTextFiles = async (files: File[]) => {
    if (loading || isReadingFiles || files.length === 0) return;
    const textFiles = files.filter((file) => file.name.toLowerCase().endsWith(".txt"));
    let rejectedCount = files.length - textFiles.length;
    if (textFiles.length === 0) {
      setError("텍스트 파일(.txt)을 선택해 주세요.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsReadingFiles(true);
    setError("");
    const imported: ScriptGroup[] = [];
    for (let index = 0; index < textFiles.length; index += 1) {
      const file = textFiles[index];
      setGenerationNote(`텍스트 파일을 읽고 있어요 (${index + 1}/${textFiles.length})`);
      try {
        const sourceText = await readTextFile(file);
        imported.push(createScriptGroup(file.name, "file", sourceText, provider));
      } catch {
        rejectedCount += 1;
      }
    }

    if (imported.length > 0) {
      clearAudio();
      setScriptGroups((current) => {
        const keep = current.filter((group) => !(group.kind === "manual" && !group.sourceText.trim() && group.parts.every((part) => !part.text.trim())));
        return [...keep, ...imported];
      });
    }
    if (rejectedCount > 0) setError("일부 파일을 읽지 못했어요. .txt 파일인지 확인해 주세요.");
    setGenerationNote("");
    setIsReadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeScriptGroup = (groupId: string) => {
    const removed = scriptGroups.find((group) => group.id === groupId);
    removed?.parts.forEach(clearPartAudio);
    setScriptGroups((current) => {
      const remaining = current.filter((group) => group.id !== groupId);
      return remaining.length > 0 ? remaining : [createScriptGroup("", "manual", "", provider)];
    });
  };

  const repartitionGroups = (nextProvider: ProviderId) => {
    clearAudio();
    setScriptGroups((current) => current.map((group) => ({
      ...group,
      parts: splitTextIntoChunks(group.sourceText, nextProvider).map(createScriptPart),
    })));
  };

  const chooseProvider = (nextProvider: ProviderId) => {
    setProvider(nextProvider);
    setModel(DEFAULT_MODELS[nextProvider]);
    setVoiceName(getStaticVoices(nextProvider, DEFAULT_MODELS[nextProvider], gender)[0]?.id ?? "");
    setElevenVoices([]);
    setError("");
    repartitionGroups(nextProvider);
  };

  const chooseModel = (nextModel: string) => {
    setModel(nextModel);
    if (provider !== "elevenlabs") {
      setVoiceName(getStaticVoices(provider, nextModel, gender)[0]?.id ?? "");
    }
    setError("");
    clearAudio();
  };

  const chooseGender = (nextGender: Gender) => {
    setGender(nextGender);
    setVoiceName(getStaticVoices(provider, model, nextGender)[0]?.id ?? "");
    setError("");
    clearAudio();
  };

  const generateParts = async (requestedJobs: { groupId: string; partId: string }[]) => {
    if (loading || voiceLoading || !voiceName) return;
    const jobs = requestedJobs.flatMap(({ groupId, partId }) => {
      const group = scriptGroups.find((item) => item.id === groupId);
      const partIndex = group?.parts.findIndex((item) => item.id === partId) ?? -1;
      const part = group?.parts[partIndex];
      if (!group || !part || !part.text.trim() || textExceedsLimit(part.text, provider)) return [];
      return [{ groupId, partId, sourceName: group.sourceName, partIndex: partIndex + 1, partCount: group.parts.length, text: part.text.trim() }];
    });
    if (jobs.length === 0) return;

    setLoading(true);
    setError("");
    let turnstileSessionActive = hasTurnstileSession;

    try {
      for (let index = 0; index < jobs.length; index += 1) {
        const job = jobs[index];
        setGenerationNote(`${index + 1}/${jobs.length}개 음성을 만들고 있어요`);
        updatePart(job.groupId, job.partId, (part) => ({ ...part, isLoading: true, error: "" }));
        try {
          let audioBlob: Blob;
          if (provider === "supertonic") {
            setGenerationNote(`${index + 1}/${jobs.length}개 · 기기에서 음성을 만들고 있어요`);
            const { synthesizeSupertonicMp3 } = await import("./supertonic");
            audioBlob = await synthesizeSupertonicMp3(job.text, voiceName, speed, setGenerationNote);
          } else {
            const response = await fetch("/api/synthesize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider,
                text: job.text,
                model,
                gender,
                voiceName,
                speakingRate: speed,
                website: honeypot,
                elapsedMs: Math.round(performance.now() - startedAt),
                turnstileToken,
              }),
            });
            const sessionExpiry = Number(response.headers.get("X-TTS-Session-Expires"));
            if (Number.isFinite(sessionExpiry) && sessionExpiry > Date.now()) {
              turnstileSessionActive = true;
              setTurnstileSessionExpiresAt(sessionExpiry);
              storeTurnstileSessionExpiry(sessionExpiry);
            } else if (response.status === 403) {
              turnstileSessionActive = false;
              setTurnstileSessionExpiresAt(0);
              clearTurnstileSessionExpiry();
            }
            if (!response.ok) {
              const responseText = await response.text();
              let responseError = "";
              try {
                const result = JSON.parse(responseText) as { error?: string };
                responseError = result.error ?? "";
              } catch {
                responseError = response.status === 504
                  ? "음성 생성이 5분 안에 끝나지 않아 서버 연결이 종료됐어요. 문장을 더 짧게 나눠 다시 시도해 주세요."
                  : `음성을 만들지 못했어요. 서버 응답을 확인해 주세요. (오류 ${response.status})`;
              }
              const requestError = new Error(responseError || "음성을 만들지 못했어요. 잠시 후 다시 시도해 주세요.") as Error & { status?: number };
              requestError.status = response.status;
              throw requestError;
            }
            audioBlob = await response.blob();
            if (response.headers.get("content-type")?.includes("audio/wav")) {
              const { wavToMp3 } = await import("./audio");
              audioBlob = await wavToMp3(await audioBlob.arrayBuffer());
            }
          }

          if (!audioBlob.size) throw new Error("음성을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
          const metadata = {
            text: job.text,
            service: providerInfoLabel(provider),
            model: modelInfo.label,
            gender: genderSupported ? (gender === "FEMALE" ? "여성" : "남성") : "모델 기본",
            voice: selectedVoiceLabel,
          };
          const taggedBlob = await addId3Metadata(audioBlob, metadata);
          const downloadUrl = createTrackedUrl(taggedBlob);
          const audioUrl = createTrackedUrl(audioBlob);
          updatePart(job.groupId, job.partId, (part) => ({ ...part, audioUrl, downloadUrl, isLoading: false, error: "" }));
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "음성을 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
          updatePart(job.groupId, job.partId, (part) => ({ ...part, isLoading: false, error: message }));
          const status = (caught as Error & { status?: number })?.status;
          if (status === 403 || status === 429) break;
        }
      }
    } finally {
      if (provider !== "supertonic" && TURNSTILE_SITE_KEY && turnstileWidgetIdRef.current && window.turnstile && !turnstileSessionActive) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
        setTurnstileToken("");
      }
      setGenerationNote("");
      setLoading(false);
    }
  };

  const allJobs = scriptGroups.flatMap((group) => group.parts.map((part) => ({ groupId: group.id, partId: part.id, text: part.text })));
  const pendingJobs = allJobs.filter((job) => job.text.trim() && !scriptGroups
    .find((group) => group.id === job.groupId)?.parts.find((part) => part.id === job.partId)?.audioUrl);
  const hasOverLimitPart = scriptGroups.some((group) => group.parts.some((part) => textExceedsLimit(part.text, provider)));
  const completedAudioCount = scriptGroups.reduce((count, group) => count + group.parts.filter((part) => Boolean(part.audioUrl)).length, 0);

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/tts" aria-label="텍스트-스피치 홈">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>텍스트-스피치</span>
        </a>
        <span className="topbar-note">한국어 텍스트 음성 변환</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span /> KOREAN TTS (한국어 텍스트 음성 변환)</div>
          <h1 id="hero-title">글에 목소리를<br />더해 보세요.</h1>
          <p>읽고 싶은 문장을 넣고, 마음에 드는 목소리를 골라 보세요.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-sound">
            {[18, 30, 43, 26, 52, 34, 20, 42, 25, 15].map((height, index) => (
              <span key={index} style={{ height }} />
            ))}
          </div>
          <span className="art-dot dot-one" />
          <span className="art-dot dot-two" />
        </div>
      </section>

      <section className="studio-card" aria-label="음성 만들기">
        <div className="card-heading">
          <div>
            <span className="section-kicker">01 / VOICE (목소리)</span>
            <h2>목소리 설정</h2>
          </div>
          <span className="language-badge"><span className="language-dot" /> 한국어</span>
        </div>

        <div className="field-block provider-field">
          <div className="field-heading">
            <label htmlFor="provider">TTS 서비스 (텍스트 음성 변환 서비스)</label>
            <span className="field-hint">생성 방식을 선택해요</span>
          </div>
          <div className="select-wrap">
            <select
              id="provider"
              value={provider}
              disabled={loading || isReadingFiles}
              onChange={(event) => chooseProvider(event.target.value as ProviderId)}
            >
              {PROVIDERS.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
            <span className="select-chevron" aria-hidden="true" />
          </div>
        </div>

        <div className="field-block model-field">
          <div className="field-heading">
            <label>모델</label>
            <span className="field-hint">원하는 음성 품질을 선택해요</span>
          </div>
          <div className="model-list" role="tablist" aria-label="음성 모델">
            {modelOptions.map((option) => (
              <button
                className={`model-option ${model === option.id ? "selected" : ""}`}
                key={option.id}
                type="button"
                role="tab"
                aria-selected={model === option.id}
                disabled={loading || isReadingFiles}
                onClick={() => chooseModel(option.id)}
              >
                <span className="model-option-name">{option.label}</span>
                <span className="model-option-detail">{option.detail}</span>
              </button>
            ))}
          </div>
          <p className="price-note">{modelInfo.price}{provider === "google" && <span> · Google Cloud TTS (구글 클라우드 음성 변환) 요금</span>}</p>
          {hasGoogleCloudByteLimit && <p className="provider-note">Google Cloud TTS API (구글 클라우드 음성 변환 API)는 요청당 최대 5,000바이트까지 받아요.</p>}
          {provider === "openrouter" && model === "fish-audio/s2.1-pro-free:free" && <p className="provider-note">Fish Audio (피시 오디오) 무료 모델이며 기본 음성을 사용합니다. 무료 제공과 처리량은 OpenRouter (오픈라우터)와 Fish Audio (피시 오디오)의 정책에 따라 달라질 수 있어요.</p>}
          {provider === "openrouter" && model === "microsoft/mai-voice-2-flash" && <p className="provider-note">OpenRouter (오픈라우터)를 통해 한국어 Haena (해나, 여성)·Junho (준호, 남성) 음성을 사용합니다.</p>}
          {provider === "supertonic" && <p className="provider-note">모델을 기기에 저장해 다음 실행부터 재사용합니다. 처음 받을 때 약 400MB (400메가바이트)가 필요해요. <a href="https://huggingface.co/Supertone/supertonic-3" target="_blank" rel="noreferrer">Hugging Face (허깅페이스)의 모델 이용 조건</a>을 확인해 주세요.</p>}
          {provider !== "supertonic" && <p className="provider-note">입력 문장은 선택한 TTS 서비스로 전송돼요.</p>}
        </div>

        <div className="settings-row">
          <div className="field-block gender-field">
            <div className="field-heading">
              <label>성별</label>
              {!genderSupported && <span className="field-hint">모델 기본 음성 사용</span>}
            </div>
            <div className="segmented-control" role="group" aria-label="음성 성별" aria-disabled={!genderSupported}>
              <button
                type="button"
                className={gender === "FEMALE" ? "active" : ""}
                aria-pressed={gender === "FEMALE"}
                disabled={!genderSupported || loading || isReadingFiles}
                onClick={() => chooseGender("FEMALE")}
              >여성</button>
              <button
                type="button"
                className={gender === "MALE" ? "active" : ""}
                aria-pressed={gender === "MALE"}
                disabled={!genderSupported || loading || isReadingFiles}
                onClick={() => chooseGender("MALE")}
              >남성</button>
            </div>
          </div>

          <div className="field-block voice-field">
            <div className="field-heading">
              <label htmlFor="voice">음성</label>
            </div>
            <div className="select-wrap">
              <select
                id="voice"
                value={voiceName}
                onChange={(event) => {
                  setVoiceName(event.target.value);
                  clearAudio();
                }}
                disabled={voiceLoading || voices.length === 0 || loading || isReadingFiles}
              >
                {voiceLoading && <option value="">음성을 불러오는 중…</option>}
                {!voiceLoading && voices.length === 0 && <option value="">사용 가능한 음성이 없어요</option>}
                {voices.map((voice) => (
                  <option value={voice.id} key={voice.id}>{voice.name}</option>
                ))}
              </select>
              <span className="select-chevron" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="field-block speed-block">
          <div className="field-heading speed-heading">
            <label htmlFor="speed">말하기 속도</label>
            <span className="speed-value">{speedSupported ? `${speed.toFixed(2).replace(/0$/, "")}×` : "모델 기본"}</span>
          </div>
          <input
            id="speed"
            className="speed-slider"
            type="range"
            min={speedMin}
            max={speedMax}
            step={speedStep}
            value={speed}
            disabled={!speedSupported || loading || isReadingFiles}
            onChange={(event) => {
              setSpeed(Number(event.target.value));
              clearAudio();
            }}
            style={{ "--range-progress": `${speedSupported ? ((speed - speedMin) / (speedMax - speedMin)) * 100 : 50}%` } as CSSProperties & { "--range-progress": string }}
          />
          <div className="range-labels"><span>느리게</span><span>보통</span><span>빠르게</span></div>
        </div>

        <div className="section-divider" />

        <div className="card-heading text-heading">
          <div className="script-heading-copy">
            <span className="section-kicker">02 / SCRIPT (읽을 문장)</span>
            <div className="script-title-row">
              <h2>읽을 문장</h2>
              <div className="sample-buttons" role="group" aria-label="테스트 문장">
                {SAMPLE_SENTENCES.map((sentence, index) => (
                  <button
                    type="button"
                    key={sentence}
                    aria-label={`테스트 문장 ${index + 1} 입력`}
                    disabled={loading || isReadingFiles}
                    onClick={() => insertTestSentence(index + 1, sentence)}
                  >테스트 {index + 1}</button>
                ))}
                <button type="button" aria-label="긴 문장 분할 테스트 입력" onClick={() => insertTestSentence(4, SPLIT_TEST_TEXT)} disabled={loading || isReadingFiles}>테스트 4</button>
              </div>
            </div>
          </div>
          <span className="char-count">입력칸 {scriptGroups.reduce((count, group) => count + group.parts.length, 0)}개</span>
        </div>

        <div
          className={`file-drop-zone ${isDraggingFiles ? "drag-active" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
          onDragOver={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingFiles(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingFiles(false);
            void handleTextFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <div>
            <strong>.txt 파일을 여기에 끌어다 놓으세요</strong>
            <span>여러 파일을 한꺼번에 선택할 수 있어요. 긴 파일은 자동으로 나눠요.</span>
          </div>
          <div className="file-picker-actions">
            <input
              ref={fileInputRef}
              className="file-input-hidden"
              type="file"
              accept=".txt,text/plain"
              multiple
              disabled={loading || isReadingFiles}
              onChange={(event: ChangeEvent<HTMLInputElement>) => void handleTextFiles(Array.from(event.target.files ?? []))}
              aria-label="여러 텍스트 파일 선택"
            />
            <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()} disabled={loading || isReadingFiles}>
              {isReadingFiles ? "파일을 읽고 있어요" : ".txt 파일 선택"}
            </button>
            <button type="button" className="secondary-button" onClick={addManualGroup} disabled={loading || isReadingFiles}>문장 직접 추가</button>
          </div>
        </div>

        <div className="script-groups">
          {scriptGroups.map((group, groupIndex) => (
            <section className="script-group" key={group.id} aria-label={group.sourceName || `직접 입력 ${groupIndex + 1}`}>
              <div className="script-group-heading">
                <div>
                  <strong>{group.sourceName || "직접 입력"}</strong>
                  <span>{group.parts.length > 1 ? `${group.parts.length}개 문장으로 나눴어요` : "MP3 파일 1개"}</span>
                </div>
                {(group.kind !== "manual" || scriptGroups.length > 1) && (
                  <button type="button" className="clear-button" onClick={() => removeScriptGroup(group.id)} disabled={loading || isReadingFiles}>삭제</button>
                )}
              </div>
              {group.parts.map((part, partIndex) => {
                const characterCount = Array.from(part.text).length;
                const textByteCount = UTF8_ENCODER.encode(part.text.trim()).length;
                const overLimit = textExceedsLimit(part.text, provider);
                const metadata = {
                  text: part.text.trim(),
                  service: providerInfoLabel(provider),
                  model: modelInfo.label,
                  gender: genderSupported ? (gender === "FEMALE" ? "여성" : "남성") : "모델 기본",
                  voice: selectedVoiceLabel,
                };
                const filename = createMp3Filename(metadata, group.sourceName, partIndex + 1, group.parts.length);
                const singlePartJob = [{ groupId: group.id, partId: part.id }];

                return (
                  <article className="script-part" key={part.id}>
                    <div className="script-part-heading">
                      <strong>{group.parts.length > 1 ? `문장 ${partIndex + 1}` : "읽을 문장"}</strong>
                      <span className={overLimit ? "part-count over-limit" : "part-count"}>
                        {characterCount.toLocaleString()} / {characterLimit.toLocaleString()}자
                        {hasGoogleCloudByteLimit && ` · ${textByteCount.toLocaleString()} / 5,000바이트`}
                      </span>
                    </div>
                    <textarea
                      className="script-input"
                      aria-label={`${group.sourceName || "직접 입력"} ${group.parts.length > 1 ? `문장 ${partIndex + 1}` : "읽을 문장"}`}
                      placeholder="여기에 문장을 입력해 주세요."
                      value={part.text}
                      onChange={(event) => updatePartText(group.id, part.id, event.target.value)}
                      maxLength={characterLimit}
                      rows={6}
                      disabled={loading || isReadingFiles}
                    />
                    <div className="input-footer">
                      <span><Icon name="spark" /> 한국어 문장을 자연스럽게 읽어 드려요</span>
                      <div className="part-actions">
                        {overLimit && (
                          <button
                            type="button"
                            className="clear-button"
                            onClick={() => {
                              const chunks = splitTextIntoChunks(part.text, provider);
                              if (chunks.length < 2) return;
                              clearPartAudio(part);
                              setScriptGroups((current) => current.map((item) => {
                                if (item.id !== group.id) return item;
                                const parts = item.parts.flatMap((existing) => existing.id === part.id ? chunks.map(createScriptPart) : [existing]);
                                return { ...item, sourceText: parts.map((existing) => existing.text).join("\n\n"), parts };
                              }));
                            }}
                            disabled={loading}
                          >나누기</button>
                        )}
                        <button type="button" className="clear-button" onClick={() => updatePartText(group.id, part.id, "")} disabled={loading || !part.text}>지우기</button>
                      </div>
                    </div>
                    {part.error && <div className="part-error" role="alert">{part.error}</div>}
                    {part.audioUrl && (
                      <div className="audio-result" aria-live="polite">
                        <div className="result-title">
                          <span className="result-icon"><Icon name="play" /></span>
                          <div><strong>음성이 준비됐어요</strong><span>MP3 (엠피쓰리) · {metadata.service} · {metadata.model} · {metadata.gender} · {metadata.voice} · {speedSupported ? `${speed.toFixed(2)}×` : "기본 속도"}</span></div>
                        </div>
                        <audio controls src={part.audioUrl} aria-label={`${group.sourceName || "읽을 문장"} 미리 듣기 ${partIndex + 1}`} />
                        <a className="download-button" href={part.downloadUrl ?? undefined} download={filename}>
                          <Icon name="download" /> MP3 (엠피쓰리) 내려받기
                        </a>
                      </div>
                    )}
                    {!part.audioUrl && (
                      <button
                        className="part-generate-button"
                        type="button"
                        onClick={() => void generateParts(singlePartJob)}
                        disabled={loading || isReadingFiles || voiceLoading || !part.text.trim() || overLimit || !voiceName || (provider !== "supertonic" && !!TURNSTILE_SITE_KEY && !turnstileToken && !hasTurnstileSession)}
                      >{part.isLoading ? <><span className="spinner" /> 만들고 있어요</> : "이 문장 생성하기"}</button>
                    )}
                  </article>
                );
              })}
            </section>
          ))}
        </div>

        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">이 입력칸은 비워 두세요.</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        {TURNSTILE_SITE_KEY && (
          <div className="turnstile-area" style={{ display: provider === "supertonic" || hasTurnstileSession ? "none" : undefined }}>
            <div ref={turnstileRef} />
          </div>
        )}

        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="action-row">
          <button
            className="generate-button"
            type="button"
            onClick={() => void generateParts(pendingJobs.map(({ groupId, partId }) => ({ groupId, partId })))}
            disabled={loading || isReadingFiles || voiceLoading || !voiceName || pendingJobs.length === 0 || hasOverLimitPart || (provider !== "supertonic" && !!TURNSTILE_SITE_KEY && !turnstileToken && !hasTurnstileSession)}
          >
            {loading ? (
              <><span className="spinner" /> 음성을 만들고 있어요</>
            ) : (
              <><Icon name="play" /> {pendingJobs.length > 1 ? "전체 생성하기" : pendingJobs.length === 0 && completedAudioCount > 0 ? "모두 만들었어요" : "생성하기"}</>
            )}
          </button>
          <span className="action-caption">{generationNote || (hasOverLimitPart ? "글자 수 제한을 넘은 문장을 나눠 주세요" : pendingJobs.length > 0 ? `${pendingJobs.length}개 음성을 만들 수 있어요. 생성 후 각각 미리 듣고 MP3로 저장합니다.` : completedAudioCount > 0 ? "모두 만들었어요. 아래에서 각각 미리 듣거나 저장하세요." : "문장을 입력하거나 .txt 파일을 선택해 주세요.")}</span>
        </div>
      </section>

      <footer className="page-footer">
        <span>텍스트-스피치 <span className="footer-separator">·</span> 글을 듣는 또 다른 방법</span>
        <span className="footer-right"><span>{providerInfoLabel(provider)}</span><a href="/third-party-notices.html">오픈소스 라이선스</a></span>
      </footer>
    </main>
  );
}

export default App;
