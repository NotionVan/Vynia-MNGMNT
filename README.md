# Vynia MNGMNT

Sistema de gestión de pedidos para **Vynia** (obrador artesano sin gluten), conectado a Notion como base de datos.

**URL producción:** [vynia-mngmnt.vercel.app](https://vynia-mngmnt.vercel.app)

## Funcionalidades

### Pedidos
- Lista de pedidos filtrable por fecha (Hoy / Mañana / Pasado + glass calendar horizontal)
- Filtros de estado: Pendientes, Recogidos, Todos (pills con efecto tubelight)
- Pipeline visual: badge de estado prominente con semicírculo SVG animado (`EstadoGauge`) + botón 1-tap para avanzar al siguiente estado
- Stats cards con anillos SVG (`PipelineRing`): "Por preparar", "Listo para recoger", "Recogido"
- Buscador de clientes con ficha (datos + pedidos asociados, edición inline de nombre/teléfono/email)
- Modal de detalle: edición de notas, fecha, productos; cambio de estado y pagado con confirmación
- Selección bulk para cambio de estado múltiple con rollback automático en fallos
- Toggle "Ver/Ocultar datos" (precios + teléfonos)
- WhatsApp notification al marcar "Listo para recoger"
- Renderizado progresivo (IntersectionObserver, lotes de 30 cards)

### Nuevo Pedido
- Formulario en 2 pasos: (1) Cliente + productos + notas + pagado, (2) Fecha con sugerencias inteligentes
- "Pegar pedido": parseo de mensajes/capturas de WhatsApp con Claude Haiku 4.5 (vision)
- Dictado por voz: Web Speech API para transcribir audio en tiempo real
- Sugerencias de fecha: analiza producción de los próximos 7 días y sugiere fechas con productos en común
- Crea cliente en Notion si no existe

### Producción
- Vista agregada de productos por día con cantidades totales
- "Disponible para venta": planificación de producción con steppers, cálculo de excedentes (localStorage por fecha)
- Toggle Pendiente / Todo el día
- Click en producto expande pedidos; click en pedido abre modal de detalle

### Seguimiento público
- URL: `/seguimiento` (standalone HTML, sin React)
- Embeddable en WordPress via iframe (`vynia.es/mi-pedido/`)
- Cliente introduce teléfono → tarjetas glass-morphism con gauge SVG animado por estado
- CTA de reseña Google
- Rate limiting: 10 req/min por IP + 3 req/min por teléfono

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 6 (arquitectura modular, ~20 ficheros en `src/`) |
| Backend | Vercel Serverless Functions (7 funciones en `api/`) |
| Base de datos | Notion API (`@notionhq/client@2.3.0`) |
| IA | Anthropic API (Claude Haiku 4.5 para parseo de pedidos) |
| Deploy | Vercel (autodeploy desde `main`) |

## Estructura

```
Vynia-MNGMNT/
├── api/                          # Vercel Serverless Functions
│   ├── _notion.js                # Notion client, retry, cache, constantes compartidas
│   ├── pedidos.js                # GET (listar + enrich server-side) + POST (crear)
│   ├── pedidos/[id].js           # PATCH (estado, propiedades, archivar)
│   ├── clientes.js               # GET (buscar) + POST (buscar o crear) + PATCH (actualizar)
│   ├── registros.js              # GET/POST/DELETE registros + GET ?productos=true (catálogo)
│   ├── produccion.js             # GET (producción diaria + modo rango multi-día)
│   ├── tracking.js               # GET (seguimiento público, rate limited)
│   └── parse-order.js            # POST (parseo IA de texto/imagen WhatsApp)
├── __tests__/                    # Vitest (77 tests, 16 ficheros)
├── public/
│   ├── seguimiento.html          # Página pública de seguimiento (standalone)
│   └── *.png                     # Logos e imágenes
├── src/
│   ├── App.jsx                   # Shell principal (~700 líneas): provider, effects, layout
│   ├── api.js                    # Cliente API frontend (fetch wrapper, cache SWR, dedup)
│   ├── main.jsx                  # Entry point React
│   ├── constants/
│   │   ├── estados.js            # ESTADOS, ESTADO_NEXT, ESTADO_TRANSITIONS, effectiveEstado
│   │   ├── catalogo.js           # CATALOGO_FALLBACK, PRICE_MAP, FRECUENTES
│   │   ├── brand.js              # VYNIA_LOGO, VYNIA_LOGO_MD
│   │   └── helpContent.jsx       # HELP_CONTENT (5 categorías de ayuda)
│   ├── utils/
│   │   ├── fmt.js                # fmt (todayISO, localISO, etc.), DAY_NAMES
│   │   ├── helpers.js            # esTarde, computeDateSuggestions, waLink, parseProductsStr
│   │   └── surplus.js            # loadSurplusPlan, saveSurplusPlan, cleanOldSurplus
│   ├── hooks/
│   │   ├── useBreakpoint.js      # isDesktop / isTablet responsive hook
│   │   ├── useTooltip.js         # Long-press mobile + hover desktop
│   │   ├── useVersionCheck.js    # Poll version.json + visibilitychange
│   │   ├── useCatalog.js         # localStorage SWR + background fetch catálogo
│   │   ├── useGlassCalendar.jsx  # State + render del glass calendar horizontal
│   │   ├── usePedidos.js         # Estado, CRUD, bulk, confirmaciones de pedidos
│   │   └── useProduccion.js      # Producción diaria + invalidación
│   ├── styles/
│   │   ├── global.css            # Keyframes, CSS variables, media queries, print
│   │   └── shared.js             # labelStyle, inputStyle, formSectionStyle
│   ├── context/
│   │   ├── VyniaContext.jsx      # VyniaProvider + useVynia() — UI/handlers
│   │   └── PedidosContext.jsx    # PedidosProvider + usePedidosCtx() — datos de pedidos
│   └── components/
│       ├── Icons.jsx             # ~37 iconos SVG inline
│       ├── EstadoGauge.jsx       # Semicírculo SVG de progreso
│       ├── PipelineRing.jsx      # Anillo SVG de pipeline
│       ├── TabPedidos.jsx        # Tab de lista de pedidos
│       ├── TabNuevo.jsx          # Tab de crear pedido
│       ├── TabProduccion.jsx     # Tab de producción diaria
│       ├── OrderDetailModal.jsx  # Modal de detalle de pedido
│       ├── ParseWhatsAppModal.jsx # Modal de parseo WhatsApp con IA
│       ├── ListeningPopup.jsx    # Popup fullscreen de dictado por voz
│       ├── ConfirmEstadoDialog.jsx # Confirmación de cambio de estado
│       ├── ConfirmPagadoDialog.jsx # Confirmación de pago
│       ├── PhoneMenuPopover.jsx  # Popover de acciones de teléfono
│       ├── WhatsAppPrompt.jsx    # Prompt de envío de WhatsApp
│       └── HelpOverlay.jsx       # Overlay de ayuda con bento grid
├── index.html
├── vite.config.js
├── vercel.json                   # Rewrites, security headers, CSP
├── .env.local                    # NOTION_TOKEN, ANTHROPIC_API_KEY (gitignored)
└── package.json
```

## API Endpoints

### GET /api/pedidos
- Query params: `filter=todos|pendientes|recogidos`, `fecha=YYYY-MM-DD`, `clienteId=<id>`
- Enriquecimiento server-side: devuelve `productos` (string) e `importe` (number) calculados en backend via OR query por chunks de 100
- Paginación automática via cursor

### POST /api/pedidos
- Body: `{ properties: { ... } }` — propiedades Notion del pedido
- Usa `Notion-Version: 2025-09-03` con `template: { type: "default" }` para aplicar plantilla de BD

### PATCH /api/pedidos/:id
- Body: `{ properties: { ... }, archived?: boolean }`
- Dual-write: `Estado` status + checkboxes sync (Recogido/NoAcude/Incidencia)

### GET /api/clientes
- Query params: `q=<search>` — busca por nombre, teléfono o email (filtro `or`)

### POST /api/clientes
- Body: `{ nombre, telefono? }` — busca o crea cliente

### PATCH /api/clientes
- Body: `{ id, nombre?, telefono?, email? }` — actualiza datos del cliente

### GET /api/registros
- `?pedidoId=<id>` — productos de un pedido
- `?productos=true` — catálogo completo (reemplaza al antiguo `/api/productos`)
- `?orphans=true` — registros sin pedido asociado

### POST /api/registros
- **Modo single**: `{ pedidoPageId, productoNombre, cantidad }`
- **Modo batch**: `{ pedidoPageId, lineas: [{ productoNombre, cantidad }] }` — crea múltiples registros en paralelo (lotes de 10)

### DELETE /api/registros
- Body: `{ registroIds: [string] }` — archiva registros en lotes de 10 en paralelo

### GET /api/produccion
- `?fecha=YYYY-MM-DD` — producción diaria agregada con datos de clientes
- `?fecha=YYYY-MM-DD&rango=7` — producción ligera multi-día (solo nombre + unidades por producto/día)

### POST /api/parse-order
- Body: `{ text?, imageBase64?, senderName?, senderPhone? }`
- Parsea texto/imagen con Claude Haiku 4.5 (vision), devuelve datos estructurados del pedido
- Lookup de cliente por teléfono en BD Clientes

### GET /api/tracking
- Query params: `tel=<teléfono>` (mínimo 6 dígitos)
- **Endpoint público** — rate limited: 10 req/min por IP + 3 req/min por teléfono
- No expone IDs internos, notas ni estado de pago

## Bases de Datos Notion

| BD | ID | Uso |
|----|-----|-----|
| Pedidos | `1c418b3a-38b1-81a1-9f3c-da137557fcf6` | Pedidos de clientes |
| Clientes | `1c418b3a-38b1-811f-b3ab-ea7a5e513ace` | Datos de clientes |
| Productos | `1c418b3a-38b1-8186-8da9-cfa6c2f0fcd2` | Catálogo de productos |
| Registros | `1d418b3a-38b1-808b-9afb-c45193c1270b` | Líneas de pedido (producto + cantidad) |

Integración: **Frontend Vynia** (debe tener acceso a cada BD individualmente).

## Desarrollo local

```bash
npm install

# Con API real (necesita NOTION_TOKEN + ANTHROPIC_API_KEY en .env.local)
vercel dev

# Solo frontend (modo DEMO funciona sin API)
npx vite

# Tests (lento en Google Drive — copiar a /tmp/vynia-test con rsync primero)
npm test
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NOTION_TOKEN` | Token de la integración "Frontend Vynia" en Notion |
| `ANTHROPIC_API_KEY` | Token de Anthropic para Claude Haiku 4.5 (parseo WhatsApp) |

Se configuran en `.env.local` para desarrollo local y en el dashboard de Vercel para producción.

## Modos

- **LIVE** — Conecta a Notion API real (por defecto si API disponible)
- **DEMO** — Datos locales hardcodeados para testing sin API. Se activa con toggle en menú hamburguesa o automáticamente si falla la API

## UI / UX

- **Palette**: Vynia brand — primario `#4F6867`, secundario `#1B1C39`, accent `#E1F2FC`, bg `#EFE9E4`, muted `#A2C2D0`
- **Fuentes**: Roboto Condensed (títulos/números), Inter (texto)
- **Layout**: Full-width 100%, columnas auto-fill responsive `minmax(320px, 1fr)`
- **Glass calendar**: Date picker horizontal con backdrop-blur, strip scrollable, domingos en rojo
- **Filtros**: Pills con efecto tubelight (glow bar animada en pill activo)
- **Cards**: Hover shadow, EstadoGauge semicircular SVG, pipeline 1-tap
- **Loaders**: Logo loader con rotación (logoSpin)
- **Tooltips**: Hover (desktop) + long-press ~0.4s (móvil)
- **Bottom nav**: 3 tabs fijas con iconos dock-style (ClipboardList, ChefHat) + dot indicator

## Sistema de Estado

`Estado` (propiedad status de Notion) es la **source of truth**. Los checkboxes se mantienen sincronizados via dual-write.

| Estado | Grupo | Color | Pipeline 1-tap |
|--------|-------|-------|----------------|
| Sin empezar | to_do | #8B8B8B | → En preparación |
| En preparación | in_progress | #1565C0 | → Listo para recoger |
| Listo para recoger | in_progress | #E65100 | → Recogido |
| Recogido | complete | #2E7D32 | (fin) |
| No acude | complete | #C62828 | (fin) |
| Incidencia | complete | #795548 | (fin) |

## Performance

- **Server-side enrich**: `GET /api/pedidos` calcula importe + productos en backend (OR query por chunks de 100)
- **SWR frontend**: Cache 45s con stale-while-revalidate en `api.js`, dedup de requests en vuelo
- **Catálogo SWR**: localStorage 2h + background revalidation
- **Auto-refresh**: Poll 120s + visibilitychange (con `skipEnrich` para preservar datos)
- **Batch registros**: POST batch para crear múltiples registros en 1 request
- **Cache servidor**: pedidos 10s, producción 60s, catálogo 30min, tracking 15s
- **Retry automático**: Proxy en `_notion.js`, 429/502/503, backoff exponencial + jitter

## Deploy

- Vercel project: `vynia-mngmnt` en team `javiers-projects-9e54bc4d`
- Git integration: push a `main` autodeploya
- Repo: `github.com/javintnvn/Vynia-MNGMNT`
- **Límite Hobby plan**: max 12 Serverless Functions (actualmente 7 usadas)

## Notas técnicas

- `@notionhq/client` debe ser v2.x (v5.x eliminó `databases.query`, NO actualizar)
- El campo `"Unidades "` en Registros tiene un espacio trailing — usar constante `PROP_UNIDADES` de `_notion.js`
- El campo `"Nombre"` (title) en Registros contiene solo `" "` — usar `"AUX Producto Texto"` (fórmula)
- `"N Pedido"` es tipo `unique_id`, acceder via `.unique_id.number`
- Teléfono del cliente viene de rollup en Pedidos: `p["Telefono"]?.rollup?.array[0]?.phone_number`
- Nombre del cliente viene de rollup `"AUX Nombre Cliente"` en Pedidos (0 API calls extra)
- Arquitectura modular: App.jsx es shell (~700 líneas) con 2 contextos (VyniaContext + PedidosContext), 7 hooks custom, 14 componentes
- El catálogo se carga via `GET /api/registros?productos=true` (consolidado en registros.js para respetar límite de funciones)
- Security headers en `vercel.json`: CSP, HSTS, X-Frame-Options, Permissions-Policy (microphone=self)
