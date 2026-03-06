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
│   └── parse-order.js      # POST (parseo IA de mensajes WhatsApp)
├── __tests__/              # Vitest test suite (51 tests, 14 files)
├── public/
│   ├── seguimiento.html    # Pagina publica de seguimiento de pedidos (standalone, sin React)
│   └── logovynia2_azul.png # Logo Vynia usado en seguimiento
├── src/
│   ├── App.jsx             # Componente principal (toda la UI, ~2800 lineas)
│   └── api.js              # Cliente API frontend (wrapper fetch)
├── main.jsx                # Entry point React
├── index.html
├── vite.config.js
├── vercel.json             # Rewrites: /seguimiento → tracking page, /api/* → serverless, /* → SPA
├── .env.local              # NOTION_TOKEN (gitignored)
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
2. **Nuevo** — Formulario en DOS pasos para crear pedido: 1) Cliente (autocompletado), productos del catalogo (busqueda + cantidades con NumberFlow) + notas + pagado toggle. 2) Sugerencias inteligentes de fecha (analiza produccion de proximos 7 dias, muestra chips con fechas que comparten productos del carrito, scoring `overlapCount*3 + overlapUnits`, max 3 sugerencias) + Fecha (presets hoy/manana/pasado + datepicker + hora). Crea con Estado = "Sin empezar". Funcion de scoring: `computeDateSuggestions(produccionRango, lineas)` — logica pura sin IA. Estado: `dateSuggestions`, `suggestionsLoading`. Fetch async via `loadProduccionRango()` al pasar a Paso 2
3. **Produccion** — Vista agregada de productos por dia. Selector de fecha (presets + datepicker). Filtros "Pendiente" (resta pedidos "Listo para recoger" y "Recogido") y "Todo el dia" (muestra todo). Barra de resumen con conteo de productos, boton "Desplegar/Contraer" (expande o colapsa todos los acordeones a la vez) y total de unidades pendientes. Lista de productos con badge de cantidad total. Accordion: click en producto muestra pedidos filtrados con nombre de cliente y badge de estado (click individual en modo expandAll contrae todo y deja solo ese producto). Click en pedido abre modal con detalle completo. Cambiar fecha o filtro resetea el estado de expansion

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
- **Responsive**: Mobile-first, max-width 960px centrado
- **Tooltips**: Todos los botones tienen `title` para hover (desktop) + sistema de tooltip tactil por long-press ~0.4s (movil) con popup animado que desaparece tras 1.5s
- **Cards de pedido**: Cabecera prominente estilo glass-button con semicirculo SVG animado (`EstadoGauge`) que muestra progreso del pipeline (0%/33%/66%/100%), titulo del estado (13px bold), subtitulo con porcentaje, fondo degradado con color del estado, shimmer overlay. Constantes: `ESTADO_PROGRESS` (mapa estado→progreso 0-1). Boton pipeline secundario (fondo semitransparente, texto coloreado, sin sombra). Boton picker `···` para cambio manual
- **Toggle precios**: Boton `€ ON/OFF` a la derecha de la barra de busqueda, oculto por defecto (`mostrarPrecios` state). Controla visibilidad del importe en cards
- **Changelog popup**: Click en numero de version en header abre popup con fecha del commit y mensaje de cambios (inyectados en build time via `__APP_CHANGELOG__` desde `git log`)
- **Update banner**: Chequeo automatico de `/version.json` cada 2 min + al volver a la pestaña. Si hay nueva version desplegada, muestra banner flotante "Nueva version disponible" con boton "Actualizar" (reload). Plugin Vite `version-json` genera el fichero en build y lo sirve en dev
- **Print**: CSS @media print para imprimir lista de pedidos/produccion
- **Bottom nav**: 3 tabs fijas (Pedidos, Nuevo, Produccion) con safe-area-inset-bottom
- **Seccion de Ayuda**: Boton `?` en header abre modal full-screen con manual de instrucciones. Dos niveles de navegacion: (1) Bento Grid con 5 cards de categoria (Pedidos, Nuevo Pedido, Produccion, Seguimiento, General) con gradientes de color unicos, iconos, animaciones staggered de entrada y hover scale; (2) Animated List con secciones expandibles estilo acordeon, numero circular coloreado, preview truncado, pasos numerados y tips con borde de acento. Contextual: abre la categoria del tab activo. Estado: `showHelp`, `helpExpanded` (Set), `helpActiveCategory`. Contenido estatico en constante `HELP_CONTENT` (~180 lineas). Colores por categoria: Pedidos (#1565C0 azul), Nuevo (#2E7D32 verde), Produccion (#E65100 naranja), Seguimiento (#7B1FA2 morado), General (#4F6867). CSS: `helpSlideUp`, `helpItemIn`, `.help-bento-card`, `.help-list-item`. Oculto en @media print

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
- Variable de entorno en Vercel: `NOTION_TOKEN`
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
- Toda la UI esta en un solo componente `App.jsx` (~2700 lineas) — no hay componentes separados
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
- **14 archivos de test**, 51 tests cubriendo: API client, cache/dedup, estado resolution, bulk operations, timezone, unicode, telefono formats, integraciones
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
