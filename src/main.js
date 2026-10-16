import { scorePronunciation } from "./scoring.js";
import { LESSONS } from "./lessons.js";
import { tutorTurn } from "./tutor.js";
import { speak, stopSpeaking, listen, stopListening, speechSupported } from "./speech.js";

const $ = (sel) => document.querySelector(sel);

const state = {
  lesson: null,
  history: [], // {role, content} envoyé au tuteur IA
  busy: false,
  listening: false,
};

// ---------- Stockage local (sur le téléphone) ----------
function load(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// ---------- Réglages : clé API ----------
const getApiKey = () => load("apiKey", "");

function openSettings() {
  $("#api-key").value = getApiKey();
  $("#settings-status").textContent = "";
  $("#settings").showModal();
}

$("#settings-form").onsubmit = (e) => {
  e.preventDefault();
  const key = $("#api-key").value.trim();
  save("apiKey", key);
  $("#settings").close();
  renderKeyBanner();
};
$("#settings-cancel").onclick = () => $("#settings").close();
$("#open-settings").onclick = openSettings;

function renderKeyBanner() {
  $("#key-banner").hidden = Boolean(getApiKey());
}

// ---------- Progression ----------
function loadProgress() {
  try {
    return JSON.parse(load("progress")) || { days: [], turns: 0 };
  } catch {
    return { days: [], turns: 0 };
  }
}
function recordPractice() {
  const p = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (!p.days.includes(today)) p.days.push(today);
  p.turns += 1;
  save("progress", JSON.stringify(p));
  renderStreak();
}
function renderStreak() {
  const p = loadProgress();
  let streak = 0;
  const d = new Date();
  for (;;) {
    if (!p.days.includes(d.toISOString().slice(0, 10))) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  $("#streak").textContent =
    p.turns === 0
      ? "Fais ta première conversation aujourd'hui 🔥"
      : `🔥 ${streak} jour${streak > 1 ? "s" : ""} d'affilée · ${p.turns} phrase${p.turns > 1 ? "s" : ""} prononcée${p.turns > 1 ? "s" : ""}`;
}

// ---------- Navigation ----------
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
}

function renderLessons() {
  const ul = $("#lessons");
  ul.innerHTML = "";
  for (const lesson of LESSONS) {
    const li = document.createElement("li");
    li.innerHTML = `<button class="lesson-card">
        <span class="emoji">${lesson.emoji}</span>
        <span><strong></strong><small></small></span>
      </button>`;
    li.querySelector("strong").textContent = lesson.title;
    li.querySelector("small").textContent = lesson.goal;
    li.querySelector("button").onclick = () => openLesson(lesson);
    ul.appendChild(li);
  }
}

function openLesson(lesson) {
  state.lesson = lesson;
  state.history = [];
  $("#lesson-title").textContent = `${lesson.emoji} ${lesson.title}`;
  $("#lesson-goal").textContent = lesson.goal;
  $("#chat").innerHTML = "";
  renderPhrases(lesson.phrases);
  selectTab("talk");
  show("lesson");
  if (getApiKey()) tutorReply();
  else addBubble("error", "Ajoute ta clé API dans ⚙️ Réglages pour parler avec Sam. L'onglet Prononciation marche sans clé.");
}

function selectTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${name}`));
}

// ---------- Conversation ----------
function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  $("#chat").appendChild(div);
  div.scrollIntoView({ behavior: "smooth", block: "end" });
  return div;
}

function button(label, onclick) {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = onclick;
  return b;
}

// Affiche la phrase de Sam tout de suite ; la traduction arrive juste après.
function addTutorBubble(reply) {
  const div = addBubble("tutor", "");
  const p = document.createElement("p");
  p.textContent = reply;
  const fr = document.createElement("p");
  fr.className = "translation";
  fr.hidden = true;
  const translate = button("🇫🇷 Traduire", () => (fr.hidden = !fr.hidden));
  translate.disabled = true;
  const actions = document.createElement("div");
  actions.className = "bubble-actions";
  actions.append(
    button("🔊 Réécouter", () => speak(reply)),
    button("🐢 Lentement", () => speak(reply, 0.7)),
    translate
  );
  div.append(p, actions, fr);
  return {
    setTranslation(text) {
      fr.textContent = text;
      translate.disabled = !text;
    },
  };
}

function addFeedback(data) {
  if (!data.corrections?.length && !data.better_way) return;
  const div = document.createElement("div");
  div.className = "feedback";
  const title = document.createElement("strong");
  title.textContent = `Score ${data.score}/100`;
  div.appendChild(title);
  for (const c of data.corrections ?? []) {
    const item = document.createElement("div");
    item.className = "correction";
    item.innerHTML = `<s></s> → <b></b><small></small>`;
    item.querySelector("s").textContent = c.original;
    item.querySelector("b").textContent = c.corrected;
    item.querySelector("small").textContent = c.explanation_fr;
    div.appendChild(item);
  }
  if (data.better_way) {
    const better = document.createElement("div");
    better.className = "better";
    better.textContent = `💡 Plus naturel : “${data.better_way}”`;
    better.appendChild(button("🔊", () => speak(data.better_way)));
    div.appendChild(better);
  }
  const bubbles = $("#chat").querySelectorAll(".bubble.user");
  bubbles[bubbles.length - 1]?.after(div);
}

function explainError(err) {
  const msg = err?.message ?? "";
  if (/API key not valid|API_KEY_INVALID/i.test(msg) || err?.status === 401)
    return "ta clé Gemini n'est pas valide. Vérifie-la dans ⚙️ Réglages.";
  if (err?.status === 429) return "la limite gratuite est atteinte pour le moment. Réessaie dans une minute, ou demain si c'est la limite du jour.";
  if (err?.status === 403) return "Google refuse cette clé (pays non pris en charge ou API désactivée).";
  if (!navigator.onLine || /fetch|network/i.test(msg)) return "pas de connexion Internet.";
  return msg || "erreur inconnue.";
}

async function tutorReply() {
  state.busy = true;
  const thinking = addBubble("tutor typing", "…");
  let bubble = null;
  const showReply = (reply) => {
    thinking.remove();
    bubble = addTutorBubble(reply);
    speak(reply); // Sam parle pendant que les corrections finissent d'arriver
  };
  try {
    const data = await tutorTurn({
      apiKey: getApiKey(),
      lessonId: state.lesson.id,
      level: $("#level").value,
      history: state.history,
      onReply: showReply,
    });
    if (!bubble) showReply(data.reply);
    bubble.setTranslation(data.reply_fr);
    state.history.push({ role: "assistant", content: data.reply });
    if (state.history.length > 1) addFeedback(data);
  } catch (err) {
    console.error(err);
    thinking.remove();
    // Retire le dernier message de l'apprenant pour qu'il puisse le redire.
    if (state.history.at(-1)?.role === "user") state.history.pop();
    addBubble("error", `Oups : ${explainError(err)}`);
  } finally {
    state.busy = false;
  }
}

async function sendUserText(text) {
  if (!text || state.busy) return;
  if (!getApiKey()) return openSettings();
  addBubble("user", text);
  state.history.push({ role: "user", content: text.slice(0, 2000) });
  recordPractice();
  await tutorReply();
}

const IDLE_HINT = "Appuie sur le micro et parle en anglais";

async function onMic() {
  if (state.busy) return;
  if (state.listening) return stopListening();
  stopSpeaking();
  state.listening = true;
  $("#mic").classList.add("recording");
  $("#live").textContent = "Je t'écoute…";
  try {
    const text = await listen({ onInterim: (t) => ($("#live").textContent = t || "Je t'écoute…") });
    $("#live").textContent = text ? IDLE_HINT : "Je n'ai rien entendu, réessaie.";
    if (text) await sendUserText(text);
  } catch (err) {
    $("#live").textContent =
      err.message === "not-allowed"
        ? "Autorise le micro pour English Speak dans les réglages du téléphone."
        : "Micro indisponible : écris ta réponse au clavier.";
  } finally {
    state.listening = false;
    $("#mic").classList.remove("recording");
  }
}

// ---------- Prononciation ----------
function renderPhrases(phrases) {
  const ul = $("#phrases");
  ul.innerHTML = "";
  for (const phrase of phrases) {
    const li = document.createElement("li");
    li.className = "phrase";
    li.innerHTML = `<p class="target"></p><div class="phrase-actions"></div><p class="result muted"></p>`;
    const target = li.querySelector(".target");
    const result = li.querySelector(".result");
    target.textContent = phrase;
    const repeat = button("🎤 Répéter", async () => {
      repeat.disabled = true;
      stopSpeaking();
      result.textContent = "Je t'écoute…";
      try {
        const spoken = await listen({ onInterim: (t) => (result.textContent = t) });
        const { score, words } = scorePronunciation(phrase, spoken);
        target.innerHTML = "";
        words.forEach(({ word, ok }, k) => {
          const span = document.createElement("span");
          span.className = ok ? "ok" : "miss";
          span.textContent = word;
          target.append(span, k < words.length - 1 ? " " : "");
        });
        result.textContent = `${score}/100 · entendu : “${spoken || "rien"}” ${
          score >= 90 ? "🎉 Excellent !" : score >= 60 ? "👍 Presque !" : "💪 Réessaie"
        }`;
        if (spoken) recordPractice();
      } catch (err) {
        result.textContent =
          err.message === "not-allowed" ? "Autorise le micro dans les réglages du téléphone." : "Micro indisponible.";
      } finally {
        repeat.disabled = false;
      }
    });
    li.querySelector(".phrase-actions").append(button("🔊 Écouter", () => speak(phrase, 0.85)), repeat);
    ul.appendChild(li);
  }
}

// ---------- Démarrage ----------
$("#back").onclick = () => {
  stopSpeaking();
  show("home");
};
$("#mic").onclick = onMic;
$("#text-form").onsubmit = (e) => {
  e.preventDefault();
  const input = $("#text-input");
  const text = input.value.trim();
  input.value = "";
  sendUserText(text);
};
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => selectTab(t.dataset.tab)));
$("#level").value = load("level", "intermediate");
$("#level").onchange = (e) => save("level", e.target.value);
$("#key-banner").onclick = openSettings;

speechSupported().then((ok) => ($("#support-warning").hidden = ok));
renderStreak();
renderKeyBanner();
renderLessons();
