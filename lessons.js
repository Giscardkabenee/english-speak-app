// Leçons courtes : chaque leçon est une mise en situation avec un objectif
// et quelques phrases clés à prononcer.
export const LESSONS = [
  {
    id: "cafe",
    emoji: "☕",
    title: "Commander au café",
    goal: "Commander une boisson et un snack, demander le prix.",
    scenario:
      "You are a friendly barista in a London coffee shop. The learner is a customer. Take their order, suggest a pastry, and tell them the price.",
    phrases: [
      "Could I have a latte, please?",
      "What would you recommend?",
      "How much is it?",
      "Can I pay by card?",
    ],
  },
  {
    id: "smalltalk",
    emoji: "👋",
    title: "Se présenter",
    goal: "Dire qui tu es, d'où tu viens et ce que tu aimes faire.",
    scenario:
      "You are meeting the learner for the first time at a friend's party. Ask about their name, where they are from, their job and their hobbies.",
    phrases: [
      "Nice to meet you.",
      "I'm from France, but I live in Brussels.",
      "In my free time, I like reading.",
      "What do you do for a living?",
    ],
  },
  {
    id: "travel",
    emoji: "✈️",
    title: "À l'aéroport",
    goal: "S'enregistrer, poser une question sur la porte d'embarquement.",
    scenario:
      "You are a check-in agent at an airport. Ask for the learner's passport, ask about luggage, and give them their gate and boarding time.",
    phrases: [
      "I'd like to check in, please.",
      "I have one suitcase.",
      "Which gate is it?",
      "What time does boarding start?",
    ],
  },
  {
    id: "interview",
    emoji: "💼",
    title: "Entretien d'embauche",
    goal: "Parler de ton expérience et de tes points forts.",
    scenario:
      "You are a recruiter interviewing the learner for a job. Ask them to introduce themselves, describe their experience, strengths and why they want the job.",
    phrases: [
      "I have three years of experience in this field.",
      "One of my strengths is teamwork.",
      "I'm looking for new challenges.",
      "Could you tell me more about the team?",
    ],
  },
  {
    id: "free",
    emoji: "💬",
    title: "Conversation libre",
    goal: "Parler de ce que tu veux avec le tuteur.",
    scenario:
      "You are a friendly English tutor having a casual conversation. Let the learner choose the topic and keep the conversation going with open questions.",
    phrases: [
      "Let's talk about my weekend.",
      "I'd like to practise my English.",
      "Could you repeat that, please?",
      "What does that word mean?",
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
