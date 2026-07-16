/* ============================================================
   ORNATA — Capa de datos (Firebase o Local)
   ------------------------------------------------------------
   Expone window.OrnataDB con una API común:
     OrnataDB.enabled            -> true si Firebase está configurado
     OrnataDB.load()             -> {productos, config} | null
     OrnataDB.save({productos,config})
     OrnataDB.uploadImage(id, file) -> URL de descarga
     OrnataDB.login(email, pass) / logout() / onAuth(cb) / user()
   Si Firebase NO está configurado, enabled=false y la web usa el
   modo local (productos.js + localStorage), sin romperse.
   ============================================================ */
window.OrnataDB = (function () {
  var cfg = window.FIREBASE_CONFIG || {};
  var enabled = !!(cfg.apiKey && cfg.projectId && window.firebase);
  var db, storage, auth;

  if (enabled) {
    try {
      firebase.initializeApp(cfg);
      db = firebase.firestore();
      storage = firebase.storage();
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

    uploadImage: function (id, file) {
      if (!enabled) return Promise.reject(new Error("Firebase no configurado"));
      var safe = String(id).replace(/[^a-z0-9_-]/gi, "");
      var ref = storage.ref("productos/" + safe + "_" + Date.now() + "_" + (file.name || "img"));
      return ref.put(file).then(function () { return ref.getDownloadURL(); });
    },

    login: function (email, pass) { return auth.signInWithEmailAndPassword(email, pass); },
    logout: function () { return auth.signOut(); },
    onAuth: function (cb) { if (enabled) auth.onAuthStateChanged(cb); else cb(null); },
    user: function () { return enabled ? auth.currentUser : null; }
  };
})();
