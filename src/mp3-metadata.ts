export type Mp3Metadata = {
  text: string;
  service: string;
  model: string;
  gender: string;
  voice: string;
};

const encoder = new TextEncoder();

function joinBytes(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function syncSafeSize(size: number) {
  return new Uint8Array([
    (size >>> 21) & 0x7f,
    (size >>> 14) & 0x7f,
    (size >>> 7) & 0x7f,
    size & 0x7f,
  ]);
}

function frame(id: string, content: Uint8Array) {
  const header = new Uint8Array(10);
  header.set(encoder.encode(id), 0);
  header.set(syncSafeSize(content.length), 4);
  return joinBytes([header, content]);
}

function textFrame(id: string, value: string) {
  return frame(id, joinBytes([new Uint8Array([3]), encoder.encode(value)]));
}

function userTextFrame(description: string, value: string) {
  return frame("TXXX", joinBytes([
    new Uint8Array([3]),
    encoder.encode(description),
    new Uint8Array([0]),
    encoder.encode(value),
  ]));
}

function commentFrame(value: string) {
  return frame("COMM", joinBytes([
    new Uint8Array([3]),
    encoder.encode("kor"),
    new Uint8Array([0]),
    encoder.encode(value),
  ]));
}

function stripLeadingId3Tag(audio: Uint8Array) {
  let offset = 0;
  while (
    audio[offset] === 0x49 &&
    audio[offset + 1] === 0x44 &&
    audio[offset + 2] === 0x33 &&
    audio.length - offset >= 10
  ) {
    const size = (
      ((audio[offset + 6] & 0x7f) << 21) |
      ((audio[offset + 7] & 0x7f) << 14) |
      ((audio[offset + 8] & 0x7f) << 7) |
      (audio[offset + 9] & 0x7f)
    );
    const footerSize = audio[offset + 5] & 0x10 ? 10 : 0;
    const nextOffset = offset + 10 + size + footerSize;
    if (nextOffset > audio.length) break;
    offset = nextOffset;
  }
  return audio.subarray(offset);
}

export async function addId3Metadata(mp3: Blob, metadata: Mp3Metadata) {
  const comment = [
    `읽을 문장: ${metadata.text}`,
    `TTS 서비스: ${metadata.service}`,
    `모델: ${metadata.model}`,
    `성별: ${metadata.gender}`,
    `음성: ${metadata.voice}`,
  ].join("\n");
  const frames = joinBytes([
    textFrame("TIT2", metadata.text),
    textFrame("TPE1", `${metadata.voice} (${metadata.gender})`),
    textFrame("TALB", `${metadata.service} · ${metadata.model}`),
    userTextFrame("TTS 서비스", metadata.service),
    userTextFrame("모델", metadata.model),
    userTextFrame("성별", metadata.gender),
    userTextFrame("음성", metadata.voice),
    userTextFrame("읽을 문장", metadata.text),
    commentFrame(comment),
  ]);

  const header = new Uint8Array(10);
  header.set([0x49, 0x44, 0x33, 4, 0, 0], 0);
  header.set(syncSafeSize(frames.length), 6);
  const audio = stripLeadingId3Tag(new Uint8Array(await mp3.arrayBuffer()));
  return new Blob([header, frames, audio], { type: "audio/mpeg" });
}

function cleanFilenamePart(value: string, maxCharacters: number, maxBytes: number) {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[<>:"|?*]/g, " ")
    .replace(/[/\\]/g, " ")
    .split("")
    .map((character) => character.charCodeAt(0) < 32 ? " " : character)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  const characters = Array.from(cleaned);
  const output: string[] = [];
  let byteLength = 0;
  for (const character of characters) {
    const characterBytes = encoder.encode(character).length;
    if (output.length >= maxCharacters || byteLength + characterBytes > maxBytes) break;
    output.push(character);
    byteLength += characterBytes;
  }

  const truncated = output.length < characters.length;
  let result = output.join("").trim();
  if (truncated) {
    while (result && encoder.encode(`${result}…`).length > maxBytes) {
      result = Array.from(result).slice(0, -1).join("").trim();
    }
    result += "…";
  }
  return result;
}

export function createMp3Filename(metadata: Mp3Metadata, sourceName = "", partIndex = 1, partCount = 1) {
  const baseName = sourceName
    ? sourceName.replace(/\.txt$/i, "")
    : metadata.text.replace(/\s+/g, " ");
  const title = cleanFilenamePart(baseName, 36, 70) || "음성";
  const part = partCount > 1 ? `_분할${partIndex}중${partCount}` : "";
  const service = cleanFilenamePart(metadata.service, 12, 22) || "TTS";
  const model = cleanFilenamePart(metadata.model, 26, 48) || "모델";
  const gender = cleanFilenamePart(metadata.gender, 4, 8) || "성별";
  const voice = cleanFilenamePart(metadata.voice, 12, 20) || "음성";
  return `${title}${part}_서비스-${service}_모델-${model}_성별-${gender}_음성-${voice}.mp3`;
}
