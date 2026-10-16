import Anthropic from "@anthropic-ai/sdk";
import { getLesson, LEVELS } from "./lessons.js";

export const MODEL = "claude-opus-5-5";

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
        additionalProperties: false,
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
  additionalProperties: false,
};

function systemPrompt(lesson, level) {
  return `You are "Sam", a warm, encouraging English speaking tutor in a mobile app for French-speaking learners. The conversation is spoken: the learner's messages come from speech recognition, so ignore missing punctuation and capital letters, and don't correct obvious transcription glitches.

Role-play: ${lesson.scenario}
Lesson goal (for the learner): ${lesson.goal}
Learner level: ${LEVELS[level] ?? LEVELS.intermediate}

Keep each reply short (1 to 3 sentences) so it is easy to listen to, stay in the role-play, and always end with a question or prompt so the learner keeps speaking. If the learner writes in French, gently answer in English and help them say it in English in "better_way".
Only list real grammar or vocabulary mistakes in "corrections"; explanations are in French and one sentence long.`;
}

/**
 * The app runs on the learner's own phone with their own API key, so it
 * calls the Claude API directly (no server in between).
 * @param {{apiKey: string, lessonId: string, level: string, history: {role: "user"|"assistant", content: string}[]}} params
 */
export async function tutorTurn({ apiKey, lessonId, level, history }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const lesson = getLesson(lessonId);
  const messages =
    history.length > 0
      ? history
      : [{ role: "user", content: "(The learner just opened the lesson. Greet them and start the role-play.)" }];

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: systemPrompt(lesson, level),
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: REPLY_SCHEMA },
    },
    messages,
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Le tuteur n'a pas pu répondre à ce message.");
  }
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(text);
}
