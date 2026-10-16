import { scorePronunciation } from "./scoring.js";
import { LESSONS, lessonOfTheDay } from "./lessons.js";
import { tutorReply, tutorFeedback } from "./tutor.js";
import { speak, stopSpeaking, listen, stopListening, speechSupported } from "./speech.js";

const $ = (sel) => document.querySelector(sel);

const state = {
  lesson: null,
  history: [], // {role, content} envoyé au tuteur IA
  busy: false,
  listening: false,
  samLine: "",
  turn: 0, // numéro du tour en cours, pour ignorer les réponses arrivées trop tard
  hintIndex: 0,
  pron: { index: 0, done: new Set() },
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
  $("#settings").showModal();
}
$("#settings-form").onsubmit = (e) => {
  e.preventDefault();
  save("apiKey", $("#api-key").value.trim());
  $("#settings").close();
  renderKeyBanner();
};
$("#settings-cancel").onclick = () => $("#settings").close();
$("#open-settings").onclick = openSettings;
$("#key-banner").onclick = openSettings;

function renderKeyBanner() {
  $("#key-banner").hidden = Boolean(getApiKey());
}

// ---------- Progression ----------
function loadProgress() {
  try {
    return { days: [], turns: 0, pronSum: 0, pronCount: 0, ...JSON.parse(load("progress")) };
  } catch {
    return { days: [], turns: 0, pronSum: 0, pronCount: 0 };
  }
}
function recordPractice(pronScore = null) {
  const p = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (!p.days.includes(today)) p.days.push(today);
  if (pronScore === null) p.turns += 1;
  else {
    p.pronSum += pronScore;
    p.pronCount += 1;
  }
  save("progress", JSON.stringify(p));
  renderStats();
}
function renderStats() {
  const p = loadProgress();
  let streak = 0;
  const d = new Date();
  while (p.days.includes(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  $("#stat-streak").textContent = streak;
  $("#stat-turns").textContent = p.turns;
  $("#stat-pron").textContent = p.pronCount ? `${Math.round(p.pronSum / p.pronCount)}%` : "–";
}

// ---------- Navigation ----------
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
}
function goHome() {
  state.turn++; // ignore toute réponse encore en route
  stopSpeaking();
  if (state.listening) stopListening();
  renderStats();
  show("home");
}

function renderHome() {
  const featured = lessonOfTheDay();
  $("#featured-title").textContent = featured.title;
  $("#featured-goal").textContent = featured.goal;
  $("#featured-talk").onclick = () => openTalk(featured);
  $("#featured-pron").onclick = () => openPron(featured);

  const list = $("#lessons");
  list.innerHTML = "";
  for (const lesson of LESSONS.filter((l) => l !== featured)) {
    const row = document.createElement("button");
    row.className = "lesson-row";
    row.innerHTML = `<span></span><span></span>`;
    row.children[0].textContent = lesson.title;
    row.children[1].textContent = `${lesson.level} · ${lesson.minutes} min`;
    row.onclick = () => openTalk(lesson);
    list.appendChild(row);
  }
  renderStats();
  renderKeyBanner();
}

// ---------- Conversation ----------
function setStage(mode, label) {
  $("#wave").className = `wave ${mode}`;
  $("#stage-label").textContent = label;
}

function addMsg(kind, text) {
  const div = document.createElement("div");
  div.className = `msg ${kind}`;
  div.textContent = text;
  $("#chat").appendChild(div);
  return div;
}

function openTalk(lesson) {
  state.lesson = lesson;
  state.history = [];
  state.samLine = "";
  state.hintIndex = 0;
  $("#talk-role").textContent = `Sam · ${lesson.role}`;
  $("#talk-lesson").textContent = lesson.title;
  $("#chat").innerHTML = "";
  $("#last-turn").hidden = true;
  $("#hint").hidden = true;
  $("#sam-line").textContent = "";
  $("#sam-line-fr").textContent = "";
  $("#live").textContent = "";
  show("talk");
  if (!getApiKey()) {
    setStage("", "CLÉ MANQUANTE");
    $("#sam-line").textContent = "Ajoute ta clé Gemini gratuite pour parler avec Sam.";
    openSettings();
    return;
  }
  samSpeaks();
}

function explainError(err) {
  const msg = err?.message ?? "";
  if (/API key not valid|API_KEY_INVALID/i.test(msg) || err?.status === 401)
    return "Ta clé Gemini n'est pas valide. Vérifie-la dans les réglages.";
  if (err?.status === 429) return "La limite gratuite est atteinte. Réessaie dans une minute, ou demain si c'est la limite du jour.";
  if (err?.status === 403) return "Google refuse cette clé (pays non pris en charge ou API désactivée).";
  if (!navigator.onLine || /fetch|network/i.test(msg)) return "Pas de connexion Internet.";
  return msg || "Erreur inconnue.";
}

function showFeedback(data) {
  const box = $("#feedback");
  box.innerHTML = "";
  const corrections = data.corrections ?? [];
  if (!corrections.length) {
    const ok = document.createElement("div");
    ok.className = "fb good";
    ok.textContent = data.praise_fr || "Bien dit !";
    box.appendChild(ok);
  }
  for (const c of corrections) {
    const fix = document.createElement("div");
    fix.className = "fb fix";
    fix.innerHTML = `<span><s></s> → <b></b></span><small></small>`;
    fix.querySelector("s").textContent = c.original;
    fix.querySelector("b").textContent = c.corrected;
    fix.querySelector("small").textContent = c.explanation_fr;
    box.appendChild(fix);
  }
  if (data.better_way) {
    const better = document.createElement("div");
    better.className = "fb";
    better.innerHTML = `<div class="better"><span></span><button type="button">Écouter</button></div>`;
    better.querySelector("span").textContent = `Plus naturel : « ${data.better_way} »`;
    better.querySelector("button").onclick = () => speak(data.better_way);
    box.appendChild(better);
  }
}

/** Sam répond. Avec `learnerText`, les corrections sont demandées en parallèle. */
async function samSpeaks(learnerText) {
  const turn = ++state.turn;
  const current = () => turn === state.turn;
  const apiKey = getApiKey();
  const level = $("#level").value;
  state.busy = true;
  $("#hint").hidden = true;
  setStage("thinking", "SAM RÉFLÉCHIT");
  $("#sam-line-fr").textContent = "";

  if (learnerText) {
    $("#last-turn").hidden = false;
    $("#last-user").textContent = learnerText;
    $("#feedback").innerHTML = "";
    tutorFeedback({ apiKey, lessonId: state.lesson.id, level, previousLine: state.samLine, learnerText })
      .then((data) => current() && showFeedback(data))
      .catch((err) => console.warn("feedback", err));
  }

  let spoken = false;
  const onReply = (line) => {
    if (!current() || spoken) return;
    spoken = true;
    state.samLine = line;
    $("#sam-line").textContent = line;
    setStage("speaking", "SAM PARLE");
    speak(line).then(() => current() && !state.listening && setStage("", "À TOI"));
  };

  try {
    const data = await tutorReply({ apiKey, lessonId: state.lesson.id, level, history: state.history, onReply });
    if (!current()) return;
    onReply(data.reply);
    $("#sam-line-fr").textContent = data.reply_fr;
    state.history.push({ role: "assistant", content: data.reply });
    addMsg("sam", data.reply);
  } catch (err) {
    console.error(err);
    if (!current()) return;
    // Retire le dernier message de l'apprenant pour qu'il puisse le redire.
    if (state.history.at(-1)?.role === "user") state.history.pop();
    setStage("", "OUPS");
    $("#sam-line").textContent = explainError(err);
    addMsg("error", explainError(err));
  } finally {
    if (current()) state.busy = false;
  }
}

function sendLearnerText(text) {
  if (!text || state.busy) return;
  if (!getApiKey()) return openSettings();
  state.history.push({ role: "user", content: text.slice(0, 2000) });
  addMsg("user", text);
  recordPractice();
  samSpeaks(text);
}

async function onMic() {
  if (state.busy) return;
  if (state.listening) return stopListening();
  stopSpeaking();
  state.listening = true;
  $("#mic").classList.add("recording");
  setStage("listening", "JE T'ÉCOUTE");
  $("#live").textContent = "";
  try {
    const text = await listen({ onInterim: (t) => ($("#live").textContent = t) });
    $("#live").textContent = text ? "" : "Je n'ai rien entendu, réessaie.";
    state.listening = false;
    if (text) sendLearnerText(text);
    else setStage("", "À TOI");
  } catch (err) {
    setStage("", "À TOI");
    $("#live").textContent =
      err.message === "not-allowed"
        ? "Autorise le micro pour English Speak dans les réglages du téléphone."
        : "Micro indisponible : écris ta réponse (bouton en haut à droite).";
  } finally {
    state.listening = false;
    $("#mic").classList.remove("recording");
  }
}

function showHint() {
  const phrases = state.lesson.phrases;
  const p = phrases[state.hintIndex % phrases.length];
  state.hintIndex++;
  const hint = $("#hint");
  hint.innerHTML = `<span class="kicker">TU PEUX DIRE</span><strong></strong><small class="muted"></small>`;
  hint.querySelector("strong").textContent = p.en;
  hint.querySelector("small").textContent = p.fr;
  hint.hidden = false;
  speak(p.en, 0.9);
}

$("#talk-back").onclick = goHome;
$("#mic").onclick = onMic;
$("#hint-btn").onclick = showHint;
$("#replay").onclick = () => state.samLine && speak(state.samLine, 0.85);
$("#open-transcript").onclick = () => ($("#transcript").hidden = false);
$("#close-transcript").onclick = () => ($("#transcript").hidden = true);
$("#text-form").onsubmit = (e) => {
  e.preventDefault();
  const input = $("#text-input");
  const text = input.value.trim();
  input.value = "";
  if (text) $("#transcript").hidden = true;
  sendLearnerText(text);
};

// ---------- Prononciation ----------
function openPron(lesson) {
  state.lesson = lesson;
  state.pron = { index: 0, done: new Set() };
  show("pron");
  renderPron();
}

function renderPron() {
  const { phrases } = state.lesson;
  const { index, done } = state.pron;
  const phrase = phrases[index];
  $("#pron-progress").innerHTML = phrases.map((_, i) => `<span class="${done.has(i) || i === index ? "done" : ""}"></span>`).join("");
  $("#pron-kicker").textContent = `PHRASE ${index + 1} SUR ${phrases.length}`;
  $("#pron-target").textContent = phrase.en;
  $("#pron-fr").textContent = phrase.fr;
  $("#pron-words").innerHTML = "";
  $("#pron-tip-title").textContent = "Écoute, puis répète";
  $("#pron-tip").textContent = "Touche le micro et dis la phrase. Les mots bien reconnus passent au vert.";
  $("#pron-score").textContent = "–";
  $("#pron-score").parentElement.classList.remove("low");
  $("#pron-score-label").textContent = "score";
}

async function onPronMic() {
  if (state.listening) return stopListening();
  const phrase = state.lesson.phrases[state.pron.index];
  stopSpeaking();
  state.listening = true;
  $("#pron-mic").classList.add("recording");
  $("#pron-tip-title").textContent = "Je t'écoute…";
  try {
    const spoken = await listen({ onInterim: (t) => ($("#pron-tip").textContent = t) });
    if (!spoken) {
      $("#pron-tip-title").textContent = "Je n'ai rien entendu";
      $("#pron-tip").textContent = "Rapproche le téléphone et réessaie.";
      return;
    }
    const { score, words } = scorePronunciation(phrase.en, spoken);
    const chips = $("#pron-words");
    chips.innerHTML = "";
    for (const { word, ok } of words) {
      const chip = document.createElement("span");
      chip.className = `chip ${ok ? "ok" : "miss"}`;
      chip.textContent = word;
      chips.appendChild(chip);
    }
    $("#pron-score").textContent = score;
    $("#pron-score").parentElement.classList.toggle("low", score < 60);
    $("#pron-score-label").textContent = score >= 90 ? "excellent" : score >= 60 ? "presque" : "réessaie";
    const missed = words.filter((w) => !w.ok).map((w) => w.word);
    $("#pron-tip-title").textContent = missed.length ? `À retravailler : ${missed.join(", ")}` : "Parfait, tout est reconnu !";
    $("#pron-tip").textContent = `Entendu : « ${spoken} »`;
    state.pron.done.add(state.pron.index);
    recordPractice(score);
  } catch (err) {
    $("#pron-tip-title").textContent = "Micro indisponible";
    $("#pron-tip").textContent =
      err.message === "not-allowed" ? "Autorise le micro dans les réglages du téléphone." : "Vérifie que l'app Google est installée.";
  } finally {
    state.listening = false;
    $("#pron-mic").classList.remove("recording");
  }
}

$("#pron-close").onclick = goHome;
$("#pron-mic").onclick = onPronMic;
$("#pron-listen").onclick = () => speak(state.lesson.phrases[state.pron.index].en, 0.9);
$("#pron-slow").onclick = () => speak(state.lesson.phrases[state.pron.index].en, 0.6);
$("#pron-next").onclick = () => {
  state.pron.index = (state.pron.index + 1) % state.lesson.phrases.length;
  renderPron();
};

// ---------- Démarrage ----------
$("#level").value = load("level", "intermediate");
$("#level").onchange = (e) => save("level", e.target.value);
speechSupported().then((ok) => ($("#support-warning").hidden = ok));
renderHome();
