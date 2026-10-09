# Prueba de aislamiento RLS — CP-1

- Fecha: 2026-10-09 (CP-1 y CP-2)
- Comando: `npm run test:rls` (script `scripts/rls-test.mjs`)
- Llave usada: publishable (la misma del navegador). Sin llave secreta.
- Usuarios: A (dueño) y B (`+prueba`), creados a mano con registro público desactivado.
- Resultado CP-1: **13/13 correctas** · Resultado CP-2 (tras migración 0002): **16/16 correctas**

| # | Verificación | Resultado |
|---|---|---|
| 1 | A puede guardar su propio error | ✓ |
| 2 | A ve su propio error | ✓ |
| 3 | A ve solo 1 perfil (el suyo) | ✓ |
| 4 | B NO ve los errores de A | ✓ |
| 5 | B ve solo 1 perfil (el suyo) | ✓ |
| 6 | B NO puede crear datos a nombre de A | ✓ |
| 7 | B NO puede modificar datos de A | ✓ |
| 8 | B NO puede borrar datos de A | ✓ |
| 9 | El dato de A sigue intacto | ✓ |
| 10 | Sin login NO se ven perfiles | ✓ |
| 11 | Sin login NO se ven errores | ✓ |
| 12 | user_api_keys: el usuario no puede leerla | ✓ |
| 13 | user_api_keys: el usuario no puede escribirla | ✓ |
| 14 | usage_daily: el usuario puede leer su uso | ✓ |
| 15 | usage_daily: el usuario NO puede alterar su cuota | ✓ |
| 16 | consume_request: el navegador NO puede llamarla | ✓ |

Volver a correr esta prueba después de cada migración que toque tablas o políticas.
