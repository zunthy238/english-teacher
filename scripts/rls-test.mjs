// scripts/rls-test.mjs
// Prueba de aislamiento entre usuarios (CP-1). Usa SOLO la llave publishable, igual que la app:
// si un usuario pudiera ver o tocar datos de otro, esta prueba lo detecta.
// Uso: npm run test:rls   (lee credenciales de .env.local; nada de esto se sube a GitHub)
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const need = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "RLS_TEST_A_EMAIL",
  "RLS_TEST_A_PASSWORD",
  "RLS_TEST_B_EMAIL",
  "RLS_TEST_B_PASSWORD",
];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Faltan variables en .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const newClient = () =>
  createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function signIn(email, password) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo entrar como ${email}: ${error.message}`);
  return { client, id: data.user.id };
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ ok, name, detail });
}

const TEST_TYPE = "rls_isolation_test";

try {
  const A = await signIn(process.env.RLS_TEST_A_EMAIL, process.env.RLS_TEST_A_PASSWORD);
  const B = await signIn(process.env.RLS_TEST_B_EMAIL, process.env.RLS_TEST_B_PASSWORD);
  const anon = newClient();

  // 1. A crea un dato propio
  const ins = await A.client
    .from("errors")
    .upsert(
      { user_id: A.id, error_type: TEST_TYPE, example_wrong: "He drink.", example_right: "He drinks." },
      { onConflict: "user_id,error_type" },
    )
    .select();
  check("A puede guardar su propio error", !ins.error && ins.data?.length === 1, ins.error?.message);

  // 2. A ve su dato y su perfil
  const aErr = await A.client.from("errors").select("id").eq("error_type", TEST_TYPE);
  check("A ve su propio error", aErr.data?.length === 1, aErr.error?.message);
  const aProf = await A.client.from("profile").select("id");
  check("A ve solo 1 perfil (el suyo)", aProf.data?.length === 1 && aProf.data[0].id === A.id, aProf.error?.message);

  // 3. B NO ve los datos de A
  const bErr = await B.client.from("errors").select("id").eq("user_id", A.id);
  check("B NO ve los errores de A", !bErr.error && bErr.data?.length === 0, bErr.error?.message);
  const bProf = await B.client.from("profile").select("id");
  check("B ve solo 1 perfil (el suyo)", bProf.data?.length === 1 && bProf.data[0].id === B.id, bProf.error?.message);

  // 4. B NO puede escribir a nombre de A
  const bIns = await B.client
    .from("errors")
    .insert({ user_id: A.id, error_type: "intruso", example_wrong: "x", example_right: "y" });
  check("B NO puede crear datos a nombre de A", Boolean(bIns.error), "el insert fue aceptado");

  // 5. B NO puede modificar ni borrar datos de A
  const bUpd = await B.client.from("errors").update({ count: 999 }).eq("user_id", A.id).select();
  check("B NO puede modificar datos de A", !bUpd.error && bUpd.data?.length === 0, bUpd.error?.message);
  const bDel = await B.client.from("errors").delete().eq("user_id", A.id).select();
  check("B NO puede borrar datos de A", !bDel.error && bDel.data?.length === 0, bDel.error?.message);
  const still = await A.client.from("errors").select("count").eq("error_type", TEST_TYPE).single();
  check("El dato de A sigue intacto", still.data?.count === 1, still.error?.message);

  // 6. Sin login no se ve nada
  const anonProf = await anon.from("profile").select("id");
  check("Sin login NO se ven perfiles", (anonProf.data?.length ?? 0) === 0);
  const anonErr = await anon.from("errors").select("id");
  check("Sin login NO se ven errores", (anonErr.data?.length ?? 0) === 0);

  // 7. Bóveda de keys: cerrada incluso para el dueño desde el navegador
  const vaultRead = await A.client.from("user_api_keys").select("*");
  check("user_api_keys: el usuario no puede leerla", (vaultRead.data?.length ?? 0) === 0);
  const vaultIns = await A.client
    .from("user_api_keys")
    .insert({ user_id: A.id, provider: "openai", ciphertext: "x", iv: "x", tag: "x" });
  check("user_api_keys: el usuario no puede escribirla", Boolean(vaultIns.error), "el insert fue aceptado");

  // 8. Cuota: el usuario puede ver su uso, pero NO alterarlo (lo escribe solo el servidor)
  const usageRead = await A.client.from("usage_daily").select("requests");
  check("usage_daily: el usuario puede leer su uso", !usageRead.error, usageRead.error?.message);
  const usageWrite = await A.client
    .from("usage_daily")
    .upsert({ user_id: A.id, day: "2000-01-01", requests: 0 }, { onConflict: "user_id,day" });
  check("usage_daily: el usuario NO puede alterar su cuota", Boolean(usageWrite.error), "la escritura fue aceptada");
  const rpc = await A.client.rpc("consume_request", { p_user: A.id, p_limit: 999 });
  check("consume_request: el navegador NO puede llamarla", Boolean(rpc.error), "la función respondió");

  // Limpieza: A borra su dato de prueba
  await A.client.from("errors").delete().eq("error_type", TEST_TYPE);
} catch (e) {
  console.error(`\n✗ Error inesperado: ${e.message}\n`);
  process.exit(1);
}

console.log("\nPrueba de aislamiento RLS\n");
for (const r of results) {
  console.log(`${r.ok ? "✓" : "✗"} ${r.name}${!r.ok && r.detail ? `  →  ${r.detail}` : ""}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} correctas\n`);
process.exit(failed ? 1 : 0);
