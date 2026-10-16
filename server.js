import "./env.js";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LESSONS } from "./lessons.js";
import { tutorTurn, MODEL } from "./tutor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/lessons", (_req, res) => {
  res.json(LESSONS.map(({ scenario, ...rest }) => rest));
});

app.post("/api/chat", async (req, res) => {
  const { lessonId, level, history } = req.body ?? {};
  if (!Array.isArray(history) || history.length > 60) {
    return res.status(400).json({ error: "Historique invalide." });
  }
  const clean = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "la clé ANTHROPIC_API_KEY n'est pas configurée sur le serveur" });
  }
  try {
    res.json(await tutorTurn({ lessonId, level, history: clean }));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message || "Erreur du tuteur." });
  }
});

app.listen(PORT, () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY n'est pas défini : le tuteur ne pourra pas répondre.");
  }
  console.log(`English Speak tourne sur http://localhost:${PORT} (modèle : ${MODEL})`);
});
