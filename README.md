# Gestor de Proyectos (estilo Monday.com) — versión en la nube

MVP funcional de una plataforma de gestión de proyectos y tareas, con base de datos real compartida: varias personas pueden conectarse por internet y ver/editar la misma información (a diferencia de la versión estática, que guarda todo solo en el navegador de cada quien).

## Actualizar un despliegue que ya tiene datos

Si ya tienes esta app funcionando en Vercel con usuarios y proyectos reales, puedes subir esta versión actualizada sin perder nada: los cambios de base de datos de esta versión son **aditivos** (agregan columnas nuevas a `User` para el perfil/personalización, y la tabla nueva de mensajes de chat), nunca borran ni modifican las tablas existentes. Simplemente sube estos archivos a tu mismo repositorio de GitHub (sobrescribiendo los anteriores) y Vercel va a redesplegar solo.

## Novedades de esta versión (permisos y edición)

- **Menciones**: ahora se marcan como leídas automáticamente al ver el mensaje (ya no hace falta responder); dejan de aparecer como pendientes y de notificar apenas las ves.
- **Bandeja de entrada**: tanto quien envió como quien recibió un requerimiento puede eliminarlo, desde la lista o desde el detalle.
- **Usuarios**: cualquier administrador (no solo uno en particular) puede editar el nombre, correo y contraseña de cualquier usuario desde `/users`.
- **Proyectos**: cualquier administrador puede editar los datos del proyecto, agregar miembros y ahora también **quitar miembros** (antes solo se podía agregar).
- **Chat**: cualquier integrante de una conversación (1 a 1 o grupo) puede eliminarla, no solo quien la creó.
- **Chat**: se puede **editar un mensaje de texto después de enviarlo** (por si hay un error de tipeo); queda marcado como "(editado)" para que sea transparente para el resto.
- **Bandeja de entrada**: se corrigió un error por el que el contador de "no leídos" del menú de arriba no bajaba al leer un requerimiento (quedaba pegado); ahora baja de inmediato.
- **Tableros de proyecto configurables**: al crear un proyecto ahora eliges el **"Modo del tablero"**: "Tareas" (las columnas de siempre: Por hacer / En progreso / En revisión / Terminado) o "Administrativo" (Prospectos / Diseño / Presupuesto / Ejecución / Liquidación / Pos venta). El tablero Kanban, el menú de "Estado" de cada tarea y el informe del proyecto se ajustan solos según el modo elegido. El modo se define al crear el proyecto y no se puede cambiar después (para no dejar tareas con un estado que ya no existe en el tablero).

## Calendario personal y citas (nuevo)

Cada usuario tiene ahora un **Calendario** (nuevo enlace "Calendario" en el menú de arriba, con contador de citas pendientes por responder), con una **vista de mes tipo Google Calendar**: navegas entre meses con ‹ ›, un botón "Hoy", y cada día muestra sus citas como etiquetas de colores (ámbar = pendiente, azul = aceptada, roja tachada = rechazada). Al hacer clic en un día se abre el detalle a la derecha, con el listado completo de esa fecha y el botón "+ Agendar" para crear una cita justo ahí.

- **Cualquier persona del equipo puede agendarle una cita a cualquier otra** (no hace falta ser administrador): eliges "Ver calendario de" la persona, revisas su disponibilidad en el mes, y agendas con "+ Nueva cita" o "+ Agendar" en un día puntual.
- Si la cita es para ti mismo, queda **aceptada** al instante. Si es para otra persona, le queda **pendiente**: le llega un aviso a su bandeja de entrada y la ve en su Calendario (arriba de todo, en la sección "Pendientes de responder", además de en el día correspondiente) con botones **Aceptar** / **Rechazar**.
- Una cita pendiente que se acepta pasa a "Aceptada" automáticamente; no hace falta ningún paso extra para que quede agendada.
- Cualquiera puede eliminar una cita propia; quien la creó (si se la agendó a otra persona) y cualquier administrador también pueden eliminarla.

Como cualquier persona puede ver el calendario de cualquier otra (para poder coordinarse y agendar), ten en cuenta que los títulos y descripciones de las citas no son privados dentro del equipo — si más adelante quieres restringir esto (por ejemplo, que solo los administradores puedan ver calendarios ajenos), avísame y lo ajusto.

No hace falta ninguna acción manual además de subir esta versión: la tabla nueva (`CalendarEvent`) se crea sola en la base de datos la primera vez que Vercel construye el proyecto, igual que las actualizaciones anteriores.

## Tareas: "Realizada" en vez de vencida (nuevo)

Antes, una tarea marcada como terminada podía seguir mostrando la fecha límite en rojo como si estuviera vencida. Ahora, apenas una tarea llega a su columna final ("Terminado" en modo Tareas, o "Pos venta" en modo Administrativo), tanto en el tablero Kanban como en los informes se muestra **"✅ Realizada"** en vez de la fecha. También se agregó un aviso de **"Próxima a vencer"** (en ámbar) para tareas sin terminar cuya fecha límite es en los próximos 3 días, además del aviso de "Vencida" (en rojo) que ya existía para las que ya pasaron su fecha.

## Instalarla como app en el celular (iOS y Android)

La app ahora es una **PWA** (Progressive Web App): se puede "instalar" desde el navegador del celular, queda con ícono en la pantalla de inicio y se abre a pantalla completa, sin la barra del navegador — se siente como una app normal. No requiere pasar por App Store ni Google Play, es gratis y funciona igual en iPhone y Android. Como con cualquier otra actualización: primero subes este código a tu repositorio de GitHub (reemplazando los archivos anteriores) y Vercel redespliega solo; recién ahí la app queda instalable en la URL de producción.

**Ahora hay un botón "📲 Instalar app" arriba a la derecha, junto a "🔔 Activar avisos"** (con sesión iniciada):

- **En Android (Chrome/Edge)**: al tocar el botón, el propio navegador abre el cuadro de diálogo de instalación — confirmas y listo, queda el ícono en el cajón de aplicaciones.
- **En iPhone/iPad**: Safari no permite que una web dispare ese diálogo por código (es una limitación de Apple, no de la app), así que el botón abre un mini instructivo: tocar el botón de compartir de Safari → "Agregar a inicio". Tiene que ser desde Safari, no desde Chrome.
- El botón se oculta solo una vez que la app ya está instalada.

El ícono que se usa es el logo personalizado de `/settings` si ya subiste uno; si no, usa un ícono genérico incluido en `public/icons/`. El nombre que aparece bajo el ícono también sigue al nombre de la app configurado en `/settings`.

**El menú de arriba ahora es responsive**: en el celular ya no aparecen todos los enlaces amontonados en una sola fila (eso hacía que la app se sintiera apretada e incómoda) — ahora hay un botón de menú (☰) que despliega los enlaces uno debajo del otro, con botones grandes y fáciles de tocar. En pantallas más grandes se ve igual que antes, todo en una fila.

Se agregó además un **service worker** (`public/sw.js`, no guarda nada en caché, solo deja pasar las peticiones a internet tal cual) — es un requisito técnico de Android/Chrome para que la instalación sea "de verdad" (ícono propio, pantalla completa) en vez de un simple acceso directo que abre el navegador con la barra de direcciones visible.

**Importante si ya habías agregado el ícono antes de esta actualización**: en el celular, borra ese ícono viejo de la pantalla de inicio (mantén presionado → Eliminar) y vuelve a agregarlo después de subir esta versión a GitHub y que Vercel redespliegue — si no, puede seguir comportándose como el acceso directo anterior porque quedó guardado con la versión vieja del sitio.

**Diferencia con una app "de verdad" en las tiendas**: esta instalación (PWA) no pasa por App Store ni Google Play, así que no hay que pagar cuentas de desarrollador ni esperar revisión — se instala directo desde el navegador con el botón de arriba. Si en el futuro quieres una publicación real en las tiendas, es un proyecto aparte (usando algo como Capacitor) que sí requiere cuenta de desarrollador de Apple (US$99/año), cuenta de Google Play (US$25 pago único) y compilar la parte de iOS desde una Mac.

**Botón "🔄" junto al nombre de la app**: recarga la página trayendo la versión más nueva del sitio. Es útil sobre todo en la app instalada del celular, que al no tener barra de navegador no tiene un botón de recargar propio — así que si después de actualizar y redesplegar en Vercel una función nueva no aparece, lo primero es tocar este botón (o cerrar y volver a abrir la app).

## Informe por profesional (nuevo)

En `/reports` ahora hay dos pestañas: **"Por proyecto"** (la de siempre) y **"Por profesional"** (nueva). En esta última eliges a una persona del equipo y ves: en cuántos proyectos está trabajando y cuáles son, cuántas tareas tiene asignadas en total (con el detalle de cada una: proyecto, estado, prioridad, fecha límite), cuántas ya terminó, y cuántas tiene vencidas. También se puede exportar a CSV o imprimir, igual que el informe por proyecto. No hace falta ningún cambio de base de datos para esto — usa la misma información que ya existía, solo la agrupa distinto.

## Referentes investigados

Se revisaron plataformas similares antes de diseñar el modelo de datos: **Monday.com**, **Asana**, **ClickUp**, **Trello**, **Wrike** y alternativas open source como **OpenProject**, **Leantime** y **Freedcamp**. De ahí se tomaron los conceptos base: tableros por proyecto con columnas de estado (Kanban), tarjetas de tarea con responsable/prioridad/fecha límite, y archivos adjuntos por tarea. La bandeja de entrada tipo correo (para "requerimientos" con trazabilidad de respuestas) es un añadido específico de este proyecto, inspirado en el sistema de tickets de herramientas de soporte.

## Archivos pesados: necesitas activar Vercel Blob (paso nuevo, una sola vez)

Los archivos adjuntos de tareas y del chat ahora se suben directo del navegador a **Vercel Blob** (almacenamiento de archivos de Vercel), en vez de pasar por la base de datos. Esto es necesario porque Vercel limita a ~4.5MB lo que puede recibir una función serverless — por eso antes fallaban los archivos pesados, sin importar el código.

Antes de volver a desplegar esta versión, activa Vercel Blob en tu proyecto (una sola vez):

1. En tu proyecto de Vercel, ve a la pestaña **"Storage"**.
2. Haz clic en **"Create Database"** → elige **"Blob"**.
3. Ponle un nombre (por ejemplo "archivos"), y cuando te pregunte por el nivel de acceso elige **"Public"** (no "Private" — el código necesita URLs públicas para poder mostrar/descargar los archivos). Confirma la creación.
4. **Verifica que quedó la variable `BLOB_READ_WRITE_TOKEN`**: ve a Settings → Environments → Production (sección "Environment Variables"). A veces Vercel solo agrega `BLOB_STORE_ID` y no esta — si falta, entra a tu store de Blob → pestaña **".env.local"** → "Show secret" → copia el valor de `BLOB_READ_WRITE_TOKEN` → agrégalo tú mismo como variable de entorno (Production y Preview).
5. Sube el código de esta versión a GitHub como siempre, y haz un **Redeploy** del despliegue más reciente para que tome la variable.

Los archivos que ya habías subido antes (guardados en la base de datos) siguen funcionando exactamente igual — no se pierden ni hay que volver a subirlos.

## Funcionalidades incluidas

- **Configuración de marca** (`/settings`, solo administradores): cambia el nombre de la aplicación (reemplaza "Gestor de Proyectos" en la barra superior, el título de la pestaña y las pantallas de login/registro), sube un logo y una imagen/portada. Se aplica al instante para todo el equipo.

- Autenticación propia (registro, login, logout) con contraseña cifrada y sesión por JWT en cookie httpOnly. El primer usuario registrado queda como administrador; todos los siguientes necesitan un **código de invitación**.
- Proyectos (tableros) con miembros que se agregan seleccionándolos de una lista (ya no hace falta escribir el email). El dueño del proyecto **o cualquier administrador** puede editar el nombre y la descripción, agregar miembros y quitarlos. Al crear el proyecto se elige el **modo del tablero**: "Tareas" (Por hacer / En progreso / En revisión / Terminado) o "Administrativo" (Prospectos / Diseño / Presupuesto / Ejecución / Liquidación / Pos venta) — ver la sección de novedades más arriba.
- Tareas con título, descripción, estado (según el modo del tablero del proyecto), prioridad, responsable y fecha límite. Al asignar (o reasignar) una tarea, la persona recibe automáticamente un aviso en su bandeja de entrada.
- Tablero Kanban con arrastrar y soltar para cambiar el estado de una tarea.
- Subida y descarga de archivos adjuntos por tarea, **puedes seleccionar varios archivos a la vez** y nunca se borran los que ya estaban al agregar uno nuevo. Los archivos se suben directo a Vercel Blob, con subida por partes para que archivos grandes (hasta 500MB cada uno) sean confiables — ver la sección de arriba sobre activar Vercel Blob.
- Bandeja de entrada por usuario: cualquier miembro puede enviar un "requerimiento" a otro (como un correo, con asunto y mensaje), con hilo de respuestas y estado (Abierto / En progreso / Cerrado) para trazabilidad completa. Tanto quien lo envió como quien lo recibió puede eliminarlo si ya no hace falta.
- **Gestión de usuarios** (solo administradores): crear, eliminar y **editar** (nombre, correo, contraseña, rol) cuentas del equipo desde `/users`. Cualquier administrador puede hacerlo, no solo quien creó la cuenta.
- **Códigos de invitación** (solo administradores, también desde `/users`): generas un código de un solo uso (con rol miembro o administrador) y se lo compartes a quien quieras sumar; sin código válido no se puede crear una cuenta nueva.
- **Informes** (`/reports`): resumen de tareas por estado, tareas vencidas, tabla detallada por proyecto y exportación a CSV / impresión.
- **Perfil** (`/profile`): cada usuario edita su nombre, descripción/bio, sube su foto de perfil, cambia su contraseña, y personaliza el fondo de su propia pantalla (color o imagen) — esto último es privado, solo lo ve quien lo configura.
- **Chat entre usuarios** (`/chat`): mensajería directa (1 a 1) y **grupal** entre personas registradas, con texto, imágenes, notas de voz (se graban desde el navegador) y archivos adjuntos. Muestra quién está **en línea** (punto verde) según la última vez que esa persona tuvo la app abierta. Se actualiza automáticamente cada pocos segundos, con contador de mensajes sin leer por conversación. Cualquier integrante puede **editar un mensaje de texto propio** después de enviarlo (queda marcado "(editado)"), y cualquier integrante puede **eliminar la conversación completa** (1 a 1 o grupo) para todos.
- **Hilos de conversación**: cualquier mensaje del chat se puede responder en un hilo aparte (como en Slack), sin llenar el canal principal. El botón "💬 Responder en hilo" bajo cada mensaje abre un panel con esas respuestas; si ya tiene respuestas, muestra el contador. También se puede editar un mensaje propio desde dentro del hilo.
- **Gestión de grupos**: desde el botón "Miembros" en el encabezado de un grupo se puede agregar gente nueva, quitar miembros (solo quien creó el grupo), salir del grupo, o eliminarlo por completo (cualquier integrante del grupo puede hacerlo).
- **Menciones con @**: al escribir "@" dentro de un grupo aparece un menú para elegir a la persona; su nombre queda resaltado en el mensaje para todos. Ver el canal o el hilo donde te mencionaron ya cuenta como "leída" la mención automáticamente, sin necesidad de responder.
- **Panel de menciones**: el botón "🔔 Menciones" en la barra lateral del chat muestra quién te mencionó y en qué conversación, con un punto que indica si ya la viste o sigue sin leer; un clic te lleva directo a ese mensaje.
- **Buscador de palabras clave en el chat**: campo de búsqueda en la barra lateral que busca en todos tus mensajes (de canal y de hilos), en todas tus conversaciones; al hacer clic en un resultado te lleva directo a ese mensaje.
- **Notificaciones**: la Bandeja de entrada y el Chat muestran un contador de pendientes directamente en el menú de arriba. Si el usuario activa los avisos del navegador ("🔔 Activar avisos"), también recibe una notificación emergente cuando llega algo nuevo mientras tiene la app abierta en otra pestaña o minimizada.
- **Permisos revisados**: cada usuario solo puede ver los proyectos, tareas, archivos, requerimientos y conversaciones de chat donde está agregado — se hizo una revisión completa de todas las rutas para confirmarlo (y se corrigió una que faltaba: la lista de adjuntos de una tarea).

## Stack técnico

- **Next.js 14** (App Router) + **TypeScript** — frontend y backend (API routes) en un solo proyecto, desplegado en **Vercel**.
- **Prisma ORM** + **PostgreSQL** — pensado para una base de datos gratuita en la nube (Neon o Supabase), así todos los usuarios comparten los mismos datos sin importar desde dónde se conecten.
- **Tailwind CSS** para estilos.
- Autenticación propia con **bcryptjs** (hash de contraseñas) y **jose** (JWT, compatible con el middleware de Next.js).
- Los archivos adjuntos se guardan como bytes directamente en la base de datos (no en disco), porque en Vercel (y la mayoría de plataformas serverless) el sistema de archivos no es persistente entre peticiones.

## Estructura del proyecto

```
app/
  api/            # Endpoints backend (auth, users, projects, tasks, attachments, inbox)
  dashboard/      # Listado de proyectos
  projects/[id]/  # Tablero Kanban de un proyecto
  inbox/          # Bandeja de entrada tipo correo
  users/          # Gestión de usuarios (solo admin)
  reports/        # Informes por proyecto
  login/ register/
components/       # KanbanBoard, TaskCard, TaskModal, Navbar
lib/              # prisma client, auth (JWT/hash), sesión, tipos, selects reutilizables
prisma/
  schema.prisma   # Modelo de datos
  seed.ts         # Datos de prueba (solo para uso local)
```

## Modelo de datos (resumen)

- `User` (nombre, email, contraseña, rol admin/miembro)
- `Project` (dueño, miembros vía `ProjectMember`)
- `Task` (proyecto, responsable, creador, estado, prioridad, fecha límite)
- `Attachment` (archivo como bytes en la base de datos, vinculado a una tarea, quién lo subió)
- `Ticket` + `TicketReply` (requerimiento tipo correo, remitente, destinatario, estado, hilo de respuestas)

Todas las entidades tienen `createdAt`/`updatedAt` para trazabilidad. Si se elimina un usuario, sus referencias (creador de una tarea, remitente de un ticket, etc.) quedan como "Usuario eliminado" en vez de borrar el historial.

## Desplegar en la nube (recomendado — así varias personas comparten los mismos datos)

Consulta la guía paso a paso `guia-despliegue-nube.md` incluida junto a este proyecto: cubre crear una base de datos Postgres gratis (Neon), subir el código a GitHub, desplegarlo en Vercel con variables de entorno, y probarlo con varios usuarios reales.

Resumen rápido:

1. Crea una base de datos Postgres gratuita en [neon.tech](https://neon.tech) y copia el connection string.
2. Sube este código a un repositorio de GitHub.
3. Importa el repositorio en [vercel.com](https://vercel.com).
4. En "Environment Variables" agrega `DATABASE_URL` (el connection string de Neon) y `JWT_SECRET` (una cadena larga y aleatoria).
5. Despliega. El comando de build (`npm run build`) ya incluye `prisma db push`, así que las tablas se crean solas en la base de datos la primera vez.
6. Entra a la URL que te da Vercel, regístrate (el primer usuario queda como administrador) y desde `/users` agrega al resto del equipo.

## Cómo correrlo en tu computadora (opcional, para seguir desarrollando)

Requisitos: Node.js 18+ y una base de datos Postgres (puedes usar la misma de Neon, o crear un segundo proyecto gratis ahí para "desarrollo").

```bash
npm install
cp .env.example .env      # pega tu DATABASE_URL de Postgres y define JWT_SECRET
npx prisma db push        # crea las tablas
npm run seed               # opcional: crea usuarios y datos de prueba
npm run dev
```

Abre `http://localhost:3000`. Si ejecutaste el seed, puedes entrar con:

- `admin@empresa.com` / `password123` (administrador)
- `ana@empresa.com` / `password123`
- `luis@empresa.com` / `password123`

O simplemente regístrate desde `/register` (el primer usuario registrado será administrador).

## Cómo subirlo a GitHub

```bash
cd gestor-proyectos   # o el nombre que le des a la carpeta
git init
git add .
git commit -m "Primer commit: MVP gestor de proyectos"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

`node_modules` y el archivo `.env` (que contiene tus claves) ya están excluidos vía `.gitignore` — nunca subas ese archivo a GitHub.

## Roadmap sugerido (siguientes pasos)

- Notificaciones (email o in-app) cuando se asigna una tarea o llega un requerimiento nuevo.
- Comentarios dentro de cada tarea (además de los adjuntos).
- Vista de calendario y vista de lista, además del Kanban.
- Roles y permisos más granulares por proyecto (no solo dueño/miembro).
- Búsqueda global de tareas y requerimientos.
- Tests automatizados (unitarios de las rutas API y end-to-end del flujo principal).

## Limitaciones conocidas del MVP

- Los archivos adjuntos están pensados para tamaños moderados (máx. 5MB c/u); las bases gratuitas de Neon/Supabase tienen un límite total de almacenamiento (0.5GB aprox.), así que en un uso intensivo con muchos archivos conviene migrar a almacenamiento externo (S3, R2, Supabase Storage) más adelante.
- No hay recuperación de contraseña por email todavía.
- El drag-and-drop del Kanban usa la API nativa del navegador (sin librería externa), funciona bien en escritorio pero no está optimizado para móvil.
- `prisma db push` (usado en el build automático) sincroniza el esquema directamente; para un equipo grande con cambios de esquema frecuentes, conviene migrar más adelante a `prisma migrate` con historial de migraciones.
- El chat se actualiza revisando cada 3-5 segundos (no es una conexión en vivo tipo WhatsApp/Slack); para un chat instantáneo real habría que sumar un servicio de tiempo real (Pusher, Ably, Supabase Realtime), lo cual implica otra cuenta/configuración externa.
- El estado "en línea" se calcula por el mismo mecanismo (la app avisa cada 30 segundos mientras está abierta); si alguien cierra la pestaña sin avisar, puede tardar hasta ~90 segundos en aparecer como desconectado.
- Los grupos de chat todavía no tienen opción de cambiar el nombre después de creados (sí se puede agregar/quitar miembros y eliminar el grupo).
- Mencionar a alguien con @ resalta su nombre en el mensaje, pero por ahora no le dispara una notificación aparte en su bandeja de entrada (queda como posible mejora futura).
- Las notificaciones del navegador solo funcionan mientras la pestaña de la app sigue abierta (aunque esté minimizada o en segundo plano); si se cierra la pestaña por completo no llegan avisos, ya que eso requeriría configurar notificaciones push reales (con su propio servicio externo).
- Los mensajes de audio del chat usan la grabación nativa del navegador; funciona bien en Chrome/Edge/Firefox. En Safari/iOS el soporte de grabación de audio puede ser más limitado según la versión.
- El logo, la imagen de portada y el fondo personalizado de perfil siguen subiéndose directo a la base de datos (no a Vercel Blob), con un máximo de 2-3MB — es de sobra para ese tipo de imágenes chicas y evita complicar esa parte.
- La imagen de fondo personalizada del perfil es privada (solo la ve quien la configuró); no se comparte con el resto del equipo.
