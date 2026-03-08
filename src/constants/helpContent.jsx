import I from "../components/Icons.jsx";

// ─── HELP CONTENT ───
const HELP_CONTENT = [
  {
    id: "pedidos", title: "Pedidos", icon: <I.Clipboard s={20} />,
    sections: [
      {
        title: "Filtrar pedidos",
        content: "Usa las pills de la parte superior para filtrar por estado: Total, Pendientes o Recogidos.",
        steps: ["Selecciona una fecha con los botones Hoy / Mañana / Pasado o el calendario", "Combina filtros de estado y fecha para encontrar pedidos concretos"],
        tip: "Las pills muestran el recuento de pedidos en cada estado",
      },
      {
        title: "Buscar clientes",
        content: "La barra de busqueda permite encontrar clientes por nombre, telefono o email.",
        steps: ["Escribe al menos 2 caracteres para iniciar la busqueda", "Pulsa en un resultado para abrir la ficha del cliente"],
      },
      {
        title: "Estados de pedidos",
        content: "Cada pedido pasa por un pipeline de estados con codigo de color.",
        steps: [
          "Sin empezar (gris) — pedido recibido",
          "En preparacion (azul) — en el obrador",
          "Listo para recoger (naranja) — terminado",
          "Recogido (verde) — entregado al cliente",
        ],
        tip: "Tambien existen los estados No acude (rojo) e Incidencia (marron) para situaciones especiales",
      },
      {
        title: "Avanzar estado (pipeline)",
        content: "Cada tarjeta tiene un boton de 1-tap que avanza al siguiente estado del pipeline.",
        steps: ["Pulsa el boton con el nombre del siguiente estado", "Confirma el cambio en el dialogo que aparece"],
        tip: "El pipeline sigue el orden: Sin empezar → En preparacion → Listo para recoger → Recogido",
      },
      {
        title: "Cambiar estado manualmente",
        content: "El boton ··· abre un selector con todos los estados posibles.",
        steps: ["Pulsa ··· en la tarjeta del pedido", "Selecciona el estado deseado", "Confirma el cambio"],
      },
      {
        title: "Seleccion multiple (bulk)",
        content: "Permite cambiar el estado de varios pedidos a la vez.",
        steps: ["Pulsa Seleccionar en la barra de filtros", "Marca los pedidos que quieras", "Usa la barra flotante inferior para elegir el nuevo estado"],
        tip: "Solo se muestran los estados comunes a todos los pedidos seleccionados",
      },
      {
        title: "Detalle del pedido",
        content: "Pulsa en una tarjeta para abrir el modal de detalle con toda la informacion.",
        steps: ["Edita las notas pulsando en el area de texto", "Cambia la fecha de entrega pulsando en la fecha", "Modifica los productos con el boton Modificar productos", "Marca o desmarca como pagado pulsando el badge €/PAGADO"],
      },
      {
        title: "Ficha de cliente",
        content: "Al buscar un cliente y seleccionarlo, se abre su ficha con historial de pedidos.",
        steps: ["Pulsa el icono de edicion para modificar nombre, telefono o email", "Pulsa el enlace externo para abrir la ficha en Notion"],
      },
      {
        title: "Telefono y WhatsApp",
        content: "Pulsa el numero de telefono de un pedido para ver opciones de contacto.",
        steps: ["Llamar abre el marcador del telefono", "WhatsApp abre una conversacion directa"],
        tip: "Al marcar un pedido como Listo para recoger, se ofrece enviar un aviso automatico por WhatsApp",
      },
      {
        title: "Toggle de datos sensibles",
        content: "El toggle 'Ver/Ocultar datos' junto a la barra de busqueda muestra u oculta los importes y numeros de telefono en las tarjetas y modales.",
        tip: "Los datos estan ocultos por defecto para proteger la privacidad de los clientes",
      },
      {
        title: "Marcar como pagado",
        content: "Cada tarjeta tiene un boton € Pago / Pagado en la zona de acciones (junto al pipeline y al picker de estado). Tambien puedes cambiarlo desde el modal de detalle y la vista de Produccion.",
        steps: ["Pulsa el boton € Pago para marcar como pagado, o Pagado para desmarcar", "Confirma el cambio en el dialogo que aparece", "El cambio se guarda en Notion automaticamente"],
        tip: "El badge PAGADO en el nombre del pedido es solo informativo — usa el boton de la zona de acciones para cambiar el estado de pago",
      },
      {
        title: "Imprimir",
        content: "El boton de impresora en la cabecera imprime la lista de pedidos filtrada actual.",
        tip: "La impresion usa un formato optimizado para A4",
      },
    ],
  },
  {
    id: "nuevo", title: "Nuevo Pedido", icon: <I.Plus s={20} />,
    sections: [
      {
        title: "Paso 1: Datos del Pedido",
        content: "El formulario se divide en dos pasos. En el primer paso seleccionarás todos los datos relativos al pedido en sí:",
        steps: [
          "Selecciona un cliente o escribe uno nuevo. Si no existe se creará en Notion.",
          "Agrega productos desde el buscador o lista de frecuentes, y ajusta las unidades.",
          "Añade notas si lo necesitas y marca si el cliente ya lo ha dejado pagado.",
        ],
        tip: "Necesitas al menos un cliente y un producto seleccionado para avanzar al paso 2",
      },
      {
        title: "Pegar pedido (importar de WhatsApp)",
        content: "El boton Pegar pedido permite importar pedidos directamente desde WhatsApp usando IA. Acepta texto, capturas de pantalla y dictado por voz.",
        steps: [
          "Pulsa el boton Pegar pedido debajo de los productos para abrir el modal de importacion",
          "Pega el texto del mensaje de WhatsApp en el area de texto, o arrastra/pega una captura de pantalla",
          "Para capturas: arrastra una imagen al area de drop, pega desde el portapapeles (Cmd+V / Ctrl+V) o selecciona un archivo",
          "Pulsa Analizar para que la IA extraiga los datos del pedido (cliente, productos, cantidades, fecha)",
        ],
        tip: "Si el telefono del remitente coincide con un cliente existente, se selecciona automaticamente. Si no existe, se marcara como NUEVO",
      },
      {
        title: "Dictado por voz",
        content: "El boton Dictar permite transcribir audio reproduciendo un mensaje de voz de WhatsApp cerca del microfono del dispositivo.",
        steps: [
          "Pulsa Dictar para abrir el visualizador de escucha a pantalla completa",
          "Reproduce el audio de WhatsApp cerca del microfono — la transcripcion aparece en tiempo real",
          "Pulsa Parar cuando termine el audio",
          "Revisa y edita el texto transcrito antes de pulsar Analizar",
        ],
        tip: "Requiere permiso de microfono y reconocimiento de voz en Chrome. En Safari el dictado no esta disponible",
      },
      {
        title: "Revisar resultado del analisis",
        content: "Tras analizar, el sistema muestra una preview con los datos extraidos y un badge de confianza (alta, media o baja).",
        steps: [
          "Revisa el cliente, productos y cantidades detectados",
          "Los productos reconocidos del catalogo aparecen marcados; los no reconocidos muestran un aviso",
          "Pulsa Aplicar para pre-rellenar el formulario con los datos extraidos",
          "Ajusta manualmente cualquier dato antes de continuar al paso 2",
        ],
        tip: "Puedes combinar texto e imagen en el mismo analisis para mayor precision",
      },
      {
        title: "Sugerencias inteligentes de fecha",
        content: "Al pasar al paso 2, el sistema analiza la produccion de los proximos 7 dias y sugiere las mejores fechas de entrega basandose en los productos del carrito.",
        steps: [
          "Las sugerencias aparecen como chips encima del selector de fecha",
          "Cada chip muestra el dia, los productos en comun con tu carrito y las unidades previstas",
          "Pulsa un chip para seleccionar esa fecha automaticamente",
          "Si no hay coincidencias de productos, no se muestran sugerencias",
        ],
        tip: "Las sugerencias priorizan dias donde ya se van a producir los mismos productos que has seleccionado, para optimizar la produccion del obrador",
      },
      {
        title: "Paso 2: Fecha de Entrega y Creacion",
        content: "En el segundo paso podras seleccionar exclusivamente la fecha y hora.",
        steps: [
          "Pulsa en Siguiente: Elegir fecha cuando termines con los productos.",
          "Revisa las sugerencias inteligentes de fecha si aparecen, o selecciona manualmente.",
          "Selecciona el dia con los atajos Hoy / Manana / Pasado o usa el calendario.",
          "Si te equivocas, usa el boton 'Volver a datos del pedido' para retroceder e introducir cambios.",
          "Pulsa Crear pedido para enviar todo."
        ],
        tip: "El pedido siempre se crea con estado Sin empezar.",
      },
    ],
  },
  {
    id: "produccion", title: "Produccion", icon: <I.Store s={20} />,
    sections: [
      {
        title: "Seleccionar fecha",
        content: "Elige el dia para ver la produccion agregada.",
        steps: ["Usa los botones Hoy / Mañana / Pasado o el calendario"],
      },
      {
        title: "Filtros: Pendiente vs Todo el dia",
        content: "Controla que pedidos se incluyen en el recuento.",
        steps: ["Pendiente — resta los pedidos ya Listo para recoger y Recogido", "Todo el dia — muestra la produccion total sin descontar"],
        tip: "Usa Pendiente para saber cuanto queda por preparar",
      },
      {
        title: "Barra de resumen",
        content: "Muestra el total de productos distintos y unidades pendientes.",
        steps: ["Pulsa Desplegar/Contraer para expandir o colapsar todos los productos a la vez"],
      },
      {
        title: "Productos y pedidos",
        content: "Cada producto muestra la cantidad total y los pedidos que lo contienen.",
        steps: ["Pulsa un producto para ver los pedidos asociados", "Pulsa un pedido para abrir su detalle completo"],
        tip: "El badge de cada producto muestra el total de unidades",
      },
      {
        title: "Planificar produccion",
        content: "Encima de los filtros hay un desplegable para introducir la carga de produccion del dia. El sistema compara tu plan con los pedidos existentes y calcula automaticamente cuantas unidades quedan disponibles para venta directa (excedente = plan − pedidos).",
        steps: [
          "Pulsa la barra verde Planificar produccion para abrir el desplegable",
          "El chevron del header indica el estado: abajo = cerrado, arriba = abierto",
          "Pulsa de nuevo el header para cerrar el desplegable en cualquier momento",
        ],
        tip: "Pulsa el boton circular con la i (ℹ) en el header para ver una explicacion detallada dentro de la propia seccion",
      },
      {
        title: "Anadir productos al plan",
        content: "Dentro del desplegable abierto puedes buscar productos del catalogo o usar los accesos rapidos.",
        steps: [
          "Escribe en el buscador para filtrar productos del catalogo",
          "Pulsa un resultado para anadirlo con cantidad 1",
          "Si no hay productos aun, aparecen pills de acceso rapido con los productos frecuentes",
          "Cuando ya hay productos, los accesos rapidos aparecen como pills pequenas debajo de la lista",
        ],
      },
      {
        title: "Ajustar cantidades",
        content: "Cada producto tiene un stepper (+/−) para modificar las unidades planificadas.",
        steps: [
          "Pulsa + para aumentar la cantidad planificada",
          "Pulsa − para reducir. Si llega a 0, el producto se elimina del plan",
          "El numero central muestra la cantidad actual con animacion",
          "Si el producto tiene pedidos, veras el texto X en pedidos debajo del nombre",
        ],
        tip: "Junto al stepper aparece un badge de excedente cuando hay pedidos para ese producto",
      },
      {
        title: "Interpretar los badges de excedente",
        content: "Cada producto con pedidos muestra un badge de color junto al stepper que indica la diferencia entre lo planificado y lo reservado.",
        steps: [
          "Badge verde (+N) — sobran N unidades para venta directa",
          "Badge rojo (−N) — faltan N unidades para cubrir los pedidos",
          "Badge gris (0) — la produccion cubre exactamente los pedidos, sin excedente",
        ],
        tip: "Ejemplo: si planificas 6 brownies y hay 3 en pedidos, el badge mostrara +3 en verde (3 disponibles para venta)",
      },
      {
        title: "Resumen con el desplegable cerrado",
        content: "Al cerrar el desplegable, el header muestra un resumen compacto con los totales del plan.",
        steps: [
          "El subtitulo del header muestra: X plan · Y pedidos · Z disp.",
          "Debajo del header se despliega la lista de productos con Plan, Pedidos y badge de excedente",
          "Pulsa en cualquier parte del header para volver a abrir y editar",
        ],
      },
      {
        title: "Persistencia de datos",
        content: "Los datos del plan se guardan automaticamente en tu navegador (localStorage) para cada dia.",
        steps: [
          "Cada dia tiene su propio plan independiente",
          "Los datos se mantienen al recargar la pagina o cerrar el navegador",
          "Los planes de mas de 7 dias se eliminan automaticamente para no acumular datos",
          "Al cambiar de fecha en el selector, se carga el plan correspondiente a ese dia",
        ],
        tip: "Los datos solo se guardan en tu navegador, no en Notion. Si cambias de dispositivo o borras datos del navegador, los planes se pierden",
      },
    ],
  },
  {
    id: "seguimiento", title: "Seguimiento", icon: <I.Phone s={20} />,
    sections: [
      {
        title: "Pagina publica para clientes",
        content: "Los clientes pueden consultar el estado de sus pedidos en la pagina de seguimiento.",
        steps: ["El cliente introduce su numero de telefono", "Se muestran sus pedidos con estado, fecha y productos", "La pagina es accesible en vynia-mngmnt.vercel.app/seguimiento"],
        tip: "No requiere login ni contrasena — solo el numero de telefono",
      },
      {
        title: "Incrustar en WordPress",
        content: "La pagina de seguimiento puede incrustarse en tu web de WordPress como iframe.",
        tip: "En modo iframe se ocultan automaticamente el logo y el fondo para integrarse con tu web",
      },
    ],
  },
  {
    id: "general", title: "General", icon: <I.Gear s={20} />,
    sections: [
      {
        title: "Modo Live vs Demo",
        content: "El boton LIVE/DEMO en la cabecera alterna entre datos reales y datos de prueba.",
        steps: ["LIVE — conectado a Notion (datos reales)", "DEMO — datos de ejemplo sin conexion"],
        tip: "El modo Demo se activa automaticamente si no hay conexion con la API",
      },
      {
        title: "Sincronizacion y recarga",
        content: "La app se sincroniza con Notion de varias formas.",
        steps: ["Automaticamente al volver a la pestaña del navegador", "Cada 60 segundos mientras la pestaña esta activa", "Manualmente con el boton de recarga en la cabecera"],
      },
      {
        title: "Version y changelog",
        content: "Pulsa el numero de version bajo el logo para ver las notas de la ultima actualizacion.",
      },
      {
        title: "Tooltips (ayuda rapida)",
        content: "Todos los botones tienen textos de ayuda.",
        steps: ["En escritorio: pasa el cursor por encima", "En movil: manten pulsado ~0.4 segundos"],
        tip: "El tooltip desaparece solo tras 1.5 segundos en movil",
      },
      {
        title: "Banner de actualizacion",
        content: "Cuando hay una nueva version desplegada, aparece un banner en la parte inferior.",
        steps: ["Pulsa Actualizar para recargar con la ultima version"],
      },
      {
        title: "Horario del negocio",
        content: "Configura los dias y horas de apertura de tu obrador para que las sugerencias de fecha de entrega sean mas precisas.",
        steps: [
          "Abre el menu hamburguesa y pulsa Horario del negocio",
          "Activa o desactiva cada dia de la semana con el toggle",
          "Para los dias abiertos, ajusta la hora de apertura y cierre. Si tu obrador tiene horario partido (manana y tarde), pulsa Anadir segundo tramo para configurar el segundo horario.",
          "Los cambios se guardan automaticamente y se sincronizan entre dispositivos",
          "Al crear un nuevo pedido, las sugerencias inteligentes de fecha excluiran automaticamente los dias cerrados",
        ],
        tip: "Si no configuras el horario, el sistema asume que abres todos los dias (comportamiento por defecto). Los dias marcados como cerrados se muestran tachados en el selector de fecha, pero puedes seleccionarlos manualmente si lo necesitas.",
      },
    ],
  },
];

export default HELP_CONTENT;
