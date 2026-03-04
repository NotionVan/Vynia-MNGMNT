# Testing & Optimization Agents — Vynia MNGMNT

Colección de agentes especializados para auditar, estresar, testear, optimizar y documentar el proyecto. Numerados por orden recomendado de ejecución según el ciclo de desarrollo.

## Flujo de Trabajo (Workflow)

```
[INVESTIGACIÓN]
04-research-agent ────────┐
                          │
[AUDITORÍA Y CAOS]        v (Implementación)
01-code-auditor ───┐      │
07-api-security ───┼──> 05-refactor-maven ───> 03-test-verify
02-chaos-engineer ─┤      │
06-ux-a11y-guardian┘      │
                          v
                    08-the-scribe (Documentación Final)
```

## Directorio de Agentes

| # | Agente | Qué hace | Output |
|---|--------|----------|--------|
| **01** | `code-auditor` | Análisis sistemático de *edge cases* lógicos y riesgos funcionales. | Informe de riesgos priorizado |
| **02** | `chaos-engineer` | Simula escenarios de caos desde 5 perfiles destructivos de usuario. | Top 10 escenarios + defensas |
| **03** | `test-verify` | Escribe y ejecuta tests reales (Vitest). | Tests + reporte de bugs |
| **04** | `research-agent` | Investiga herramientas/soluciones **sin contexto** precio ("Clean room"). | Informes de *benchmarking* imparciales |
| **05** | `refactor-maven` | Reescribe código para hacerlo más limpio (Clean Code/SOLID) sin alterar lógica. | Código refactorizado + Justificación |
| **06** | `ux-a11y-guardian` | Audita accesibilidad (WCAG) y barreras de Experiencia de Usuario (UX/UI). | Puntuación UI/UX + Fixes cosméticos |
| **07** | `api-security-sentinel` | Busca vulnerabilidades (tokens, inyecciones) y evalúa límites (Notion API Rate Limits).| Informe de mitigación e inyección |
| **08** | `the-scribe` | Genera documentación (Release Notes, READMEs) entendibles para negocio y devs. | Changelogs legibles o Markdown técnico |

## Cómo usar el ecosistema

1. **Investigación (Opcional)**: Usa `04` cuando necesites buscar una librería nueva o una solución a un problema arquitectónico antes de programar.
2. **Auditoría (Paralela)**: Ejecuta `01`, `02`, `06` y `07` sobre componentes específicos para obtener una visión 360º de riesgos (lógicos, usuarios, UI y seguridad red). 
3. **Corrección**: Usa `05-refactor-maven` para arreglar problemas estructurales detectados en las auditorías, asegurándote de no romper la lógica existente.
4. **Verificación**: Corre `03-test-verify` informándolo de los hallazgos críticos para que cree los tests correspondientes.
5. **Cierre**: Pasa los diffs de código o resultados a `08-the-scribe` para que genere el *Changelog* para los dueños de la pastelería.

## Reglas y Notas

- Los agentes **01, 02, 04, 06 y 07** son **solo lectura** — no modifican código, solo analizan o sugieren mejoras.
- El agente **03** **solo crea tests** en `__tests__/` — nunca modifica `src/` ni `api/`.
- El agente **05** reescribe código en `src/` o `api/` pero **tiene prohibido alterar la lógica de negocio**.
- Cada agente tiene un prompt construido con contexto aislado para evitar alucinar características no comprobadas de la aplicación principal.
