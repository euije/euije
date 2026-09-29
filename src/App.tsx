import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import "./App.css";

type ProviderId = "google" | "openrouter" | "azure" | "elevenlabs" | "supertonic";
type Gender = "FEMALE" | "MALE";

type Voice = {
  id: string;
  name: string;
};

const GOOGLE_VOICES: Record<"standard" | "wavenet" | "neural2" | "chirp3hd", Record<Gender, Voice[]>> = {
  standard: {
    FEMALE: [{ id: "ko-KR-Standard-A", name: "Standard A" }, { id: "ko-KR-Standard-B", name: "Standard B" }],
    MALE: [{ id: "ko-KR-Standard-C", name: "Standard C" }, { id: "ko-KR-Standard-D", name: "Standard D" }],
  },
  wavenet: {
    FEMALE: [{ id: "ko-KR-Wavenet-A", name: "WaveNet A" }, { id: "ko-KR-Wavenet-B", name: "WaveNet B" }],
    MALE: [{ id: "ko-KR-Wavenet-C", name: "WaveNet C" }, { id: "ko-KR-Wavenet-D", name: "WaveNet D" }],
  },
  neural2: {
    FEMALE: [{ id: "ko-KR-Neural2-A", name: "Neural2 A" }, { id: "ko-KR-Neural2-B", name: "Neural2 B" }],
    MALE: [{ id: "ko-KR-Neural2-C", name: "Neural2 C" }],
  },
  chirp3hd: {
    FEMALE: ["Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome", "Gacrux", "Kore", "Laomedeia", "Leda", "Pulcherrima", "Sulafat", "Vindemiatrix", "Zephyr"].map((name) => ({ id: `ko-KR-Chirp3-HD-${name}`, name })),
    MALE: ["Achird", "Algenib", "Algieba", "Alnilam", "Charon", "Enceladus", "Fenrir", "Iapetus", "Orus", "Puck", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Umbriel", "Zubenelgenubi"].map((name) => ({ id: `ko-KR-Chirp3-HD-${name}`, name })),
  },
};

const GEMINI_VOICES: Record<Gender, Voice[]> = {
  FEMALE: ["Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome", "Gacrux", "Kore", "Laomedeia", "Leda", "Pulcherrima", "Sulafat", "Vindemiatrix", "Zephyr"].map((name) => ({ id: name, name })),
  MALE: ["Achird", "Algenib", "Algieba", "Alnilam", "Charon", "Enceladus", "Fenrir", "Iapetus", "Orus", "Puck", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Umbriel", "Zubenelgenubi"].map((name) => ({ id: name, name })),
};

const AZURE_VOICES: Record<Gender, Voice[]> = {
  FEMALE: ["SunHi", "JiMin", "SeoHyeon", "SoonBok", "YuJin"].map((name) => ({ id: `ko-KR-${name}Neural`, name })),
  MALE: ["InJoon", "BongJin", "GookMin", "Hyunsu"].map((name) => ({ id: `ko-KR-${name}Neural`, name })),
};

type ModelChoice = { id: string; label: string; detail: string; price: string };

const MODEL_OPTIONS: Record<ProviderId, ModelChoice[]> = {
  google: [
    { id: "standard", label: "Standard", detail: "가볍게 시작", price: "월 400만 자 무료 · 이후 $4 / 100만 자" },
    { id: "neural2", label: "Neural2", detail: "균형 잡힌 음성", price: "월 100만 자 무료 · 이후 $16 / 100만 자" },
    { id: "wavenet", label: "WaveNet", detail: "자연스러운 합성 음성", price: "월 100만 자 무료 · 이후 $16 / 100만 자" },
    { id: "chirp3hd", label: "Chirp 3 HD", detail: "생성형 음성", price: "월 100만 자 무료 · 이후 $30 / 100만 자" },
  ],
  openrouter: [
    { id: "google/gemini-3.8-flash-lite-tts", label: "Gemini Flash Lite", detail: "빠르고 비용 효율적", price: "텍스트 $0.50 · 오디오 $6 / 100만 토큰" },
    { id: "google/gemini-3.8-flash-tts", label: "Gemini Flash TTS", detail: "표현력 중심", price: "텍스트 $0.50 · 오디오 $9 / 100만 토큰" },
  ],
  azure: [
    { id: "neural", label: "Azure Neural", detail: "한국어 신경망 음성", price: "Azure 종량제 · 지역별 요금" },
  ],
  elevenlabs: [
    { id: "eleven_multilingual_v2", label: "Multilingual v2", detail: "다국어 음성", price: "계정 크레딧에 따라 차감" },
    { id: "eleven_flash_v2_5", label: "Flash v2.5", detail: "빠른 합성", price: "계정 크레딧에 따라 차감" },
  ],
  supertonic: [
    { id: "supertonic-3", label: "Supertonic 3", detail: "기기에서 직접 생성", price: "브라우저 로컬 실행 · 첫 다운로드 약 400MB" },
  ],
};

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "google", label: "Google Cloud" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "azure", label: "Azure Speech" },
  { id: "elevenlabs", label: "ElevenLabs" },
  { id: "supertonic", label: "Supertonic 3 · 이 기기에서 실행" },
];

const SUPERTONIC_VOICES: Record<Gender, Voice[]> = {
  FEMALE: ["F1", "F2", "F3", "F4", "F5"].map((name) => ({ id: name, name })),
  MALE: ["M1", "M2", "M3", "M4", "M5"].map((name) => ({ id: name, name })),
};

const DEFAULT_MODELS: Record<ProviderId, string> = {
  google: "neural2",
  openrouter: "google/gemini-3.8-flash-lite-tts",
  azure: "neural",
  elevenlabs: "eleven_multilingual_v2",
  supertonic: "supertonic-3",
};

const MAX_CHARACTERS = 1200;
const SUPERTONIC_MAX_CHARACTERS = 500;
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;

function getStaticVoices(provider: ProviderId, model: string, gender: Gender) {
  if (provider === "google") return GOOGLE_VOICES[model as keyof typeof GOOGLE_VOICES][gender];
  if (provider === "openrouter") return GEMINI_VOICES[gender];
  if (provider === "azure") return AZURE_VOICES[gender];
  if (provider === "supertonic") return SUPERTONIC_VOICES[gender];
  return [];
}

function providerInfoLabel(provider: ProviderId) {
  if (provider === "supertonic") return "Supertonic 3 · 로컬";
  return PROVIDERS.find((item) => item.id === provider)?.label ?? "음성 서비스";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
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
  const [text, setText] = useState("");
  const [provider, setProvider] = useState<ProviderId>("google");
  const [model, setModel] = useState(DEFAULT_MODELS.google);
  const [gender, setGender] = useState<Gender>("FEMALE");
  const [voiceName, setVoiceName] = useState(GOOGLE_VOICES.neural2.FEMALE[0].id);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [generationNote, setGenerationNote] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [elevenVoices, setElevenVoices] = useState<Voice[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(() => performance.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | undefined>(undefined);
  const modelOptions = MODEL_OPTIONS[provider];
  const modelInfo = modelOptions.find((item) => item.id === model) ?? modelOptions[0];
  const voices = provider === "elevenlabs" ? elevenVoices : getStaticVoices(provider, model, gender);
  const characterLimit = provider === "supertonic" ? SUPERTONIC_MAX_CHARACTERS : MAX_CHARACTERS;
  const characterCount = Array.from(text).length;

  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (provider === "supertonic" || !TURNSTILE_SITE_KEY || !turnstileRef.current) return;
    const container = turnstileRef.current;
    let widgetId: string | undefined;
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");

    const renderWidget = () => {
      if (!window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
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
  }, [provider]);

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
        if (!response.ok) throw new Error(result.error || "ElevenLabs 음성을 불러오지 못했어요.");
        return result.voices ?? [];
      })
      .then((items) => {
        if (!active) return;
        setElevenVoices(items);
        setVoiceName((current) => items.some((voice) => voice.id === current) ? current : items[0]?.id ?? "");
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "ElevenLabs 음성을 불러오지 못했어요.");
      })
      .finally(() => {
        if (active) setVoiceLoading(false);
      });

    return () => { active = false; };
  }, [provider, gender]);

  const changeText = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setError("");
    if (audioUrl) setAudioUrl(null);
  };

  const chooseProvider = (nextProvider: ProviderId) => {
    setProvider(nextProvider);
    setModel(DEFAULT_MODELS[nextProvider]);
    setVoiceName(getStaticVoices(nextProvider, DEFAULT_MODELS[nextProvider], gender)[0]?.id ?? "");
    setElevenVoices([]);
    setError("");
    setAudioUrl(null);
    setTurnstileToken("");
  };

  const chooseModel = (nextModel: string) => {
    setModel(nextModel);
    if (provider !== "elevenlabs") {
      setVoiceName(getStaticVoices(provider, nextModel, gender)[0]?.id ?? "");
    }
    setError("");
    setAudioUrl(null);
  };

  const chooseGender = (nextGender: Gender) => {
    setGender(nextGender);
    setVoiceName(getStaticVoices(provider, model, nextGender)[0]?.id ?? "");
    setError("");
    setAudioUrl(null);
  };

  const generateAudio = async () => {
    if (!text.trim() || loading || voiceLoading || !voiceName) return;
    setLoading(true);
    setError("");
    setAudioUrl(null);

    try {
      if (provider === "supertonic") {
        setGenerationNote("기기에서 음성을 만들고 있어요. 첫 실행은 모델 다운로드가 필요해요.");
        const { synthesizeSupertonicMp3 } = await import("./supertonic");
        const audioBlob = await synthesizeSupertonicMp3(text.trim(), voiceName, speed, setGenerationNote);
        setAudioUrl(URL.createObjectURL(audioBlob));
        return;
      }

      const response = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          text: text.trim(),
          model,
          gender,
          voiceName,
          speakingRate: speed,
          website: honeypot,
          elapsedMs: Math.round(performance.now() - startedAt),
          turnstileToken,
        }),
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "음성을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
      }

      const audioBlob = await response.blob();
      if (!audioBlob.size) throw new Error("음성을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
      setAudioUrl(URL.createObjectURL(audioBlob));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "음성을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      if (provider !== "supertonic" && TURNSTILE_SITE_KEY && turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
        setTurnstileToken("");
      }
      setGenerationNote("");
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="소리결 홈">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>소리결</span>
        </a>
        <span className="topbar-note">한국어 텍스트 음성 변환</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span /> KOREAN TEXT TO SPEECH</div>
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
            <span className="section-kicker">01 / VOICE</span>
            <h2>목소리 설정</h2>
          </div>
          <span className="language-badge"><span className="language-dot" /> 한국어</span>
        </div>

        <div className="field-block provider-field">
          <div className="field-heading">
            <label htmlFor="provider">TTS 서비스</label>
            <span className="field-hint">생성 방식을 선택해요</span>
          </div>
          <div className="select-wrap">
            <select
              id="provider"
              value={provider}
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
                onClick={() => chooseModel(option.id)}
              >
                <span className="model-option-name">{option.label}</span>
                <span className="model-option-detail">{option.detail}</span>
              </button>
            ))}
          </div>
          <p className="price-note">{modelInfo.price}{provider === "google" && <span> · USD, Google Cloud 기준</span>}</p>
          {provider === "openrouter" && <p className="provider-note">한국어 Gemini TTS를 OpenRouter API로 호출해요. 속도는 음성 지시로 반영됩니다.</p>}
          {provider === "supertonic" && <p className="provider-note">첫 실행 때 약 400MB를 내려받아요. <a href="https://huggingface.co/Supertone/supertonic-3" target="_blank" rel="noreferrer">모델 이용 조건</a>을 확인해 주세요.</p>}
          {provider !== "supertonic" && <p className="provider-note">입력 문장은 선택한 TTS 서비스로 전송돼요.</p>}
        </div>

        <div className="settings-row">
          <div className="field-block gender-field">
            <div className="field-heading">
              <label>성별</label>
            </div>
            <div className="segmented-control" role="group" aria-label="음성 성별">
              <button
                type="button"
                className={gender === "FEMALE" ? "active" : ""}
                aria-pressed={gender === "FEMALE"}
                onClick={() => chooseGender("FEMALE")}
              >여성</button>
              <button
                type="button"
                className={gender === "MALE" ? "active" : ""}
                aria-pressed={gender === "MALE"}
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
                  setAudioUrl(null);
                }}
                disabled={voiceLoading || voices.length === 0}
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
            <span className="speed-value">{speed.toFixed(2).replace(/0$/, "")}×</span>
          </div>
          <input
            id="speed"
            className="speed-slider"
            type="range"
            min="0.7"
            max="1.2"
            step="0.05"
            value={speed}
            onChange={(event) => {
              setSpeed(Number(event.target.value));
              setAudioUrl(null);
            }}
            style={{ "--range-progress": `${((speed - 0.7) / 0.5) * 100}%` } as CSSProperties & { "--range-progress": string }}
          />
          <div className="range-labels"><span>느리게</span><span>보통</span><span>빠르게</span></div>
        </div>

        <div className="section-divider" />

        <div className="card-heading text-heading">
          <div>
            <span className="section-kicker">02 / SCRIPT</span>
            <h2>읽을 문장</h2>
          </div>
          <span className={`char-count ${characterCount > characterLimit ? "over-limit" : ""}`}>
            {characterCount.toLocaleString()} <span>/ {characterLimit.toLocaleString()}</span>
          </span>
        </div>

        <textarea
          className="script-input"
          aria-label="음성으로 바꿀 문장"
          placeholder="여기에 문장을 입력해 주세요.\n\n예) 오늘은 기분 좋은 바람이 불어요. 천천히 주변을 둘러보며 걸어 볼까요?"
          value={text}
          onChange={changeText}
          maxLength={characterLimit}
          rows={6}
        />
        <div className="input-footer">
          <span><Icon name="spark" /> 한국어 문장을 자연스럽게 읽어 드려요</span>
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              setText("");
              setError("");
              setAudioUrl(null);
            }}
            disabled={!text}
          >지우기</button>
        </div>

        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">Leave this field empty</label>
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

        {provider !== "supertonic" && TURNSTILE_SITE_KEY && (
          <div className="turnstile-area">
            <div ref={turnstileRef} />
          </div>
        )}

        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="action-row">
          <button
            className="generate-button"
            type="button"
            onClick={generateAudio}
            disabled={loading || voiceLoading || !voiceName || !text.trim() || characterCount > characterLimit || (provider !== "supertonic" && !!TURNSTILE_SITE_KEY && !turnstileToken)}
          >
            {loading ? (
              <><span className="spinner" /> 음성을 만들고 있어요</>
            ) : (
              <><Icon name="play" /> 미리 듣기</>
            )}
          </button>
          <span className="action-caption">{generationNote || "생성 후 재생하고 MP3로 저장할 수 있어요"}</span>
        </div>

        {audioUrl && (
          <div className="audio-result" aria-live="polite">
            <div className="result-title">
              <span className="result-icon"><Icon name="play" /></span>
              <div><strong>음성이 준비됐어요</strong><span>MP3 · {providerInfoLabel(provider)} · {modelInfo.label} · {speed.toFixed(2)}×</span></div>
            </div>
            <audio controls src={audioUrl} aria-label="생성된 음성 미리 듣기" />
            <a
              className="download-button"
              href={audioUrl}
              download="sorigyeol-voice.mp3"
            ><Icon name="download" /> MP3 다운로드</a>
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>소리결 <span className="footer-separator">·</span> 글을 듣는 또 다른 방법</span>
        <span className="footer-right"><span>{providerInfoLabel(provider)}</span><a href="/third-party-notices.html">오픈소스 라이선스</a></span>
      </footer>
    </main>
  );
}

export default App;
