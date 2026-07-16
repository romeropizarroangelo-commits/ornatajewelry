# 🚀 Conectar Firebase y publicar ORNATA en internet

Tu web ya está preparada para funcionar en la **nube**: cuando la conectes a Firebase, cada vez que guardes en el **Panel de administración** (`admin.html`) la tienda se actualiza **para todos**, y las fotos se suben a internet automáticamente.

Ahora mismo funciona en **modo LOCAL** (solo en tu PC). Sigue estos pasos para pasar a **modo NUBE**.

---

## PARTE 1 — Crear el proyecto Firebase (gratis, ~10 min)

1. Entra a **https://console.firebase.google.com** e inicia sesión con tu cuenta Google.
2. Clic en **“Crear un proyecto”** → ponle nombre (ej. `ornata-jewelry`) → Continuar → Continuar → **Crear proyecto**.

### 1.1 Activar la base de datos (Firestore)
3. Menú izquierdo → **Compilación (Build) → Firestore Database** → **Crear base de datos**.
4. Elige **modo de producción** → Siguiente → elige la ubicación más cercana (ej. `southamerica-east1`) → **Habilitar**.
5. Pestaña **Reglas (Rules)**, pega esto y pulsa **Publicar**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
> Esto deja que cualquiera **vea** el catálogo, pero solo tú (con sesión) puedes **editar**.

### 1.2 Activar el almacenamiento de fotos (Storage)
6. Menú → **Build → Storage** → **Comenzar** → Siguiente → **Listo**.
7. Pestaña **Reglas (Rules)**, pega esto y **Publicar**:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 1.3 Activar el inicio de sesión (Authentication)
8. Menú → **Build → Authentication** → **Comenzar**.
9. Pestaña **Sign-in method** → **Correo electrónico/contraseña** → actívalo → **Guardar**.
10. Pestaña **Users** → **Agregar usuario** → escribe **tu correo** y una **contraseña** (esta será tu clave del panel) → Agregar.

---

## PARTE 2 — Pegar tus claves en la web

11. En la consola, arriba a la izquierda: **⚙ (engranaje) → Configuración del proyecto**.
12. Baja hasta **“Tus apps”** → clic en el icono **`</>`** (Web) → ponle un apodo (ej. `web`) → **Registrar app**.
13. Verás un bloque `const firebaseConfig = { ... }`. **Copia esos valores.**
14. Abre el archivo **`firebase-config.js`** de tu carpeta y pégalos así:
```js
window.FIREBASE_CONFIG = {
  apiKey: "AIza...............",
  authDomain: "ornata-jewelry.firebaseapp.com",
  projectId: "ornata-jewelry",
  storageBucket: "ornata-jewelry.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcd..."
};

window.ORNATA_ADMIN_EMAIL = "tucorreo@ejemplo.com";
```
15. **Guarda el archivo.**

✅ Listo. Abre `admin.html`: ahora pedirá **iniciar sesión** y el indicador dirá **☁ Nube (Firebase)**.
Entra con tu correo/contraseña → pulsa **💾 Guardar cambios** una vez (esto sube el catálogo inicial a la nube).
Desde ahora, cada cambio que guardes se ve en la tienda al instante.

---

## PARTE 3 — Publicar la web en internet

Tienes dos caminos. **El más fácil es Netlify (arrastrar y soltar).**

### Opción A — Netlify (sin instalar nada, 3 min) ⭐ recomendado
1. Entra a **https://app.netlify.com** → crea cuenta gratis.
2. En el panel, busca **“Add new site” → “Deploy manually”** (o la zona que dice *Drag and drop your site folder here*).
3. **Arrastra toda la carpeta** `kit-web-scrolling` a esa zona.
4. En segundos te da un enlace público tipo `https://ornata-xxxx.netlify.app`. ¡Ya está online!
5. (Opcional) En **Site settings → Domain** puedes poner tu propio dominio (`ornatajewelry.com`).

> Cada vez que cambies algo del **diseño** (archivos), vuelves a arrastrar la carpeta.
> Los cambios de **productos/precios/fotos** NO necesitan re-subir nada: se guardan en Firebase y se actualizan solos.

### Opción B — Firebase Hosting (con instalación)
Requiere instalar Node.js y usar la terminal:
```
npm install -g firebase-tools
firebase login
firebase init hosting     (elige tu proyecto; carpeta pública: .  ; NO como single-page app)
firebase deploy
```
Te dará un enlace `https://ornata-jewelry.web.app`.

---

## 📌 Resumen de cómo trabajarás cada día
- **Agregar/editar productos, precios y fotos** → abres `admin.html`, inicias sesión, editas, **Guardar**. Se actualiza solo en la web. ✅
- **Cambiar textos o diseño** → se edita el código y (si usas Netlify) se vuelve a arrastrar la carpeta.

## ❓ Sobre pagos con tarjeta
La tienda ya cobra por **Yape/Plin** y **transferencia** (el cliente manda su comprobante al confirmar el pedido).
Para aceptar **tarjetas** necesitas una pasarela peruana con cuenta de comercio: **Culqi**, **Mercado Pago** o **Izipay**.
Cuando abras una cuenta, avísame cuál y la integramos en el checkout.

---
¿Dudas en algún paso? Dime en qué punto estás y te guío. 💜
