# Testing Agents — Vynia MNGMNT

3 agentes especializados para auditar, estresar y testear el proyecto. Numerados por orden de ejecucion.

## Orden de ejecucion

```
01-code-auditor  ──┐
                    ├──→  03-test-verify
02-chaos-engineer ─┘
```

| # | Agente | Que hace | Output |
|---|--------|----------|--------|
| 01 | code-auditor | Analisis sistematico de edge cases y riesgos | Informe de riesgos priorizado |
| 02 | chaos-engineer | Escenarios de caos desde 5 personas destructivas | Top 10 escenarios + defensas |
| 03 | test-verify | Escribe y ejecuta tests reales (Vitest) | Tests + reporte de bugs |

## Como usar

1. **Ejecutar 01 y 02** (pueden ir en paralelo en dos terminales):
   ```
   /agents → 01-code-auditor
   /agents → 02-chaos-engineer
   ```

2. **Revisar los informes** de ambos agentes

3. **Ejecutar 03** alimentandolo con los hallazgos:
   ```
   /agents → 03-test-verify
   ```
   El agente 03 hara su propio reconocimiento del codigo, pero los informes de 01 y 02 le dan contexto adicional sobre que priorizar.

## Notas

- Los agentes 01 y 02 son **solo lectura** — no modifican codigo
- El agente 03 **solo crea tests** en `__tests__/` — nunca modifica `src/` ni `api/`
- Cada agente tiene contexto aislado (no contaminan la sesion principal)
