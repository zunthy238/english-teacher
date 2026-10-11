// lib/mock/story.ts — historia de ejemplo para pruebas (Mike Chat).
export const RAW_STORY = {
  title: "First Day at the Office",
  scene_emoji: "☕💻",
  setting_es: "David llega a su primer día de trabajo.",
  speakers: [
    { name: "Maria", gender: "female" },
    { name: "David", gender: "male" },
  ],
  key_words: [
    { word: "badge", meaning_es: "carné" },
    { word: "desk", meaning_es: "escritorio" },
    { word: "team lead", meaning_es: "líder del equipo" },
  ],
  lines: [
    { speaker: 0, en: "Hi! You must be David. Welcome to the team.", es: "¡Hola! Tú debes ser David. Bienvenido al equipo." },
    { speaker: 1, en: "Thanks! Sorry I'm late. My train was delayed.", es: "¡Gracias! Perdón por llegar tarde. Mi tren se retrasó." },
    { speaker: 0, en: "No worries. Here's your badge.", es: "Tranquilo. Aquí está tu carné." },
    { speaker: 1, en: "Great. Where's my desk?", es: "Genial. ¿Dónde está mi escritorio?" },
    { speaker: 0, en: "It's next to your team lead, Sam. He's really nice.", es: "Está al lado de tu líder, Sam. Es muy amable." },
    { speaker: 1, en: "Perfect. What time is the first meeting?", es: "Perfecto. ¿A qué hora es la primera reunión?" },
    { speaker: 0, en: "It's at ten. We meet every Monday.", es: "Es a las diez. Nos reunimos cada lunes." },
    { speaker: 1, en: "Okay. I'll get a coffee first.", es: "Vale. Primero tomaré un café." },
    { speaker: 0, en: "Good idea. The kitchen is on the left.", es: "Buena idea. La cocina está a la izquierda." },
  ],
  questions: [
    { question: "What is the conversation mainly about?", options: ["A first day at work", "A job interview", "A trip"], answer: "A first day at work", line: 0, explanation_es: "Maria le da la bienvenida." },
    { question: "Why is David late?", options: ["His train was delayed", "He forgot his badge", "He had a meeting"], answer: "His train was delayed", line: 1, explanation_es: "Dice: my train was delayed." },
    { question: "Where is David's desk?", options: ["Next to Sam", "In the kitchen", "On the left"], answer: "next to sam", line: 4, explanation_es: "Next to your team lead, Sam." },
    { question: "When is the meeting?", options: ["At ten", "At two", "At noon"], answer: "At ten", line: 6, explanation_es: "It's at ten." },
  ],
  dictation: [2, 99],
};
