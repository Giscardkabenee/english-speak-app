// Leçons courtes : chaque leçon est une mise en situation avec un objectif
// et quelques phrases clés à prononcer (avec leur traduction).
export const LESSONS = [
  {
    id: "cafe",
    title: "Commander au café",
    role: "Serveur",
    level: "Débutant",
    minutes: 5,
    goal: "Sam joue le serveur. Tu commandes une boisson et un gâteau.",
    scenario:
      "You are a friendly barista in a London coffee shop. The learner is a customer. Take their order, suggest a pastry, and tell them the price.",
    phrases: [
      { en: "Could I have a latte, please?", fr: "Je pourrais avoir un latte, s'il vous plaît ?" },
      { en: "What would you recommend?", fr: "Que me conseillez-vous ?" },
      { en: "Thank you, that's three coffees.", fr: "Merci, ça fait trois cafés." },
      { en: "Can I pay by card?", fr: "Je peux payer par carte ?" },
    ],
  },
  {
    id: "smalltalk",
    title: "Se présenter",
    role: "Nouvel ami",
    level: "Débutant",
    minutes: 5,
    goal: "Tu rencontres Sam à une fête. Dis qui tu es et ce que tu aimes faire.",
    scenario:
      "You are meeting the learner for the first time at a friend's party. Ask about their name, where they are from, their job and their hobbies.",
    phrases: [
      { en: "Nice to meet you.", fr: "Enchanté de te rencontrer." },
      { en: "I grew up in a small town, but now I live in the city.", fr: "J'ai grandi dans une petite ville, mais maintenant je vis en ville." },
      { en: "In my free time, I like reading.", fr: "Pendant mon temps libre, j'aime lire." },
      { en: "What do you do for a living?", fr: "Qu'est-ce que tu fais dans la vie ?" },
    ],
  },
  {
    id: "travel",
    title: "À l'aéroport",
    role: "Agent d'enregistrement",
    level: "Débutant",
    minutes: 6,
    goal: "Tu t'enregistres pour ton vol et tu demandes ta porte d'embarquement.",
    scenario:
      "You are a check-in agent at an airport. Ask for the learner's passport, ask about luggage, and give them their gate and boarding time.",
    phrases: [
      { en: "I'd like to check in, please.", fr: "Je voudrais m'enregistrer, s'il vous plaît." },
      { en: "I have one suitcase.", fr: "J'ai une valise." },
      { en: "Which gate is it?", fr: "C'est quelle porte ?" },
      { en: "What time does boarding start?", fr: "À quelle heure commence l'embarquement ?" },
    ],
  },
  {
    id: "interview",
    title: "Entretien d'embauche",
    role: "Recruteur",
    level: "Intermédiaire",
    minutes: 8,
    goal: "Sam te fait passer un entretien. Parle de ton expérience et de tes points forts.",
    scenario:
      "You are a recruiter interviewing the learner for a job. Ask them to introduce themselves, describe their experience, strengths and why they want the job.",
    phrases: [
      { en: "I have three years of experience in this field.", fr: "J'ai trois ans d'expérience dans ce domaine." },
      { en: "One of my strengths is teamwork.", fr: "L'un de mes points forts est le travail d'équipe." },
      { en: "I'm looking for new challenges.", fr: "Je cherche de nouveaux défis." },
      { en: "Could you tell me more about the team?", fr: "Pourriez-vous m'en dire plus sur l'équipe ?" },
    ],
  },
  // ---------- Mon travail : MEAL et conservation ----------
  {
    id: "meal-donor",
    work: true,
    title: "Rapport au bailleur",
    role: "Chargée de programme du bailleur",
    level: "Intermédiaire",
    minutes: 8,
    goal: "Tu présentes les résultats de ton projet au bailleur : indicateurs, cibles atteintes, retards.",
    scenario:
      "You are a programme officer at a donor organisation having a progress meeting with the learner, a MEAL officer at a conservation NGO. Ask about results against the logframe indicators, targets versus achievements, data sources, challenges, delays and next steps. Use MEAL vocabulary naturally (baseline, target, indicator, outcome, output, means of verification).",
    phrases: [
      { en: "We reached eighty percent of our annual target.", fr: "Nous avons atteint quatre-vingts pour cent de notre cible annuelle." },
      { en: "The baseline survey was completed in March.", fr: "L'enquête de référence a été terminée en mars." },
      { en: "This indicator is measured every quarter.", fr: "Cet indicateur est mesuré chaque trimestre." },
      { en: "The main challenge was access to the field sites.", fr: "Le principal défi a été l'accès aux sites de terrain." },
    ],
  },
  {
    id: "meal-learning",
    work: true,
    title: "Atelier leçons apprises",
    role: "Collègue de l'équipe",
    level: "Intermédiaire",
    minutes: 8,
    goal: "Tu animes un atelier d'apprentissage : ce qui a marché, ce qui n'a pas marché, quoi changer.",
    scenario:
      "You are a colleague in a learning and reflection workshop facilitated by the learner, who works in MEAL (Monitoring, Evaluation, Accountability and Learning) for a conservation programme. Share opinions on what worked and what did not, and ask the learner to summarise lessons learned, recommendations and how feedback from communities is used.",
    phrases: [
      { en: "What worked well during this phase?", fr: "Qu'est-ce qui a bien marché pendant cette phase ?" },
      { en: "One key lesson learned is that we need more community feedback.", fr: "Une leçon clé est qu'il nous faut plus de retours des communautés." },
      { en: "I recommend that we adjust the data collection tools.", fr: "Je recommande d'ajuster les outils de collecte de données." },
      { en: "How can we make sure this is used in the next plan?", fr: "Comment s'assurer que ce soit utilisé dans le prochain plan ?" },
    ],
  },
  {
    id: "field-data",
    work: true,
    title: "Collecte de données sur le terrain",
    role: "Responsable de la communauté",
    level: "Intermédiaire",
    minutes: 6,
    goal: "Tu interroges un responsable local pour une enquête : explique le but, demande le consentement, pose tes questions.",
    scenario:
      "You are a community leader living near a national park, being interviewed by the learner for a monitoring survey of a conservation project. Answer in simple English, sometimes give vague answers so the learner has to ask follow-up questions, and expect them to explain the purpose of the survey and ask for consent.",
    phrases: [
      { en: "The purpose of this survey is to understand how the project affects your community.", fr: "Le but de cette enquête est de comprendre comment le projet touche votre communauté." },
      { en: "Your answers will remain confidential.", fr: "Vos réponses resteront confidentielles." },
      { en: "Do you agree to take part in this interview?", fr: "Acceptez-vous de participer à cet entretien ?" },
      { en: "Could you give me an example?", fr: "Pourriez-vous me donner un exemple ?" },
    ],
  },
  {
    id: "conservation",
    work: true,
    title: "Présenter la conservation des gorilles",
    role: "Journaliste",
    level: "Intermédiaire",
    minutes: 8,
    goal: "Un journaliste t'interroge sur la conservation des gorilles de montagne et le rôle des communautés.",
    scenario:
      "You are an international journalist interviewing the learner, who works for a mountain gorilla conservation programme. Ask about gorilla population trends, threats (poaching, habitat loss, disease), ranger-based monitoring, tourism revenue sharing and how local communities benefit from conservation.",
    phrases: [
      { en: "The mountain gorilla population has been growing slowly.", fr: "La population de gorilles de montagne augmente lentement." },
      { en: "Local communities are at the heart of our work.", fr: "Les communautés locales sont au cœur de notre travail." },
      { en: "Rangers monitor the gorilla groups every day.", fr: "Les rangers suivent les groupes de gorilles chaque jour." },
      { en: "Part of the tourism revenue is shared with nearby villages.", fr: "Une partie des revenus du tourisme est partagée avec les villages voisins." },
    ],
  },
  {
    id: "team-meeting",
    work: true,
    title: "Réunion d'équipe en anglais",
    role: "Directeur du programme",
    level: "Intermédiaire",
    minutes: 6,
    goal: "Tu fais le point sur ton travail en réunion : ce que tu as fait, ce qui bloque, ce dont tu as besoin.",
    scenario:
      "You are the programme director of a conservation NGO running a weekly team meeting in English. Ask the learner, who leads MEAL, for a quick update on their work, blockers, upcoming field missions and reports, and what support they need.",
    phrases: [
      { en: "This week I finalised the quarterly report.", fr: "Cette semaine, j'ai finalisé le rapport trimestriel." },
      { en: "I'm waiting for data from the field team.", fr: "J'attends les données de l'équipe de terrain." },
      { en: "I'll share the dashboard by Friday.", fr: "Je partagerai le tableau de bord d'ici vendredi." },
      { en: "Could we discuss this after the meeting?", fr: "Pourrait-on en parler après la réunion ?" },
    ],
  },
  {
    id: "free",
    title: "Conversation libre",
    role: "Tuteur",
    level: "Tous niveaux",
    minutes: 10,
    goal: "Parle de ce que tu veux avec Sam.",
    scenario:
      "You are a friendly English tutor having a casual conversation. The learner works in MEAL (Monitoring, Evaluation, Accountability and Learning) for a conservation programme. Let the learner choose the topic, which may be work-related, and keep the conversation going with open questions.",
    phrases: [
      { en: "Let's talk about my weekend.", fr: "Parlons de mon week-end." },
      { en: "I'd like to practise my English.", fr: "J'aimerais pratiquer mon anglais." },
      { en: "Could you repeat that, please?", fr: "Pourriez-vous répéter, s'il vous plaît ?" },
      { en: "What does that word mean?", fr: "Que veut dire ce mot ?" },
    ],
  },
];

export const LEVELS = {
  beginner: "A1-A2 (beginner): use very short, simple sentences and common words.",
  intermediate: "B1-B2 (intermediate): use natural everyday English at a moderate pace.",
  advanced: "C1 (advanced): speak naturally with idioms and richer vocabulary.",
};

export function getLesson(id) {
  return LESSONS.find((l) => l.id === id) ?? LESSONS[LESSONS.length - 1];
}

export const WORK_LESSONS = LESSONS.filter((l) => l.work);

/** La leçon mise en avant change chaque jour, parmi les sujets de travail. */
export function lessonOfTheDay(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return WORK_LESSONS[day % WORK_LESSONS.length];
}
