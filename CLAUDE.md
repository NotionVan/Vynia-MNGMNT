# Vynia MNGMNT — Sistema de Gestion de Pedidos

## Stack
- **Frontend**: React 19 + Vite 6 (single-file UI en `src/App.jsx`)
- **Backend**: Vercel Serverless Functions (directorio `api/`)
- **Database**: Notion API via `@notionhq/client@2.3.0`
- **Deploy**: Vercel (proyecto `vynia-mngmnt`, repo `javintnvn/Vynia-MNGMNT`)
- **URL produccion**: `https://vynia-mngmnt.vercel.app`

## Estructura

```
Vynia-MNGMNT/
├── api/                    # Vercel Serverless Functions
│   ├── _notion.js          # Notion client, retry, cache, shared constants (PROP_UNIDADES)
│   ├── pedidos.js          # GET (listar con filtro) + POST (crear pedido)
│   ├── pedidos/[id].js     # PATCH (cambiar estado, propiedades)
│   ├── clientes.js         # GET (buscar) + POST (buscar o crear) + PATCH (actualizar cliente)
│   ├── registros.js        # GET/POST/DELETE (lineas de pedido) + GET ?productos=true (catalogo)
│   ├── produccion.js       # GET (produccion diaria agregada con clientes)
│   ├── tracking.js         # GET (seguimiento publico por telefono)
│   └── parse-order.js      # POST (parseo IA de texto/imagen WhatsApp + lookup cliente)
├── __tests__/              # Vitest test suite (77 tests, 16 files)
├── public/
│   ├── seguimiento.html    # Pagina publica de seguimiento de pedidos (standalone, sin React)
│   └── logovynia2_azul.png # Logo Vynia usado en seguimiento
├── src/
│   ├── App.jsx             # Componente principal (toda la UI, ~5100 lineas)
│   └── api.js              # Cliente API frontend (wrapper fetch)
├── main.jsx                # Entry point React
├── index.html
├── vite.config.js
├── vercel.json             # Rewrites: /seguimiento → tracking page, /api/* → serverless, /* → SPA
├── .env.local              # NOTION_TOKEN, ANTHROPIC_API_KEY (gitignored)
└── package.json
```

## Bases de Datos Notion

Todas dentro de la pagina "Gestiona Tu Obrador" (`1c418b3a-38b1-80ba-8e58-d69cbdaa2228`).
Integracion: **Frontend Vynia** (debe tener acceso a cada BD individualmente).

| BD | ID | Uso |
|----|-----|-----|
| Pedidos | `1c418b3a-38b1-81a1-9f3c-da137557fcf6` | Pedidos de clientes |
| Clientes | `1c418b3a-38b1-811f-b3ab-ea7a5e513ace` | Datos de clientes |
| Productos | `1c418b3a-38b1-8186-8da9-cfa6c2f0fcd2` | Catalogo de productos |
| Registros | `1d418b3a-38b1-808b-9afb-c45193c1270b` | Lineas de pedido (producto + cantidad) |

## Propiedades Notion importantes

### Pedidos
- `"Pedido"` — title (ej: "Pedido Maria Garcia")
- `"Fecha entrega"` — date, puede incluir hora (ej: `2026-02-26T10:30:00`)
- `"Fecha Creacion"` — date de creacion del pedido (OJO: con tilde en "Creacion")
- `"Estado"` — **status (source of truth)** — valores: "Sin empezar" (to_do), "En preparacion" (in_progress), "Listo para recoger" (in_progress), "Recogido" (complete), "No acude" (complete), "Incidencia" (complete). Leer via `p["Estado"]?.status?.name`. Escribir via `{ "Estado": { status: { name: "Recogido" } } }`
- `"Recogido"` — checkbox (sync automatico via dual-write al cambiar Estado)
- `"No acude"` — checkbox (sync automatico via dual-write al cambiar Estado)
- `"Pagado al reservar"` — checkbox (nombre exacto)
- `"Incidencia"` — checkbox (sync automatico via dual-write al cambiar Estado)
- `"Notas"` — rich_text
- `"Clientes"` — relation a BD Clientes (array de ids)
- `"N Pedido"` — unique_id (acceder via `.unique_id.number`)
- `"Telefono"` — rollup desde Clientes (acceder via `.rollup.array[0].phone_number`)

### Registros
- `"Nombre"` — title (contiene solo un espacio " ", **NO usar** para nombre de producto)
- `"AUX Producto Texto"` — formula (string) — **nombre real del producto**, derivado de la relacion Productos. Acceder via `.formula.string`
- `"Unidades "` — number (**espacio trailing**, no borrar)
- `"Pedidos"` — relation a BD Pedidos
- `"Productos"` — relation a BD Productos

### Clientes
- title — nombre del cliente
- `"Telefono"` — phone_number

### Productos
- title — nombre del producto (ej: "Brownie", "Cookies de chocolate y avellanas")
- El catalogo completo esta hardcodeado en `src/App.jsx` como `CATALOGO[]`

## API Endpoints

### GET /api/pedidos
- Query params: `filter=todos|pendientes|recogidos`
- Devuelve array de pedidos con: id, titulo, fecha, **estado**, recogido, noAcude, pagado, incidencia, notas, numPedido, **cliente**, **telefono**, clienteId
- Resuelve nombres de clientes via rollup `"AUX Nombre Cliente"` en Pedidos
- Resuelve telefono via rollup `"Telefono"` en Pedidos
- Paginacion automatica via cursor

### POST /api/pedidos
- Body: `{ properties: { ... } }` — propiedades Notion del pedido
- Devuelve `{ id }` del pedido creado

### PATCH /api/pedidos/:id
- Body: `{ properties: { ... } }` — propiedades a actualizar
- Usado para cambiar Estado (dual-write: Estado + checkboxes sync), Notas, Fecha entrega, etc.

### POST /api/clientes
- Body: `{ nombre, telefono? }`
- Busca cliente por nombre exacto. Si no existe, lo crea
- Devuelve `{ id, created: boolean }`

### PATCH /api/clientes
- Body: `{ id, nombre?, telefono?, email? }`
- Actualiza propiedades del cliente (nombre, telefono, email)
- Devuelve `{ ok: true }`

### POST /api/registros
- Body: `{ pedidoPageId, productoNombre, cantidad }`
- Busca producto por nombre en BD Productos y crea registro en BD Registros
- Vincula registro a pedido y producto

### GET /api/produccion
- Query params: `fecha=YYYY-MM-DD`
- Devuelve `{ productos: [...] }` con estructura:
  ```json
  {
    "nombre": "Brownie",
    "totalUnidades": 5,
    "pedidos": [
      {
        "pedidoId": "abc-123",
        "pedidoTitulo": "Pedido Maria Garcia",
        "cliente": "Maria Garcia",
        "telefono": "612345678",
        "unidades": 3,
        "fecha": "2026-02-26T10:30:00",
        "estado": "En preparación",
        "recogido": false,
        "noAcude": false,
        "pagado": true,
        "incidencia": false,
        "notas": "Sin nueces",
        "numPedido": 42,
        "productos": [
          { "nombre": "Brownie", "unidades": 3 },
          { "nombre": "Cookie Oreo", "unidades": 2 }
        ]
      }
    ]
  }
  ```
- Filtra pedidos por fecha (excluye "No acude")
- Resuelve nombres de clientes via rollup `"AUX Nombre Cliente"` en Pedidos
- Lee nombre de producto de formula `"AUX Producto Texto"`, no del titulo
- Incluye lista completa de productos de cada pedido en `pedido.productos`
- Usa OR query unico para traer todos los registros de todos los pedidos de golpe (mismo patron que tracking.js). Para >100 pedidos, divide en chunks de 100 (limite de compound filter de Notion)
- **Modo rango** (sugerencias de fecha): `GET /api/produccion?fecha=YYYY-MM-DD&rango=7` devuelve produccion ligera de multiples dias en una sola llamada. Respuesta: `{ produccion: { "YYYY-MM-DD": [{ nombre, totalUnidades }], ... } }`. Solo nombre y unidades por producto/dia (sin datos de cliente/pedido). Rango max 14 dias. Cache 60s con key `produccion-rango:${fecha}:${dias}`

### POST /api/parse-order
- Body: `{ text?: string, imageBase64?: string, senderName?: string, senderPhone?: string }`
- Requiere al menos `text` (min 5 chars) O `imageBase64` (data URI)
- Parsea texto o captura de WhatsApp con Claude Haiku 4.5 (vision) y devuelve datos estructurados del pedido
- Flujo: 1) Carga catalogo via `loadCatalog()` (cached 5min), 2) Construye content array multimodal (image + text), 3) Llama a Anthropic API, 4) Post-procesa: valida productos contra catalogo, calcula confidence
- Devuelve `{ ok, confidence, cliente, telefono, fecha, hora, pagado, notas, lineas: [{ nombre, cantidad, matched }], warnings: [] }`
- Env var: `ANTHROPIC_API_KEY`

### GET /api/tracking
- Query params: `tel=612345678` (numero de telefono, minimo 6 digitos)
- **Endpoint publico** — usado por la pagina de seguimiento para clientes
- Flujo: 1) Busca cliente en BD Clientes por `Telefono` (phone_number contains), 2) Query Pedidos por relacion Clientes de TODOS los clientes encontrados (OR filter, soporta entradas duplicadas de cliente con mismo telefono), 3) Fetch registros (productos) por cada pedido
- Devuelve `{ cliente: "Maria Garcia", pedidos: [...] }` con estructura:
  ```json
  {
    "cliente": "Maria Garcia",
    "pedidos": [
      {
        "numPedido": 42,
        "fecha": "2026-02-26T10:30:00",
        "estado": "En preparación",
        "productos": [
          { "nombre": "Brownie", "unidades": 3 }
        ]
      }
    ]
  }
  ```
- **NO expone IDs internos** de Notion (se eliminan antes de la respuesta)
- **NO expone notas ni estado de pago** — solo fecha, estado, productos y cantidades
- Si no encuentra cliente: devuelve `{ pedidos: [], cliente: null }`
- Pedidos ordenados por fecha descendente (mas recientes primero), max 20
- Cache server-side 15s (misma consulta repetida)

### Pagina de seguimiento (`/seguimiento`)
- URL standalone: `https://vynia-mngmnt.vercel.app/seguimiento`
- URL publica (iframe en WordPress): `https://vynia.es/mi-pedido/`
- Pagina standalone (HTML+JS vanilla, sin React) en `public/seguimiento.html`
- Logo Vynia real (`public/logovynia2_azul.png`) en header (oculto en modo iframe)
- El cliente introduce su telefono → llama a `/api/tracking?tel=...`
- Tarjetas glass-morphism con `backdrop-filter: blur(20px)`, bordes semi-transparentes y sombras inset
- Gauge semicircular SVG animado por pedido: gradiente de color segun estado, fill animado via Web Animations API con easing `cubic-bezier(0.65, 0, 0.35, 1)`, progreso 0%/33%/66%/100%, `stroke-linecap="round"`
- Label del estado centrado dentro del gauge (nombre grande + subtitulo contextual: "pedido recibido", "en proceso", "pasa a recoger", "entregado")
- Barra de acento coloreada (3px) en la parte superior de cada tarjeta
- Animaciones de entrada staggered: cards con `cardSlideUp` + delay por indice, labels con `labelReveal`, iconos especiales con `iconPop` (bounce)
- Para estados no-lineales (No acude, Incidencia) muestra icono circular con animacion pop en lugar de gauge
- Fondo de pagina con gradientes radiales sutiles para dar profundidad al efecto glass
- Vynia-branded: misma paleta de colores y fuentes que la app principal
- Mobile-first, responsive
- CTA de resena Google: tarjeta glass-morphism blanca con logo oficial de Google Review (`public/google-review.png`), texto "Dejanos tu opinion". Aparece encima de la lista de pedidos (tras el header "Pedidos de X"). Abre `g.page/r/Ceetj32kIx45EBM/review` en nueva pestana. Oculto en print
- Modo iframe: detecta `window !== window.top`, añade clase `.embedded` (oculta logo y footer, fondo transparente, sin gradientes de fondo)
- Iframe embed code para WordPress:
  ```html
  <iframe src="https://vynia-mngmnt.vercel.app/seguimiento" style="width:100%;min-height:600px;border:none;background:transparent" loading="lazy" allow="clipboard-write"></iframe>
  ```

## Frontend API client (src/api.js)

Exporta objeto `notion` con metodos, y funciones de cache `invalidateApiCache()` (limpia todo) e `invalidatePedidosCache()` (solo claves de pedidos):
- `loadAllPedidos()` — GET /api/pedidos?filter=todos
- `loadPedidos()` — GET /api/pedidos?filter=pendientes
- `loadPedidosByDate(fecha)` — GET /api/pedidos?fecha=...
- `loadPedidosByCliente(clienteId)` — GET /api/pedidos?clienteId=...
- `cambiarEstado(pageId, nuevoEstado)` — PATCH dual-write: Estado status + checkboxes sync
- `updatePage(pageId, properties)` — PATCH generico
- `archivarPedido(pageId)` — PATCH archived: true
- `searchClientes(q)` — GET /api/clientes?q=...
- `updateCliente(id, { nombre, telefono, email })` — PATCH /api/clientes
- `findOrCreateCliente(nombre, telefono)` — POST /api/clientes
- `crearPedido(clienteNombre, clientePageId, fecha, hora, pagado, notas, lineas)` — POST pedido + registros (Estado = "Sin empezar")
- `crearRegistro(pedidoPageId, productoNombre, cantidad)` — POST /api/registros
- `loadRegistros(pedidoId)` — GET /api/registros?pedidoId=...
- `deleteRegistros(registroIds)` — DELETE /api/registros
- `findOrphanRegistros()` — GET /api/registros?orphans=true
- `loadProduccion(fecha)` — GET /api/produccion?fecha=...
- `loadProduccionRango(fecha, rango)` — GET /api/produccion?fecha=...&rango=N (produccion ligera multi-dia para sugerencias de fecha)
- `loadProductos()` — GET /api/registros?productos=true
- `parseWhatsApp(text?, senderName?, senderPhone?, imageBase64?)` — POST /api/parse-order (texto, imagen, o ambos)

## Tabs de la app

1. **Pedidos** — Lista de pedidos con filtros estadisticos (pendientes/hoy/recogidos/todos), pills de filtro, badge de estado prominente como cabecera de cada card, boton pipeline (1 tap avanza estado), estado picker popover, enlace telefono, busqueda de clientes con ficha (enlace a Notion, edicion inline de nombre/telefono/email), seleccion bulk para cambio de estado multiple, toggle de visibilidad de precios (boton `€ ON/OFF` junto a barra de busqueda, oculto por defecto). Fila de fecha: botones Hoy/Manana/Pasado a la izquierda + datepicker al extremo derecho. Modal de detalle incluye: edicion inline de notas (crear/modificar/eliminar via textarea), edicion de fecha, modificar productos, y cambio de estado
2. **Nuevo** — Formulario en DOS pasos para crear pedido: 1) Cliente (autocompletado), productos del catalogo (busqueda + cantidades con NumberFlow) + notas + pagado toggle. Boton "Pegar pedido" (card premium con shine effect) abre modal para importar pedidos de WhatsApp via: texto pegado, captura de pantalla (drag-drop/clipboard/file), o dictado por voz (Web Speech API, boton "Dictar" con pulso animado). Parseo con Claude Haiku 4.5 (vision), preview con confianza, matching contra catalogo, lookup de cliente por telefono. 2) Sugerencias inteligentes de fecha (analiza produccion de proximos 7 dias, muestra chips con fechas que comparten productos del carrito, scoring `overlapCount*3 + overlapUnits`, max 3 sugerencias) + Fecha (presets hoy/manana/pasado + datepicker + hora). Crea con Estado = "Sin empezar". Funcion de scoring: `computeDateSuggestions(produccionRango, lineas)` — logica pura sin IA. Estado: `dateSuggestions`, `suggestionsLoading`. Fetch async via `loadProduccionRango()` al pasar a Paso 2
3. **Produccion** — Vista agregada de productos por dia. Selector de fecha (presets + datepicker). Seccion "Disponible para venta": flujo de 3 estados — boton CTA "Planificar produccion" → modo edicion (steppers, busqueda catalogo, pills frecuentes) → resumen compacto con totales plan/pedidos/disponibles y badges de excedente/deficit. Datos en localStorage por fecha (`vynia-surplus:YYYY-MM-DD`), limpieza >7 dias. Filtros "Pendiente" (resta pedidos "Listo para recoger" y "Recogido") y "Todo el dia" (muestra todo). Barra de resumen con conteo de productos, boton "Desplegar/Contraer" (expande o colapsa todos los acordeones a la vez) y total de unidades pendientes. Lista de productos con badge de cantidad total. Accordion: click en producto muestra pedidos filtrados con nombre de cliente y badge de estado (click individual en modo expandAll contrae todo y deja solo ese producto). Click en pedido abre modal con detalle completo. Cambiar fecha o filtro resetea el estado de expansion

## Sistema de Estado

La propiedad `"Estado"` (tipo status de Notion) es la **source of truth** del estado de cada pedido. Los checkboxes (Recogido, No acude, Incidencia) se mantienen sincronizados via dual-write para que las vistas de Notion sigan funcionando.

### Estados y pipeline

| Estado | Grupo | Color | Pipeline 1-tap |
|--------|-------|-------|----------------|
| Sin empezar | to_do | gris #8B8B8B | → En preparacion |
| En preparacion | in_progress | azul #1565C0 | → Listo para recoger |
| Listo para recoger | in_progress | naranja #E65100 | → Recogido |
| Recogido | complete | verde #2E7D32 | (fin) |
| No acude | complete | rojo #C62828 | (fin) |
| Incidencia | complete | marron #795548 | (fin) |

### Dual-write (`cambiarEstado`)
Al cambiar estado desde la app, se escribe en una sola PATCH:
- `Estado: { status: { name: nuevoEstado } }`
- `Recogido: { checkbox: nuevoEstado === "Recogido" }`
- `No acude: { checkbox: nuevoEstado === "No acude" }`
- `Incidencia: { checkbox: nuevoEstado === "Incidencia" }`

### Legacy fallback (`effectiveEstado`)
Para pedidos que no tienen la propiedad Estado asignada, se deriva el estado desde los checkboxes: recogido → "Recogido", noAcude → "No acude", incidencia → "Incidencia", ninguno → "Sin empezar".

### Constantes en App.jsx
- `ESTADOS` — mapa de config (group, color, bg, label, icon) por cada estado
- `ESTADO_NEXT` — siguiente estado en el pipeline lineal (para boton 1-tap)
- `ESTADO_TRANSITIONS` — todos los estados posibles desde cualquier estado (excluye el estado actual). Permite cambiar a cualquier estado sin restricciones

### Confirmacion de cambio de estado
Todos los cambios de estado (pipeline 1-tap, modal detalle, picker popover, bulk) pasan por un dialogo de confirmacion antes de ejecutarse. El flujo es:
1. El usuario hace click en cualquier boton de estado → se llama a `requestEstadoChange(pedido, nuevoEstado)`
2. Se muestra un popup de confirmacion (glass-morphism, Vynia-branded) con el icono del estado destino, nombre del pedido (o conteo en bulk), y botones Cancelar/Confirmar
3. Al confirmar → se ejecuta `cambiarEstado` o `cambiarEstadoBulk` segun corresponda
- Estado: `pendingEstadoChange` — almacena `{ pedido, nuevoEstado, isBulk }`
- Funcion: `confirmarCambioEstado()` — ejecuta el cambio pendiente y cierra el dialogo

### Seleccion bulk (`cambiarEstadoBulk`)
Boton "Seleccionar" en la barra de filtros activa modo bulk. Cada card muestra checkbox circular; click togglea seleccion. Barra flotante (fixed, encima del bottom nav) muestra contador + botones de estado. Muestra todos los estados comunes a los seleccionados (interseccion de `ESTADO_TRANSITIONS`, excluye estados actuales). Ejecuta `cambiarEstado` en paralelo via `Promise.allSettled`. WhatsApp NO se dispara en bulk. Al completar o cambiar de tab, el modo se desactiva.

### WhatsApp notification
Al marcar un pedido como "Listo para recoger", si el pedido tiene telefono, se muestra un popup preguntando si se quiere avisar al cliente. Si se acepta, se abre `wa.me/{telefono}?text={mensaje}` con el texto: "¡Hola! Tu pedido de Vynia ya esta listo para que pases a recogerlo."

## UI / UX

- **Palette**: Vynia brand — primario `#4F6867`, secundario `#1B1C39`, accent `#E1F2FC`, bg `#EFE9E4`, muted `#A2C2D0`
- **Fuentes**: Roboto Condensed (titulos/numeros), Inter (texto)
- **Responsive**: Mobile-first, full-width (sin max-width). Grid de cards auto-fill con `minmax(320px, 1fr)` (columnas automaticas segun ancho). Tablet: 2 cols fijas. Mobile: 1 col
- **Tooltips**: Todos los botones tienen `title` para hover (desktop) + sistema de tooltip tactil por long-press ~0.4s (movil) con popup animado que desaparece tras 1.5s
- **Cards de pedido**: Cabecera prominente estilo glass-button con semicirculo SVG animado (`EstadoGauge`) que muestra progreso del pipeline (0%/33%/66%/100%), titulo del estado (13px bold), subtitulo con porcentaje, fondo degradado con color del estado, shimmer overlay. Constantes: `ESTADO_PROGRESS` (mapa estado→progreso 0-1). Boton pipeline secundario (fondo semitransparente, texto coloreado, sin sombra). Boton picker `···` para cambio manual
- **Toggle precios**: Boton `€ ON/OFF` a la derecha de la barra de busqueda, oculto por defecto (`mostrarPrecios` state). Controla visibilidad del importe en cards
- **Changelog popup**: Click en numero de version en header abre popup con fecha del commit y mensaje de cambios (inyectados en build time via `__APP_CHANGELOG__` desde `git log`)
- **Update banner**: Chequeo automatico de `/version.json` cada 2 min + al volver a la pestaña. Si hay nueva version desplegada, muestra banner flotante "Nueva version disponible" con boton "Actualizar" (reload). Plugin Vite `version-json` genera el fichero en build y lo sirve en dev
- **Print**: CSS @media print para imprimir lista de pedidos/produccion
- **Bottom nav**: 3 tabs fijas (Pedidos, Nuevo, Produccion) con safe-area-inset-bottom
- **Iconos SVG inline**: Objeto `I` con funciones de componente (`I.Clipboard`, `I.Img`, `I.AlertTri`, `I.Mail`, `I.Gear`, `I.Mic`, `I.Phone`, `I.Plus`, `I.Store`, etc.). Props: `s` (size), `c` (color). Zero emojis Unicode en toda la app
- **Modal "Pegar pedido"**: Glass-morphism con header gradiente (#4F6867→#1B1C39) + icono SVG, drop zone para imagenes, boton "Dictar" con Web Speech API (pulso animado `micPulse` mientras escucha), textarea, boton "Analizar". Preview de resultado con badge de confianza, productos matched/unmatched, warnings con triangulo SVG. CSS: `.parse-btn` (shine effect), `.mic-pulse`
- **Seccion de Ayuda**: Boton `?` en header abre modal full-screen con manual de instrucciones. Dos niveles de navegacion: (1) Bento Grid con 5 cards de categoria (Pedidos, Nuevo Pedido, Produccion, Seguimiento, General) con gradientes de color unicos, iconos SVG, animaciones staggered de entrada y hover scale; (2) Animated List con secciones expandibles estilo acordeon, numero circular coloreado, preview truncado, pasos numerados y tips con borde de acento. Contextual: abre la categoria del tab activo. Estado: `showHelp`, `helpExpanded` (Set), `helpActiveCategory`. Contenido estatico en constante `HELP_CONTENT` (~180 lineas). Colores por categoria: Pedidos (#1565C0 azul), Nuevo (#2E7D32 verde), Produccion (#E65100 naranja), Seguimiento (#7B1FA2 morado), General (#4F6867). CSS: `helpSlideUp`, `helpItemIn`, `.help-bento-card`, `.help-list-item`. Oculto en @media print

## Modos

- **LIVE** — Conecta a Notion API real (por defecto si API disponible)
- **DEMO** — Datos locales hardcodeados para testing sin API. Incluye pedidos, clientes y produccion de demo. Se activa con toggle en header o automaticamente si falla la API

## Desarrollo local

```bash
npm install
vercel dev          # para API routes (necesita NOTION_TOKEN en .env.local)
# o
npx vite            # solo frontend (modo DEMO funciona sin API)
```

## Deploy

- Vercel project name: `vynia-mngmnt` en team `javiers-projects-9e54bc4d`
- Variables de entorno en Vercel: `NOTION_TOKEN`, `ANTHROPIC_API_KEY`
- Git integration: push a `main` autodeploya automaticamente
- Repo: `github.com/javintnvn/Vynia-MNGMNT`
- **Limite Hobby plan**: max 12 Serverless Functions por deployment. Actualmente 7 funciones en `api/` (excluye `_notion.js` helper). NO crear nuevos ficheros en `api/` sin consolidar primero
- **OBLIGATORIO en cada commit**: 1) Actualizar `"version"` en `package.json` (semver: patch para fixes/perf, minor para features, major para breaking changes). 2) Documentar los cambios en la seccion `## Changelog vX.Y.Z` al final de este archivo (CLAUDE.md) con ID de cambio (FIX-xx, FEAT-xx, PERF-xx) y descripcion concisa

## Notas tecnicas

- `@notionhq/client` debe ser v2.x (v5.x elimino `databases.query`, NO actualizar). Excepcion: `handlePost` en `api/pedidos.js` usa `fetch` directo con `Notion-Version: 2025-09-03` y `parent: { type: "data_source_id", data_source_id: DS_PEDIDOS }` para soportar `template: { type: "default" }` (aplica la plantilla de la BD al crear pedido). `DS_PEDIDOS` (`1c418b3a-38b1-8176-a42b-000b33f3b1aa`) es el data_source_id (diferente del database_id). La plantilla se aplica asincronamente por Notion tras la creacion
- El campo `"Unidades "` en Registros tiene un espacio trailing — definido como `PROP_UNIDADES` en `api/_notion.js` y exportado. Usar siempre la constante, nunca el string literal
- El campo `"Nombre"` (title) en Registros contiene solo `" "` — usar `"AUX Producto Texto"` (formula) para el nombre real del producto
- `"N Pedido"` es tipo `unique_id`, acceder via `.unique_id.number`
- El telefono del cliente viene de un rollup en Pedidos: `p["Telefono"]?.rollup?.array[0]?.phone_number`
- Nombre de cliente viene de rollup `"AUX Nombre Cliente"` en Pedidos (no requiere llamadas extra a la API)
- Toda la UI esta en un solo componente `App.jsx` (~5100 lineas) — no hay componentes separados
- El catalogo de productos esta hardcodeado en `CATALOGO_FALLBACK[]` en App.jsx, con carga dinamica via `/api/registros?productos=true`
- `api/productos.js` fue consolidado en `api/registros.js` para respetar el limite de 12 Serverless Functions del Hobby plan de Vercel
- `@number-flow/react` se usa para animaciones de cantidad en steppers del carrito
- **Estado es la source of truth** — NO usar checkboxes para determinar estado. Usar `effectiveEstado()` que resuelve Estado o fallback desde checkboxes para legacy
- **Sync con Notion** — La app se sincroniza con Notion de 3 formas: (1) auto-refresh al volver a la pestaña via `visibilitychange` (debounced 2s), (2) polling cada 120s mientras la pestaña esta activa, (3) boton recargar manual. Los polls automaticos y visibility usan `skipEnrich: true` (no re-fetchan registros, preservan datos de productos/importe del estado previo). Carga inicial y reload manual hacen enrichment completo. El cache de `api.js` (`CACHE_TTL = 45000`) evita llamadas duplicadas. `invalidatePedidosCache()` invalida solo claves de pedidos (no registros/produccion/catalogo) — usada tras cambios de estado. `invalidateApiCache()` limpia todo — usada en reloads completos
- **Server-side cache** — `api/_notion.js` exporta `cached(key, ttlMs, fn)` (Map en memoria, persiste en instancias warm de Vercel). TTLs: `/api/pedidos` GET 10s, `/api/produccion` 60s, `/api/registros?productos=true` 300s (5min), `/api/tracking` 15s
- **Renderizado progresivo** — La lista de pedidos usa IntersectionObserver para renderizar en lotes de 30. Al hacer scroll, carga automaticamente mas cards. Se resetea al cambiar filtro/datos. Muestra "Mostrando X de Y pedidos" cuando hay mas por cargar

## Tests

- **Framework**: Vitest 4.x con jsdom
- **Ejecutar**: `npm test` (o `npx vitest run`)
- **16 archivos de test**, 77 tests cubriendo: API client, cache/dedup, estado resolution, bulk operations, timezone, unicode, telefono formats, integraciones, date suggestions, surplus plan, double submit
- **Nota Google Drive**: vitest es lento en Google Drive. Para desarrollo rapido, copiar a `/tmp/vynia-test` con `rsync -a --exclude='node_modules' --exclude='.git'` y ejecutar ahi

## Changelog v1.4.0

### Bug fixes
- **BUG-01**: `effectiveEstado` no resolvia correctamente estados legacy
- **BUG-02**: `toISOString()` generaba fecha UTC en lugar de local (fijo via `fmt.localISO()`)
- **BUG-03**: `produccion.js` no paginaba pedidos (max 100). Añadida paginacion con cursor
- **BUG-04**: `"Unidades "` hardcodeado como string literal en 3 archivos. Extraido a constante `PROP_UNIDADES` en `_notion.js`
- **BUG-05**: `registros.js` no validaba si el producto existe antes de crear registro
- **BUG-06**: `clientes.js` no validaba telefono (min 6 digitos) al crear cliente
- **BUG-07**: Busqueda de cliente en POST `/api/clientes` usaba `equals` (case-sensitive). Cambiado a `contains` + filtro client-side case-insensitive
- **BUG-08**: `tracking.js` no priorizaba match exacto de telefono cuando hay multiples resultados
- **BUG-09**: Filtro "pendientes" en `pedidos.js` no excluia Incidencias
- **BUG-10**: `effectiveEstado` sobrescribia estados desconocidos. Simplificado para confiar en Estado como source of truth
- **BUG-11**: Propiedad `telefono`/`tel` inconsistente en `setSelectedPedido` — normalizado en todos los call sites
- **BUG-12**: Cache de `api.js` no deduplicaba llamadas en vuelo
- **BUG-13**: Creacion de registros sin rollback — `crearPedido()` ahora reporta productos fallidos; `guardarModificacion()` crea antes de borrar
- **BUG-14**: `cambiarEstadoBulk()` sin rollback — añadido `prevEstados` Map + rollback automatico de fallos

### Mejoras
- **CHAOS-01**: Fechas locales — nuevo helper `fmt.localISO()` reemplaza todos los `toISOString().split("T")[0]`
- **CHAOS-08**: Renderizado progresivo — IntersectionObserver con lotes de 30 cards para listas largas de pedidos

## Changelog v1.4.1

### Mejoras
- **FEAT-01**: Toggle "Pagado" interactivo — el badge €/PAGADO es clickable en cards de pedidos, ficha de cliente, modal de detalle y vista de produccion. Permite marcar/desmarcar pago en cualquier momento del ciclo de vida del pedido via `togglePagado()` → `updatePage()` → Notion API. Actualiza estado local (pedidos, selectedPedido, produccionData) de forma optimista

## Changelog v1.4.2

### Mejoras
- **FEAT-02**: Boton "€ Pago / Pagado" grande en la zona de acciones de cada card de pedido (junto a pipeline y picker), siempre visible. Confirmacion obligatoria via popup glass-morphism antes de cambiar el estado de pago (patron identico a `pendingEstadoChange`). Los badges pequeños en la fila del nombre quedan como indicadores informativos (solo lectura)
- **FIX-01**: Corregido `vercel.json` — patron `/*` invalido en headers reemplazado por `/(.*)`; rewrite SPA normalizado al formato oficial de Vercel

## Changelog v1.4.3

### Bug fixes
- **FIX-02**: Ruta dinamica `/api/pedidos/[id]` devuelve 404 en produccion — el rewrite SPA `/(.*) → /index.html` interceptaba rutas dinamicas de la API. Restaurado negative lookahead `/((?!api/).*) → /index.html` para excluir `/api/*` del SPA fallback. Afectaba a todas las operaciones PATCH: pagado, cambio de estado, notas, archivar

### Mejoras
- **PERF-01**: Optimistic UI para toggle de pagado — la UI se actualiza al instante al confirmar, sin esperar respuesta de Notion (~1-2s). Rollback automatico si la API falla (mismo patron que `cambiarEstadoBulk`)

## Changelog v1.4.4

### Mejoras
- **PERF-02**: Eliminar N+1 queries en `/api/produccion` — reemplazado loop de 1 query por pedido (batches de 5, con 200ms delay) por OR query unico que trae todos los registros de golpe. Mismo patron que ya usa `tracking.js`. Para >100 pedidos, divide en chunks de 100 (limite de compound filter de Notion). Reduce latencia de ~12s a ~600ms con 100 pedidos, eliminando riesgo de timeout en Vercel

## Changelog v1.4.5

### Bug fixes
- **FIX-03**: "Ver pedido" tras crear no abria modal de detalle — race condition entre `loadPedidos()` async (sin await) y `pedidos.find()` en `verPedidoCreado()`. Fix: `pendingViewPedidoId` ref + useEffect que selecciona el pedido cuando `pedidos` se actualiza con los datos nuevos

## Changelog v1.5.0

### Mejoras
- **FEAT-03**: Boton CTA de resena Google en pagina de seguimiento (`seguimiento.html`) — aparece debajo de las cards de pedido tras consultar por telefono. Estilo gradient Vynia (#4F6867) con efecto shine sweep en hover, glow radial, scale transitions y animacion de entrada staggered. Estrella dorada SVG (Google brand), titulo "Dejanos tu opinion", subtitulo "Tu resena nos ayuda a crecer". Abre `g.page/r/Ceetj32kIx45EBM/review` en nueva pestana. Oculto en print. Compatible con modo iframe (vynia.es/mi-pedido/)

## Changelog v1.5.1

### Bug fixes
- **FIX-04**: Pagina de seguimiento bloqueada en iframe (vynia.es/mi-pedido/) — `X-Frame-Options: DENY` del catch-all `/(.*)`  en `vercel.json` sobreescribia los headers de `/seguimiento`. Fix: mover bloque `/seguimiento` DESPUES del catch-all para que sus headers ganen. CSP combinado con `frame-ancestors 'self' https://vynia.es https://www.vynia.es` + permisos para Google Fonts. `X-Frame-Options: SAMEORIGIN` (ignorado por browsers modernos cuando CSP frame-ancestors esta presente)

## Changelog v1.5.2

### Mejoras
- **PERF-03**: "Ver pedido" instantaneo tras crear — en lugar de esperar a que `loadPedidos()` termine el roundtrip a Notion, construye el pedido inmediatamente con los datos de creacion (cliente, productos, fecha, estado "Sin empezar") y abre el modal al instante. Se actualiza silenciosamente cuando llegan los datos completos (numPedido, etc.)

## Changelog v1.5.3

### Bug fixes
- **FIX-05**: Seguimiento no encuentra pedidos cuando hay clientes duplicados con mismo telefono — `tracking.js` solo buscaba pedidos del primer cliente encontrado. Fix: recopilar TODOS los client IDs que coinciden con el telefono y usar OR filter para buscar pedidos de todos ellos (mismo patron que ya usa registros). El nombre mostrado sigue siendo el del mejor match

## Changelog v1.5.4

### Mejoras
- **FEAT-04**: CTA de resena Google movido encima de la lista de pedidos (debajo de la barra de busqueda) en lugar de al final, para mayor visibilidad

## Changelog v1.5.5

### Mejoras
- **FEAT-05**: CTA de resena Google rediseñado — fondo glass-morphism blanco (diferenciado del boton de busqueda verde). Logo oficial de Google Review (`google-review.png`) en lugar del SVG de estrella. Texto oscuro sobre fondo claro para contraste con la seccion de busqueda

## Changelog v1.6.0

### Mejoras
- **FEAT-06**: Sugerencia inteligente de fecha de entrega — al crear un pedido, el sistema analiza la produccion de los proximos 7 dias y sugiere fechas optimas basandose en solapamiento de productos. Nuevo param `rango` en `GET /api/produccion` para consulta multi-dia ligera (1 API call en lugar de 7). Scoring: `overlapCount * 3 + overlapUnits`, desempate por fecha mas cercana. UI: seccion de sugerencias en Paso 2 del formulario "Nuevo" con chips clickables que muestran productos en comun y unidades. El usuario siempre tiene la ultima palabra. 11 tests nuevos en `date-suggestions.test.js`

## Changelog v1.7.0

### Mejoras
- **FEAT-07**: Boton "Pegar pedido" en tab Nuevo — parsea mensajes de WhatsApp con IA (Claude Haiku 4.5) y pre-rellena el formulario. Modal glass-morphism con textarea, preview de resultado con badge de confianza (alta/media/baja), lista de productos detectados con indicador matched/no-matched, y warnings para productos no encontrados. Nuevo endpoint `api/parse-order.js` (7/12 serverless functions). Catalogo de productos extraido a `_notion.js` como funcion compartida `loadCatalog()` (reutilizada por `registros.js` y `parse-order.js`). Env var: `ANTHROPIC_API_KEY`

## Changelog v1.7.1

### Mejoras
- **FEAT-08**: Modal "Pegar pedido" acepta capturas de pantalla de WhatsApp ademas de texto. Zona unificada: drop zone para arrastrar imagenes, pegar desde clipboard (Cmd+V / Ctrl+V), o boton de seleccion de archivo. Claude Haiku 4.5 (vision) analiza la captura y extrae el pedido. Preview de imagen con boton para quitar. El textarea sigue disponible debajo para contexto adicional. Endpoint `parse-order.js` extendido con soporte multimodal (content array con bloques image + text)

## Changelog v1.7.2

### Mejoras
- **FEAT-09**: Identificacion de cliente por telefono en parseo de pedidos. Tras extraer el telefono del mensaje/captura, el backend busca en BD Clientes por numero (formato XXXXXXXXX, sin codigo de pais). Si existe: devuelve `clienteId` + nombre verificado de la BD, el frontend lo selecciona directamente sin autocomplete. Si no existe: badge "NUEVO" en preview, pre-rellena nombre + telefono para crear nuevo cliente al submit. Prompt actualizado para priorizar extraccion de telefono en formato limpio

## Changelog v1.7.3

### Mejoras
- **FEAT-10**: Rediseno visual del boton "Pegar pedido" — estilo premium card con gradiente, contenedor de icono con backdrop-blur, titulo+subtitulo, flecha chevron, efecto shine sweep en hover (CSS animation). Modal header con icono SVG en contenedor gradiente (#4F6867→#1B1C39). Drop zone con icono SVG imagen. Prompt WhatsApp con icono en contenedor gradiente verde
- **FEAT-11**: Eliminacion total de emojis Unicode del sistema — reemplazados por iconos SVG inline via objeto `I` (nuevos: Clipboard, Img, AlertTri, Mail, Gear). Afecta: boton pegar, modal parse (header, drop zone, warnings, prompt WhatsApp), ficha cliente (email), badge PASADO, y las 5 categorias de HELP_CONTENT (bento cards)

## Changelog v1.8.0

### Mejoras
- **FEAT-12**: Seccion "Disponible para venta" en tab Produccion — el panadero introduce las unidades planificadas por producto y el sistema calcula el excedente disponible para venta directa (plan - pedidos). Datos en localStorage por fecha (key `vynia-surplus:YYYY-MM-DD`), limpieza automatica de entradas >7 dias. Stepper con NumberFlow, busqueda de catalogo para productos sin pedidos, pills de acceso rapido (FRECUENTES), resumen agregado (planificadas/pedidos/disponibles). Badge verde (excedente), rojo (deficit), gris (justo). Seccion colapsable con estado persistente. Soporte print. 15 tests nuevos en `surplus-plan.test.js`

## Changelog v1.8.1

### Mejoras
- **FEAT-13**: Dictado por voz en modal "Pegar pedido" — boton "Dictar" que usa la Web Speech API del navegador (`SpeechRecognition`, `es-ES`) para transcribir audio en tiempo real. El staff reproduce un audio de WhatsApp y la app lo escucha via microfono del dispositivo. Transcripcion en vivo al textarea, con resultado editable antes de analizar. Animacion de pulso (CSS `micPulse`) mientras escucha. Cleanup automatico al cerrar modal. Coste $0 (API del navegador, sin backend). Compatible con Chrome y Safari (desktop/movil). Muestra error informativo en navegadores sin soporte (Firefox). Nuevo icono SVG `I.Mic`

## Changelog v1.8.2

### Bug fixes
- **FIX-06**: Modificar productos de un pedido duplicaba todos los registros — al abrir un pedido desde la lista o ficha de cliente, los productos se cargaban via `parseProductsStr` como `{nombre, unidades}` sin campo `id` del registro de Notion. El useEffect que carga registros frescos (con IDs) se saltaba la recarga al ver que el array ya tenia items. Al guardar, `guardarModificacion` no encontraba IDs para borrar los registros viejos, creando nuevos sin eliminar los anteriores. Fix: (1) useEffect ahora verifica que los productos tengan `id` antes de saltarse la recarga, (2) safety net en `guardarModificacion` que carga registros frescos de la API si los productos no tienen IDs

## Changelog v1.8.3

### Mejoras
- **FEAT-14**: Rediseno de la seccion "Disponible para venta" en tab Produccion — movida encima de los filtros (Pendiente/Todo el dia) con flujo de 3 estados: (1) boton CTA "Planificar produccion" cuando no hay plan, (2) modo edicion con busqueda, pills frecuentes y steppers al pulsar el boton, (3) resumen compacto con totales (plan/pedidos/disponibles) y lista de productos con badges de excedente al pulsar "Listo". Boton "Editar" para volver al modo edicion. Reemplazado `surplusCollapsed` por `surplusEditing` (sin persistencia en localStorage del estado colapsado). Ayuda actualizada con el nuevo flujo

## Changelog v1.8.4

### Bug fixes
- **FIX-07**: Mensajes de error de microfono accionables — `not-allowed` ahora indica al usuario que vaya a Ajustes del navegador > Permisos > Microfono. `no-speech` indica que acerque el audio al microfono. Errores genericos siguen mostrando el codigo de error

## Changelog v1.8.5

### Mejoras
- **FEAT-15**: Seccion de planificacion convertida en desplegable — el header con gradiente Vynia actua como toggle (chevron animado arriba/abajo). Unifica las 3 vistas (CTA, edicion, resumen) en una sola card con header consistente. Nuevo icono `I.Info` y boton circular en el header que despliega un panel informativo inline (fondo `#E1F2FC`, animacion `popoverIn`) con instrucciones detalladas: como funciona, como usar busqueda/steppers, significado de badges (verde/rojo/gris) y persistencia en localStorage. Las filas del editor ahora muestran badge de excedente junto al stepper y texto "X en pedidos" para contexto inmediato. Estado `surplusInfoOpen` se resetea al cambiar de fecha

## Changelog v1.8.6

### Bug fixes
- **FIX-08**: El navegador no mostraba el dialogo de permiso de microfono — `SpeechRecognition.start()` no siempre dispara el prompt del navegador. Fix: llamar a `navigator.mediaDevices.getUserMedia({ audio: true })` antes de iniciar el reconocimiento de voz para forzar el dialogo de permisos. El stream se libera inmediatamente (SpeechRecognition gestiona el suyo propio). Si el usuario deniega, se muestra mensaje accionable con instrucciones para el candado de la barra de direcciones

## Changelog v1.8.7

### Mejoras
- **FEAT-16**: Seccion de ayuda de planificacion ampliada — la entrada unica "Planificar produccion" se divide en 6 secciones detalladas: (1) como abrir/cerrar el desplegable y el chevron, (2) anadir productos via buscador y pills frecuentes, (3) ajustar cantidades con steppers e info "X en pedidos", (4) interpretar badges de excedente (verde/rojo/gris con ejemplos), (5) resumen compacto visible con desplegable cerrado, (6) persistencia de datos en localStorage por dia con retencion de 7 dias y advertencia sobre cambio de dispositivo

## Changelog v1.8.8

### Mejoras
- **FEAT-17**: Popup fullscreen de escucha con visualizador de audio — al pulsar "Dictar", se abre overlay fullscreen (z-index 500) con: icono de microfono con anillo pulsante (`listenRingPulse`, `micBreath`), 32 barras de frecuencia reactivas en canvas via Web Audio API (`AnalyserNode.getByteFrequencyData`, `requestAnimationFrame`), preview del texto transcrito en tiempo real, y boton "Parar" rojo. El stream de `getUserMedia` se mantiene vivo para alimentar el `AudioContext` (visualizacion) mientras `SpeechRecognition` gestiona su propio stream (transcripcion). Cleanup completo al parar: cierra AudioContext, detiene stream, cancela animationFrame. Mejor deteccion de errores: HTTP sin mediaDevices muestra mensaje de HTTPS requerido, `NotAllowedError` muestra instrucciones del candado

## Changelog v1.8.9

### Bug fixes
- **FIX-09**: Dictado por voz no funcionaba — reescrito el flujo de inicio: (1) `SpeechRecognition.start()` se ejecuta PRIMERO y gestiona sus propios permisos de micro (antes `getUserMedia` bloqueaba el micro y `SpeechRecognition` no podia acceder), (2) `getUserMedia` se lanza DESPUES de forma asincrona y no-bloqueante solo para la visualizacion del canvas, (3) `rec.start()` envuelto en try-catch para capturar errores sincronos, (4) `rec.onend` auto-reinicia el reconocimiento en vez de parar (Chrome corta tras ~10s de silencio con `continuous=true`), (5) `no-speech` ya no se trata como error fatal (silencio normal), (6) errores visibles dentro del popup fullscreen via `listenError` (antes se mostraban detras del overlay), (7) `isListeningRef` ref para closures fiables en `onend`/`drawWaveform`

## Changelog v1.8.10

### Bug fixes
- **FIX-10**: Dictado bloqueado incluso con permiso de micro concedido — Chrome tiene permiso de "reconocimiento de voz" SEPARADO del permiso de microfono. Fixes: (1) revertido a `getUserMedia` PRIMERO para forzar el prompt del navegador, luego `SpeechRecognition` despues (el stream se mantiene para visualizacion), (2) flag `fatalError` local evita bucle infinito de auto-reinicio cuando `rec.onerror` con `not-allowed` disparaba `rec.onend` que intentaba `rec.start()` otra vez, (3) deteccion de Safari (existe `webkitSpeechRecognition` pero no funciona de forma fiable) con mensaje al usuario, (4) mensajes de error especificos para `not-allowed` (enlace a Ajustes Chrome > Reconocimiento de voz), `network` (sin conexion), `service-not-allowed`, (5) errores mostrados tanto en popup fullscreen (`listenError`) como en modal (`parseError`)

## Changelog v1.8.11

### Bug fixes
- **FIX-11**: Dictado por voz bloqueado a nivel HTTP — `vercel.json` enviaba header `Permissions-Policy: microphone=()` que prohibe el acceso al microfono antes de que el JavaScript se ejecute. Cambiado a `microphone=(self)`. Eliminado `getUserMedia` completamente (conflicto con `SpeechRecognition` por bug de Chromium #41083534: ambos intentan acceder al mic y se bloquean mutuamente). `SpeechRecognition.start()` gestiona su propio acceso al mic y muestra el prompt nativo de Chrome. Canvas waveform (Web Audio API) reemplazado por ecualizador CSS puro (8 barras con `@keyframes eqBar` staggered). Eliminados refs innecesarios: `audioCtxRef`, `analyserRef`, `animFrameRef`, `streamRef`, `canvasRef` y funcion `drawWaveform()`

## Changelog v1.9.0

### Mejoras
- **FEAT-18**: Layout full-width con columnas auto-fill — eliminadas restricciones max-width (1400px/960px), la app ahora usa 100% del ancho del navegador. Grid de cards cambiado de `repeat(3, 1fr)` a `repeat(auto-fill, minmax(320px, 1fr))` para ajustar automaticamente el numero de columnas segun el ancho disponible (~5 columnas en 1920px, ~3-4 en laptops, sin cambios en tablet/movil). Padding horizontal aumentado de 32px a 48px en desktop. Gap entre cards aumentado de 12px a 16px. Bottom nav y bulk bar ajustados para full-width

## Changelog v1.9.1

### Mejoras
- **FEAT-19**: Menu hamburguesa en header — los 5 botones del header (LIVE/DEMO, Imprimir, Escoba, Ayuda, Recargar) agrupados en un unico boton hamburguesa con dropdown glass-morphism. Cada opcion con icono + texto descriptivo. Toggle LIVE/DEMO al final con separador visual. Click fuera cierra el menu. Nuevo icono `I.Menu`. Estado: `showMenu`, ref: `menuRef`

## Changelog v1.9.2

### Mejoras
- **FEAT-20**: Efecto tubelight en pills de filtro — los pills de fecha (Hoy/Mañana/Pasado) y estado (Pendientes/Recogidos/Todos) envueltos en contenedores glass-morphism con fondo sutil y backdrop-blur. El pill activo muestra una barra luminosa ("tubelight") de 24x3px con glow via box-shadow en la parte superior, animada con pulso sutil (`tubelightGlow`). Pills sin borde propio, fondo transparente cuando inactivos. Boton "Seleccionar" queda fuera del contenedor. Nueva keyframe `tubelightGlow`

## Changelog v1.9.3

### Mejoras
- **FEAT-21**: Boton "Seleccionar" estilo flow-button — borde redondeado pill (border-radius 100px), circulo expandible al hover que llena el boton de color Vynia (#4F6867) con texto blanco, transicion cubic-bezier suave (0.6s), efecto active scale(0.95). En modo bulk activo, fondo rojo (#C62828) con circulo ya expandido. Iconos SVG inline (check/X) en vez de Unicode

## Changelog v1.9.4

### Mejoras
- **FEAT-22**: Efecto tubelight en filtros de tab Produccion — los pills de fecha (Hoy/Mañana/Pasado) y estado (Pendiente/Todo el dia) envueltos en contenedores glass-morphism con backdrop-blur, identico patron visual que los filtros de tab Pedidos. Barra tubelight con glow en pill activo. Pills sin borde propio, fondo transparente cuando inactivos

## Changelog v1.9.5

### Mejoras
- **FEAT-23**: Toggle "Ver/Ocultar importes" estilo switch — reemplazado el boton "€ ON/OFF" por un toggle switch deslizante (44x24px) con knob circular que contiene icono €, animacion cubic-bezier suave (0.3s), track verde Vynia (#4F6867) cuando activo. Etiqueta textual "Ver importes"/"Ocultar importes" junto al switch. Help content actualizado

## Changelog v1.9.6

### Mejoras
- **FEAT-24**: Iconos de bottom nav con fondo activo — los tabs Pedidos y Produccion ahora tienen un contenedor (36x36px, borderRadius 10) con fondo `#E1F2FC` cuando estan activos, igual que el tab Nuevo. Transicion suave de 0.25s. Inactivos: fondo transparente, color `#A2C2D0`

## Changelog v1.9.7

### Mejoras
- **FEAT-25**: Iconos dock-style en bottom nav — Pedidos cambiado de `I.List` (lista generica) a `I.ClipboardList` (portapapeles con lista, strokeWidth 1.5). Produccion cambiado de `I.Store` (tienda) a `I.ChefHat` (gorro de chef, strokeWidth 1.5). Dot indicator (5px circulo verde Vynia) debajo del label del tab activo, inspirado en el dock de referencia. Los iconos originales `I.List` e `I.Store` se mantienen disponibles en el objeto `I`

## Changelog v1.9.8

### Mejoras
- **FEAT-26**: Header rebranding — logo sustituido de base64 inline (`VYNIA_LOGO`) a `/logovynia2_azul.png` (mismo que pagina de seguimiento). Titulo cambiado de "PEDIDOS" a "Gestion de Pedidos de Vynia". Titulo "Produccion Diaria" en tab Produccion centrado (`textAlign: "center"`)

## Changelog v1.10.0

### Mejoras
- **FEAT-27**: Glass Calendar — los date pickers nativos de Pedidos y Produccion reemplazados por un calendario glass-morphism horizontal. Fondo oscuro translucido (`rgba(27,28,57,0.88)`) con `backdrop-filter: blur(20px)`, strip horizontal scrollable con todos los dias del mes, dia seleccionado con gradient pill (`#4F6867→#A2C2D0`), dot indicator para "hoy", navegacion de meses con chevrons, auto-scroll al dia seleccionado. Boton "Fecha" reemplaza el input nativo, mostrando la fecha formateada cuando es una fecha custom. Se cierra al seleccionar dia, click fuera, o cambiar de tab. CSS `.scrollbar-hide` para ocultar scrollbar del strip
- **FEAT-28**: Luma-spin loader — los 3 spinners circulares (principal 44px, ficha cliente 28px, boton Analizar 14px) reemplazados por el efecto luma-spin: dos rectangulos con bordes redondeados que se metamorfosean con `@keyframes loaderAnim` (inset porcentual, funciona en cualquier tamaño). Colores Vynia (`#4F6867`) para spinners sobre fondo claro, blanco para el spinner inline del boton. Duracion 2.5s con delay -1.25s para el segundo rectangulo

## Changelog v1.10.1

### Mejoras
- **FIX-12**: Logo del header corregido — cambiado de `logovynia2_azul.png` (logo azul texto) a `Logo Vynia redondo.png` (logo circular con "Obrador Artesano / Sin Gluten"). Contenedor ajustado a `borderRadius: "50%"` e imagen a `objectFit: "cover"` para encajar el logo circular. Fichero copiado a `public/logo-vynia-redondo.png`

## v2.0.0 — Rediseno visual completo

Version major que agrupa todas las mejoras de interfaz (v1.9.0–v1.10.1):

- **Layout**: Full-width sin max-width, columnas auto-fill responsive `minmax(320px, 1fr)`
- **Header**: Menu hamburguesa (agrupa LIVE/Print/Broom/Help/Refresh), logo circular Vynia, titulo "Gestion de Pedidos de Vynia"
- **Filtros**: Efecto tubelight en pills de fecha y estado (Pedidos + Produccion), glow bar animada en pill activo, contenedor glass-morphism
- **Seleccionar**: Estilo flow-button con circulo expandible en hover y estado activo
- **Importes**: Toggle switch deslizante con icono euro (reemplaza boton "€ ON/OFF")
- **Bottom nav**: Iconos dock-style (ClipboardList, ChefHat), fondo activo con dot indicator
- **Calendario**: Glass calendar horizontal (paleta Vynia, blur, strip scrollable, gradient pill, dot "hoy", navegacion de meses, domingos en rojo)
- **Loaders**: Efecto luma-spin (rectangulos metamorficos) en los 3 spinners
- **Produccion**: Titulo "Produccion Diaria" centrado

## Changelog v2.0.1

### Mejoras
- **FIX-13**: Glass calendar refinado — (1) Boton "Fecha" integrado dentro del contenedor tubelight como un pill mas (mismos estilos, tubelight glow cuando activo), en vez de ser un boton separado con borde propio. (2) Fondo del calendario cambiado de oscuro translucido (`rgba(27,28,57,0.88)`) a paleta Vynia clara (`rgba(239,233,228,0.95)`) con `backdrop-filter: blur(16px)`, borde `rgba(162,194,208,0.3)`, textos en `#1B1C39`, botones nav en `#4F6867`. (3) Domingos en rojo (`#C62828`): letra del dia de la semana en rojo semi-transparente, numero en rojo, margen izquierdo extra (6px) para separar visualmente las semanas. Seleccionar un preset (Hoy/Manana/Pasado) cierra el calendario si estaba abierto

## Changelog v2.1.0

### Mejoras
- **FEAT-29**: Pipeline summary card en tab Pedidos — seccion visual con 3 anillos circulares SVG (`PipelineRing`) mostrando la distribucion de pedidos por fase del pipeline: "Por preparar" (azul #1565C0, agrupa Sin empezar + En preparacion), "Listo para recoger" (naranja #E65100), "Recogido" (verde #2E7D32). Cada anillo muestra el conteo en el centro, porcentaje de llenado proporcional al total, label y texto descriptivo debajo. Card glass-morphism con backdrop-blur. Nuevas stats `statsPorPreparar` y `statsListoRecoger` en el useMemo de stats existente. Componente `PipelineRing` con SVG circle + stroke-dasharray animado (transicion cubic-bezier 0.8s)
- **FEAT-30**: Hover shadow en cards de pedidos — reemplazado el efecto shimmer animado (radial-gradient border con `shine-pulse` 14s) por un efecto hover limpio: `transform: translateY(-2px)` + sombra `::before` que aparece con `opacity` transition 0.3s. Border color se acentua en hover (`rgba(79,104,103,0.35)`). Eliminada keyframe `shine-pulse` (ya no usada). Respetuoso con `prefers-reduced-motion`

## Changelog v2.1.1

### Mejoras
- **FIX-14**: Logo del header un 15% mas grande — contenedor e imagen de 42px a 48px

## Changelog v2.1.2

### Mejoras
- **FIX-15**: Logo del header un 25% mas grande — contenedor e imagen de 48px a 60px

## Changelog v2.2.0

### Mejoras
- **FEAT-31**: Loader de panaderia — reemplazado el luma-spin geometrico (dos rectangulos con `inset` morph) por un circulo que pulsa suavemente (`doughRise`). Un unico elemento circular que alterna entre `scale(1) opacity(0.6)` y `scale(1.15) opacity(1)`. CSS puro, sin SVG. Aplicado a los 3 loaders: principal (44px, color Vynia), ficha cliente (28px), y boton Analizar (14px, blanco). Animacion 2.5s `ease-in-out` infinita

## Changelog v2.2.1

### Mejoras
- **FIX-16**: Loader simplificado — eliminada rotacion, deformacion de escala y morph de border-radius. Ahora solo pulso circular minimalista (scale + opacity)

## Changelog v2.1.3

### Mejoras
- **FEAT-31**: Boton "Pagado" prominente en modal de detalle de pedido — el badge minusculo (9px) reemplazado por un boton full-width entre la seccion de info y productos. Estilo: gradiente Vynia (#4F6867→#3D5655) con sombra cuando pagado, borde semitransparente cuando no pagado. Icono SVG de moneda, texto "Pagado"/"Marcar como pagado", font 14px Roboto Condensed. El badge informativo "PAGADO" se mantiene en la fila de estado (solo lectura). Funcionalidad sin cambios (requestPagadoChange)

## Changelog v2.2.2

### Mejoras
- **FEAT-32**: Stats cards estilo dot-card — las tarjetas de estadisticas (Total/Pendientes/Recogidos) rediseñadas con 4 lineas de esquina decorativas (L-brackets), gradiente radial "ray" desde el borde superior, fondo glass-morphism con backdrop-blur. Colores distintivos por tipo: Total (#4F6867 Vynia), Pendientes (#1565C0 azul pipeline), Recogidos (#2E7D32 verde pipeline). Estado activo: fondo accent azul claro, borde coloreado, ray mas intenso. Hover: lift -2px + sombra. Aplicado a ambas versiones: desktop (header inline) y mobile (barra de stats). Clase `.dot-card`

## Changelog v2.2.3

### Bug fixes
- **FIX-17**: Eliminado punto animado (moveDot) de las stats cards — el dot luminoso que recorria el borde de cada tarjeta eliminado junto con la keyframe `moveDot`. Se mantiene el resto del diseno: L-brackets, ray gradient, glass-morphism, colores distintivos y hover lift

## Changelog v2.2.4

### Mejoras
- **FEAT-33**: Loader con batidora manual (whisk) — reemplazado el circulo pulsante por un icono SVG de batidora manual (`I.Whisk`) con animacion de balanceo (`whiskRock`, ±12deg, transform-origin en la parte superior del mango, 1.2s ease-in-out infinite). Aplicado a los 3 loaders: principal (44px), ficha cliente (28px), boton Analizar (14px, blanco). Eliminada keyframe `doughRise`

## Changelog v2.3.0

### Mejoras
- **FEAT-34**: Rediseno de secciones del formulario "Nuevo Pedido"

## Changelog v2.3.1

### Mejoras
- **FEAT-35**: Logo loader animado

## Changelog v2.3.2

### Mejoras
- **FEAT-36**: Filtros sticky en mobile (tab Pedidos) — la barra de filtros (selector de fecha, pills de estado, buscador de cliente, toggle de importes) se queda fija debajo del header en dispositivos moviles. Solo las cards de pedidos hacen scroll. Implementado con `position: sticky` + `top: headerH` (medido dinamicamente via `ResizeObserver` en el header). Fondo solido `#EFE9E4` con borde inferior sutil para separar de las cards. En desktop no cambia (scroll normal). Nuevos: `headerRef`, `headerH` state, ResizeObserver useEffect — los 3 loaders (principal 56px, ficha cliente 32px, boton Analizar 16px) ahora usan la imagen del logo de la manga pastelera (`Logo loader.png`) con rotacion continua (`logoSpin`, 360deg, 2s linear infinite). El logo circular con su arco incompleto crea un efecto de spinner natural al girar. Boton Analizar usa `filter: brightness(2.5)` para visibilidad sobre fondo oscuro. Eliminados icono `I.Whisk` de los loaders y keyframe `whiskRock`. Imagen copiada a `public/logo-loader.png` — inspirado en profile-card premium. Secciones (Cliente, Notas+Pagado, Productos, Sugerencias, Entrega) con fondo radial-gradient claro, borderRadius 20px, sombra por capas (4px+1px), borde semi-transparente. Barra de acento gradiente (3px) en la parte superior de cada seccion: verde Vynia (Cliente), azul muted (Notas), oscuro (Productos/Entrega), accent (Sugerencias). Inputs con fondo translucido `rgba(239,233,228,0.35)`, borderRadius 14px, padding ampliado, transicion a fondo blanco en focus con glow verde. Labels con fontSize 11px y spacing mejorado. Pills de productos frecuentes con sombra sutil y hover elevado. Estilo compartido via constante `formSectionStyle`

## Changelog v2.3.3

### Refactor
- **REFACTOR-01**: Extraer constantes y utilidades de App.jsx — primer paso del desacoplamiento del monolito (5644→5410 lineas, -234). Nuevos modulos: `constants/estados.js` (ESTADOS, ESTADO_PROGRESS, ESTADO_NEXT, ESTADO_ACTION, ESTADO_TRANSITIONS, effectiveEstado), `constants/catalogo.js` (CATALOGO_FALLBACK, PRICE_MAP, rebuildPriceMap, FRECUENTES), `constants/brand.js` (VYNIA_LOGO, VYNIA_LOGO_MD), `utils/fmt.js` (fmt, DAY_NAMES), `utils/helpers.js` (esTarde, computeDateSuggestions), `utils/surplus.js` (SURPLUS_KEY, loadSurplusPlan, saveSurplusPlan, cleanOldSurplus). Sin cambios de comportamiento

## Changelog v2.3.4

### Refactor
- **REFACTOR-02**: Extraer Icons y HelpContent de App.jsx — segundo paso del desacoplamiento del monolito (5410→5132 lineas, -278). Nuevos modulos: `components/Icons.jsx` (objeto I con ~37 iconos SVG inline), `constants/helpContent.jsx` (HELP_CONTENT, 5 categorias de ayuda con JSX). Sin cambios de comportamiento

## Changelog v2.3.5

### Refactor
- **REFACTOR-03**: Extraer CSS y estilos compartidos de App.jsx — tercer paso del desacoplamiento del monolito (5132→4893 lineas, -239). Bloque `<style>` completo (216 lineas: CSS variables, keyframes, media queries, print styles) movido a `styles/global.css` e importado en `main.jsx`. Constantes de estilo inline (labelStyle, inputStyle, formSectionStyle) movidas a `styles/shared.js`. Sin cambios de comportamiento

## Changelog v2.3.6

### Refactor
- **REFACTOR-04**: Extraer EstadoGauge, PipelineRing y useBreakpoint de App.jsx — cuarto paso del desacoplamiento del monolito (4893→4826 lineas, -67). Nuevos modulos: `hooks/useBreakpoint.js` (responsive breakpoint hook), `components/EstadoGauge.jsx` (semicirculo SVG de progreso de estado), `components/PipelineRing.jsx` (anillo SVG de pipeline). Sin cambios de comportamiento

## Changelog v2.3.7

### Refactor
- **REFACTOR-05**: Extraer modales y popovers de App.jsx — quinto paso del desacoplamiento del monolito (4826→4112 lineas, -714). 7 nuevos componentes: `ConfirmEstadoDialog.jsx`, `ConfirmPagadoDialog.jsx`, `WhatsAppPrompt.jsx`, `PhoneMenuPopover.jsx`, `ListeningPopup.jsx`, `HelpOverlay.jsx` (internaliza helpExpanded/helpActiveCategory state), `ParseWhatsAppModal.jsx`. Funcion `waLink` extraida a `utils/helpers.js`. Sin cambios de comportamiento

## Changelog v2.3.8

### Refactor
- **REFACTOR-06**: Extraer OrderDetailModal de App.jsx — sexto paso del desacoplamiento del monolito (4112→3680 lineas, -432). Nuevo componente `OrderDetailModal.jsx` (~460 lineas) internaliza 6 estados (editingFecha, editingNotas, editingProductos, editLineas, editSearchProd, confirmCancel) y 3 funciones (addEditProducto, updateEditQty, editProductosFiltrados). Los handlers `guardarModificacion`, `cambiarNotas`, `cambiarFechaPedido` ahora retornan `true` al completar; el componente resetea su estado local al recibir confirmacion. Sin cambios de comportamiento

## Changelog v2.3.9

### Refactor
- **REFACTOR-07**: Extraer TabNuevo de App.jsx — septimo paso del desacoplamiento del monolito (3680→2826 lineas, -854). Nuevo componente `TabNuevo.jsx` (~870 lineas) internaliza 24 estados (cliente, telefono, fecha, hora, notas, pagado, lineas, nuevoPaso, createResult, showParseModal, parseText/Image/Loading/Result/Error, isListening, listenText/Error, etc.), 5 refs, y 13 funciones (resetForm, onClienteChange, selectCliente, addProducto, updateQty, handleParse*, toggleListening, stopListening, aplicarParseo, crearPedido wrapper, verPedidoCreado wrapper). Incluye renderizado de ParseWhatsAppModal y ListeningPopup. `crearPedido` en App.jsx refactorizado para aceptar params object y retornar resultado. `verPedidoCreado` acepta `(pedidoId, resultData)` en lugar de leer estado local. Sin cambios de comportamiento

## Changelog v2.4.0

### Refactor
- **REFACTOR-08**: Extraer TabProduccion de App.jsx — octavo paso del desacoplamiento del monolito (2826→2201 lineas, -625). Nuevo componente `TabProduccion.jsx` (~638 lineas) internaliza 7 estados (expandedProduct, expandAll, ocultarRecogidos, surplusPlan, surplusSearch, surplusEditing, surplusInfoOpen), 2 efectos (cleanOldSurplus al montar, loadSurplusPlan al cambiar fecha), y 5 valores computados (prodView, surplusView, surplusTotals, surplusSearchResults, updateSurplus). Eliminados imports no usados de App.jsx: NumberFlow, FRECUENTES, SURPLUS_KEY, loadSurplusPlan, saveSurplusPlan, cleanOldSurplus. Corregidas 4 referencias a funciones inexistentes del Phase 6a (setCreateResult, resetForm en bottom nav) y Phase 5 (setHelpActiveCategory, setHelpExpanded en menu, setClienteSuggestions en click-outside handler). Sin cambios de comportamiento
