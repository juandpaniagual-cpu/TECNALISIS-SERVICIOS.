# Tecnalisis Servicios

Aplicación de control de mantenimiento para servicios, técnicos e ingenieros de seguimiento.

Esta versión **no usa Supabase**. Funciona con:

- GitHub para guardar el código.
- Cloudflare Pages para publicar la app.
- Cloudflare Pages Functions como backend.
- Cloudflare D1 como base de datos.
- Cloudflare R2 opcional para guardar fotos/evidencias si decides activarlo después.

## Funciones incluidas

- Login propio con sesiones.
- Creación del primer administrador desde la app.
- Solicitud pública de acceso desde el enlace compartido.
- Aprobación de usuarios por el administrador antes de permitir ingreso.
- Roles:
  - Administrador: crea usuarios, crea órdenes y cambia cualquier estado.
  - Técnico: ve sus órdenes asignadas, documenta el servicio y cambia el estado.
  - Ingeniero: hace seguimiento, documenta y cambia el estado de las órdenes.
- Creación de técnicos, ingenieros y administradores desde la pantalla Equipo.
- Creación de órdenes de servicio.
- Venta de productos o insumos dentro de una orden de servicio.
- Fotos/evidencias opcionales dentro de cada orden de servicio.
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
- `cloudflare-d1-products-migration.sql`: migración para agregar venta de productos/insumos en una base ya creada.
- `cloudflare-d1-photos-migration.sql`: migración para agregar fotos/evidencias en una base ya creada.
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
- `service_products`
- `service_photos`

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

## 5. Crear almacén R2 para fotos/evidencias opcional

Este paso es opcional. Si no quieres registrar tarjeta en Cloudflare, puedes dejarlo para después.

La app funciona sin R2 para usuarios, órdenes, estados, notas y venta de productos.

Si más adelante quieres que técnicos e ingenieros puedan subir fotos:

1. En Cloudflare ve a **Storage & Databases**.
2. Entra a **R2 Object Storage**.
3. Crea un bucket, por ejemplo:

   `tecnalisis-servicios-evidencias`

4. Vuelve al proyecto **Cloudflare Pages** de la app.
5. Ve a **Settings** > **Bindings**.
6. Agrega un binding tipo **R2 bucket**.
7. Nombre del binding:

   `EVIDENCE_BUCKET`

8. Selecciona el bucket:

   `tecnalisis-servicios-evidencias`

9. Guarda y vuelve a desplegar si Cloudflare lo pide.

El nombre `EVIDENCE_BUCKET` es importante porque las Functions lo usan para guardar y mostrar las fotos.

## 6. Crear el primer administrador

Cuando abras la URL publicada por Cloudflare, si la base D1 está vacía, la app mostrará:

**Crear administrador**

Ingresa:

- Nombre completo.
- Correo.
- Contraseña.

Ese será el primer usuario administrador.

## 7. Crear técnicos e ingenieros

Después de entrar como administrador:

1. Ve a **Equipo**.
2. Clic en **Nuevo usuario**.
3. Crea técnicos e ingenieros.
4. Usa contraseñas temporales para que cada persona entre.

## 8. Enlace para compartir con técnicos e ingenieros

El enlace público de la aplicación es el mismo para todos:

`https://tecnalisis-servicios-app.pages.dev`

Para compartirlo:

1. El administrador entrega el enlace de la app.
2. El técnico o ingeniero hace clic en **Solicitar acceso**.
3. La persona llena nombre, correo, rol solicitado y contraseña.
4. La solicitud queda pendiente.
5. El administrador entra a **Equipo**.
6. En **Solicitudes pendientes**, revisa la persona y da clic en **Autorizar ingreso**.

Sin autorización del administrador, el usuario no puede iniciar sesión.

Permisos de estados:

- Administrador: puede cambiar el estado de cualquier orden.
- Ingeniero: puede cambiar el estado de las órdenes y hacer seguimiento.
- Técnico: puede cambiar el estado de las órdenes asignadas a él y documentar el servicio.

Además, dentro de cada orden pueden agregar notas y subir fotos/evidencias según sus permisos.

## 9. Crear servicios

Como administrador o ingeniero:

1. Clic en **Nuevo servicio**.
2. Selecciona técnico asignado.
3. Selecciona ingeniero de seguimiento.
4. Si el servicio incluye venta de producto o insumo, marca **Este servicio incluye venta de producto o insumo**.
5. Registra producto, cantidad, unidad y precio unitario.
6. Guarda.

Los técnicos solo verán los servicios asignados a ellos.

## 10. Agregar venta de productos a una base ya creada

Si la base D1 ya existía antes de esta función, ejecuta en **D1 > Console**:

```sql
create table if not exists service_products (
  id text primary key,
  service_order_id text not null references service_orders(id) on delete cascade,
  product_name text not null,
  quantity real not null default 1,
  unit text not null default 'unidad',
  unit_price real not null default 0,
  total_price real not null default 0,
  notes text,
  created_at text not null
);

create index if not exists idx_products_order on service_products(service_order_id);
```

## 11. Agregar fotos/evidencias a una base ya creada

Si la base D1 ya existía antes de esta función, ejecuta en **D1 > Console** el contenido de:

`cloudflare-d1-photos-migration.sql`

También debes crear el bucket R2 y el binding `EVIDENCE_BUCKET`.

## 12. Si aparece error de conexión

Revisa:

- Que la base D1 exista.
- Que ejecutaste `cloudflare-d1-schema.sql`.
- Que si actualizaste la app, ejecutaste `cloudflare-d1-products-migration.sql`.
- Que si activaste fotos, ejecutaste `cloudflare-d1-photos-migration.sql`.
- Que el binding en Cloudflare Pages se llame exactamente `DB`.
- Que el binding R2 para fotos se llame exactamente `EVIDENCE_BUCKET`.
- Que hiciste deploy después de crear el binding.

## Nota

Esta versión no necesita `npm install`, ni Supabase, ni servidor externo. Todo queda dentro de Cloudflare y GitHub.
