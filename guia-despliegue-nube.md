# Guía paso a paso: publicar el Gestor de Proyectos en la nube (con datos compartidos)

Esta guía es para la versión completa (`gestor-proyectos`, hecha con Next.js), que sí tiene una base de datos real: todas las personas que entren, desde donde sea, ven y editan la misma información. Solo necesitas el navegador, sin instalar nada en tu computadora.

## Lo que vas a crear (gratis)

1. Una base de datos en **Neon** (Postgres gratuito en la nube).
2. Un repositorio en **GitHub** con el código.
3. Un despliegue en **Vercel**, conectado al repositorio, con una URL pública tipo `https://tu-proyecto.vercel.app`.

## Paso 1: Crear la base de datos en Neon

1. Entra a [neon.tech](https://neon.tech) y crea una cuenta (puedes usar tu cuenta de GitHub para registrarte más rápido).
2. Haz clic en **"Create a project"**. Ponle un nombre, por ejemplo `gestor-proyectos`.
3. Cuando se cree, Neon te muestra un **"Connection string"** — algo como:
   `postgresql://usuario:contraseña@ep-algo.neon.tech/neondb?sslmode=require`
4. **Copia ese texto completo** y guárdalo en algún lado (lo vas a necesitar en el Paso 4). No lo compartas públicamente.

## Paso 2: Subir el código a GitHub

1. Descomprime el archivo `gestor-proyectos.zip` en tu computadora.
2. Entra a [github.com](https://github.com) → botón **"New"** → nombre del repositorio, por ejemplo `gestor-proyectos` → **Public** → **"Create repository"**.
3. En la página del repo, haz clic en **"uploading an existing file"** (o "Add file" → "Upload files").
4. Abre la carpeta descomprimida y selecciona **todo su contenido** (no la carpeta en sí, sino lo que está dentro: `app`, `components`, `lib`, `prisma`, `package.json`, etc.) y arrástralo a GitHub.
5. Espera a que cargue todo y haz clic en **"Commit changes"**.

> Nota: la carpeta `node_modules` no viene incluida (es normal, Vercel la genera solo al desplegar).

## Paso 3: Crear el proyecto en Vercel

1. Entra a [vercel.com](https://vercel.com) y crea una cuenta usando **"Continue with GitHub"** (así quedan conectados automáticamente).
2. Haz clic en **"Add New..." → "Project"**.
3. Busca y selecciona el repositorio que acabas de subir (`gestor-proyectos`) y haz clic en **"Import"**.
4. Vercel va a detectar solo que es un proyecto Next.js. **No hagas clic en "Deploy" todavía** — primero necesitas agregar las variables de entorno (siguiente paso).

## Paso 4: Configurar las variables de entorno

Todavía en la pantalla de configuración del proyecto (antes de desplegar), busca la sección **"Environment Variables"** y agrega estas dos:

| Name | Value |
|---|---|
| `DATABASE_URL` | El connection string que copiaste de Neon en el Paso 1 |
| `JWT_SECRET` | Cualquier texto largo y aleatorio, por ejemplo: `k3j2h4g5f6d7s8a9p0o1i2u3y4t5r6e7` (invéntate uno distinto) |

Después de agregar ambas, haz clic en **"Deploy"**.

## Paso 5: Esperar el despliegue

Vercel va a instalar las dependencias, crear automáticamente las tablas en tu base de datos de Neon (el proyecto ya viene configurado para hacer esto solo) y publicar el sitio. Esto toma 1-3 minutos. Al terminar, verás un botón **"Visit"** con tu URL pública, algo como `https://gestor-proyectos-tuusuario.vercel.app`.

## Paso 6: Crear el primer usuario y agregar al equipo

1. Abre la URL que te dio Vercel.
2. Haz clic en **"Regístrate"** y crea tu cuenta — al ser la primera, queda como **administrador** automáticamente.
3. Comparte esa misma URL con tus compañeros para que cada uno se registre con su propio email.
4. Como administrador, ve a **"Usuarios"** en el menú si prefieres crear tú mismo las cuentas del equipo (en vez de que cada quien se registre).
5. Crea un proyecto desde "Proyectos" → "+ Nuevo proyecto", y usa "+ Agregar miembro" (dentro del proyecto) para invitar por email a las personas que ya tengan cuenta.

Listo: a partir de aquí, todos los que entren a esa URL —desde cualquier computadora o celular— ven y trabajan sobre los mismos proyectos, tareas, archivos y requerimientos.

## Cómo actualizar el sitio si haces cambios más adelante

Si vuelves a subir archivos nuevos al mismo repositorio de GitHub (Paso 2), Vercel detecta el cambio automáticamente y vuelve a desplegar la aplicación sola, sin que tengas que repetir los pasos 3 y 4.

## Preguntas frecuentes

**¿Esto tiene algún costo?** Los planes gratuitos de Neon y Vercel alcanzan perfectamente para un equipo pequeño/mediano. Si el uso crece mucho (muchísimos usuarios o archivos), eventualmente tocaría pasar a un plan pago de cualquiera de los dos.

**¿Puedo usar Supabase en vez de Neon?** Sí, funciona igual: crea el proyecto en [supabase.com](https://supabase.com), copia el "Connection string" (modo "URI") desde Project Settings → Database, y úsalo como `DATABASE_URL` en el Paso 4.

**¿Qué pasa con los usuarios de prueba (admin@empresa.com, etc.)?** Esos solo se crean si ejecutas manualmente `npm run seed` en tu computadora conectado a la base de datos. En un despliegue nuevo en Vercel, la base de datos empieza vacía — el primer usuario en registrarse en tu URL pública queda como administrador.
