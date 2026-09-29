import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp3OutputFormat,
  Output,
  canEncodeAudio,
} from "mediabunny";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";

export async function wavToMp3(wavBuffer: ArrayBuffer) {
  if (!(await canEncodeAudio("mp3"))) registerMp3Encoder();

  const input = new Input({
    source: new BlobSource(new Blob([wavBuffer], { type: "audio/wav" })),
    formats: ALL_FORMATS,
  });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp3OutputFormat(), target });
  const conversion = await Conversion.init({ input, output });
  await conversion.execute();
  if (!target.buffer) throw new Error("MP3 변환 결과를 만들지 못했어요.");
  return new Blob([target.buffer], { type: "audio/mpeg" });
}
