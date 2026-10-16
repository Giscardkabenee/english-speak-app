// Micro et voix : plugins natifs dans l'app Android, API du navigateur sinon
// (pratique pour tester dans Chrome sur ordinateur).
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const isNative = Capacitor.isNativePlatform();
const WebRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ---------- Voix ----------
let englishVoice = null;
if (!isNative && "speechSynthesis" in window) {
  const pick = () => {
    const voices = speechSynthesis.getVoices();
    englishVoice =
      voices.find((v) => v.lang === "en-US" && /Google|Samantha|Natural/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null;
  };
  pick();
  speechSynthesis.onvoiceschanged = pick;
}

export async function speak(text, rate = 0.95) {
  if (isNative) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({ text, lang: "en-US", rate, category: "playback" });
    } catch (err) {
      console.warn("TTS", err);
    }
    return;
  }
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  await new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    if (englishVoice) u.voice = englishVoice;
    u.onend = u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (isNative) TextToSpeech.stop().catch(() => {});
  else if ("speechSynthesis" in window) speechSynthesis.cancel();
}

// ---------- Micro ----------
export async function speechSupported() {
  if (!isNative) return Boolean(WebRecognition);
  try {
    return (await NativeRecognition.available()).available;
  } catch {
    return false;
  }
}

let webRec = null;

/**
 * Écoute une phrase en anglais et renvoie le texte reconnu.
 * Erreurs possibles : "not-allowed" (micro refusé), "unsupported".
 */
export async function listen({ onInterim } = {}) {
  if (isNative) {
    let perm = await NativeRecognition.checkPermissions();
    if (perm.speechRecognition !== "granted") perm = await NativeRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") throw new Error("not-allowed");

    try {
      // Sans résultats partiels, start() se termine quand l'apprenant arrête de parler.
      const res = await NativeRecognition.start({
        language: "en-US",
        maxResults: 1,
        partialResults: false,
        popup: false,
      });
      return (res?.matches?.[0] ?? "").trim();
    } catch (err) {
      // Android renvoie une erreur quand il n'a rien entendu.
      if (/match|speech|timeout/i.test(err?.message ?? "")) return "";
      throw err;
    }
  }

  if (!WebRecognition) throw new Error("unsupported");
  return new Promise((resolve, reject) => {
    const rec = new WebRecognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      onInterim?.(finalText + interim);
    };
    rec.onerror = (e) => (e.error === "no-speech" ? resolve("") : reject(new Error(e.error)));
    rec.onend = () => resolve(finalText.trim());
    rec.start();
    webRec = rec;
  });
}

export function stopListening() {
  if (isNative) NativeRecognition.stop().catch(() => {});
  else webRec?.stop();
}
