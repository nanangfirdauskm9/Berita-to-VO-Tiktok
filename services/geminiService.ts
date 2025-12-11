import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { GeneratedScript, GroundingSource } from "../types";
import { base64ToUint8Array, createPcmBlob, decodeAudioData, createWavBlob } from "./audioUtils";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION_SCRIPTWRITER = `
Kamu adalah konten kreator berita profesional untuk platform video pendek (TikTok, Instagram Reels, YouTube Shorts).
Tugasmu adalah mengubah konten sumber menjadi naskah video pendek yang *catchy*, viral, dan mudah dipahami Gen Z dan Milenial.

GAYA BAHASA (WAJIB):
- **Natural & Conversational**: Gunakan bahasa lisan sehari-hari yang santai, seperti cerita ke teman.
- **Flow**: Mengalir enak dibaca, gunakan tanda baca untuk mengatur napas.
- **Tanpa Basa-basi**: Langsung masuk ke inti cerita yang menarik (Hook verbal).

ATURAN TEKNIS (SANGAT PENTING):
1. **HANYA SCRIPT VO**: Output di bagian [SCRIPT VO] hanya boleh berisi kata-kata yang akan diucapkan narator.
2. **TANPA VISUAL**: JANGAN menulis deskripsi visual, instruksi kamera, atau tanda kurung adegan (contoh: [Tampilkan gambar X] -> DILARANG).
3. **TANPA CTA**: JANGAN sertakan ajakan like, komen, share, atau subscribe di akhir naskah.
4. **TANPA LABEL**: JANGAN gunakan label struktur seperti "Hook:", "Isi:", "Closing:". Langsung tulis narasinya.

FORMAT OUTPUT WAJIB:
[HEADLINE]
(Judul singkat untuk teks layar. Maks 7 kata)

[SCRIPT VO]
(Tulis narasi full teks paragraf. Murni ucapan saja.)
`;

export const generateNewsScript = async (
  input: string,
  inputType: 'url' | 'video',
  videoData?: string,
  mimeType?: string
): Promise<{ script: GeneratedScript; sources: GroundingSource[] }> => {
  
  let modelName = 'gemini-3-pro-preview'; // Default for complex tasks
  let contents: any[] = [];
  
  // Setup Grounding tools
  // Note: Google Maps tool is currently not enabled for gemini-3-pro-preview, so it is removed to prevent 400 errors.
  const tools: any[] = [
    { googleSearch: {} }
  ];

  if (inputType === 'video' && videoData && mimeType) {
    // Video Understanding Logic
    contents = [
      {
        inlineData: {
          mimeType: mimeType,
          data: videoData
        }
      },
      {
        text: "Analisis video ini dan buatkan naskah narasi (VO) untuk TikTok/Shorts. Ceritakan isi video dengan gaya seru dan natural. Jangan sertakan deskripsi visual, label struktur, atau CTA dalam naskah."
      }
    ];
  } else {
    // URL Logic (Article or YouTube Link)
    // We use gemini-3-pro-preview with search grounding to 'read' the internet content
    contents = [
      {
        text: `Buatkan naskah TikTok/Shorts yang seru berdasarkan link ini: ${input}. Cari fakta unik dan sampaikan dengan bahasa santai. Hanya naskah narasi (VO), jangan ada CTA atau instruksi visual.`
      }
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents.length === 1 ? contents[0].text : { parts: contents },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_SCRIPTWRITER,
        tools: tools,
        thinkingConfig: { thinkingBudget: 1024 } // Use reasoning for better script structure
      },
    });

    const text = response.text || '';
    
    // Parse the output based on the fixed format
    const headlineMatch = text.match(/\[HEADLINE\]\s*(.*?)\s*\[SCRIPT VO\]/s);
    const scriptMatch = text.match(/\[SCRIPT VO\]\s*([\s\S]*)/);

    const headline = headlineMatch ? headlineMatch[1].trim() : "Viral News";
    const body = scriptMatch ? scriptMatch[1].trim() : text;

    // Extract Grounding Metadata
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        } else if (chunk.maps) {
           // Keep this check in case maps tool is re-enabled or returns data via other means
           sources.push({ title: chunk.maps.title, uri: chunk.maps.googleMapsUri }); 
        }
      });
    }

    return {
      script: { headline, body },
      sources
    };

  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};

/**
 * Generates audio and returns a Blob URL (wav format) for playback and download.
 */
export const generateTTSAudio = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Kore' is good for clarity.
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    // Convert raw PCM to WAV for download capability
    const pcmBytes = base64ToUint8Array(base64Audio);
    const wavBlob = createWavBlob(pcmBytes, 24000); // 24kHz is standard for Gemini TTS
    
    return URL.createObjectURL(wavBlob);

  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};

// Deprecated in favor of generating a blob URL, but kept for legacy if needed, 
// though we will switch the UI to use generateTTSAudio.
export const playTextToSpeech = async (text: string): Promise<void> => {
   // This function is now just a wrapper for immediate playback if needed,
   // but the UI handles the audio object now.
   const url = await generateTTSAudio(text);
   const audio = new Audio(url);
   audio.play();
};

// Live API Handling
export const connectToLiveNewsroom = async (
  onAudioData: (buffer: AudioBuffer) => void,
  onClose: () => void
) => {
  const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  let nextStartTime = 0;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: "You are a creative Content Director for a viral TikTok News channel. Brainstorm with the user about hooks, trends, and storytelling angles. Speak Indonesian comfortably, be casual, energetic, and fun. Use terms like 'FYP', 'Viral', 'Hook', 'Netizen'.",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, // Energetic voice
      },
    },
    callbacks: {
      onopen: () => {
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          sessionPromise.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
          });
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);
      },
      onmessage: async (message: LiveServerMessage) => {
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
           nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
           const audioBuffer = await decodeAudioData(
             base64ToUint8Array(base64Audio),
             outputAudioContext,
             24000,
             1
           );
           
           const source = outputAudioContext.createBufferSource();
           source.buffer = audioBuffer;
           source.connect(outputAudioContext.destination);
           source.start(nextStartTime);
           nextStartTime += audioBuffer.duration;
           
           // Visualize output (Optional hook call)
           onAudioData(audioBuffer);
        }
      },
      onclose: () => {
        console.log("Live session closed");
        onClose();
      },
      onerror: (err) => {
        console.error("Live session error", err);
        onClose();
      }
    }
  });

  return {
    disconnect: async () => {
      const session = await sessionPromise;
      session.close();
      inputAudioContext.close();
      outputAudioContext.close();
      stream.getTracks().forEach(t => t.stop());
    }
  };
};