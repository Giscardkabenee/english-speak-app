// Micro et voix : plugins natifs dans l'app Android, API du navigateur sinon
// (pratique pour tester dans Chrome sur ordinateur).
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const isNative = Capacitor.isNativePlatform();
const WebRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ---------- Voix ----------
// Réglages choisis par l'apprenant : voix (identifiant voiceURI) et vitesse.
const prefs = { voice: "", speed: 1 };
export function setVoicePrefs({ voice, speed }) {
  if (voice !== undefined) prefs.voice = voice;
  if (speed !== undefined) prefs.speed = Number(speed) || 1;
}

async function allVoices() {
  if (isNative) {
    try {
      return (await TextToSpeech.getSupportedVoices()).voices ?? [];
    } catch {
      return [];
    }
  }
  if (!("speechSynthesis" in window)) return [];
  let voices = speechSynthesis.getVoices();
  if (!voices.length) {
    // Chrome charge la liste des voix en différé.
    await new Promise((r) => {
      speechSynthesis.addEventListener("voiceschanged", r, { once: true });
      setTimeout(r, 1500);
    });
    voices = speechSynthesis.getVoices();
  }
  return voices;
}

const ACCENTS = [
  ["en-us", "américaine"],
  ["en-gb", "britannique"],
  ["en-au", "australienne"],
  ["en-in", "indienne"],
];
const locale = (v) => (v.lang ?? "").replace("_", "-").toLowerCase();

/** Jusqu'à 3 voix anglaises proposées dans les réglages : [{ id, label }]. */
export async function englishVoices() {
  const voices = (await allVoices()).filter((v) => locale(v).startsWith("en"));
  // Les voix installées sur le téléphone d'abord (elles marchent hors ligne).
  voices.sort((a, b) => Number(b.localService ?? false) - Number(a.localService ?? false));
  const picked = [];
  // Une voix par accent, puis on complète avec d'autres voix américaines.
  for (const [loc] of ACCENTS) {
    const v = voices.find((x) => locale(x) === loc && !picked.includes(x));
    if (v && picked.length < 3) picked.push(v);
  }
  for (const v of voices) if (picked.length < 3 && !picked.includes(v)) picked.push(v);
  const counts = {};
  return picked.map((v, i) => {
    const accent = ACCENTS.find(([loc]) => loc === locale(v))?.[1] ?? "anglaise";
    counts[accent] = (counts[accent] ?? 0) + 1;
    return { id: v.voiceURI || v.name, label: `Voix ${i + 1} (${accent}${counts[accent] > 1 ? ` ${counts[accent]}` : ""})` };
  });
}

let voiceCache = null;
async function chosenVoice() {
  if (!prefs.voice) return null;
  voiceCache ??= await allVoices();
  const index = voiceCache.findIndex((v) => (v.voiceURI || v.name) === prefs.voice);
  return index === -1 ? null : { index, voice: voiceCache[index] };
}

export async function speak(text, rate = 1.0) {
  const finalRate = Math.min(2, Math.max(0.3, rate * prefs.speed));
  const chosen = await chosenVoice();
  if (isNative) {
    try {
      await TextToSpeech.stop();
      const options = { text, lang: chosen?.voice.lang ?? "en-US", rate: finalRate, category: "playback" };
      if (chosen) options.voice = chosen.index;
      await TextToSpeech.speak(options);
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
    u.rate = finalRate;
    const voice = chosen?.voice ?? speechSynthesis.getVoices().find((v) => v.lang === "en-US" && /Google|Samantha|Natural/i.test(v.name));
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
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
