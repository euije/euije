import { loadTextToSpeech, loadVoiceStyle, writeWavFile } from "./vendor/supertonic/helper";
import * as ort from "onnxruntime-web/webgpu";
import { wavToMp3 } from "./audio";

const MODEL_REVISION = "3cadd1ee6394adea1bd021217a0e650ede09a323";
const MODEL_ROOT = `https://huggingface.co/Supertone/supertonic-3/resolve/${MODEL_REVISION}`;
const ONNX_ROOT = `${MODEL_ROOT}/onnx`;

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
ort.env.wasm.numThreads = 1;

let ttsPromise: Promise<{ textToSpeech: any; cfgs: any }> | undefined;
const stylePromises = new Map<string, Promise<any>>();

function loadModel(onStatus: (message: string) => void) {
  if (!ttsPromise) {
    const executionProviders = "gpu" in navigator ? ["webgpu", "wasm"] : ["wasm"];
    const progress = (_name: string, index: number, total: number) => {
      onStatus(`모델을 불러오는 중이에요 (${index}/${total})`);
    };
    ttsPromise = loadTextToSpeech(ONNX_ROOT, { executionProviders }, progress)
      .catch(async (error: unknown) => {
        if (!executionProviders.includes("webgpu")) throw error;
        onStatus("그래픽 가속을 사용할 수 없어 기본 처리 방식으로 전환하고 있어요.");
        return loadTextToSpeech(ONNX_ROOT, { executionProviders: ["wasm"] }, progress);
      })
      .catch((error: unknown) => {
        ttsPromise = undefined;
        throw error;
      });
  }
  return ttsPromise;
}

function loadStyle(voiceName: string) {
  let stylePromise = stylePromises.get(voiceName);
  if (!stylePromise) {
    stylePromise = loadVoiceStyle([`${MODEL_ROOT}/voice_styles/${voiceName}.json`]);
    stylePromises.set(voiceName, stylePromise);
  }
  return stylePromise;
}

export async function synthesizeSupertonicMp3(
  text: string,
  voiceName: string,
  speed: number,
  onStatus: (message: string) => void,
) {
  onStatus("Supertonic 3 (수퍼토닉 3) 모델을 불러오는 중이에요. 첫 실행 때 약 400MB (400메가바이트)를 내려받아요.");
  const { textToSpeech, cfgs } = await loadModel(onStatus);
  onStatus("선택한 목소리를 준비하고 있어요.");
  const style = await loadStyle(voiceName);
  onStatus("이 기기에서 한국어 음성을 만들고 있어요.");
  const result = await textToSpeech.call(text, "ko", style, 8, speed);
  const wav = writeWavFile(result.wav, cfgs.ae.sample_rate) as ArrayBuffer;
  onStatus("MP3 (엠피쓰리) 파일로 변환하고 있어요.");
  return await wavToMp3(wav);
}
