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
  {
    id: "free",
    title: "Conversation libre",
    role: "Tuteur",
    level: "Tous niveaux",
    minutes: 10,
    goal: "Parle de ce que tu veux avec Sam.",
    scenario:
      "You are a friendly English tutor having a casual conversation. Let the learner choose the topic and keep the conversation going with open questions.",
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

/** La leçon mise en avant change chaque jour. */
export function lessonOfTheDay(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return LESSONS[day % LESSONS.length];
}
