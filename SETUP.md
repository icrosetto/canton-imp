# CantonIMP — Guía de Setup Completo
## Del zip a correr en Mac + celular, sincronizado

---

## PASO 1 — Instalar Node.js (una sola vez)

1. Ir a https://nodejs.org
2. Descargar la versión **LTS** (la de la izquierda)
3. Instalar normalmente (siguiente, siguiente, instalar)
4. Verificar: abrir **Terminal** y escribir:
   ```
   node -v
   ```
   Tiene que mostrar algo como `v20.x.x`

---

## PASO 2 — Crear cuenta en Supabase (gratis)

1. Ir a https://supabase.com → **Start for free**
2. Registrarse con GitHub o email
3. Click en **New Project**
   - Name: `canton-imp`
   - Database Password: elegí una contraseña (guardala)
   - Region: **South America (São Paulo)** ← importante para latencia
4. Esperar ~2 minutos a que el proyecto se cree

---

## PASO 3 — Crear las tablas en Supabase

1. En el dashboard de Supabase → click en **SQL Editor** (ícono de código en la barra izquierda)
2. Click en **New query**
3. Abrir el archivo `supabase_schema.sql` de esta carpeta
4. Copiar TODO el contenido y pegarlo en el editor
5. Click en **Run** (▶️)
6. Tiene que mostrar "Success. No rows returned"

---

## PASO 4 — Obtener las credenciales

1. En Supabase → **Settings** (engranaje abajo a la izquierda) → **API**
2. Copiar:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon / public key** → el token largo que empieza con `eyJ...`

---

## PASO 5 — Configurar el proyecto

1. Descomprimí la carpeta `canton-imp` donde quieras (ej: Escritorio)
2. Dentro de la carpeta, buscá el archivo `.env.example`
3. **Duplicalo** y renombrá la copia a `.env` (sin el `.example`)
4. Abrí `.env` con cualquier editor de texto (TextEdit, VS Code, etc.)
5. Reemplazá los valores:
   ```
   VITE_SUPABASE_URL=https://TU_URL.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...tu_key
   ```
6. Guardá el archivo

> ⚠️ El archivo `.env` NUNCA lo subas a internet ni lo compartas.
> Contiene las credenciales de tu base de datos.

---

## PASO 6 — Instalar dependencias y correr

Abrí **Terminal**, navegá a la carpeta del proyecto:

```bash
cd ~/Desktop/canton-imp    # o donde hayas descomprimido
npm install                # descarga las dependencias (~1 min)
npm run dev                # arranca el servidor local
```

Va a aparecer algo así:
```
  VITE v5.x.x  ready in 300ms
  ➜  Local:   http://localhost:5173/
```

Abrí http://localhost:5173 en el navegador → **la app está corriendo**.

---

## PASO 7 — Publicar en Vercel (para acceder desde el celular)

### 7a. Subir el código a GitHub

1. Ir a https://github.com → crear cuenta si no tenés
2. Click en **New repository** → nombre: `canton-imp` → Create
3. En Terminal, dentro de la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "primera version"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/canton-imp.git
   git push -u origin main
   ```

### 7b. Deployar en Vercel

1. Ir a https://vercel.com → **Sign up with GitHub**
2. Click en **Add New Project**
3. Importar el repositorio `canton-imp`
4. En **Environment Variables** agregar:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
5. Click en **Deploy**

En ~1 minuto Vercel te da una URL tipo:
**`https://canton-imp-tuusuario.vercel.app`**

Esa URL funciona desde cualquier dispositivo con internet.

---

## PASO 8 — Instalar como app en el celular (PWA)

### En iPhone (Safari):
1. Abrí la URL de Vercel en **Safari** (no Chrome)
2. Tocá el botón de compartir (📤)
3. Scroll y tocá **"Agregar a pantalla de inicio"**
4. Nombre: `CantonIMP` → **Agregar**

### En Android (Chrome):
1. Abrí la URL en Chrome
2. Va a aparecer un banner automático "Agregar a inicio"
3. Si no aparece: menú ⋮ → **Instalar app**

La app aparece en tu pantalla de inicio como cualquier app nativa,
abre sin barras del navegador, y funciona offline con los últimos datos cacheados.

---

## FLUJO DE USO

```
En la feria (celular):
  → Cargás proveedores y artículos
  → Se guardan en Supabase automáticamente

En la Mac (después):
  → Abrís http://localhost:5173 (o la URL de Vercel)
  → Todos los datos están ahí, sincronizados
  → Armás las cargas tranquilo en pantalla grande
```

---

## OFFLINE — ¿Qué pasa sin internet?

- La app **sigue funcionando** con los últimos datos cacheados (PWA)
- Los cambios que hagas **se guardan localmente** (localStorage)
- Cuando recuperás conexión, los cambios nuevos se sincronizan a Supabase
- ⚠️ Si dos dispositivos modifican los mismos datos sin conexión,
  gana el último en sincronizar. Para uso personal esto no es un problema.

---

## ACTUALIZAR la app después de cambios

Si en el futuro modificás el código:

```bash
# En la Mac, dentro de la carpeta:
git add .
git commit -m "descripcion del cambio"
git push
```

Vercel detecta el push y redeploya automáticamente en ~1 minuto.
El celular recibe la actualización la próxima vez que abre la app.

---

## RESUMEN DE COSTOS

| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Free tier | $0 — 500MB DB, 1GB storage |
| Vercel   | Hobby      | $0 — proyectos personales |
| Total    |            | **$0/mes** |

El free tier de Supabase es más que suficiente para miles de
proveedores, artículos y cargas.

---

## SOPORTE

Si algo no funciona, los errores más comunes son:

**"supabase env vars missing"** → el archivo `.env` no está bien configurado (Paso 5)

**La app abre pero no guarda datos** → verificar que corriste el SQL del Paso 3

**No puedo pushear a GitHub** → puede que necesites configurar git con tu email:
```bash
git config --global user.email "tu@email.com"
git config --global user.name "Tu Nombre"
```
