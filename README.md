# Tecnalisis Servicios

Aplicación de control de mantenimiento para servicios, técnicos e ingenieros de seguimiento.

Esta versión **no usa Supabase**. Funciona con:

- GitHub para guardar el código.
- Cloudflare Pages para publicar la app.
- Cloudflare Pages Functions como backend.
- Cloudflare D1 como base de datos.

## Funciones incluidas

- Login propio con sesiones.
- Creación del primer administrador desde la app.
- Roles:
  - Administrador: crea usuarios y órdenes.
  - Técnico: ve sus órdenes, inicia servicio y envía a revisión.
  - Ingeniero: revisa y aprueba servicios.
- Creación de técnicos, ingenieros y administradores desde la pantalla Equipo.
- Creación de órdenes de servicio.
- Seguimiento por notas.
- Cambio de estados.
- Filtro por técnico.
- Buscador por orden, cliente, equipo, técnico o ingeniero.
- Exportación CSV.
- Modo demo local.

## Archivos principales

- `index.html`: interfaz principal.
- `styles.css`: diseño visual.
- `app.js`: lógica del frontend.
- `functions/`: backend de Cloudflare Pages Functions.
- `cloudflare-d1-schema.sql`: tablas para Cloudflare D1.
- `_redirects`: soporte para app estática.
- `_headers`: cabeceras básicas de seguridad.

## 1. Subir a GitHub

1. Entra a [GitHub](https://github.com/).
2. Crea un repositorio nuevo:

   `tecnalisis-servicios`

3. Sube todos los archivos de esta carpeta.
4. Guarda con **Commit changes**.

## 2. Crear proyecto en Cloudflare Pages

1. Entra a [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Ve a **Workers & Pages**.
3. Clic en **Create application**.
4. Elige **Pages**.
5. Elige **Connect to Git**.
6. Conecta GitHub y selecciona el repositorio `tecnalisis-servicios`.
7. Usa esta configuración:

   - Framework preset: `None`
   - Build command: `exit 0`
   - Build output directory: `.`

8. Clic en **Save and Deploy**.

## 3. Crear la base de datos Cloudflare D1

En Cloudflare:

1. Ve a **Storage & Databases**.
2. Entra a **D1 SQL Database**.
3. Crea una base de datos, por ejemplo:

   `tecnalisis-servicios-db`

4. Abre la base de datos.
5. Entra a **Console**.
6. Copia y ejecuta completo el contenido de:

   `cloudflare-d1-schema.sql`

Esto crea las tablas:

- `users`
- `sessions`
- `service_orders`
- `service_updates`

## 4. Vincular D1 con Cloudflare Pages

En tu proyecto de Cloudflare Pages:

1. Ve a **Settings**.
2. Entra a **Bindings**.
3. Agrega un binding de tipo **D1 database**.
4. Nombre del binding:

   `DB`

5. Selecciona la base:

   `tecnalisis-servicios-db`

6. Guarda.
7. Vuelve a **Deployments** y haz un nuevo deploy si Cloudflare lo pide.

El nombre `DB` es importante porque las Functions usan `context.env.DB`.

## 5. Crear el primer administrador

Cuando abras la URL publicada por Cloudflare, si la base D1 está vacía, la app mostrará:

**Crear administrador**

Ingresa:

- Nombre completo.
- Correo.
- Contraseña.

Ese será el primer usuario administrador.

## 6. Crear técnicos e ingenieros

Después de entrar como administrador:

1. Ve a **Equipo**.
2. Clic en **Nuevo usuario**.
3. Crea técnicos e ingenieros.
4. Usa contraseñas temporales para que cada persona entre.

## 7. Crear servicios

Como administrador o ingeniero:

1. Clic en **Nuevo servicio**.
2. Selecciona técnico asignado.
3. Selecciona ingeniero de seguimiento.
4. Guarda.

Los técnicos solo verán los servicios asignados a ellos.

## 8. Si aparece error de conexión

Revisa:

- Que la base D1 exista.
- Que ejecutaste `cloudflare-d1-schema.sql`.
- Que el binding en Cloudflare Pages se llame exactamente `DB`.
- Que hiciste deploy después de crear el binding.

## Nota

Esta versión no necesita `npm install`, ni Supabase, ni servidor externo. Todo queda dentro de Cloudflare y GitHub.
