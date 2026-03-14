# Vynia MNGMNT — Sistema de Gestion de Pedidos

## Stack
- **Frontend**: React 19 + Vite 6 (arquitectura modular, ~20 ficheros en `src/`)
- **Backend**: Vercel Serverless Functions (directorio `api/`)
- **Database**: Notion API via `@notionhq/client@2.3.0`
- **Deploy**: Vercel (proyecto `vynia-mngmnt`, repo `javintnvn/Vynia-MNGMNT`)
- **URL produccion**: `https://vynia-mngmnt.vercel.app`

## Estructura

```
Vynia-MNGMNT/
├── api/                          # Vercel Serverless Functions
│   ├── _notion.js                # Notion client, retry, cached/clearCached, shared constants (PROP_UNIDADES, DB_REGISTROS, DB_PRODUCTOS, DB_PLANIFICACION, DB_HORARIO), extractors (extractTitle/RichText/DateStart), loadCatalog
│   ├── pedidos.js                # GET (listar con filtro) + POST (crear pedido)
│   ├── pedidos/[id].js           # PATCH (cambiar estado, propiedades)
│   ├── clientes.js               # GET (buscar) + POST (buscar o crear) + PATCH (actualizar cliente)
│   ├── registros.js              # GET/POST/DELETE (lineas de pedido) + GET ?productos=true (catalogo)
│   ├── produccion.js             # GET (produccion diaria agregada) + GET/POST ?surplus=true (planificacion Notion)
│   ├── tracking.js               # GET (seguimiento publico por telefono)
│   ├── parse-order.js            # POST (parseo IA de texto/imagen WhatsApp + lookup cliente)
│   ├── horario.js                # GET/PATCH (horario semanal del negocio, hybrid localStorage + Notion)
│   └── health.js                 # GET (health check — conectividad Notion, monitorizable)
├── __tests__/                    # Vitest test suite (125 tests, 20 files)
├── public/
│   ├── seguimiento.html          # Pagina publica de seguimiento (standalone, sin React)
│   └── logovynia2_azul.png       # Logo Vynia usado en seguimiento
├── src/
│   ├── App.jsx                   # Shell principal (~700 lineas): providers, effects, layout
│   ├── api.js                    # Cliente API frontend (wrapper fetch)
│   ├── constants/
│   │   ├── estados.js            # ESTADOS, ESTADO_NEXT, ESTADO_TRANSITIONS, effectiveEstado
│   │   ├── catalogo.js           # CATALOGO_FALLBACK, PRICE_MAP, FRECUENTES
│   │   ├── brand.js              # VYNIA_LOGO, VYNIA_LOGO_MD
│   │   └── helpContent.jsx       # HELP_CONTENT (5 categorias de ayuda con JSX)
│   ├── utils/
│   │   ├── fmt.js                # fmt object (todayISO, localISO, etc.), DAY_NAMES
│   │   ├── helpers.js            # esTarde, computeDateSuggestions, waLink, parseProductsStr
│   │   ├── surplus.js            # loadSurplusPlan, saveSurplusPlan, cleanOldSurplus
│   │   ├── horario.js           # loadHorario, saveHorarioDia, isOpenDay, jsDayToBdIndex (hybrid localStorage + Notion)
│   │   └── stats.js             # computePedidoStats, computeBulkTransitions
│   ├── hooks/
│   │   ├── useBreakpoint.js      # isDesktop / isTablet responsive hook
│   │   ├── useCatalog.js         # localStorage SWR + background fetch de catalogo
│   │   ├── useGlassCalendar.jsx  # Glass calendar state, click-outside, scroll, render
│   │   ├── usePedidos.js         # Estado de pedidos, CRUD, bulk, stats (~370 lineas)
│   │   ├── useProduccion.js      # Estado de produccion, load, invalidate (~55 lineas)
│   │   ├── useTooltip.js         # Tooltip state + event listeners touch/mouse/scroll
│   │   └── useVersionCheck.js    # Polling version.json + visibilitychange
│   ├── styles/
│   │   ├── global.css            # Keyframes, clases CSS, media queries, print
│   │   └── shared.js             # labelStyle, inputStyle, formSectionStyle
│   ├── context/
│   │   ├── VyniaContext.jsx      # VyniaProvider + useVynia() hook (layout, handlers, catalogo, calendar, privacy)
│   │   └── PedidosContext.jsx    # PedidosProvider + usePedidosCtx() hook (pedidos, stats, filtros, bulk)
│   └── components/
│       ├── Icons.jsx             # Objeto I con ~37 iconos SVG inline
│       ├── EstadoGauge.jsx       # Semicirculo SVG de progreso de estado
│       ├── PipelineRing.jsx      # Anillo SVG de pipeline
│       ├── TabPedidos.jsx        # Tab de lista de pedidos (~854 lineas)
│       ├── TabNuevo.jsx          # Tab de crear pedido (~870 lineas)
│       ├── TabProduccion.jsx     # Tab de produccion diaria (~638 lineas)
│       ├── OrderDetailModal.jsx  # Modal de detalle de pedido (~460 lineas)
│       ├── ParseWhatsAppModal.jsx # Modal de parseo WhatsApp con IA
│       ├── ListeningPopup.jsx    # Popup fullscreen de dictado por voz
│       ├── ConfirmEstadoDialog.jsx # Dialogo de confirmacion de cambio de estado
│       ├── ConfirmPagadoDialog.jsx # Dialogo de confirmacion de pago
│       ├── PhoneMenuPopover.jsx  # Popover de acciones de telefono
│       ├── WhatsAppPrompt.jsx    # Prompt de envio de WhatsApp
│       ├── HelpOverlay.jsx       # Overlay de ayuda con bento grid
│       └── HorarioEditor.jsx    # Editor de horario semanal (modal desde menu hamburguesa)
├── main.jsx                      # Entry point React (importa global.css)
├── index.html
├── vite.config.js
├── vercel.json                   # Rewrites: /seguimiento, /api/*, /* → SPA
├── .env.local                    # NOTION_TOKEN, ANTHROPIC_API_KEY (gitignored)
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
| Planificacion | `b0147c49-24d5-461a-b377-54a234cc4a94` | Planificacion de produccion diaria (nombre + fecha + unidades) |
| Horario Negocio | `31d18b3a-38b1-8044-b968-ddc21626833b` | Horario semanal del obrador (7 paginas, L-D) |

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
- El catalogo completo esta hardcodeado en `constants/catalogo.js` como `CATALOGO_FALLBACK[]`, con carga dinamica via `/api/registros?productos=true`

### Horario Negocio
- `"Nombre"` — title ("Lunes", "Martes"... "Domingo")
- `"Día"` — number (0=Lunes, 1=Martes, 2=Miercoles, 3=Jueves, 4=Viernes, 5=Sabado, 6=Domingo)
- `"Abierto"` — checkbox
- `"Hora apertura"` — rich_text ("HH:MM")
- `"Hora cierre"` — rich_text ("HH:MM")
- `"Hora apertura 2"` — rich_text, segundo tramo opcional ("HH:MM")
- `"Hora cierre 2"` — rich_text, segundo tramo opcional ("HH:MM")
- Ultima edicion — last_edited_time (automatica de Notion)

## API Endpoints

### GET /api/pedidos
- Query params: `filter=todos|pendientes|recogidos`
- Devuelve array de pedidos con: id, titulo, fecha, **estado**, recogido, noAcude, pagado, incidencia, notas, numPedido, **cliente**, **telefono**, clienteId, **productos** (string, ej: "2x Brownie, 1x Cookie"), **importe** (number, calculado server-side)
- Resuelve nombres de clientes via rollup `"AUX Nombre Cliente"` en Pedidos
- Resuelve telefono via rollup `"Telefono"` en Pedidos
- Bulk fetch de registros + calculo de importe server-side (OR query por chunks de 100, precio via `loadCatalog()` cached 30min)
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
- **Modo single**: Body `{ pedidoPageId, productoNombre, cantidad }` — busca producto por nombre y crea 1 registro
- **Modo batch**: Body `{ pedidoPageId, lineas: [{ productoNombre, cantidad }] }` — resuelve nombres via `loadCatalog()` cache, crea registros en batches paralelos de 10 con 200ms delay. Usado por `crearPedido` (1 request en vez de N secuenciales)
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

### GET /api/horario
- Lee todas las paginas de la BD Horario Negocio (7 paginas, una por dia de la semana)
- Cache server-side 5 min (`cached("horario", 300000, ...)`)
- Devuelve `{ horario: { 0: { abierto, apertura, cierre, apertura2, cierre2, pageId }, ... 6: {...} }, lastEdited: "ISO string" }`
- `apertura2`/`cierre2` son strings o null (segundo tramo horario partido)
- `lastEdited` es el MAX de todos los `last_edited_time` de las 7 paginas

### PATCH /api/horario
- Body: `{ dia: number, abierto?: boolean, apertura?: string, cierre?: string, apertura2?: string, cierre2?: string }`
- Busca la pagina con `Dia === dia`, actualiza propiedades correspondientes
- Invalida cache: `clearCached("horario")`
- Devuelve `{ ok: true }`

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
- `loadSurplus(fecha)` — GET /api/produccion?surplus=true&fecha=... (planificacion desde Notion)
- `saveSurplus(fecha, plan)` — POST /api/produccion (surplus write-through a Notion)
- `loadHorario()` — GET /api/horario (horario semanal desde Notion)
- `saveHorarioDia(dia, data)` — PATCH /api/horario (write-through a Notion)

## Tabs de la app

1. **Pedidos** — Lista de pedidos con filtros estadisticos (pendientes/hoy/recogidos/todos), pills de filtro, badge de estado prominente como cabecera de cada card, boton pipeline (1 tap avanza estado), estado picker popover, enlace telefono, busqueda de clientes con ficha (enlace a Notion, edicion inline de nombre/telefono/email), seleccion bulk para cambio de estado multiple, toggle de visibilidad de precios (boton `€ ON/OFF` junto a barra de busqueda, oculto por defecto). Fila de fecha: botones Hoy/Manana/Pasado a la izquierda + datepicker al extremo derecho. Modal de detalle incluye: edicion inline de notas (crear/modificar/eliminar via textarea), edicion de fecha, modificar productos, y cambio de estado
2. **Nuevo** — Formulario en DOS pasos para crear pedido: 1) Cliente (autocompletado), productos del catalogo (busqueda + cantidades con NumberFlow) + notas + pagado toggle. Boton "Pegar pedido" (card premium con shine effect) abre modal para importar pedidos de WhatsApp via: texto pegado, captura de pantalla (drag-drop/clipboard/file), o dictado por voz (Web Speech API, boton "Dictar" con pulso animado). Parseo con Claude Haiku 4.5 (vision), preview con confianza, matching contra catalogo, lookup de cliente por telefono. 2) Sugerencias inteligentes de fecha (analiza produccion de proximos 7 dias, muestra chips con fechas que comparten productos del carrito, scoring `overlapCount*3 + overlapUnits`, max 3 sugerencias) + Fecha (presets hoy/manana/pasado + datepicker + hora). Crea con Estado = "Sin empezar". Funcion de scoring: `computeDateSuggestions(produccionRango, lineas, horario?)` — logica pura sin IA, filtra dias cerrados si se pasa horario. Estado: `dateSuggestions`, `suggestionsLoading`. Fetch async via `loadProduccionRango()` al pasar a Paso 2
3. **Produccion** — Vista agregada de productos por dia. Selector de fecha (presets + datepicker). Seccion "Disponible para venta": flujo de 3 estados — boton CTA "Planificar produccion" → modo edicion (steppers, busqueda catalogo, pills frecuentes) → resumen compacto con totales plan/pedidos/disponibles y badges de excedente/deficit. Datos persistidos en Notion (BD Planificacion) con write-through a localStorage para carga instantanea; fallback a localStorage si API falla (modo offline). Limpieza >7 dias. Filtros "Pendiente" (resta pedidos "Listo para recoger" y "Recogido") y "Todo el dia" (muestra todo). Barra de resumen con conteo de productos, boton "Desplegar/Contraer" (expande o colapsa todos los acordeones a la vez) y total de unidades pendientes. Lista de productos con badge de cantidad total. Accordion: click en producto muestra pedidos filtrados con nombre de cliente y badge de estado (click individual en modo expandAll contrae todo y deja solo ese producto). Click en pedido abre modal con detalle completo. Cambiar fecha o filtro resetea el estado de expansion

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

### Constantes en `constants/estados.js`
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
- **Toggle datos sensibles**: Toggle switch "Ver/Ocultar datos" a la derecha de la barra de busqueda, oculto por defecto (`mostrarDatos` state en VyniaContext). Controla visibilidad de importes y telefonos en cards, ficha de cliente, resultados de busqueda y modal de detalle. Iconos `I.Eye`/`I.EyeOff` en el knob del switch
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
- **Limite Hobby plan**: max 12 Serverless Functions por deployment. Actualmente 8 funciones en `api/` (excluye `_notion.js` helper). NO crear nuevos ficheros en `api/` sin consolidar primero
- **OBLIGATORIO en cada commit**: 1) Actualizar `"version"` en `package.json` (semver: patch para fixes/perf, minor para features, major para breaking changes). 2) Documentar los cambios en la seccion `## Changelog vX.Y.Z` al final de este archivo (CLAUDE.md) con ID de cambio (FIX-xx, FEAT-xx, PERF-xx) y descripcion concisa

## Reglas de desarrollo

### NUNCA
- Actualizar `@notionhq/client` a v5+ (rompe `databases.query`). Debe permanecer en v2.x
- Crear nuevos ficheros en `api/` sin consolidar primero (limite 12 Serverless Functions Hobby plan, actualmente 8)
- Usar emojis Unicode en la UI — solo SVG inline via objeto `I` en `components/Icons.jsx`
- Usar el string `"Unidades "` directamente — siempre `PROP_UNIDADES` de `api/_notion.js`
- Usar checkboxes (Recogido/No acude/Incidencia) para determinar estado — usar `effectiveEstado()` de `constants/estados.js`
- Usar `toISOString()` para fechas locales — siempre `fmt.localISO()` de `utils/fmt.js` (evita desfase UTC)
- Hardcodear IDs de BDs de Notion — usar constantes de `api/_notion.js` (`DB_REGISTROS`, `DB_PRODUCTOS`, `DB_PLANIFICACION`)
- Usar `"Nombre"` (title) de Registros para nombre de producto — siempre `"AUX Producto Texto"` (formula)

### SIEMPRE
- Bump version en `package.json` en cada commit (patch: fix/perf, minor: feat, major: breaking)
- Añadir entrada en Changelog al final de este archivo (FIX-xx / FEAT-xx / PERF-xx / REFACTOR-xx)
- Tests: copiar a `/tmp/vynia-test` con `rsync -a --exclude='node_modules' --exclude='.git'` antes de ejecutar (Google Drive es lento)
- Dual-write al cambiar estado: `Estado` status + checkboxes sincronizados en una sola PATCH
- Iconos nuevos: añadir como funcion en objeto `I` de `Icons.jsx` (props: `s` size, `c` color)
- Estilos inline (no CSS modules ni styled-components). CSS global solo en `styles/global.css`. Constantes compartidas en `styles/shared.js`
- Funciones puras en `utils/` — testeables, sin side effects, sin imports de React
- Acceder a telefono del cliente via rollup en Pedidos: `p["Telefono"]?.rollup?.array[0]?.phone_number`
- Acceder a nombre de cliente via rollup `"AUX Nombre Cliente"` en Pedidos (no requiere llamadas extra a la API)
- Acceder a `"N Pedido"` via `.unique_id.number`

## Patrones de arquitectura

### Estructura de la UI
`App.jsx` (~700 lineas) actua como shell: providers (`VyniaProvider` + `PedidosProvider`), effects globales, layout (header + tabs + bottom nav). La logica de negocio vive en 2 custom hooks (`usePedidos`, `useProduccion`). Cada tab y modal es un componente independiente que accede al estado compartido via `useVynia()` y `usePedidosCtx()` hooks

### Contextos React
| Contexto | Contenido | Frecuencia de cambio |
|----------|-----------|---------------------|
| `VyniaContext` | layout, handlers genericos, catalogo, glass calendar, privacy toggle | Rara vez |
| `PedidosContext` | pedidos[], stats, filtros, bulk selection | Cada 120s (polling) |

Separados para evitar re-renders innecesarios. TabPedidos usa ambos; TabNuevo, TabProduccion y OrderDetailModal solo usan VyniaContext

### Añadir un componente
1. Crear en `src/components/NombreComponente.jsx`
2. Acceder a estado compartido via `useVynia()` (layout, catalogo, calendar) o `usePedidosCtx()` (pedidos, stats, bulk)
3. Props solo para datos locales que el padre controla directamente
4. Internalizar estado local que no necesita salir del componente

### Añadir un hook
1. Crear en `src/hooks/useNombreHook.js` (`.jsx` si contiene JSX — Vite lo requiere)
2. Estado y efectos internos; exponer API minima
3. Comunicacion entre hooks via callbacks (ver `onInvalidateProduccion` y `onUpdateProduccionPagado` en App.jsx)

### Añadir logica pura
1. Crear en `src/utils/` como funcion exportada
2. Sin imports de React, sin side effects
3. Añadir tests en `__tests__/nombre.test.js`

### Añadir endpoint API
1. PRIMERO verificar si se puede consolidar en un endpoint existente (param/query switch). Ejemplo: surplus se consolido en `produccion.js` via `?surplus=true`
2. Si es nuevo fichero: comprobar que no excede 12 serverless functions (actualmente 8)
3. Patron: import `notion`, `cached`, extractors de `api/_notion.js`
4. Cache server-side via `cached(key, ttlMs, fn)` — invalidar con `clearCached(key)` tras escrituras
5. Paginacion: usar `start_cursor` para queries >100 resultados. Para registros: OR query en chunks de 100 (limite compound filter de Notion)
6. Endpoints publicos: rate limiting obligatorio (ver `tracking.js`: 10 req/min por IP + 3 req/min por telefono)

### Catalogo de productos
Hardcodeado en `CATALOGO_FALLBACK[]` en `constants/catalogo.js` como fallback. Carga dinamica via `/api/registros?productos=true`. Server-side: `loadCatalog()` en `api/_notion.js` (cached 30min). Frontend: `useCatalog` hook con localStorage SWR

## Notas de implementacion

### Creacion de pedidos (handlePost en pedidos.js)
`handlePost` usa `fetch` directo (no el SDK) con `Notion-Version: 2025-09-03` y `parent: { type: "data_source_id", data_source_id: DS_PEDIDOS }` para soportar `template: { type: "default" }`. `DS_PEDIDOS` = `1c418b3a-38b1-8176-a42b-000b33f3b1aa` (diferente del database_id). La plantilla se aplica asincronamente por Notion tras la creacion

### Sync con Notion
La app se sincroniza de 3 formas: (1) auto-refresh al volver a la pestaña via `visibilitychange` (debounced 2s), (2) polling cada 120s mientras activa, (3) boton recargar manual. Polls y visibility usan `skipEnrich: true` (preservan datos previos). Carga inicial y reload manual hacen enrichment completo. `invalidatePedidosCache()` invalida solo claves de pedidos — usada tras cambios de estado. `invalidateApiCache()` limpia todo — usada en reloads

### Server-side cache
`api/_notion.js` exporta `cached(key, ttlMs, fn)`, `clearCached(key)` (SWR: marca stale, devuelve datos viejos mientras revalida), `deleteCachedPrefix(prefix)` (hard-delete: borra entradas, fuerza cold fetch — usar tras writes), y `withTiming(label, fn)` (mide wall time, devuelve `{ data, ms }`). TTLs: pedidos GET 10s, produccion 60s, catalogo 300s (5min), tracking 15s, surplus 15s, health 30s. Tras POST/PATCH, los endpoints usan `deleteCachedPrefix("pedidos:")` para invalidacion inmediata

### Renderizado progresivo
La lista de pedidos usa IntersectionObserver para renderizar en lotes de 30. Se resetea al cambiar filtro/datos

## Requisitos No Funcionales

### Disponibilidad
- Objetivo 99.5% mensual. Degradacion graceful obligatoria (modo DEMO, surplus localStorage fallback, CATALOGO_FALLBACK)
- Health check: `GET /api/health` verifica acceso real de lectura via `databases.query({ page_size: 1 })`. Cache 30s. Devuelve `{ ok, latency, ts }` o 503 `{ ok: false, error, ts }`
- **Monitorizacion (UptimeRobot)**: configurar HTTP check en `https://vynia-mngmnt.vercel.app/api/health`, esperar 200, keyword `"ok":true`, intervalo 5min, alerta email

### Latencia (p95)
- Carga inicial percibida <1s (catalogo desde localStorage SWR)
- Operaciones CRUD <1s (crear pedido, cambiar estado, modificar)
- Tracking publico <1s
- Parseo IA <5s
- Retry total no debe superar 10s (maxRetries=3 con backoff exponencial)

### Observabilidad: Server-Timing headers
- `withTiming(label, fn)` en `api/_notion.js` mide wall time de operaciones async. Devuelve `{ data, ms }`
- Aplicado a 3 endpoints GET: `/api/pedidos`, `/api/produccion` (GET principal), `/api/tracking`. Header: `Server-Timing: total;dur=XXX`
- Cache hits muestran ~0ms, cold calls muestran latencia real de Notion (200-800ms tipico)
- Visible en browser DevTools > Network > Timing

### Client-side timeout
- Todas las llamadas API abortan tras 10s (AbortController en `src/api.js` `doFetch`)
- Excepcion: `/parse-order` (vision IA) usa 15s
- Error: `"Tiempo de espera agotado (Xs)"`

## Tests

- **Framework**: Vitest 4.x con jsdom
- **Ejecutar**: `npm test` (o `npx vitest run`)
- **24 archivos de test**, ~182 tests cubriendo: API client, cache/dedup, estado resolution, bulk operations, timezone, unicode, telefono formats, integraciones, date suggestions, surplus plan, double submit, fmt dates, helpers pure, stats computation, bulk transitions, latencia (withTiming, AbortController timeout, health endpoint), horario (jsDayToBdIndex, isOpenDay, getOpenDaysInRange, hybrid sync, write-through), cache invalidation (deleteCachedPrefix, skipEnrich optimistic preservation)
- **Nota Google Drive**: vitest es lento en Google Drive. Para desarrollo rapido, copiar a `/tmp/vynia-test` con `rsync -a --exclude='node_modules' --exclude='.git'` y ejecutar ahi

## Troubleshooting

| Problema | Causa | Solucion |
|----------|-------|----------|
| Build falla con "invalid JS syntax" | Fichero `.js` contiene JSX | Renombrar a `.jsx` (Vite lo requiere) |
| PATCH `/api/pedidos/:id` devuelve 404 en prod | Rewrite SPA `/(.*) → /index.html` intercepta rutas API | Verificar negative lookahead `/((?!api/).*)` en `vercel.json` |
| Notion API devuelve 400 en campo | Nombre de propiedad incorrecto (tildes, espacios trailing) | Verificar contra seccion "Propiedades Notion importantes". Ej: `"Unidades "` tiene espacio |
| Tests lentos (>30s) | Ejecutando en Google Drive | `rsync -a --exclude='node_modules' --exclude='.git' . /tmp/vynia-test && cd /tmp/vynia-test && npx vitest run` |
| Pedido creado sin numPedido | Template Notion se aplica asincronamente | Normal — llega via polling (120s) o al recargar |
| Micro bloqueado en Chrome | Permisos separados: microfono + reconocimiento de voz | chrome://settings > Content > Speech recognition. Verificar `Permissions-Policy: microphone=(self)` en `vercel.json` |
| Seguimiento no carga en iframe | Headers X-Frame-Options/CSP sobreescritos | Verificar orden de bloques en `vercel.json`: `/seguimiento` debe ir DESPUES del catch-all para que sus headers ganen |
| `getUserMedia` y `SpeechRecognition` se bloquean mutuamente | Bug Chromium #41083534 | NO usar `getUserMedia` junto con `SpeechRecognition`. El speech API gestiona su propio acceso al mic |
| Registros duplicados al modificar productos | Productos sin campo `id` (cargados desde string, no desde API) | Verificar que useEffect carga registros frescos cuando los items no tienen `id` |

## Changelog

### Historial resumido
- **v1.4.x**: Bug fixes fundacionales (effectiveEstado, timezone UTC→local, paginacion, PROP_UNIDADES, cache dedup, rollback en bulk/registros). Renderizado progresivo (IntersectionObserver). Toggle pagado interactivo con optimistic UI
- **v1.5.x**: Seguimiento publico con gauge SVG, CTA resena Google, iframe embed en vynia.es. Fix clientes duplicados por telefono
- **v1.6.0**: Sugerencias inteligentes de fecha (scoring por solapamiento de productos, endpoint rango multi-dia)
- **v1.7.x**: Parseo WhatsApp con IA (Claude Haiku 4.5 vision: texto, captura, multimodal). Lookup de cliente por telefono. Catalogo compartido via `loadCatalog()`. `ANTHROPIC_API_KEY`
- **v1.8.x**: Surplus planning (plan vs pedidos = disponible). Dictado por voz (Web Speech API). Popup fullscreen con ecualizador CSS. Multiples fixes de permisos micro (getUserMedia vs SpeechRecognition, Permissions-Policy)
- **v1.9.x–v1.10.x**: Full-width layout, menu hamburguesa, tubelight pills, flow-button, toggle switch, dock-style nav, glass calendar horizontal, logo circular, luma-spin loaders
- **v2.0.0**: Rediseno visual completo (agrupacion de v1.9–v1.10)
- **v2.1.x–v2.3.x**: Pipeline rings SVG, dot-cards stats, logo loader animado, filtros sticky mobile, formulario profile-card premium. Inicio del refactoring del monolito
- **v2.3.3–v2.4.3**: Refactoring monolito completo en 11 pasos (App.jsx de 5644→1396 lineas). Extraidos: constants/, utils/, hooks/, styles/, context/, 14 componentes. VyniaContext + prop drilling reduction (56→15 props)
- **v2.5.0–v2.6.1**: Rate limiting tracking (10/IP + 3/tel por min). Toggle privacidad global (importes + telefonos). Server-side enrich pedidos (elimina N+1). SWR cache frontend. DB_REGISTROS centralizado
- **v2.7.0–v2.8.0**: Batch endpoint registros. Extractors centralizados en _notion.js. usePedidos/useProduccion hooks. Split VyniaContext/PedidosContext (elimina re-renders)
- **v2.9.0**: Surplus persistido en Notion (BD Planificacion). Health endpoint. Lazy eviction rate limiter
- **v2.10.0–v2.10.1**: 43 tests nuevos (fmt, helpers, stats). computePedidoStats/computeBulkTransitions extraidos a utils/stats.js. Sync CLAUDE.md

## Changelog v2.10.2

### Docs
- **DOCS-04**: Reestructuracion de CLAUDE.md con instrucciones accionables — nueva seccion "Reglas de desarrollo" (8 NUNCA + 10 SIEMPRE), nueva seccion "Patrones de arquitectura" (guias para añadir componentes, hooks, utils, endpoints, contextos React, catalogo), nueva seccion "Troubleshooting" (9 problemas comunes con causa y solucion). "Notas tecnicas" reorganizada como "Notas de implementacion" (solo sync, cache, rendering). Changelog historico condensado de 451 lineas (60+ entries) a resumen ejecutivo de 15 lineas. Reduccion total: 837→477 lineas (-43%)

## Changelog v2.11.0

### Mejoras
- **FEAT-41**: Server-Timing headers — nuevo `withTiming(label, fn)` en `api/_notion.js` que mide wall time de operaciones async. Aplicado a `GET /api/pedidos`, `GET /api/produccion` y `GET /api/tracking` con header `Server-Timing: total;dur=XXX`. Cache hits muestran ~0ms, cold calls muestran latencia real de Notion
- **FEAT-42**: Client-side timeout — AbortController en `src/api.js` `doFetch` con 10s default, 15s para `/parse-order` (vision IA). Error user-friendly en español al expirar
- **FEAT-43**: Health check mejorado — `GET /api/health` cambiado de `databases.retrieve` a `databases.query({ page_size: 1 })` para verificar acceso real de lectura (no solo metadata)

### Testing
- **TEST-04**: Tests de latencia — 8 tests nuevos: withTiming (measurement, error propagation, instant), doFetch timeout (AbortSignal passed, success within timeout, AbortError message), health endpoint (200 con latencia, 503 Notion down). Total: 133 tests, 21 ficheros

### Docs
- **DOCS-05**: Seccion "Requisitos No Funcionales" en CLAUDE.md — disponibilidad 99.5%, latencia p95 (CRUD <1s, tracking <1s, parseo IA <5s), observabilidad Server-Timing, client timeout 10s/15s, instrucciones monitorizacion UptimeRobot

## Changelog v2.11.1

### Docs
- **DOCS-06**: Ampliar manual de ayuda in-app (`helpContent.jsx`) — categoria "Nuevo Pedido" ampliada de 2 a 6 secciones: (1) Pegar pedido (importar de WhatsApp via texto/imagen), (2) Dictado por voz (Web Speech API, popup fullscreen, transcripcion en tiempo real), (3) Revisar resultado del analisis (preview con confianza, productos matched/unmatched, aplicar), (4) Sugerencias inteligentes de fecha (analisis produccion 7 dias, chips con solapamiento, scoring), (5) Paso 2 actualizado con mencion a sugerencias. Paso 1 sin cambios

## Changelog v2.12.0

### Mejoras
- **FEAT-44**: Horario del negocio — configuracion semanal (L-D) con soporte horario partido (2 tramos por dia), persistido en Notion BD "Horario Negocio" (`DB_HORARIO`). Editor accesible desde menu hamburguesa con auto-save y sync cross-device (hybrid localStorage + Notion). `computeDateSuggestions` filtra dias cerrados (3er parametro opcional, backward compatible). Presets de fecha Hoy/Manana/Pasado muestran indicador "Cerrado" con strikethrough. Nuevo endpoint `GET/PATCH /api/horario` (funcion serverless 9 de 12). Documentacion en overlay de ayuda. 37 tests nuevos (33 horario + 4 date-suggestions)

## Changelog v2.12.1

### Fixes
- **FIX-30**: PATCH `/api/horario` upsert — si no existe pagina para un dia en la BD de Notion, la crea automaticamente en lugar de fallar con 404 silencioso (fire-and-forget). Resuelve que el horario no se guardaba en Notion en primera configuracion

### Mejoras
- **FEAT-45**: Preset "proximo dia abierto" — cuando Hoy/Manana/Pasado estan todos cerrados, aparece un 4o chip verde con el proximo dia abierto (ej: "Mie 12 — Prox. abierto"). Usa `getOpenDaysInRange` buscando hasta 14 dias adelante
- **FIX-31**: HorarioEditor centrado en pantalla (antes bottom sheet cortado) con border radius completo. Indicador de guardado verde con icono check en lugar de texto gris

## Changelog v2.12.2

### Fixes
- **FIX-32**: Dropdown autocompletado de clientes cortado en TabNuevo — el desplegable quedaba recortado dentro de la seccion del formulario (solo se veian ~2 resultados) porque `formSectionStyle` aplica `overflow: "hidden"`. Override `overflow: "visible"` solo en la seccion Cliente para que el dropdown flote correctamente sobre el resto de la interfaz

## Changelog v2.12.3

### Fixes
- **FIX-33**: Horario sync fiable con Notion — `saveHorarioDia` ahora es async y await la respuesta de Notion en lugar de fire-and-forget. HorarioEditor muestra estado real de sincronizacion (guardando/guardado/error) con debounce 600ms. Si Notion falla, el usuario ve el error en lugar de un falso "guardado". Notion es source of truth: todos los dispositivos ven el mismo horario

## Changelog v2.12.4

### Fixes
- **FIX-34**: DB_HORARIO apuntaba a BD inexistente (`31d18b3a...8089`) — actualizado a la BD real "Horario Negocio" (`31d18b3a-38b1-8044-b968-ddc21626833b`) dentro de la pagina "Gestiona Tu Obrador". Configuradas propiedades via Notion API: Nombre (title), Dia (number), Abierto (checkbox), Hora apertura/cierre (rich_text), Hora apertura 2/cierre 2 (rich_text)

## Changelog v2.13.0

### Fixes
- **FIX-35**: Prevencion de pedidos duplicados — guardia `useRef` + `isSubmitting` state en `TabNuevo.jsx` que bloquea doble-click/doble-tap en el boton "Crear Pedido". Boton se deshabilita y muestra "Creando..." durante el envio. Complementado con dedup de POST en `api.js`: mismo path+body dentro de 5s devuelve la misma promise (defensa en profundidad)

### Mejoras
- **PERF-05**: Stale-While-Revalidate server-side — `clearCached()` en `api/_notion.js` ahora marca entradas como stale en vez de borrarlas. `cached()` devuelve datos stale inmediatamente y revalida en background. Resultado: tras crear/modificar un pedido, la lista carga instantaneamente desde cache stale (~0ms) en vez de esperar un cold fetch a Notion (~500ms)
- **PERF-06**: Llamadas paralelas en `GET /api/pedidos` — bulk fetch de registros y `loadCatalog()` ahora se ejecutan en paralelo via `Promise.all()`. Ahorra ~300-500ms por request frio (1 round-trip menos a Notion)
- **FEAT-46**: Optimistic UI en creacion de pedidos — el pedido nuevo se inyecta en el estado local inmediatamente tras la respuesta del POST, sin esperar al refresh completo de la lista. El `numPedido` y datos enriquecidos llegan via background refresh con `skipEnrich: true`

### Testing
- **TEST-05**: Tests actualizados para double-submit: guardia useRef (bloqueo concurrente + reset tras completar), POST dedup (misma ventana, diferente body, diferente path), server-side SWR (stale return + background revalidation, fresh cache hit). Reemplaza el test documentativo anterior que solo registraba el bug

## Changelog v2.13.1

### Fixes
- **FIX-36**: Productos no cargan en pedidos nuevos — fix de 4 capas: (1) reordenar invalidacion de cache frontend para ejecutarse ANTES del background refresh en `crearPedido` (antes `loadPedidos` leia cache stale), (2) `skipEnrich` ahora preserva entradas optimistas no presentes en la respuesta API (antes se perdian silenciosamente), (3) nueva `deleteCachedPrefix()` en `api/_notion.js` para borrado hard de cache tras writes (vs `clearCached` SWR para reads), (4) invalidacion server-side añadida a `POST /api/pedidos`, `POST /api/registros` (batch) y `PATCH /api/pedidos/:id`

### Testing
- **TEST-06**: Tests de cache invalidation — `deleteCachedPrefix` (match, no-match, cold-fetch-after-delete, diferencia con clearCached SWR), skipEnrich optimistic entry preservation (no en API, si en API, sin duplicados)

## Changelog v2.13.2

### Mejoras
- **PERF-07**: Optimistic UI en todas las operaciones de escritura — `cambiarEstado`, `cambiarNotas`, `cambiarFechaPedido` y `cancelarPedido` ahora actualizan la UI al instante y hacen el PATCH a Notion en background. Si Notion falla, se hace rollback automatico al estado anterior. Elimina el loader visible en cambios de estado (antes 300-800ms de espera). Mismo patron que `confirmarPagadoChange` (ya era optimista). `cambiarEstadoBulk` no cambia (ya era optimista desde v2.13.0)
