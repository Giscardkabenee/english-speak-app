import { GoogleGenAI } from "@google/genai";
import { getLesson, LEVELS } from "./lessons.js";

// Modèles Gemini avec offre gratuite, du plus généreux au moins généreux en
// nombre de requêtes gratuites par jour. Si l'un est saturé, on essaie le suivant.
export const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];

// The tutor answers with a fixed JSON shape so the app can show the reply,
// the corrections and the French help separately.
const REPLY_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "The tutor's spoken answer in English, 1 to 3 short sentences, ending with a question that keeps the conversation going.",
    },
    reply_fr: {
      type: "string",
      description: "French translation of `reply`.",
    },
    corrections: {
      type: "array",
      description: "Mistakes in the learner's last message. Empty if there were none.",
      items: {
        type: "object",
        properties: {
          original: { type: "string", description: "What the learner said." },
          corrected: { type: "string", description: "The natural, correct English." },
          explanation_fr: { type: "string", description: "Short explanation in French." },
        },
        required: ["original", "corrected", "explanation_fr"],
      },
    },
    better_way: {
      type: "string",
      description: "A more natural way a native speaker would say the learner's last message, or an empty string.",
    },
    score: {
      type: "integer",
      description: "0-100 rating of the learner's last message (grammar, vocabulary, fluency).",
    },
  },
  required: ["reply", "reply_fr", "corrections", "better_way", "score"],
};

function systemPrompt(lesson, level) {
  return `You are "Sam", a warm, encouraging English speaking tutor in a mobile app for French-speaking learners. The conversation is spoken: the learner's messages come from speech recognition, so ignore missing punctuation and capital letters, and don't correct obvious transcription glitches.

Role-play: ${lesson.scenario}
Lesson goal (for the learner): ${lesson.goal}
Learner level: ${LEVELS[level] ?? LEVELS.intermediate}

Keep each reply short (1 to 3 sentences) so it is easy to listen to, stay in the role-play, and always end with a question or prompt so the learner keeps speaking. If the learner writes in French, gently answer in English and help them say it in English in "better_way".
Only list real grammar or vocabulary mistakes in "corrections"; explanations are in French and one sentence long.`;
}

// Un modèle qui a renvoyé « quota atteint » est mis de côté un moment, pour ne
// pas perdre une requête à chaque message.
const blockedUntil = new Map();
// Certains modèles refusent le réglage de réflexion minimale : on s'en souvient.
const noThinkingConfig = new Set();

/** Extrait le champ "reply" dès qu'il est complet dans le JSON en cours d'arrivée. */
export function extractReply(partialJson) {
  const m = partialJson.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return null;
  }
}

/**
 * The app runs on the learner's own phone with their own free Gemini API key,
 * so it calls the Gemini API directly (no server in between).
 * The answer is streamed: `onReply` is called with Sam's sentence as soon as it
 * has arrived, before the corrections and translation are finished.
 * @param {{apiKey: string, lessonId: string, level: string, history: {role: "user"|"assistant", content: string}[], onReply?: (reply: string) => void}} params
 */
export async function tutorTurn({ apiKey, lessonId, level, history, onReply }) {
  const ai = new GoogleGenAI({ apiKey });
  const lesson = getLesson(lessonId);
  // The conversation always starts with this hidden learner turn, so Sam's
  // greeting is answered from a "user" turn as Gemini expects.
  const turns = [
    { role: "user", content: "(The learner just opened the lesson. Greet them and start the role-play.)" },
    ...history,
  ];
  const contents = turns.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const now = Date.now();
  const available = MODELS.filter((m) => (blockedUntil.get(m) ?? 0) < now);
  const candidates = available.length ? available : MODELS;

  let lastError;
  for (const model of candidates) {
    try {
      const config = {
        systemInstruction: systemPrompt(lesson, level),
        responseMimeType: "application/json",
        responseJsonSchema: REPLY_SCHEMA,
        maxOutputTokens: 1000,
      };
      // Pas de « réflexion » avant de répondre : c'est une conversation, la vitesse compte.
      if (!noThinkingConfig.has(model)) config.thinkingConfig = { thinkingLevel: "minimal" };

      const stream = await ai.models.generateContentStream({ model, contents, config });
      let text = "";
      let replySent = false;
      for await (const chunk of stream) {
        text += chunk.text ?? "";
        if (!replySent && onReply) {
          const reply = extractReply(text);
          if (reply) {
            replySent = true;
            onReply(reply);
          }
        }
      }
      if (!text) throw new Error("Le tuteur n'a pas pu répondre à ce message.");
      return JSON.parse(text);
    } catch (err) {
      lastError = err;
      if (err?.status === 400 && /thinking/i.test(err.message) && !noThinkingConfig.has(model)) {
        noThinkingConfig.add(model);
        candidates.splice(candidates.indexOf(model) + 1, 0, model); // réessaie sans ce réglage
        continue;
      }
      // Quota gratuit atteint (429) ou modèle indisponible (404) : on essaie le suivant.
      if (err?.status === 429 || err?.status === 404) {
        blockedUntil.set(model, Date.now() + (err.status === 429 ? 60_000 : 3_600_000));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
