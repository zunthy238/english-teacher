# Professor Mike v1.0 — Manual de operación

Cierre de la versión 1.0 (14-oct-2026). Producción: https://english-teacher-xi.vercel.app
Repositorio: github.com/zunthy238/english-teacher (rama main) · Carpeta local: C:\dev\english-teacher

## 1. Qué incluye la v1.0

| Pestaña / función | Qué hace | Costo de IA |
|---|---|---|
| **Hoy** | Plan del día, meta y racha, acceso a Mike, sesión guiada, historias, Hablar; prueba para subir cuando terminas un nivel | $0 |
| **Mike** 💬 | Clase por chat estilo WhatsApp: repaso, reglas, notas de voz, ejercicios, historia, repaso de fallados, reto final. Dominio ≥ 80 % para avanzar | 1 solicitud por tema (reto final) |
| **Sesión guiada** (/lesson) | La misma lección en tarjetas | La lección se crea 1 vez por tema y queda en caché |
| **Repaso** | Tarjetas con repetición espaciada (FSRS) | $0 |
| **Hablar** | Repite como nativo + conversaciones por voz según el propósito de cada usuario | ~7 solicitudes por conversación |
| **Historias** (/listen) | Diálogos con audio, preguntas, transcripción y dictado | 1 vez por tema |
| **Progreso** | Nivel y camino, "Ya puedo…", minutos, tiempo por actividad, errores | $0 |
| **Ajustes** (⚙️ en Hoy) | Prueba de nivel, propósito y profesión, meta diaria, API key, cambiar contraseña | $0 |

## 2. Tareas frecuentes

| Necesito… | Cómo |
|---|---|
| **Crear un usuario** | Supabase → Authentication → Users → Add user → correo + contraseña → marcar **Auto Confirm**. La persona entra, registra su API key en Ajustes y hace la prueba de nivel |
| **Cambiar el nivel de alguien** | Que haga la prueba en Ajustes, o en SQL Editor: `update public.profile set cefr_level = 'C1', placement_at = now() where id = (select id from auth.users where email = 'CORREO');` |
| **Reiniciar el avance de alguien** | `scripts/reset-user.sql`: cambiar el correo, ejecutar en SQL Editor y **no** guardar (commit) el archivo con el correo real |
| **Olvidó su contraseña** | Supabase → Authentication → Users → la persona → Send password recovery (requiere Site URL configurada, ver §5) o crear una temporal y que la cambie en Ajustes |
| **Ver reportes de ejercicios** | Supabase → Table Editor → `exercise_reports` (status `new`) |
| **Publicar un cambio** | `npm test` → `git add .` → `git commit -m "…"` → `git push` (Vercel publica solo) |
| **Aplicar una migración nueva** | Supabase → SQL Editor → pegar el archivo de `supabase/migrations/` → Run |

## 3. Costos y límites

| Concepto | Valor |
|---|---|
| Modelo de IA | gpt-4o-mini (texto) · voz del dispositivo ($0) · plan B del micrófono gpt-4o-mini-transcribe (~$0.003/min) |
| Cuota por usuario | 50 solicitudes al día (`DAILY_REQUEST_LIMIT` en Vercel) |
| Uso estimado | ~$0.30–1 por usuario al mes con uso diario |
| Llaves | Cada usuario usa su propia API key (BYOK), cifrada AES-256-GCM |
| **Llave de OpenAI del dueño** | **Renovar antes del 7-ene-2027** (Ajustes → API key) |

## 4. Mantenimiento

1. **Supabase gratis se pausa** con 7 días casi sin uso. Basta usar la app. Si se pausa: panel de Supabase → Resume project (se puede hasta 1 año después).
2. **Copias de seguridad:** el plan gratis guarda copias por tiempo limitado. Antes de tener usuarios reales, pasar a Pro o exportar los datos periódicamente.
3. **Vercel Hobby** es solo para uso personal no comercial. Para cobrar o poner anuncios hay que pasar a Pro (las donaciones sí se permiten).
4. **Pruebas:** `npm test` (142) y `npm run test:rls` (22/22) antes de cada push importante.
5. **No usar** `npm audit fix --force`.

## 5. Pendiente de configuración (5 minutos)

- Supabase → Authentication → URL Configuration → **Site URL** = `https://english-teacher-xi.vercel.app` (para correos de recuperación de contraseña).

## 6. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| "Registra tu API key" | El usuario no tiene key | Ajustes → API key |
| "Llegaste al límite de 50 solicitudes" | Cuota del día | Se reinicia a medianoche (hora de Colombia) |
| El micrófono no entiende | Permiso o Dictado apagado | iPhone: Ajustes → Safari → Micrófono → Permitir; Ajustes → General → Teclado → Activar dictado. La app pasa sola al modo grabar |
| Voz robótica | Voces básicas del iPhone | Ajustes → Accesibilidad → Contenido leído → Voces → Inglés → descargar Ava/Evan (Mejorada) |
| La app no carga datos | Supabase pausado | Panel de Supabase → Resume project |
| "Invalid supabaseUrl" en Vercel | Variable mal copiada | Copiar el VALOR después del `=` de `.env.local` y hacer Redeploy |

## 7. Hoja de ruta v2.0 (cuando se retome)

| Prioridad | Mejora |
|---|---|
| 1 | Mike escribe primero: notificación diaria tipo WhatsApp |
| 2 | Llamada económica con Mike (turnos automáticos, ~$0.02 por 20 min) |
| 3 | Pronunciación por sonido con Azure (nivel gratuito) dentro del chat |
| 4 | Simulacros TOEFL y prueba de salida de nivel más completa |
| 5 | Lanzamiento público: registro, política de datos, modelo de costos (BYOK vs. llave del dueño con cuotas), planes pagos |
| 6 | Limpieza: borrar `components/lesson/{exercises-form,lesson-content}.tsx` si siguen sin uso; 5 avisos menores de lint |
