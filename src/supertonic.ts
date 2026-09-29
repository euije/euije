import { loadTextToSpeech, loadVoiceStyle } from "./vendor/supertonic/helper";
import * as ort from "onnxruntime-web/webgpu";

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
    const progress = (name: string, index: number, total: number) => {
      onStatus(`모델 불러오는 중 ${index}/${total}: ${name}`);
    };
    ttsPromise = loadTextToSpeech(ONNX_ROOT, { executionProviders }, progress)
      .catch(async (error: unknown) => {
        if (!executionProviders.includes("webgpu")) throw error;
        onStatus("WebGPU를 사용할 수 없어 CPU 모드로 전환하고 있어요.");
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

async function floatPcmToMp3(samples: number[], sampleRate: number) {
  const { default: lamejs } = await import("lamejs");
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const mp3Parts: Uint8Array[] = [];
  const frameSize = 1152;

  for (let offset = 0; offset < samples.length; offset += frameSize) {
    const length = Math.min(frameSize, samples.length - offset);
    const frame = new Int16Array(length);
    for (let index = 0; index < length; index += 1) {
      const value = Math.max(-1, Math.min(1, samples[offset + index]));
      frame[index] = value < 0 ? Math.round(value * 32768) : Math.round(value * 32767);
    }
    const encoded = encoder.encodeBuffer(frame);
    if (encoded.length) mp3Parts.push(new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength));
  }

  const finalFrame = encoder.flush();
  if (finalFrame.length) mp3Parts.push(new Uint8Array(finalFrame.buffer, finalFrame.byteOffset, finalFrame.byteLength));
  return new Blob(mp3Parts, { type: "audio/mpeg" });
}

export async function synthesizeSupertonicMp3(
  text: string,
  voiceName: string,
  speed: number,
  onStatus: (message: string) => void,
) {
  onStatus("Supertonic 3 모델 파일을 불러오는 중이에요. 처음에는 약 400MB를 내려받아요.");
  const { textToSpeech, cfgs } = await loadModel(onStatus);
  onStatus("선택한 목소리를 준비하고 있어요.");
  const style = await loadStyle(voiceName);
  onStatus("이 기기에서 한국어 음성을 만들고 있어요.");
  const result = await textToSpeech.call(text, "ko", style, 8, speed);
  onStatus("MP3 파일로 변환하고 있어요.");
  return await floatPcmToMp3(result.wav, cfgs.ae.sample_rate);
}
