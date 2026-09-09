# Portal del cliente — qué subir y en qué orden

Este paquete trae **18 archivos**: 15 nuevos y 3 que reemplazan a los que ya
tienes. Nada más del proyecto se toca. La estructura de carpetas del ZIP es
idéntica a la del repo, así que cada archivo va exactamente donde está aquí.

## Archivos que REEMPLAZAN a los actuales (3)

```
prisma/schema.prisma
app/projects/[id]/page.tsx
app/projects/[id]/ProjectTabs.tsx
```

## Archivos NUEVOS (15)

```
lib/clientPortal.ts

app/api/projects/[id]/client-access/route.ts
app/api/projects/[id]/client-access/[accessId]/route.ts
app/api/projects/[id]/reports/route.ts
app/api/projects/[id]/reports/[reportId]/route.ts
app/api/projects/[id]/reports/[reportId]/photos/route.ts
app/api/projects/[id]/client-budget/route.ts
app/api/report-photos/[photoId]/route.ts
app/api/blob/report-photo/route.ts
app/api/portal/[token]/access/route.ts

app/portal/[token]/page.tsx
app/portal/[token]/PortalView.tsx
app/portal/[token]/PinGate.tsx

components/ReportsTab.tsx
components/ClientPortalManager.tsx
```

## Cómo subirlo desde GitHub web

Son 18 archivos, muy por debajo del límite de 100 por carga. Arrastra las
carpetas `app`, `components`, `lib` y `prisma` de este ZIP sobre la página del
repo (botón **Add file → Upload files**). GitHub respeta las rutas y reemplaza
solo los archivos que coinciden.

**No hay que correr ninguna migración a mano.** Tu script de build ya hace
`prisma generate && prisma db push`, así que al desplegar en Vercel las cuatro
tablas nuevas se crean solas y las tablas que ya existían no se tocan.

## Variable de entorno opcional

Para que el enlace que se copia salga con tu dominio propio en vez del de
Vercel, agrega en Vercel:

```
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

Si no la pones, el enlace se arma con el dominio desde el que estés navegando,
que en la práctica ya funciona bien.

## Cómo se usa

**Crear el acceso del cliente.** Entras al proyecto → botón **Portal del
cliente** (arriba, al lado de "Agregar miembro") → pestaña *Accesos* → llenas
el nombre y le das *Crear acceso*. Sale un enlace largo que copias y le mandas
al cliente por WhatsApp o correo.

- El **PIN es opcional**. Sin PIN, el enlace solo ya abre el portal. Con PIN,
  al cliente le sale una pantalla pidiéndolo antes de entrar.
- **Ver presupuesto** viene apagado. Solo si lo prendes el cliente ve la plata.
- **Regenerar enlace** invalida el anterior al instante, por si el cliente
  reenvió el link a quien no debía.
- Puedes crear **varios accesos por proyecto** (el dueño, el interventor, etc.),
  cada uno con su propio enlace y sus propios permisos.

**Subir el informe del día.** Dentro del proyecto → pestaña **Informes de
obra** → llenas título, fecha, avance % y el texto (escribes o pegas). Le das
*Crear informe* y ahí mismo aparece el botón **+ Cargar fotos**: escoges las 5,
10 o 30 fotos de una vez y se suben todas juntas al mismo informe.

- El título se autocompleta como "Registro fotográfico 01", "02", etc., pero
  puedes escribir el que quieras.
- Si desmarcas *Publicar de una vez*, el informe queda en **borrador**: lo ve
  tu equipo pero el cliente no. Después lo publicas cuando quieras.
- A cada foto le puedes poner descripción pasando el mouse por encima → *Editar*.

**Presupuesto del cliente.** Está en el botón *Portal del cliente* → pestaña
*Presupuesto del cliente*. Es una tabla aparte del presupuesto interno por
tarea: acá pones los capítulos como se los quieres presentar al cliente, con
lo presupuestado y lo ejecutado. **Si la dejas vacía, al cliente simplemente
no le aparece esa pestaña.**

## Lo que ve el cliente

Entra por el enlace, sin cuenta ni contraseña de la plataforma. Ve tres
pestañas: **Avance de obra** (los informes en orden, del más nuevo al más
viejo, con su barra de avance general), **Registro fotográfico** (todas las
fotos del proyecto en galería, con lightbox y descarga) y **Presupuesto**
(solo si se lo habilitaste).

El cliente **no** entra a la plataforma: no ve el tablero, ni el chat, ni las
tareas, ni los otros proyectos. Su enlace solo sirve para su propio proyecto.

## Nota sobre las fotos

Las fotos van a Vercel Blob (el mismo servicio donde ya guardas los adjuntos
de las tareas), no a la base de datos. Límite de 25MB por foto y solo se
aceptan imágenes. Si tu proyecto todavía no tiene el store de Blob conectado
en Vercel, hay que crearlo desde el panel de Vercel → Storage.
