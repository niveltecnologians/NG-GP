# Gestor de Proyectos (estilo Monday.com) — versión en la nube

MVP funcional de una plataforma de gestión de proyectos y tareas, con base de datos real compartida: varias personas pueden conectarse por internet y ver/editar la misma información (a diferencia de la versión estática, que guarda todo solo en el navegador de cada quien).

## Actualizar un despliegue que ya tiene datos

Si ya tienes esta app funcionando en Vercel con usuarios y proyectos reales, puedes subir esta versión actualizada sin perder nada: los cambios de base de datos de esta versión son **aditivos** (agregan columnas nuevas a `User` para el perfil/personalización, y la tabla nueva de mensajes de chat), nunca borran ni modifican las tablas existentes. Simplemente sube estos archivos a tu mismo repositorio de GitHub (sobrescribiendo los anteriores) y Vercel va a redesplegar solo.

## Referentes investigados

Se revisaron plataformas similares antes de diseñar el modelo de datos: **Monday.com**, **Asana**, **ClickUp**, **Trello**, **Wrike** y alternativas open source como **OpenProject**, **Leantime** y **Freedcamp**. De ahí se tomaron los conceptos base: tableros por proyecto con columnas de estado (Kanban), tarjetas de tarea con responsable/prioridad/fecha límite, y archivos adjuntos por tarea. La bandeja de entrada tipo correo (para "requerimientos" con trazabilidad de respuestas) es un añadido específico de este proyecto, inspirado en el sistema de tickets de herramientas de soporte.

## Funcionalidades incluidas

- **Configuración de marca** (`/settings`, solo administradores): cambia el nombre de la aplicación (reemplaza "Gestor de Proyectos" en la barra superior, el título de la pestaña y las pantallas de login/registro), sube un logo y una imagen/portada. Se aplica al instante para todo el equipo.

- Autenticación propia (registro, login, logout) con contraseña cifrada y sesión por JWT en cookie httpOnly. El primer usuario registrado queda como administrador; todos los siguientes necesitan un **código de invitación**.
- Proyectos (tableros) con miembros que se agregan seleccionándolos de una lista (ya no hace falta escribir el email). El dueño puede editar el nombre y la descripción del proyecto en cualquier momento.
- Tareas con título, descripción, estado (Por hacer / En progreso / En revisión / Terminado), prioridad, responsable y fecha límite. Al asignar (o reasignar) una tarea, la persona recibe automáticamente un aviso en su bandeja de entrada.
- Tablero Kanban con arrastrar y soltar para cambiar el estado de una tarea.
- Subida y descarga de archivos adjuntos por tarea (hasta 5MB por archivo, guardados en la base de datos para funcionar en la nube).
- Bandeja de entrada por usuario: cualquier miembro puede enviar un "requerimiento" a otro (como un correo, con asunto y mensaje), con hilo de respuestas y estado (Abierto / En progreso / Cerrado) para trazabilidad completa.
- **Gestión de usuarios** (solo administradores): crear y eliminar cuentas del equipo desde `/users`.
- **Códigos de invitación** (solo administradores, también desde `/users`): generas un código de un solo uso (con rol miembro o administrador) y se lo compartes a quien quieras sumar; sin código válido no se puede crear una cuenta nueva.
- **Informes** (`/reports`): resumen de tareas por estado, tareas vencidas, tabla detallada por proyecto y exportación a CSV / impresión.
- **Perfil** (`/profile`): cada usuario edita su nombre, descripción/bio, sube su foto de perfil, cambia su contraseña, y personaliza el fondo de su propia pantalla (color o imagen) — esto último es privado, solo lo ve quien lo configura.
- **Chat entre usuarios** (`/chat`): mensajería directa (1 a 1) y **grupal** entre personas registradas, con texto, imágenes, notas de voz (se graban desde el navegador) y archivos adjuntos. Muestra quién está **en línea** (punto verde) según la última vez que esa persona tuvo la app abierta. Se actualiza automáticamente cada pocos segundos, con contador de mensajes sin leer por conversación.
- **Hilos de conversación**: cualquier mensaje del chat se puede responder en un hilo aparte (como en Slack), sin llenar el canal principal. El botón "💬 Responder en hilo" bajo cada mensaje abre un panel con esas respuestas; si ya tiene respuestas, muestra el contador.
- **Gestión de grupos**: desde el botón "Miembros" en el encabezado de un grupo se puede agregar gente nueva, quitar miembros (solo quien creó el grupo), salir del grupo, o eliminarlo por completo (solo el creador).
- **Menciones con @**: al escribir "@" dentro de un grupo aparece un menú para elegir a la persona; su nombre queda resaltado en el mensaje para todos.
- **Panel de menciones**: el botón "🔔 Menciones" en la barra lateral del chat muestra quién te mencionó, en qué conversación, y si ya le respondiste o sigue pendiente (con un punto de color); un clic te lleva directo a ese mensaje.
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
- Los mensajes de audio del chat (hasta 8MB) usan la grabación nativa del navegador; funciona bien en Chrome/Edge/Firefox. En Safari/iOS el soporte de grabación de audio puede ser más limitado según la versión.
- La imagen de fondo personalizada del perfil es privada (solo la ve quien la configuró); no se comparte con el resto del equipo.
