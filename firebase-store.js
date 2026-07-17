/* ============================================================
   ORNATA — Capa de datos (Firebase o Local)
   ------------------------------------------------------------
   Guarda productos y configuración en Firestore (doc ornata/data)
   y las FOTOS como base64 en la colección "imagenes" (1 doc por
   producto). Así NO se necesita Storage (ni tarjeta): todo gratis
   en el plan Spark.

   API (window.OrnataDB):
     enabled                 -> true si Firebase está configurado
     load()                  -> {productos, config} | null
     save({productos,config})
     loadImages()            -> { idProducto: dataURLbase64 }
     saveImage(id, dataURL)
     deleteImage(id)
     login/logout/onAuth/user
   ============================================================ */
window.OrnataDB = (function () {
  var cfg = window.FIREBASE_CONFIG || {};
  var enabled = !!(cfg.apiKey && cfg.projectId && window.firebase);
  var db, auth;

  if (enabled) {
    try {
      firebase.initializeApp(cfg);
      db = firebase.firestore();
      auth = firebase.auth();
    } catch (e) {
      console.error("Firebase no pudo iniciar:", e);
      enabled = false;
    }
  }

  function docRef() { return db.collection("ornata").doc("data"); }

  return {
    enabled: enabled,

    load: function () {
      if (!enabled) return Promise.resolve(null);
      return docRef().get().then(function (snap) {
        return snap.exists ? snap.data() : null;
      });
    },

    save: function (data) {
      if (!enabled) return Promise.reject(new Error("Firebase no configurado"));
      return docRef().set({
        productos: data.productos || [],
        config: data.config || {},
        actualizado: Date.now()
      });
    },

    loadImages: function () {
      if (!enabled) return Promise.resolve({});
      return db.collection("imagenes").get().then(function (snap) {
        var out = {};
        snap.forEach(function (d) { out[d.id] = (d.data() || {}).data || ""; });
        return out;
      });
    },

    saveImage: function (id, dataUrl) {
      if (!enabled) return Promise.reject(new Error("Firebase no configurado"));
      return db.collection("imagenes").doc(id).set({ data: dataUrl });
    },

    deleteImage: function (id) {
      if (!enabled) return Promise.resolve();
      return db.collection("imagenes").doc(id).delete().catch(function () {});
    },

    login: function (email, pass) { return auth.signInWithEmailAndPassword(email, pass); },
    logout: function () { return auth.signOut(); },
    onAuth: function (cb) { if (enabled) auth.onAuthStateChanged(cb); else cb(null); },
    user: function () { return enabled ? auth.currentUser : null; }
  };
})();
