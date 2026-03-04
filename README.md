# Vynia MNGMNT

Sistema de gestion de pedidos para **Vynia**, conectado a Notion como base de datos.

**URL produccion:** [vynia-mngmnt.vercel.app](https://vynia-mngmnt.vercel.app)

## Funcionalidades

### Pedidos
- Lista de pedidos filtrable por fecha (Hoy / Manana / Pasado + date picker)
- Filtros de estado: Pendientes, Recogidos, Todos
- Buscador de clientes: busca en BD Clientes por nombre, telefono o email. Muestra dropdown con resultados y al seleccionar un cliente abre ficha con datos + pedidos asociados. Click en pedido abre modal con boton "← Cliente" para volver a la ficha
- Cards con nombre de cliente, hora entrega, telefono, productos, notas, importe
- Click en pedido abre modal con detalle completo + productos cargados desde Registros
- Click en telefono ofrece Llamar o enviar WhatsApp
- Toggle de recogido y no acude
- Modificar productos y cantidades de un pedido existente desde el modal (borra registros anteriores y recrea)
- Cancelar pedido (archiva en Notion) y cambiar fecha de entrega desde el modal
- Importe total calculado por pedido (carga progresiva en background desde catalogo Notion + Registros)
- Clasificacion automatica Manana/Tarde dentro de cada fecha (detecta "tarde" en notas o hora >= 17:00)
- Badges: PAGADO, INCIDENCIA, TARDE
- Stats bar con contadores (total, pendientes, recogidos)
- Boton "Ver en Notion" en modal de detalle (abre la pagina del pedido en Notion)
- Boton limpieza de registros huerfanos (archiva registros sin pedido asociado, con feedback progresivo)

### Nuevo Pedido
- Formulario dividido en dos pasos:
  1. Cliente (sugerencias, crear nuevo), productos (catálogo con buscador), notas y estado de pago.
  2. Selección de fecha de entrega (presets Hoy/Mañana/Pasado + datepicker + hora)
- Crea cliente en Notion si no existe
- Confirmacion post-creacion: pantalla de exito con "Ver pedido" (abre modal) y "Crear otro", o pantalla de error con mensaje y "Reintentar" (sin perder datos del formulario)

### Produccion
- Vista agregada de productos por dia con cantidades totales
- Toggle Pendiente / Todo el dia: discrimina pedidos recogidos de la produccion pendiente
- Muestra unidades pendientes vs recogidas (con tachado) por producto y en resumen global
- Selector de fecha (presets + datepicker)
- Click en producto expande los pedidos que lo contienen (recogidos aparecen tachados con badge RECOGIDO)
- Click en pedido abre modal con detalle completo (cliente, telefono, fecha, productos, badges, notas)
- Precarga automatica al iniciar la app para carga instantanea

### General
- Version de la app y fecha de despliegue visibles en el header (junto al logo)

## Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 19 + Vite 6 |
| Backend | Vercel Serverless Functions |
| Base de datos | Notion API (`@notionhq/client@2.3.0`) |
| Deploy | Vercel (autodeploy desde `main`) |

## Estructura

```
Vynia-MNGMNT/
├── api/                    # Vercel Serverless Functions
│   ├── _notion.js          # Modulo compartido: Notion client con retry, cache servidor, delay
│   ├── pedidos.js          # GET (listar con filtro fecha/estado) + POST (crear pedido)
│   ├── pedidos/[id].js     # PATCH (toggle recogido, no acude, etc.)
│   ├── clientes.js         # GET (buscar) + POST (buscar o crear cliente)
│   ├── registros.js        # GET (productos de un pedido | huerfanos) + POST (crear linea) + DELETE (archivar lineas)
│   ├── produccion.js       # GET (produccion diaria agregada con clientes, incluye recogidos)
│   └── productos.js        # GET (catalogo de productos desde Notion)
├── src/
│   ├── App.jsx             # Componente principal (toda la UI, ~2100 lineas)
│   └── api.js              # Cliente API frontend (wrapper fetch)
├── main.jsx                # Entry point React
├── index.html
├── vite.config.js
├── vercel.json             # Rewrites: /api/* → serverless, /* → SPA
├── .env.local              # NOTION_TOKEN (gitignored)
└── package.json
```

## API Endpoints

### GET /api/pedidos
- Query params: `filter=todos|pendientes|recogidos`, `fecha=YYYY-MM-DD`, `clienteId=<notion_page_id>`
- Filtra por fecha a nivel de Notion (on_or_after + before nextDay)
- Resuelve nombres de clientes via `pages.retrieve` en la relacion Clientes
- Resuelve telefono via rollup
- Paginacion automatica via cursor
- Devuelve: `[{ id, titulo, fecha, recogido, noAcude, pagado, incidencia, notas, numPedido, cliente, telefono, clienteId }]`

### POST /api/pedidos
- Body: `{ properties: { ... } }` — propiedades Notion del pedido
- Devuelve `{ id }` del pedido creado

### PATCH /api/pedidos/:id
- Body: `{ properties: { ... }, archived?: boolean }` — propiedades a actualizar o archivar
- Usado para toggle recogido, no acude, cambiar fecha, cancelar pedido (archived)

### GET /api/clientes
- Query params: `q=<search_term>` — busca clientes por nombre, telefono o email (filtro `or`)
- Devuelve: `[{ id, nombre, telefono, email }]`

### POST /api/clientes
- Body: `{ nombre, telefono? }`
- Busca cliente por nombre exacto. Si no existe, lo crea
- Devuelve `{ id, created: boolean }`

### GET /api/registros
- Query params: `pedidoId=<notion_page_id>` — productos de un pedido: `[{ id, nombre, unidades }]`
- Query params: `orphans=true` — registros sin pedido asociado: `{ orphanIds: [string], count: number }`

### POST /api/registros
- Body: `{ pedidoPageId, productoNombre, cantidad }`
- Busca producto por nombre en BD Productos y crea registro vinculado al pedido

### DELETE /api/registros
- Body: `{ registroIds: [string] }`
- Archiva los registros (lineas de pedido) especificados en Notion
- Usado para modificar pedidos: se borran los registros existentes y se recrean con los nuevos datos

### GET /api/produccion
- Query params: `fecha=YYYY-MM-DD`
- Filtra pedidos del dia (incluye recogidos, excluye no-acude), consulta registros asociados
- Agrega productos con cantidades totales. Incluye flag `recogido` por pedido para discriminar en frontend
- Resuelve nombres de clientes
- Devuelve: `{ productos: [{ nombre, totalUnidades, pedidos: [...] }] }`

### GET /api/productos
- Sin parametros
- Consulta la BD Productos de Notion con paginacion automatica (cursor)
- Excluye productos sin nombre o sin precio
- Devuelve array ordenado alfabeticamente: `[{ nombre, precio, cat }]`

## Bases de Datos Notion

La app utiliza 4 bases de datos dentro de la pagina "Gestiona Tu Obrador":

| BD | ID | Uso |
|----|-----|-----|
| Pedidos | `1c418b3a-38b1-81a1-9f3c-da137557fcf6` | Pedidos de clientes |
| Clientes | `1c418b3a-38b1-811f-b3ab-ea7a5e513ace` | Datos de clientes |
| Productos | `1c418b3a-38b1-8186-8da9-cfa6c2f0fcd2` | Catalogo de productos |
| Registros | `1d418b3a-38b1-808b-9afb-c45193c1270b` | Lineas de pedido (producto + cantidad) |

Integracion: **Frontend Vynia** (debe tener acceso a cada BD individualmente).

## Desarrollo local

```bash
npm install

# Con API real (necesita NOTION_TOKEN en .env.local)
vercel dev

# Solo frontend (modo DEMO funciona sin API)
npx vite
```

## Variables de entorno

| Variable | Descripcion |
|----------|-------------|
| `NOTION_TOKEN` | Token de la integracion "Frontend Vynia" en Notion |

Se configura en `.env.local` para desarrollo local y en el dashboard de Vercel para produccion.

## Modos

- **LIVE** — Conecta a Notion API real (por defecto si API disponible)
- **DEMO** — Datos locales hardcodeados para testing sin API. Se activa con toggle en header o automaticamente si falla la API

## UI / UX

- **Palette**: Vynia brand — primario `#4F6867`, secundario `#1B1C39`, accent `#E1F2FC`, bg `#EFE9E4`, muted `#A2C2D0`
- **Fuentes**: Roboto Condensed (titulos/numeros), Inter (texto)
- **Responsive**: Mobile-first con breakpoints JS (desktop >=1024px 3 columnas, tablet >=768px 2 columnas, mobile 1 columna). Max-width 1400px desktop / 960px tablet-mobile
- **Tooltips**: Hover (desktop) + long-press ~0.4s (movil) con popup animado
- **Print**: CSS @media print para imprimir lista de pedidos/produccion
- **Bottom nav**: 3 tabs fijas (Pedidos, Nuevo, Produccion) con safe-area-inset-bottom

## Deploy

- Vercel project: `vynia-mngmnt`
- Git integration: push a `main` autodeploya
- Repo: `github.com/javintnvn/Vynia-MNGMNT`

## Notas tecnicas

- `@notionhq/client` debe ser v2.x (v5.x elimino `databases.query`, NO actualizar)
- El campo `"Unidades "` en Registros tiene un espacio trailing — respetar siempre
- El campo `"Nombre"` (title) en Registros contiene solo `" "` — usar `"AUX Producto Texto"` (formula) para el nombre real del producto
- `"N Pedido"` es tipo `unique_id`, acceder via `.unique_id.number`
- El telefono del cliente viene de un rollup en Pedidos: `p["Telefono"]?.rollup?.array[0]?.phone_number`
- El nombre del cliente viene del rollup `"AUX Nombre Cliente"` en Pedidos: `p["AUX Nombre Cliente"]?.rollup?.array[0]?.title[0]?.plain_text` — elimina la necesidad de llamadas extra `pages.retrieve`
- Toda la UI esta en un solo componente `App.jsx` — no hay componentes separados
- El catalogo de productos se carga dinamicamente desde Notion via `GET /api/productos`. En App.jsx existe `CATALOGO_FALLBACK` (69 productos) como respaldo para modo DEMO o si falla la API
- Notion es la source of truth para productos y precios: si se crea o modifica un producto en Notion, la app lo refleja sin intervencion
- Todos los endpoints importan `notion` desde `_notion.js` — modulo compartido que centraliza el client de Notion con retry automatico
- `_notion.js` usa Proxy JS para interceptar todas las llamadas `notion.*.method()` y envolver con retry (backoff exponencial: 1s → 2s → 4s + jitter random, max 3 reintentos) en errores 429, 502, 503
- `cached(key, ttlMs, fn)` — cache server-side en Map a nivel de modulo, persiste en instancias warm de Vercel (independiente por funcion serverless)
- `delay(ms)` — pausa entre operaciones secuenciales de escritura para evitar rafagas que disparen rate limits
- El importe de cada pedido se calcula en frontend: se cargan registros en background por lotes de 5, se cruzan nombres de productos con PRICE_MAP (lookup case-insensitive con `toLowerCase().trim()`) y se suman `unidades * precio`
- Modificar pedido usa estrategia delete-all + recreate: archiva todos los registros existentes y crea nuevos
- Clasificacion Manana/Tarde: `esTarde(p)` detecta keyword "tarde" en notas, hora >= 17 en notas (regex), u hora >= 17 en Fecha entrega
- Responsive usa hook `useBreakpoint()` con breakpoints JS (no CSS media queries) para mantener coherencia con inline styles
- Callbacks como `loadPedidos(fechaParam)` NO deben pasarse directamente a `onClick` — usar `onClick={() => loadPedidos()}` para evitar que el evento se interprete como argumento
- Version y fecha de build se inyectan en compile time via `vite.config.js` `define`: `__APP_VERSION__` (de package.json) y `__APP_BUILD_DATE__` (ISO timestamp del build). Se actualizan automaticamente en cada deploy

## Performance

- **Memoizacion**: `useMemo` en pedidosFiltrados, stats (single-pass), groups, productosFiltrados, prodView
- **PRICE_MAP**: Lookup de precios a nivel de modulo, se reconstruye dinamicamente al cargar productos de Notion
- **Batch importe**: Un solo `setPedidos` tras todos los batches (en vez de uno por batch)
- **esTarde cache**: Resultados cacheados en Set por grupo de fecha (evita 3x llamadas por pedido)
- **API dedup**: Requests GET en vuelo deduplicados (evita duplicados por clicks rapidos)
- **API cache**: Cache en memoria con TTL 30s para GETs (evita re-fetch al cambiar tabs)
- **Vendor chunk**: React separado en chunk independiente (cacheable por separado)
- **Font optimization**: Solo pesos usados (400-800), preconnect hints
- **Static assets**: Cache-Control immutable para assets hasheados en Vercel
- **Retry automatico**: Proxy en `_notion.js` reintenta 429/502/503 con backoff exponencial (transparente para endpoints)
- **Cache servidor**: `productos` 5min, `produccion` 30s (Map en instancia warm Vercel, independiente por funcion serverless)
- **Rollup cliente**: nombre del cliente via rollup `"AUX Nombre Cliente"` en Notion — elimina N+1 queries `pages.retrieve` (0 API calls extra vs N antes)
- **Batch delete registros**: archivado en lotes de 3 en paralelo con 200ms entre lotes (vs secuencial con 300ms antes)
- **Enrich cap**: enriquecimiento de importes limitado a 50 pedidos (evita cientos de API calls al cargar "Todos")
- **Write throttling**: 300ms entre archives en DELETE registros, 200ms entre batches de queries paralelas en pedidos/produccion
