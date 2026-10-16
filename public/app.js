import { scorePronunciation } from "./scoring.js";

const $ = (sel) => document.querySelector(sel);
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const state = {
  lessons: [],
  lesson: null,
  history: [], // {role, content} envoyé au serveur
  busy: false,
};

// ---------- Synthèse vocale (la voix de Sam) ----------
let englishVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  englishVoice =
    voices.find((v) => v.lang === "en-US" && /Google|Samantha|Natural/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

function speak(text, rate = 0.95) {
  if (!("speechSynthesis" in window)) return Promise.resolve();
  speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    if (englishVoice) u.voice = englishVoice;
    u.onend = u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

// ---------- Reconnaissance vocale ----------
function listen({ onInterim } = {}) {
  return new Promise((resolve, reject) => {
    if (!SpeechRecognition) return reject(new Error("unsupported"));
    const rec = new SpeechRecognition();
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
    rec.onerror = (e) => reject(new Error(e.error));
    rec.onend = () => resolve(finalText.trim());
    rec.start();
    listen.current = rec;
  });
}

// ---------- Progression (stockée localement) ----------
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("progress")) || { days: [], turns: 0 };
  } catch {
    return { days: [], turns: 0 };
  }
}
function recordPractice() {
  const p = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (!p.days.includes(today)) p.days.push(today);
  p.turns += 1;
  try {
    localStorage.setItem("progress", JSON.stringify(p));
  } catch {}
  renderStreak();
}
function renderStreak() {
  const p = loadProgress();
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!p.days.includes(key)) break;
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

async function loadLessons() {
  const res = await fetch("/api/lessons");
  state.lessons = await res.json();
  const ul = $("#lessons");
  ul.innerHTML = "";
  for (const lesson of state.lessons) {
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
  tutorTurn();
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

function addTutorBubble(data) {
  const div = addBubble("tutor", "");
  const p = document.createElement("p");
  p.textContent = data.reply;
  div.appendChild(p);

  const actions = document.createElement("div");
  actions.className = "bubble-actions";
  const replay = document.createElement("button");
  replay.textContent = "🔊 Réécouter";
  replay.onclick = () => speak(data.reply);
  const slow = document.createElement("button");
  slow.textContent = "🐢 Lentement";
  slow.onclick = () => speak(data.reply, 0.7);
  const tr = document.createElement("button");
  tr.textContent = "🇫🇷 Traduire";
  const fr = document.createElement("p");
  fr.className = "translation";
  fr.textContent = data.reply_fr;
  fr.hidden = true;
  tr.onclick = () => (fr.hidden = !fr.hidden);
  actions.append(replay, slow, tr);
  div.append(actions, fr);
}

function addFeedback(data) {
  const hasCorrections = data.corrections?.length > 0;
  if (!hasCorrections && !data.better_way) return;
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
    const play = document.createElement("button");
    play.textContent = "🔊";
    play.onclick = () => speak(data.better_way);
    better.appendChild(play);
    div.appendChild(better);
  }
  // Le retour s'affiche sous le dernier message de l'apprenant.
  const bubbles = $("#chat").querySelectorAll(".bubble.user");
  bubbles[bubbles.length - 1]?.after(div);
}

async function tutorTurn() {
  state.busy = true;
  const thinking = addBubble("tutor typing", "…");
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: state.lesson.id,
        level: $("#level").value,
        history: state.history,
      }),
    });
    const data = await res.json();
    thinking.remove();
    if (!res.ok) throw new Error(data.error);
    state.history.push({ role: "assistant", content: data.reply });
    if (state.history.length > 1) addFeedback(data);
    addTutorBubble(data);
    await speak(data.reply);
  } catch (err) {
    thinking.remove();
    addBubble("error", `Oups : ${err.message}. Vérifie que le serveur tourne et que la clé API est configurée.`);
  } finally {
    state.busy = false;
  }
}

async function sendUserText(text) {
  if (!text || state.busy) return;
  addBubble("user", text);
  state.history.push({ role: "user", content: text });
  recordPractice();
  await tutorTurn();
}

async function onMic() {
  if (state.busy) return;
  const mic = $("#mic");
  if (mic.classList.contains("recording")) {
    listen.current?.stop();
    return;
  }
  speechSynthesis?.cancel();
  mic.classList.add("recording");
  $("#live").textContent = "Je t'écoute…";
  try {
    const text = await listen({ onInterim: (t) => ($("#live").textContent = t || "Je t'écoute…") });
    $("#live").textContent = "Appuie sur le micro et parle en anglais";
    if (text) await sendUserText(text);
    else $("#live").textContent = "Je n'ai rien entendu, réessaie.";
  } catch (err) {
    $("#live").textContent =
      err.message === "not-allowed"
        ? "Autorise l'accès au micro dans ton navigateur."
        : "Micro indisponible : écris ta réponse au clavier.";
  } finally {
    mic.classList.remove("recording");
  }
}

// ---------- Prononciation ----------
function renderPhrases(phrases) {
  const ul = $("#phrases");
  ul.innerHTML = "";
  for (const phrase of phrases) {
    const li = document.createElement("li");
    li.className = "phrase";
    li.innerHTML = `<p class="target"></p>
      <div class="phrase-actions">
        <button class="listen">🔊 Écouter</button>
        <button class="repeat">🎤 Répéter</button>
      </div>
      <p class="result muted"></p>`;
    const target = li.querySelector(".target");
    target.textContent = phrase;
    li.querySelector(".listen").onclick = () => speak(phrase, 0.85);
    li.querySelector(".repeat").onclick = async (e) => {
      const btn = e.currentTarget;
      const result = li.querySelector(".result");
      btn.disabled = true;
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
      } catch {
        result.textContent = "Micro indisponible dans ce navigateur.";
      } finally {
        btn.disabled = false;
      }
    };
    ul.appendChild(li);
  }
}

// ---------- Démarrage ----------
$("#back").onclick = () => {
  speechSynthesis?.cancel();
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
try {
  const saved = localStorage.getItem("level");
  if (saved) $("#level").value = saved;
} catch {}
$("#level").onchange = (e) => {
  try {
    localStorage.setItem("level", e.target.value);
  } catch {}
};
if (!SpeechRecognition) $("#support-warning").hidden = false;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

renderStreak();
loadLessons();
