import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import "./App.css";

type ModelId = "standard" | "wavenet" | "neural2" | "chirp3hd";
type Gender = "FEMALE" | "MALE";

type Voice = {
  id: string;
  name: string;
};

const VOICES: Record<ModelId, Record<Gender, Voice[]>> = {
  standard: {
    FEMALE: [
      { id: "ko-KR-Standard-A", name: "Standard A" },
      { id: "ko-KR-Standard-B", name: "Standard B" },
    ],
    MALE: [
      { id: "ko-KR-Standard-C", name: "Standard C" },
      { id: "ko-KR-Standard-D", name: "Standard D" },
    ],
  },
  wavenet: {
    FEMALE: [
      { id: "ko-KR-Wavenet-A", name: "WaveNet A" },
      { id: "ko-KR-Wavenet-B", name: "WaveNet B" },
    ],
    MALE: [
      { id: "ko-KR-Wavenet-C", name: "WaveNet C" },
      { id: "ko-KR-Wavenet-D", name: "WaveNet D" },
    ],
  },
  neural2: {
    FEMALE: [
      { id: "ko-KR-Neural2-A", name: "Neural2 A" },
      { id: "ko-KR-Neural2-B", name: "Neural2 B" },
    ],
    MALE: [{ id: "ko-KR-Neural2-C", name: "Neural2 C" }],
  },
  chirp3hd: {
    FEMALE: [
      { id: "ko-KR-Chirp3-HD-Achernar", name: "Achernar" },
      { id: "ko-KR-Chirp3-HD-Aoede", name: "Aoede" },
      { id: "ko-KR-Chirp3-HD-Autonoe", name: "Autonoe" },
      { id: "ko-KR-Chirp3-HD-Callirrhoe", name: "Callirrhoe" },
      { id: "ko-KR-Chirp3-HD-Despina", name: "Despina" },
      { id: "ko-KR-Chirp3-HD-Erinome", name: "Erinome" },
      { id: "ko-KR-Chirp3-HD-Gacrux", name: "Gacrux" },
      { id: "ko-KR-Chirp3-HD-Kore", name: "Kore" },
      { id: "ko-KR-Chirp3-HD-Laomedeia", name: "Laomedeia" },
      { id: "ko-KR-Chirp3-HD-Leda", name: "Leda" },
      { id: "ko-KR-Chirp3-HD-Pulcherrima", name: "Pulcherrima" },
      { id: "ko-KR-Chirp3-HD-Sulafat", name: "Sulafat" },
      { id: "ko-KR-Chirp3-HD-Vindemiatrix", name: "Vindemiatrix" },
      { id: "ko-KR-Chirp3-HD-Zephyr", name: "Zephyr" },
    ],
    MALE: [
      { id: "ko-KR-Chirp3-HD-Achird", name: "Achird" },
      { id: "ko-KR-Chirp3-HD-Algenib", name: "Algenib" },
      { id: "ko-KR-Chirp3-HD-Algieba", name: "Algieba" },
      { id: "ko-KR-Chirp3-HD-Alnilam", name: "Alnilam" },
      { id: "ko-KR-Chirp3-HD-Charon", name: "Charon" },
      { id: "ko-KR-Chirp3-HD-Enceladus", name: "Enceladus" },
      { id: "ko-KR-Chirp3-HD-Fenrir", name: "Fenrir" },
      { id: "ko-KR-Chirp3-HD-Iapetus", name: "Iapetus" },
      { id: "ko-KR-Chirp3-HD-Orus", name: "Orus" },
      { id: "ko-KR-Chirp3-HD-Puck", name: "Puck" },
      { id: "ko-KR-Chirp3-HD-Rasalgethi", name: "Rasalgethi" },
      { id: "ko-KR-Chirp3-HD-Sadachbia", name: "Sadachbia" },
      { id: "ko-KR-Chirp3-HD-Sadaltager", name: "Sadaltager" },
      { id: "ko-KR-Chirp3-HD-Schedar", name: "Schedar" },
      { id: "ko-KR-Chirp3-HD-Umbriel", name: "Umbriel" },
      { id: "ko-KR-Chirp3-HD-Zubenelgenubi", name: "Zubenelgenubi" },
    ],
  },
};

const MODELS: { id: ModelId; label: string; detail: string; price: string }[] = [
  {
    id: "standard",
    label: "Standard",
    detail: "가볍게 시작",
    price: "월 400만 자 무료 · 이후 $4 / 100만 자",
  },
  {
    id: "neural2",
    label: "Neural2",
    detail: "균형 잡힌 음성",
    price: "월 100만 자 무료 · 이후 $16 / 100만 자",
  },
  {
    id: "wavenet",
    label: "WaveNet",
    detail: "자연스러운 합성 음성",
    price: "월 100만 자 무료 · 이후 $16 / 100만 자",
  },
  {
    id: "chirp3hd",
    label: "Chirp 3 HD",
    detail: "고음질 생성형 음성",
    price: "월 100만 자 무료 · 이후 $30 / 100만 자",
  },
];

const MAX_CHARACTERS = 1200;
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;

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
  const [model, setModel] = useState<ModelId>("neural2");
  const [gender, setGender] = useState<Gender>("FEMALE");
  const [voiceName, setVoiceName] = useState(VOICES.neural2.FEMALE[0].id);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(() => performance.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | undefined>(undefined);
  const modelInfo = MODELS.find((item) => item.id === model)!;
  const voices = VOICES[model][gender];
  const characterCount = Array.from(text).length;

  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;
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
  }, []);

  const changeText = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setError("");
    if (audioUrl) setAudioUrl(null);
  };

  const chooseModel = (nextModel: ModelId) => {
    setModel(nextModel);
    setVoiceName(VOICES[nextModel][gender][0].id);
    setError("");
    setAudioUrl(null);
  };

  const chooseGender = (nextGender: Gender) => {
    setGender(nextGender);
    setVoiceName(VOICES[model][nextGender][0].id);
    setError("");
    setAudioUrl(null);
  };

  const generateAudio = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    setAudioUrl(null);

    try {
      const response = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      if (TURNSTILE_SITE_KEY && turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
        setTurnstileToken("");
      }
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

        <div className="field-block">
          <div className="field-heading">
            <label>모델</label>
            <span className="field-hint">원하는 음성 품질을 선택해요</span>
          </div>
          <div className="model-list" role="tablist" aria-label="음성 모델">
            {MODELS.map((option) => (
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
          <p className="price-note">{modelInfo.price} <span>· USD, Google Cloud 기준</span></p>
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
              >
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
            min="0.6"
            max="1.4"
            step="0.05"
            value={speed}
            onChange={(event) => {
              setSpeed(Number(event.target.value));
              setAudioUrl(null);
            }}
            style={{ "--range-progress": `${((speed - 0.6) / 0.8) * 100}%` } as CSSProperties & { "--range-progress": string }}
          />
          <div className="range-labels"><span>느리게</span><span>보통</span><span>빠르게</span></div>
        </div>

        <div className="section-divider" />

        <div className="card-heading text-heading">
          <div>
            <span className="section-kicker">02 / SCRIPT</span>
            <h2>읽을 문장</h2>
          </div>
          <span className={`char-count ${characterCount > MAX_CHARACTERS ? "over-limit" : ""}`}>
            {characterCount.toLocaleString()} <span>/ {MAX_CHARACTERS.toLocaleString()}</span>
          </span>
        </div>

        <textarea
          className="script-input"
          aria-label="음성으로 바꿀 문장"
          placeholder="여기에 문장을 입력해 주세요.\n\n예) 오늘은 기분 좋은 바람이 불어요. 천천히 주변을 둘러보며 걸어 볼까요?"
          value={text}
          onChange={changeText}
          maxLength={MAX_CHARACTERS}
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

        {TURNSTILE_SITE_KEY && (
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
            disabled={loading || !text.trim() || characterCount > MAX_CHARACTERS || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
          >
            {loading ? (
              <><span className="spinner" /> 음성을 만들고 있어요</>
            ) : (
              <><Icon name="play" /> 미리 듣기</>
            )}
          </button>
          <span className="action-caption">생성 후 재생하고 MP3로 저장할 수 있어요</span>
        </div>

        {audioUrl && (
          <div className="audio-result" aria-live="polite">
            <div className="result-title">
              <span className="result-icon"><Icon name="play" /></span>
              <div><strong>음성이 준비됐어요</strong><span>MP3 · {modelInfo.label} · {speed.toFixed(2)}×</span></div>
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
        <span>Google Cloud Text-to-Speech</span>
      </footer>
    </main>
  );
}

export default App;
