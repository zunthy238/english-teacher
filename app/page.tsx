// app/page.tsx
// La raíz de la app lleva directo a la lección del día.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/today");
}