
import { GoogleGenAI, Type } from "@google/genai";

/**
 * 音訊處理輔助：AudioBuffer 轉 WAV 格式
 */
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const length = buffer.length * 2;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  return new Blob([bufferArray], { type: 'audio/wav' });
};

/**
 * 音訊處理輔助：壓縮音訊以符合 API 限制
 */
const compressAudio = async (audioBlob: Blob): Promise<Blob> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const targetSampleRate = 16000;
  const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  const renderedBuffer = await offlineContext.startRendering();
  return audioBufferToWav(renderedBuffer);
};

/**
 * 輔助：Blob 轉 Base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * 核心：生成逐字稿與分析
 * 採用「惰性初始化」策略，只有在被呼叫時才會檢查並初始化 GoogleGenAI。
 */
export const generateTranscript = async (audioBlob: Blob) => {
  // 1. 取得 API Key (僅在此處檢查，避免初始化時崩潰)
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
    throw new Error(
      "未偵測到有效的 API Key。請確保環境變數 process.env.API_KEY 已正確設定。\n\n" +
      "提示：如果您目前沒有 API Key，請在匯入時提供 JSON 內容即可正常使用播放功能。"
    );
  }

  // 2. 初始化 AI 實例 (Lazy Init)
  const ai = new GoogleGenAI({ apiKey });

  // 3. 處理音訊資料
  const compressedBlob = await compressAudio(audioBlob);
  const base64Audio = await blobToBase64(compressedBlob);

  // 4. 呼叫 Gemini 模型
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", 
    contents: [
      {
        parts: [
          { inlineData: { mimeType: "audio/wav", data: base64Audio } },
          {
            text: `Role: Professional English Language Expert. 
Task: Transcribe audio and analyze vocabulary for learners.
Rules:
1. Divide into 5-10s segments.
2. For each segment, provide English text and Traditional Chinese (zh-TW) translation.
3. LANGUAGE ANALYSIS: Identify keywords or phrases (CEFR B1+).
4. For each keyword/phrase, provide: exact text, IPA, Chinese meaning, and a clear example sentence (example).
5. Format: Strict JSON array.`,
          },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            speaker: { type: Type.STRING },
            en: { type: Type.STRING },
            zh: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  ipa: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  example: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["word", "phrase"] }
                },
                required: ["text", "meaning", "example", "type"]
              }
            }
          },
          required: ["startTime", "endTime", "speaker", "en", "zh", "highlights"],
        },
      },
    },
  });

  try {
    const resultText = response.text;
    if (!resultText) throw new Error("AI 回傳內容為空。");
    return JSON.parse(resultText);
  } catch (err) {
    console.error("AI JSON Parse Error:", err);
    throw new Error("AI 語言分析結果解析失敗，請稍後再試。");
  }
};
