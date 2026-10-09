// lib/mock/lessons.ts
// Lecciones de prueba escritas a mano (CP-0.5). En CP-3 las reemplaza la IA + caché.
import type { Lesson } from "@/lib/schemas/lesson";

export const MOCK_LESSONS: Lesson[] = [
  {
    topic_key: "A1_verb_to_be",
    title: "Verb to be: introducing yourself at work",
    cefr_level: "A1",
    explanation_es:
      "El verbo to be significa 'ser' o 'estar'. En presente tiene tres formas: am (I), is (he, she, it) y are (you, we, they). En conversación casi siempre se usan contracciones: I'm, you're, he's, she's, it's, we're, they're. Para preguntar, el verbo va antes del sujeto: Are you from Colombia? Para negar, se agrega not: I'm not tired.",
    examples: [
      { en: "I'm Carlos. I'm from Medellín.", es: "Soy Carlos. Soy de Medellín." },
      { en: "She's a nurse at a hospital in Miami.", es: "Ella es enfermera en un hospital en Miami." },
      { en: "We're at the coffee shop on Main Street.", es: "Estamos en la cafetería de la calle Main." },
      { en: "Are you a new employee?", es: "¿Eres un empleado nuevo?" },
      { en: "He isn't at the office today.", es: "Él no está en la oficina hoy." },
      { en: "They're my coworkers.", es: "Ellos son mis compañeros de trabajo." },
    ],
    vocabulary: [
      { word: "coworker", meaning_es: "compañero de trabajo", example: "My coworker is from Texas." },
      { word: "employee", meaning_es: "empleado", example: "I'm a new employee." },
      { word: "nice to meet you", meaning_es: "mucho gusto", example: "Hi, I'm Ana. Nice to meet you." },
      { word: "from", meaning_es: "de (origen)", example: "We're from Colombia." },
      { word: "tired", meaning_es: "cansado", example: "I'm tired today." },
      { word: "busy", meaning_es: "ocupado", example: "She's busy right now." },
      { word: "office", meaning_es: "oficina", example: "The office is on the third floor." },
      { word: "neighbor", meaning_es: "vecino", example: "My neighbor is very friendly." },
    ],
    exercises: [
      {
        id: "e1",
        type: "multiple_choice",
        prompt: "I ___ a software developer.",
        options: ["am", "is", "are"],
        answer: "am",
        error_type: "verb_to_be_agreement",
      },
      {
        id: "e2",
        type: "multiple_choice",
        prompt: "They ___ from New York.",
        options: ["am", "is", "are"],
        answer: "are",
        error_type: "verb_to_be_agreement",
      },
      {
        id: "e3",
        type: "fill_blank",
        prompt: "She ___ (be) my manager.",
        answer: "is",
        error_type: "verb_to_be_agreement",
      },
      {
        id: "e4",
        type: "fill_blank",
        prompt: "___ (be) you ready for the meeting?",
        answer: "are",
        error_type: "question_word_order",
      },
      {
        id: "e5",
        type: "word_order",
        prompt: "Ordena las palabras.",
        words: ["from", "is", "Colombia", "she"],
        answer: "She is from Colombia",
        error_type: "word_order",
      },
      {
        id: "e6",
        type: "word_order",
        prompt: "Ordena la pregunta.",
        words: ["busy", "you", "now", "are"],
        answer: "Are you busy now",
        error_type: "question_word_order",
      },
      {
        id: "e7",
        type: "writing",
        prompt:
          "Escribe 4 frases para presentarte en tu primer día en una empresa de EE. UU.: nombre, origen, profesión y cómo te sientes.",
      },
      {
        id: "e8",
        type: "speaking",
        prompt: "Preséntate en voz alta a un compañero nuevo. Empieza con: Hi, I'm...",
      },
    ],
  },
  {
    topic_key: "A1_present_simple",
    title: "Present simple: daily routines",
    cefr_level: "A1",
    explanation_es:
      "El presente simple describe rutinas y hábitos. Con I, you, we y they el verbo no cambia: I work. Con he, she e it se agrega -s: She works. Los verbos terminados en -o, -sh, -ch o -x llevan -es: goes, watches. Para preguntar y negar se usa do o does: Do you drink coffee? He doesn't work on Sundays. Ojo: después de does, el verbo vuelve a su forma base: Does she work? (no 'works').",
    examples: [
      { en: "I wake up at 6:30 every day.", es: "Me despierto a las 6:30 todos los días." },
      { en: "She takes the bus to work.", es: "Ella toma el bus para ir al trabajo." },
      { en: "We have a team meeting on Mondays.", es: "Tenemos una reunión de equipo los lunes." },
      { en: "He doesn't drink coffee.", es: "Él no toma café." },
      { en: "Do you work from home?", es: "¿Trabajas desde casa?" },
      { en: "My brother watches baseball on weekends.", es: "Mi hermano ve béisbol los fines de semana." },
    ],
    vocabulary: [
      { word: "usually", meaning_es: "normalmente", example: "I usually eat lunch at noon." },
      { word: "every day", meaning_es: "todos los días", example: "She runs every day." },
      { word: "wake up", meaning_es: "despertarse", example: "I wake up early." },
      { word: "commute", meaning_es: "trayecto al trabajo", example: "My commute is 20 minutes." },
      { word: "weekend", meaning_es: "fin de semana", example: "We go hiking on the weekend." },
      { word: "grocery store", meaning_es: "supermercado", example: "He goes to the grocery store on Saturdays." },
      { word: "work from home", meaning_es: "trabajar desde casa", example: "I work from home on Fridays." },
      { word: "never", meaning_es: "nunca", example: "They never eat breakfast." },
    ],
    exercises: [
      {
        id: "e1",
        type: "multiple_choice",
        prompt: "He ___ coffee every morning.",
        options: ["drink", "drinks", "drinking"],
        answer: "drinks",
        error_type: "third_person_s",
      },
      {
        id: "e2",
        type: "multiple_choice",
        prompt: "___ she live in Miami?",
        options: ["Do", "Does", "Is"],
        answer: "Does",
        error_type: "auxiliary_do_does",
      },
      {
        id: "e3",
        type: "fill_blank",
        prompt: "My sister ___ (watch) TV at night.",
        answer: "watches",
        error_type: "third_person_s",
      },
      {
        id: "e4",
        type: "fill_blank",
        prompt: "I ___ (go) to the gym on Mondays.",
        answer: "go",
        error_type: "verb_form",
      },
      {
        id: "e5",
        type: "word_order",
        prompt: "Ordena las palabras.",
        words: ["up", "usually", "seven", "I", "at", "wake"],
        answer: "I usually wake up at seven",
        error_type: "adverb_position",
      },
      {
        id: "e6",
        type: "word_order",
        prompt: "Ordena la pregunta.",
        words: ["work", "does", "from", "he", "home"],
        answer: "Does he work from home",
        error_type: "question_word_order",
      },
      {
        id: "e7",
        type: "writing",
        prompt:
          "Escribe 5 frases sobre tu rutina en un día de trabajo: a qué hora te despiertas, cómo vas al trabajo y qué haces en la tarde.",
      },
      {
        id: "e8",
        type: "speaking",
        prompt: "Describe en voz alta la rutina de un amigo o familiar usando he o she. Cuida la -s final.",
      },
    ],
  },
];