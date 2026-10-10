// lib/placement/bank.ts
// Banco fijo de la prueba de nivel (sin IA, $0). 50 preguntas: 5 niveles × 4 habilidades.
// Reglas de calidad: UNA sola respuesta correcta, distractores plausibles, nada de inglés británico "dudoso"
// que un estadounidense aceptaría (p. ej. "take a decision"). La respuesta correcta va SIEMPRE primero aquí;
// el orden que ve el usuario se mezcla de forma estable con shuffledOptions().
import type { CefrLevel } from "../schemas/lesson";

export type Skill = "grammar" | "vocab" | "reading" | "listening";

export type PlacementItem = {
  id: string;
  level: CefrLevel;
  skill: Skill;
  prompt: string; // la pregunta (en inglés)
  passage?: string; // lectura: texto que se muestra
  audio?: string; // escucha: texto que se REPRODUCE y nunca se muestra
  options: [string, string, string, string]; // options[0] es la correcta
};

const g = (id: string, level: CefrLevel, prompt: string, options: PlacementItem["options"]): PlacementItem => ({
  id, level, skill: "grammar", prompt, options,
});
const v = (id: string, level: CefrLevel, prompt: string, options: PlacementItem["options"]): PlacementItem => ({
  id, level, skill: "vocab", prompt, options,
});
const r = (id: string, level: CefrLevel, passage: string, prompt: string, options: PlacementItem["options"]): PlacementItem => ({
  id, level, skill: "reading", passage, prompt, options,
});
const l = (id: string, level: CefrLevel, audio: string, prompt: string, options: PlacementItem["options"]): PlacementItem => ({
  id, level, skill: "listening", audio, prompt, options,
});

export const PLACEMENT_BANK: PlacementItem[] = [
  // ───────── A1 ─────────
  g("g-a1-1", "A1", "She ___ a teacher.", ["is", "are", "am", "be"]),
  g("g-a1-2", "A1", "I ___ coffee every morning.", ["drink", "drinks", "drinking", "am drink"]),
  g("g-a1-3", "A1", "___ you like pizza?", ["Do", "Does", "Are", "Is"]),
  v("v-a1-1", "A1", "What is the opposite of \"big\"?", ["small", "tall", "long", "old"]),
  v("v-a1-2", "A1", "You cook food in the ___.", ["kitchen", "bedroom", "bathroom", "garden"]),
  v("v-a1-3", "A1", "What day comes after Monday?", ["Tuesday", "Sunday", "Thursday", "Friday"]),
  r("r-a1-1", "A1", "Hi, I'm Ana. I'm from Mexico. I live in Bogotá with my sister. I work in a bank.",
    "Where does Ana work?", ["In a bank", "In Mexico", "In a school", "At home"]),
  r("r-a1-2", "A1", "The store opens at 9:00 a.m. and closes at 6:00 p.m. It is closed on Sundays.",
    "When is the store closed?", ["On Sundays", "At 9:00 a.m.", "On Mondays", "Every evening at 5:00"]),
  l("l-a1-1", "A1", "My name is Tom. I am thirty years old.", "How old is Tom?", ["30", "13", "3", "33"]),
  l("l-a1-2", "A1", "The keys are on the table.", "Where are the keys?", ["On the table", "In the car", "Under the bed", "In the bag"]),

  // ───────── A2 ─────────
  g("g-a2-1", "A2", "Yesterday we ___ to the beach.", ["went", "go", "goes", "have gone"]),
  g("g-a2-2", "A2", "This phone is ___ than my old one.", ["cheaper", "more cheap", "cheapest", "the cheaper"]),
  g("g-a2-3", "A2", "I'm ___ visit my parents next weekend.", ["going to", "go to", "will to", "going"]),
  v("v-a2-1", "A2", "What is the opposite of \"cheap\"?", ["expensive", "poor", "easy", "short"]),
  v("v-a2-2", "A2", "I'm really ___. I need to go to bed.", ["tired", "hungry", "thirsty", "busy"]),
  v("v-a2-3", "A2", "She works in a hospital and takes care of patients. She is a ___.", ["nurse", "lawyer", "pilot", "waiter"]),
  r("r-a2-1", "A2",
    "Hi Mark, I can't come to the meeting on Thursday because I'll be at a conference in Chicago. Can we meet on Friday morning instead? — Laura",
    "Why is Laura writing?", ["To change the day of the meeting", "To cancel the conference", "To invite Mark to Chicago", "To ask for a new job"]),
  r("r-a2-2", "A2",
    "Our office is moving to a new building next month. The new address is 25 Park Street. Parking will be free for all employees.",
    "What will be free for employees?", ["Parking", "Lunch", "The new building", "Bus tickets"]),
  l("l-a2-1", "A2", "I usually take the bus to work, but today I'm driving because it's raining.",
    "How is the speaker going to work today?", ["By car", "By bus", "On foot", "By train"]),
  l("l-a2-2", "A2", "The meeting starts at ten thirty, not at ten.", "When does the meeting start?", ["10:30", "10:00", "2:30", "10:13"]),

  // ───────── B1 ─────────
  g("g-b1-1", "B1", "I ___ at this company since 2021.", ["have worked", "work", "am working", "worked"]),
  g("g-b1-2", "B1", "If it rains tomorrow, we ___ the game.", ["will cancel", "would cancel", "cancelled", "are cancel"]),
  g("g-b1-3", "B1", "The report ___ by the manager yesterday.", ["was approved", "approved", "has approved", "is approving"]),
  v("v-b1-1", "B1", "We need to ___ a decision before Friday.", ["make", "do", "get", "put"]),
  v("v-b1-2", "B1", "The meeting was ___ because the manager was sick.", ["postponed", "improved", "reminded", "delivered"]),
  v("v-b1-3", "B1", "I'm looking ___ to hearing from you.", ["forward", "ahead", "up", "out"]),
  r("r-b1-1", "B1",
    "Many people think working from home saves time. However, a recent survey found that remote workers often work longer hours, because it is harder to separate work from personal life.",
    "According to the text, what is a problem with working from home?",
    ["People often work more hours", "People save time traveling", "Surveys take too long", "Offices are too expensive"]),
  r("r-b1-2", "B1",
    "To apply, send your résumé and a short cover letter by May 15. Only candidates selected for an interview will be contacted.",
    "What happens if you are NOT selected?",
    ["You will not get a reply", "You will get an email", "You must apply again", "You will have a short interview"]),
  l("l-b1-1", "B1", "Sarah finished the report last night, and she's going to send it to the client tomorrow morning.",
    "What is Sarah going to do?", ["Send the report tomorrow", "Finish the report tonight", "Call the client today", "Write a new report"]),
  l("l-b1-2", "B1", "I'd love to join you for dinner, but I have to finish this presentation first.",
    "What does the speaker mean?",
    ["They can't go to dinner right now", "They don't like dinner", "They already finished the presentation", "They want to cook dinner"]),

  // ───────── B2 ─────────
  g("g-b2-1", "B2", "If I had known about the traffic, I ___ earlier.", ["would have left", "would leave", "had left", "will leave"]),
  g("g-b2-2", "B2", "She suggested ___ the meeting to next week.", ["moving", "to move", "move", "moved"]),
  g("g-b2-3", "B2", "By the time we arrived, the presentation ___.", ["had already started", "has already started", "already starts", "would already start"]),
  v("v-b2-1", "B2", "The new manager is very ___; she always listens to different opinions.", ["open-minded", "stubborn", "careless", "shy"]),
  v("v-b2-2", "B2", "We need to ___ the costs before we present the budget.", ["estimate", "pretend", "refuse", "admire"]),
  v("v-b2-3", "B2", "Let's ___ this topic for now and come back to it next week.", ["set aside", "set up", "set off", "set out"]),
  r("r-b2-1", "B2",
    "Although the project was delivered on time, the client was disappointed with the final design, which they felt did not reflect the brand's identity. The team has agreed to revise it at no extra cost.",
    "Why was the client unhappy?",
    ["The design did not match their brand", "The project was late", "The price was too high", "The team refused to change it"]),
  r("r-b2-2", "B2",
    "Contrary to popular belief, multitasking rarely improves productivity. Studies suggest that switching between tasks can reduce efficiency by as much as 40%.",
    "What is the main idea of the text?",
    ["Doing many tasks at once usually makes us less productive", "Most people are good at multitasking", "Studies about productivity are unreliable", "Switching tasks increases efficiency by 40%"]),
  l("l-b2-1", "B2", "If I'd known the deadline had been moved up, I would have stayed late to finish the report.",
    "What happened?",
    ["The speaker didn't know the deadline changed", "The speaker stayed late", "The deadline was postponed", "The report was finished early"]),
  l("l-b2-2", "B2", "We're not ruling out a merger, but at this stage it's still too early to say.",
    "What does the speaker say about the merger?",
    ["It's possible, but nothing is decided", "It has been cancelled", "It will happen next week", "It was a mistake"]),

  // ───────── C1 ─────────
  g("g-c1-1", "C1", "Not only ___ late, but he also forgot the documents.", ["was he", "he was", "he is", "did he be"]),
  g("g-c1-2", "C1", "It's high time we ___ a decision about the budget.", ["made", "make", "will make", "have made"]),
  g("g-c1-3", "C1", "___ the circumstances, the team did a remarkable job.", ["Given", "Despite of", "Although", "In spite"]),
  v("v-c1-1", "C1", "The new policy had a ___ effect on morale; people felt motivated again.", ["tangible", "reluctant", "negligible", "hostile"]),
  v("v-c1-2", "C1", "Her argument was so ___ that nobody could find a flaw in it.", ["compelling", "tentative", "ambiguous", "redundant"]),
  v("v-c1-3", "C1", "The CEO ___ the rumors about layoffs, calling them completely unfounded.", ["dismissed", "endorsed", "disclosed", "conceded"]),
  r("r-c1-1", "C1",
    "While automation is often portrayed as a threat to employment, historical evidence suggests that technological change tends to reshape jobs rather than eliminate them outright. The real challenge, economists argue, lies in how quickly workers can acquire new skills.",
    "What do economists see as the main challenge?",
    ["How fast workers can learn new skills", "Stopping automation completely", "Finding more historical evidence", "Eliminating outdated jobs"]),
  r("r-c1-2", "C1",
    "The proposal was met with cautious optimism: board members welcomed its ambition but questioned whether the timeline was realistic.",
    "How did the board react?",
    ["Positively, but with doubts about the timeline", "They rejected it completely", "They loved the short timeline", "They had no opinion"]),
  l("l-c1-1", "C1", "Frankly, I'd be surprised if the figures turned out to be any better than last quarter's.",
    "What does the speaker expect?",
    ["The figures won't improve", "The figures will be much better", "Last quarter was a disaster", "The figures were already published"]),
  l("l-c1-2", "C1", "It's not that the idea lacks merit; it's just that we don't have the bandwidth to take it on right now.",
    "Why won't they work on the idea now?",
    ["They don't have enough time or people", "The idea is bad", "They already tried it", "Nobody likes the idea"]),
];

export const BANK_BY_ID = new Map(PLACEMENT_BANK.map((i) => [i.id, i]));

export const correctOption = (item: PlacementItem) => item.options[0];

// Mezcla estable (igual en el navegador y en el servidor) para que la correcta no quede siempre arriba
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function shuffledOptions(item: PlacementItem): string[] {
  const out = [...item.options];
  let seed = hash(item.id);
  for (let i = out.length - 1; i > 0; i--) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
