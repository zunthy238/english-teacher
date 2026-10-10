// lib/speak/scenarios.ts
// Escenarios de conversación con Professor Mike, según para qué quiere el inglés cada persona.
// Nada es exclusivo de un usuario: "work" usa la profesión que cada quien escribe en Ajustes.
export type Purpose = "daily" | "travel" | "work" | "study";
export const PURPOSES: Purpose[] = ["daily", "travel", "work", "study"];

export const PURPOSE_INFO: Record<Purpose, { label: string; emoji: string; desc: string }> = {
  daily: { label: "Vida diaria", emoji: "🌎", desc: "Hablar con gente, comprar, el médico" },
  travel: { label: "Viajes", emoji: "✈️", desc: "Aeropuerto, hotel, restaurante" },
  work: { label: "Trabajo", emoji: "💼", desc: "Entrevistas, reuniones, clientes" },
  study: { label: "Estudios / examen", emoji: "🎓", desc: "Clases, presentaciones, TOEFL" },
};

export type Scenario = {
  id: string;
  purpose: Purpose;
  emoji: string;
  title: string; // en inglés; {job} se reemplaza por la profesión
  goal_es: string; // la meta de la conversación
  role: string; // a quién interpreta Mike (para el prompt)
  opening: string; // primera línea de Mike (sin IA)
  first_hint: string; // ejemplo de respuesta para el 1er turno
};

export const SCENARIOS: Scenario[] = [
  // Vida diaria
  { id: "coffee_shop", purpose: "daily", emoji: "☕", title: "Order at a coffee shop", goal_es: "Pide una bebida y algo de comer, y paga",
    role: "a friendly barista at a busy coffee shop in Chicago",
    opening: "Hi there! What can I get started for you today?", first_hint: "Hi! Can I get a medium latte, please?" },
  { id: "new_neighbor", purpose: "daily", emoji: "🏡", title: "Meet your new neighbor", goal_es: "Preséntate y conversa sobre ti",
    role: "a talkative new neighbor in a suburb of Atlanta",
    opening: "Oh hi! I don't think we've met. I'm Jessica, I live next door. Did you just move in?", first_hint: "Hi Jessica! Yes, I moved in last week. I'm from Colombia." },
  { id: "doctor_visit", purpose: "daily", emoji: "🩺", title: "At the doctor's office", goal_es: "Explica cómo te sientes y entiende las indicaciones",
    role: "a kind family doctor at a clinic",
    opening: "Good morning! I'm Dr. Miller. So, what brings you in today?", first_hint: "Good morning. I have a headache and I feel tired." },
  { id: "store_return", purpose: "daily", emoji: "🛍️", title: "Return an item at a store", goal_es: "Devuelve un producto y explica el motivo",
    role: "a customer service employee at a department store",
    opening: "Hi, welcome to customer service! How can I help you?", first_hint: "Hi, I'd like to return this jacket. It's too small." },
  // Viajes
  { id: "airport_checkin", purpose: "travel", emoji: "🛫", title: "Check in at the airport", goal_es: "Haz el check-in, pregunta por tu maleta y la puerta",
    role: "an airline check-in agent at JFK airport",
    opening: "Good afternoon! Where are you flying to today?", first_hint: "Good afternoon. I'm flying to Miami." },
  { id: "hotel_checkin", purpose: "travel", emoji: "🏨", title: "Check in at a hotel", goal_es: "Confirma tu reserva y pide información",
    role: "a hotel front desk clerk in San Francisco",
    opening: "Welcome to the Bayview Hotel! Do you have a reservation with us?", first_hint: "Yes, I have a reservation under the name García." },
  { id: "restaurant", purpose: "travel", emoji: "🍽️", title: "Dinner at a restaurant", goal_es: "Pide la comida, pregunta y pide la cuenta",
    role: "a friendly server at an American diner",
    opening: "Hi folks, welcome in! Can I start you off with something to drink?", first_hint: "Hi! Can I have a glass of water, please?" },
  { id: "directions", purpose: "travel", emoji: "🗺️", title: "Ask for directions", goal_es: "Pregunta cómo llegar a un lugar y confirma",
    role: "a helpful local on a street in New York City",
    opening: "Hey, you look a little lost. Can I help you find something?", first_hint: "Yes, please! How do I get to Central Park?" },
  // Trabajo
  { id: "job_interview", purpose: "work", emoji: "💼", title: "Job interview – {job}", goal_es: "Preséntate y explica un logro de tu experiencia",
    role: "a friendly but professional hiring manager interviewing a candidate for a {job} position, on a video call",
    opening: "Hi, thanks for joining the call! I'm Mike, the hiring manager. Can you tell me a little about yourself?",
    first_hint: "Sure! I'm from Colombia and I have five years of experience in my field." },
  { id: "team_meeting", purpose: "work", emoji: "👥", title: "Daily team meeting", goal_es: "Cuenta qué hiciste ayer, qué harás hoy y si tienes bloqueos",
    role: "a team lead running a quick daily stand-up meeting with a {job}",
    opening: "Good morning, everyone! Let's get started. What did you work on yesterday?", first_hint: "Good morning! Yesterday I finished the monthly report." },
  { id: "client_call", purpose: "work", emoji: "📞", title: "Call with a client", goal_es: "Entiende el problema del cliente y propón una solución",
    role: "a client calling a {job} because something is not working as expected",
    opening: "Hi, thanks for taking my call. We have a problem and I hope you can help us.", first_hint: "Of course! Can you tell me what's happening?" },
  { id: "coworker_chat", purpose: "work", emoji: "🥪", title: "Small talk with a coworker", goal_es: "Conversa de forma natural en la hora del almuerzo",
    role: "a friendly coworker at lunch time in an American office",
    opening: "Hey! How's your week going so far?", first_hint: "Pretty good, thanks! It's been busy. How about you?" },
  // Estudios / examen
  { id: "class_presentation", purpose: "study", emoji: "🎤", title: "Present a topic in class", goal_es: "Presenta un tema y responde preguntas",
    role: "a university professor listening to a short student presentation and asking follow-up questions",
    opening: "Okay, you're up next! What topic are you going to present today?", first_hint: "Today I'm going to talk about renewable energy." },
  { id: "toefl_question", purpose: "study", emoji: "📝", title: "TOEFL-style speaking", goal_es: "Da tu opinión con razones y ejemplos",
    role: "a TOEFL speaking examiner asking independent questions (opinion with reasons and examples), one at a time",
    opening: "Let's begin. Some people prefer to study alone, others prefer to study in groups. Which do you prefer and why?",
    first_hint: "I prefer to study alone because I can focus better." },
  { id: "office_hours", purpose: "study", emoji: "🧑‍🏫", title: "Talk to your professor", goal_es: "Pide ayuda con una tarea y una extensión del plazo",
    role: "a busy but helpful professor during office hours",
    opening: "Come on in! What can I help you with today?", first_hint: "Hi professor. I have a question about the homework." },
];

export const SCENARIO_BY_ID = new Map(SCENARIOS.map((s) => [s.id, s]));
export const TURNS = 6; // turnos del estudiante por conversación

export function jobLabel(job: string | null | undefined) {
  return job?.trim() || "professional";
}

export function fillJob(text: string, job: string | null | undefined) {
  return text.replaceAll("{job}", jobLabel(job));
}

export function scenariosFor(goals: string[] | null | undefined): Scenario[] {
  const valid = (goals ?? []).filter((g): g is Purpose => (PURPOSES as string[]).includes(g));
  const use = valid.length ? valid : (["daily"] as Purpose[]);
  return SCENARIOS.filter((s) => use.includes(s.purpose));
}

// Ajustes: valida lo que llega a PATCH /api/profile (meta, propósitos, profesión)
export function parseProfilePatch(body: unknown):
  | { ok: true; value: { daily_minutes?: number; goals?: Purpose[]; job_title?: string | null } }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  const out: { daily_minutes?: number; goals?: Purpose[]; job_title?: string | null } = {};
  if ("daily_minutes" in b) {
    if (typeof b.daily_minutes !== "number" || ![10, 15, 20, 30, 45, 60].includes(b.daily_minutes))
      return { ok: false, error: "Elige una meta válida." };
    out.daily_minutes = b.daily_minutes;
  }
  if ("goals" in b) {
    if (!Array.isArray(b.goals)) return { ok: false, error: "Propósitos inválidos." };
    const goals = [...new Set(b.goals)].filter((g): g is Purpose => (PURPOSES as unknown[]).includes(g));
    if (goals.length === 0 || goals.length !== b.goals.length) return { ok: false, error: "Elige al menos un propósito válido." };
    out.goals = goals;
  }
  if ("job_title" in b) {
    if (b.job_title === null || (typeof b.job_title === "string" && !b.job_title.trim())) out.job_title = null;
    else if (typeof b.job_title === "string") {
      const job = b.job_title.replace(/[<>{}\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      if (job.length < 2 || job.length > 60) return { ok: false, error: "La profesión debe tener entre 2 y 60 caracteres." };
      out.job_title = job;
    } else return { ok: false, error: "Profesión inválida." };
  }
  if (Object.keys(out).length === 0) return { ok: false, error: "No hay cambios." };
  return { ok: true, value: out };
}
