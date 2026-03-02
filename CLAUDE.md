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
│   ├── pedidos.js          # GET (listar con filtro) + POST (crear pedido)
│   ├── pedidos/[id].js     # PATCH (cambiar estado, propiedades)
│   ├── clientes.js         # GET (buscar) + POST (buscar o crear) + PATCH (actualizar cliente)
│   ├── registros.js        # POST (crear linea de pedido)
│   ├── produccion.js       # GET (produccion diaria agregada con clientes)
│   └── tracking.js         # GET (seguimiento publico por telefono)
├── public/
│   ├── seguimiento.html    # Pagina publica de seguimiento de pedidos (standalone, sin React)
│   └── logovynia2_azul.png # Logo Vynia usado en seguimiento
├── src/
│   ├── App.jsx             # Componente principal (toda la UI, ~2700 lineas)
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

### GET /api/tracking
- Query params: `tel=612345678` (numero de telefono, minimo 6 digitos)
- **Endpoint publico** — usado por la pagina de seguimiento para clientes
- Flujo: 1) Busca cliente en BD Clientes por `Telefono` (phone_number contains), 2) Query Pedidos por relacion Clientes, 3) Fetch registros (productos) por cada pedido
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
- Muestra pipeline visual de 4 pasos (Sin empezar → Preparando → Listo → Recogido)
- Para estados no-lineales (No acude, Incidencia) muestra badge en lugar de pipeline
- Vynia-branded: misma paleta de colores y fuentes que la app principal
- Mobile-first, responsive
- Modo iframe: detecta `window !== window.top`, añade clase `.embedded` (oculta logo y footer, fondo transparente)
- Iframe embed code para WordPress:
  ```html
  <iframe src="https://vynia-mngmnt.vercel.app/seguimiento" style="width:100%;min-height:600px;border:none;background:transparent" loading="lazy" allow="clipboard-write"></iframe>
  ```

## Frontend API client (src/api.js)

Exporta objeto `notion` con metodos:
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
- `loadProductos()` — GET /api/productos

## Tabs de la app

1. **Pedidos** — Lista de pedidos con filtros estadisticos (pendientes/hoy/recogidos/todos), pills de filtro, badge de estado con colores, boton pipeline (1 tap avanza estado), estado picker popover, enlace telefono, busqueda de clientes con ficha (enlace a Notion, edicion inline de nombre/telefono/email), seleccion bulk para cambio de estado multiple. Modal de detalle incluye: edicion inline de notas (crear/modificar/eliminar via textarea), edicion de fecha, modificar productos, y cambio de estado
2. **Nuevo** — Formulario para crear pedido: cliente (autocompletado) + telefono + fecha (presets hoy/manana/pasado + datepicker + hora) + productos del catalogo (busqueda + cantidades con NumberFlow animado) + pagado toggle + notas. Crea con Estado = "Sin empezar"
3. **Produccion** — Vista agregada de productos por dia. Selector de fecha (presets + datepicker). Lista de productos con badge de cantidad total. Accordion: click en producto muestra pedidos con nombre de cliente y badge de estado. Click en pedido abre modal con detalle completo

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
- `ESTADO_TRANSITIONS` — transiciones validas desde cada estado (para picker)

### Seleccion bulk (`cambiarEstadoBulk`)
Boton "Seleccionar" en la barra de filtros activa modo bulk. Cada card muestra checkbox circular; click togglea seleccion. Barra flotante (fixed, encima del bottom nav) muestra contador + botones de estado. Solo muestra transiciones validas comunes a todos los seleccionados (interseccion de `ESTADO_TRANSITIONS`). Ejecuta `cambiarEstado` en paralelo via `Promise.allSettled`. WhatsApp NO se dispara en bulk. Al completar o cambiar de tab, el modo se desactiva.

### WhatsApp notification
Al marcar un pedido como "Listo para recoger", si el pedido tiene telefono, se muestra un popup preguntando si se quiere avisar al cliente. Si se acepta, se abre `wa.me/{telefono}?text={mensaje}` con el texto: "¡Hola! Tu pedido de Vynia ya esta listo para que pases a recogerlo."

## UI / UX

- **Palette**: Vynia brand — primario `#4F6867`, secundario `#1B1C39`, accent `#E1F2FC`, bg `#EFE9E4`, muted `#A2C2D0`
- **Fuentes**: Roboto Condensed (titulos/numeros), Inter (texto)
- **Responsive**: Mobile-first, max-width 960px centrado
- **Tooltips**: Todos los botones tienen `title` para hover (desktop) + sistema de tooltip tactil por long-press ~0.4s (movil) con popup animado que desaparece tras 1.5s
- **Print**: CSS @media print para imprimir lista de pedidos/produccion
- **Bottom nav**: 3 tabs fijas (Pedidos, Nuevo, Produccion) con safe-area-inset-bottom

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

## Notas tecnicas

- `@notionhq/client` debe ser v2.x (v5.x elimino `databases.query`, NO actualizar). Excepcion: `handlePost` en `api/pedidos.js` usa `fetch` directo con `Notion-Version: 2025-09-03` para soportar `template: { type: "default" }` (aplica la plantilla de la BD al crear pedido). La plantilla se aplica asincronamente por Notion tras la creacion
- El campo `"Unidades "` en Registros tiene un espacio trailing — respetar siempre
- El campo `"Nombre"` (title) en Registros contiene solo `" "` — usar `"AUX Producto Texto"` (formula) para el nombre real del producto
- `"N Pedido"` es tipo `unique_id`, acceder via `.unique_id.number`
- El telefono del cliente viene de un rollup en Pedidos: `p["Telefono"]?.rollup?.array[0]?.phone_number`
- Nombre de cliente viene de rollup `"AUX Nombre Cliente"` en Pedidos (no requiere llamadas extra a la API)
- Toda la UI esta en un solo componente `App.jsx` (~2700 lineas) — no hay componentes separados
- El catalogo de productos esta hardcodeado en `CATALOGO_FALLBACK[]` en App.jsx, con carga dinamica via `/api/productos`
- `@number-flow/react` se usa para animaciones de cantidad en steppers del carrito
- **Estado es la source of truth** — NO usar checkboxes para determinar estado. Usar `effectiveEstado()` que resuelve Estado o fallback desde checkboxes para legacy
- **Sync con Notion** — La app se sincroniza con Notion de 3 formas: (1) auto-refresh al volver a la pestaña via `visibilitychange`, (2) polling cada 60s mientras la pestaña esta activa, (3) boton recargar manual. Todas invalidan el cache frontend (30s TTL en `api.js`) antes de hacer fetch. El cache de `api.js` (`CACHE_TTL = 30000`) evita llamadas duplicadas en operaciones rapidas pero se invalida explicitamente en cada recarga
