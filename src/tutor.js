import { GoogleGenAI } from "@google/genai";
import { getLesson, LEVELS } from "./lessons.js";

// Modèles Gemini avec offre gratuite, du plus généreux au moins généreux en
// nombre de requêtes gratuites par jour. Si l'un est saturé, on essaie le suivant.
export const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];

// Sam's line and its translation come back as plain text separated by this
// marker, so the English sentence can be spoken before the rest arrives.
const SEPARATOR = "###";

// Corrections are asked for separately, in parallel, so they never delay Sam.
const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    corrections: {
      type: "array",
      description: "Real grammar or vocabulary mistakes in the learner's message. Empty if there were none.",
      items: {
        type: "object",
        properties: {
          original: { type: "string", description: "What the learner said." },
          corrected: { type: "string", description: "The natural, correct English." },
          explanation_fr: { type: "string", description: "One short sentence in French." },
        },
        required: ["original", "corrected", "explanation_fr"],
      },
    },
    better_way: {
      type: "string",
      description: "A more natural way a native speaker would say it, or an empty string if it was already natural.",
    },
    praise_fr: {
      type: "string",
      description: "If there is no mistake: one short encouraging sentence in French. Otherwise an empty string.",
    },
    score: { type: "integer", description: "0-100 rating of the message (grammar, vocabulary, fluency)." },
  },
  required: ["corrections", "better_way", "praise_fr", "score"],
};

function replyPrompt(lesson, level) {
  return `You are "Sam", a warm English speaking tutor in a mobile app for French-speaking learners. The conversation is spoken: the learner's messages come from speech recognition, so ignore missing punctuation and capital letters.

Role-play: ${lesson.scenario}
Learner level: ${LEVELS[level] ?? LEVELS.intermediate}

Answer with 1 or 2 short sentences in English that stay in the role-play and end with a question so the learner keeps speaking. If the learner speaks French, answer in English simply. Do not correct mistakes here.
Output format, exactly: your English answer, then a line with only ${SEPARATOR}, then its French translation. Nothing else.`;
}

function feedbackPrompt(lesson, level) {
  return `You check one spoken message from a French-speaking learner of English (level: ${LEVELS[level] ?? LEVELS.intermediate}) during this role-play: ${lesson.scenario}
The text comes from speech recognition: ignore punctuation, capital letters and obvious transcription glitches. Only list real grammar or vocabulary mistakes.`;
}

// Un modèle qui a renvoyé « quota atteint » est mis de côté un moment, pour ne
// pas perdre une requête à chaque message.
const blockedUntil = new Map();
// Certains modèles refusent le réglage de réflexion minimale : on s'en souvient.
const noThinkingConfig = new Set();

/** Runs `call(model, config)` on the first free model that answers. */
async function withModels(baseConfig, call) {
  const now = Date.now();
  const available = MODELS.filter((m) => (blockedUntil.get(m) ?? 0) < now);
  const queue = available.length ? [...available] : [...MODELS];
  let lastError;
  let retried = false;
  while (queue.length) {
    const model = queue.shift();
    const config = { ...baseConfig };
    // Pas de « réflexion » avant de répondre : c'est une conversation, la vitesse compte.
    if (!noThinkingConfig.has(model)) config.thinkingConfig = { thinkingLevel: "minimal" };
    try {
      return await call(model, config);
    } catch (err) {
      lastError = err;
      if (err?.status === 400 && /thinking/i.test(err.message ?? "") && !noThinkingConfig.has(model)) {
        noThinkingConfig.add(model);
        queue.unshift(model); // réessaie sans ce réglage
        continue;
      }
      // Quota gratuit atteint (429), modèle surchargé (503/500) ou indisponible (404) :
      // on le met de côté un moment et on essaie le suivant.
      const pause = { 429: 60_000, 404: 3_600_000, 503: 30_000, 500: 30_000 }[err?.status];
      if (pause) {
        blockedUntil.set(model, Date.now() + pause);
        // Tous les modèles sont surchargés : on réessaie une fois après une courte pause.
        if (!queue.length && (err.status === 503 || err.status === 500) && !retried) {
          retried = true;
          await new Promise((r) => setTimeout(r, 1500));
          queue.push(...MODELS);
        }
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function toContents(history) {
  // The conversation always starts with this hidden learner turn, so Sam's
  // greeting is answered from a "user" turn as Gemini expects.
  return [
    { role: "user", content: "(The learner just opened the lesson. Greet them and start the role-play.)" },
    ...history,
  ].map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
}

/** Splits "English ### French" (possibly still arriving) into its two parts. */
export function splitReply(text) {
  const i = text.indexOf(SEPARATOR);
  if (i === -1) return { reply: text.trim(), reply_fr: "", complete: false };
  return { reply: text.slice(0, i).trim(), reply_fr: text.slice(i + SEPARATOR.length).trim(), complete: true };
}

/**
 * Sam's next line, streamed. `onReply` gets the English sentence as soon as it
 * is complete, before the French translation has arrived.
 * The app runs on the learner's phone with their own free Gemini key and calls
 * the Gemini API directly (no server in between).
 */
export async function tutorReply({ apiKey, lessonId, level, history, onReply }) {
  const ai = new GoogleGenAI({ apiKey });
  const lesson = getLesson(lessonId);
  const contents = toContents(history);
  return withModels({ systemInstruction: replyPrompt(lesson, level), maxOutputTokens: 300 }, async (model, config) => {
    const stream = await ai.models.generateContentStream({ model, contents, config });
    let text = "";
    let sent = false;
    for await (const chunk of stream) {
      text += chunk.text ?? "";
      const parts = splitReply(text);
      if (!sent && parts.complete && parts.reply) {
        sent = true;
        onReply?.(parts.reply);
      }
    }
    const parts = splitReply(text);
    if (!parts.reply) throw new Error("Sam n'a pas pu répondre à ce message.");
    if (!sent) onReply?.(parts.reply);
    return { reply: parts.reply, reply_fr: parts.reply_fr };
  });
}

/** Corrections for the learner's last message (runs in parallel with tutorReply). */
export async function tutorFeedback({ apiKey, lessonId, level, previousLine, learnerText }) {
  const ai = new GoogleGenAI({ apiKey });
  const lesson = getLesson(lessonId);
  const prompt = `${previousLine ? `Sam said: "${previousLine}"\n` : ""}The learner answered: "${learnerText}"`;
  return withModels(
    {
      systemInstruction: feedbackPrompt(lesson, level),
      responseMimeType: "application/json",
      responseJsonSchema: FEEDBACK_SCHEMA,
      maxOutputTokens: 600,
    },
    async (model, config) => {
      const res = await ai.models.generateContent({ model, contents: prompt, config });
      return JSON.parse(res.text);
    }
  );
}
