# ESTADO.md — Sistema JL Repuestos (SGAE réplica)

> Bitácora técnica. Fuente única de verdad para retomar contexto entre sesiones.
> Archivo del sistema: **`sistema.html`** (2438 líneas). El resto de la carpeta son OTROS proyectos (index/kibo/kaesflo/scentiall/ruido-51/drinkpoint-admin) que comparten el kit — no tocar.

---

## FASE 0 — Informe de auditoría (2026-08-09)

### 1. Stack real

| Capa | Qué es | Notas |
|------|--------|-------|
| Lenguaje | HTML5 + CSS3 + JavaScript ES6+ **vanilla** | Sin framework, sin build, sin transpilación |
| Arquitectura | **Un único archivo** `sistema.html`, todo inline (1 `<style>`, 1 `<script>` real en líneas 380–1976) | UI + lógica de negocio + persistencia mezcladas |
| Persistencia | **IndexedDB** (`sgae_db` / store `kv`, una sola clave `'db'` con TODO el estado en un blob JSON) — `sistema.html:470-489`. Fallback de migración desde `localStorage` (`sgae_db_v1`) — `:478` |
| Dependencias | **CERO librerías externas / CDN** | Ventaja: 0 riesgo de supply-chain, funciona offline. Desventaja: 0 soporte de framework, todo a mano |
| Datos fuente | `productos.csv` (30.176 filas), `productos_con_stock.csv` (897) | Importación por CSV manual |
| Backend | **No existe** | 100% cliente, una sola PC |

**Versiones obsoletas/vulnerables:** N/A — no hay dependencias que auditar. El "riesgo de versión" aquí es la ausencia total de backend, no una lib vieja.

### 2. Mapa de módulos

| Módulo | Estado | Ubicación |
|--------|--------|-----------|
| Dashboard (KPIs + gráficos SVG) | Funcional | `:610` |
| Productos (CRUD, ficha, import/export CSV, paginación) | **Funcional pero frágil** (ver deuda) | `:711-919` |
| Clientes / Proveedores | Funcional | `:922 / :979` |
| Catálogos (marcas/líneas/familias/modelos/servicios) | Funcional | `:1234-1284` |
| Cotizaciones (PDF, editable, descuento, valor x línea) | Funcional | `:1499-1613` |
| Ventas / Facturación (desde cotización, Factura/Boleta) | **Funcional pero frágil** | `:1024-1152` |
| Compras (Factura de compra sube stock) | Funcional | `:1287-1349` |
| Kardex (movimientos + saldo) | Funcional | `:1675-1706` |
| Ajuste de Inventario | Funcional | `:1709-1750` |
| Nota de Crédito (doc rel. + motivo + devolución parcial) | Funcional | `:1753-1816` |
| Cuentas por Cobrar / Pagar | Funcional (básico) | `:1183 / :1351` |
| Reportes (ranking, ventas netas, inv. valorizado, movimientos) | Funcional | `:1819-1863` |
| Configuración (datos empresa + logo + bancos) | Funcional | `:1634` |
| Inventario (existencias + valorización) | Funcional | `:1155` |
| **Compras placeholder** (`VIEWS.compras`) | Solo esqueleto (duplica facturacompra) | `:1182` |
| **Tipo de Cambio** (pantalla) | **No existe** (datos sí: `:454`, función `tcActual` `:416`) | — |
| **Guía de Remisión** | **No existe** (datos `guias:[]` `:455`) | — |
| **Caja Chica** | **No existe** (datos `caja:[]` `:456`) | — |
| Notas de Débito, Guías de compra, Órdenes de compra, Retenciones, Percepciones, Letras, Perfiles/Usuarios | Solo esqueleto (placeholder genérico) | `MENU :492-561` |

### 3. Modelo de datos actual

Objetos planos en memoria, serializados a un blob JSON (`seed()` `:424-465`). **No hay tablas ni relaciones** — arrays con IDs y a veces desnormalización (ej. `venta.cliente` guarda el NOMBRE, no solo el `clienteId`; `clienteId` a veces es `null` `:444`).

- **producto** = `{id, codigo, codFab, desc, linea, marca, origen, um, costo, precio, precioSug, moneda, stock, stockMin, pri, cie, vit, mer}`
- **venta** = `{id, num, fecha, clienteId, cliente, items, subtotal, igv, total, estado, metodo, tc, referencia, lineas[]}`
- **movimiento** (kardex) = `{id, fecha, prodId, codigo, desc, tipo, doc, cant}` — `:1140`

**Lo que FALTA o está mal (crítico para este rubro):**
- ❌ **Múltiples números de parte**: solo hay `codigo` + `codFab` (UN alternativo). No hay tabla de N part-numbers (OEM Bosch/WABCO/Knorr/Fleetguard/Donaldson…).
- ❌ **Equivalencias / cruces** entre productos intercambiables: no existen.
- ❌ **Compatibilidad vehicular** (marca→modelo→motor→años): el catálogo `modelos` son strings sueltos sin vínculo a productos.
- ⚠️ **Kardex**: existe (`movimientos`), pero **no registra usuario**, ni motivo salvo en AJUSTE, ni stock comprometido/reservado.
- ❌ **Costo promedio ponderado**: la compra **sobrescribe** `p.costo` con el último costo (`emitirCompra :1340`). Además el CSV importó `costo:0` en todo → margen real = imposible hoy.
- ❌ **Ubicación física** (zona/estante/nivel): no existe.
- ❌ **Niveles de precio** (mostrador/taller/flota): solo `precio` + `precioSug`.

### 4. Deuda técnica crítica (con evidencia)

1. **~458 líneas de código MUERTO y DUPLICADO** tras `</html>` (`sistema.html:1979-2436`), fuera de todo `<script>`. Es una copia VIEJA (ej. `:2228` tiene `tc:3.6` fijo, previo al cambio a `tcActual()`). No se ejecuta, pero ensucia y confunde. **Limpieza segura pendiente.**
2. **Sin atomicidad real en ventas.** `emitirVenta` (`:1141`) muta productos + push kardex + unshift venta y luego `save()` **sin `await`** (`:1149`). Toda la app llama `save()` en fire-and-forget. Si el guardado falla o se cierra la pestaña, la última operación se pierde sin aviso. (El blob único mitiga el "a medias" a nivel de disco, pero no la pérdida silenciosa.)
3. **Cero validación de stock.** `deductStock` (`:1130`) hace `Math.max(0, stock-qty)`: **permite sobrevender**, clava el stock en 0 y el kardex queda mintiendo. No hay mensaje "Stock insuficiente".
4. **Cero control de crédito.** El cliente tiene campo `credito` (`:435`) pero **nunca se valida**: se factura a crédito sin mirar línea ni deuda vencida.
5. **Correlativos falsos.** Número = `100000 + DB.ventas.length + 25` (`:1145`). Derivado del **largo del array** → si se borra una venta, el siguiente número colisiona; hay huecos; no es por serie; no es correlativo SUNAT.
6. **Sin usuarios / roles / auditoría.** `Perfiles/Usuarios` es placeholder. El **costo es visible** para cualquiera (Inventario `:1173`, modal producto `:484`). El "vendedor" es texto libre. Ningún movimiento guarda quién/cuándo.
7. **IGV 0.18 hardcodeado** en toda la app (`emitirVenta :1144`, `printDocumento`, cotiz, NC). Sin facturación electrónica SUNAT.
8. **Lógica de negocio dentro de la UI.** Cálculo de totales/IGV, descuento de stock y persistencia viven dentro de funciones de render. Imposible testear aislado. **Cero tests.**
9. **Búsqueda no normalizada.** `filter(... .includes(q))` (ej. `:1075`): substring simple, **no ignora guiones/espacios**, sin "últimos 6 dígitos", sin tolerancia a errores, sin búsqueda por vehículo. O(n) sobre 30k por tecla.

### 5. Los 3 riesgos más graves si entra a producción mañana

1. **🔴 Pérdida total de datos.** Todo vive en el IndexedDB de **una sola PC**, sin backend, sin backup, sin multiusuario. Limpiar caché, cambiar de PC o un disco dañado = se pierde TODO. Además `save()` sin `await` puede perder la última venta.
2. **🔴 Descuadre de stock y dinero.** Sobreventa sin validación + kardex mentiroso + venta a morosos sin control de crédito → el inventario y las cuentas por cobrar dejan de ser confiables en días.
3. **🔴 Ilegal e imposible de auditar en Perú.** Sin facturación electrónica SUNAT, con correlativos que colisionan y **sin usuarios/roles ni rastro de quién hizo qué** (y con costos a la vista de todos).

---

---

## FASE 1 — Gap analysis + plan priorizado (2026-08-10)

> Producido por panel de 4 arquitectos senior (fiscal/SUNAT, datos/migraciones, riesgo/continuidad, UX vendedor) + síntesis. Bugs adicionales verificados contra el código: `mer` nunca se descuenta (`deductStock:1131-1133`); `printFactura` fuerza `moneda:'S/'` (`:1493`); "Anular venta" hace filter/delete y destruye el comprobante (`:1056`); `load()` con `catch(e){}` puede pisar los 897 productos con seed.

### Gap analysis (resumen)
- ❌ **Faltan por completo:** múltiples números de parte (OEM+alternativos), equivalencias/cruces, compatibilidad vehicular, costo promedio ponderado, landed cost, facturación electrónica SUNAT, correlativos reales por serie, niveles de precio, control de crédito, ubicación física, stock reservado, roles (vendedor no ve costos), auditoría quién/cuándo, backup.
- 🟡 **A medias:** búsqueda (no normalizada, O(n)), multi-almacén (columnas fijas, `mer` bug), IGV (0.18 hardcodeado ~10 sitios), doble moneda/TC (clavado 3.6), caja, CxC sin antigüedad, PDF sin logo/plantilla fiscal, Guía de Remisión (vacía), reportes sobre costo=0.
- ✅ **Ya está:** conversión cotización→venta 1 clic; núcleo funcional de los módulos operativos.

### Decisión estratégica: backend vs single-file
La mayoría del valor se logra **YA sin backend** sobre `sistema.html` + IndexedDB. Solo 3 cosas exigen servidor: (1) facturación electrónica SUNAT (firma + OSE/PSE + CDR), (2) multiusuario real, (3) roles verificados + backup off-site durable.
**Bisagra:** una **capa de repositorio (`repo`)** que abstrae el acceso a datos → convierte "meter backend" en "swap del repo + sync por debajo" (offline-first), sin reescribir la UI.
**Secuencia:** capa `repo` → export/backup versionado → sync → backend.
**Regla de oro:** antes de añadir un campo, instalar `schemaVersion` + runner de migraciones reversible con **backup-antes-de-migrar** (o la 1ª migración corrompe los 897 productos sin rollback).

### Plan por fases (ordenado por: 1 bloquea operar · 2 evita pérdidas · 3 velocidad · 4 estético)

**FASE 0 — Estabilización / quick wins** · Esfuerzo S–M (2-4 días) · sin backend · sin tocar datos (solo añade `schemaVersion`)
- Borrar 458 líneas muertas/duplicadas (`:1979-2436`).
- `await` en `save()` + indicador guardando/guardado/error + reintento.
- `load()` defensivo (no pisar datos reales con seed si falla la lectura).
- Validar stock antes de vender (fin de la sobreventa por `Math.max(0,...)`).
- Anti-doble-emisión (deshabilitar botón mientras guarda).
- **Backup/export + import del blob completo a JSON.**
- Prueba 1 min: vender 5 con stock 1 → bloquea; doble clic → una venta; export/borrar/import → vuelven los 897.

**FASE 1 — Confiabilidad + andamiaje** · M–L (~1 sem) · sin backend · migración aditiva
- `schemaVersion` + runner de migraciones reversible con backup-antes-de-migrar.
- **Capa `repo`** (get/put/query + `updatedAt`/`deletedAt`) — bisagra del backend.
- **Commit atómico de venta** (validar→snapshot→mutar→await save→rollback si falla).
- Boundary global de errores + auto-backup periódico.

**FASE 2 — Fiscal y dinero (bloquea operar en Perú)** · L (~2 sem) · sin backend · migración aditiva
- Correlativos por serie persistidos (reemplaza `100000+ventas.length+25`; F001 y B001 independientes).
- Comprobantes inmutables (anular = estado, no borrar).
- Modelo SUNAT-ready (tipo comprobante 01/03/07/08, tipo id cliente, moneda+TC por doc, usuario/cajero).
- IGV configurable + redondeo 2 decimales por línea.
- **Activar Tipo de Cambio** (CRUD diario) y **Caja Chica** (arqueo).
- Login client-side (paso 1): estampa usuario+timestamp; habilita ocultar costo al vendedor.
- NC/ND conformes (referencia al original, serie propia, motivo tipificado).

**FASE 3 — Costos reales + control de inventario (evita pérdidas)** · M–L (~1.5 sem) · sin backend · migración aditiva
- Costo promedio ponderado (dejar de sobreescribir `p.costo`).
- Kardex con usuario+motivo+snapshot de costo.
- Stock reservado al aprobar cotización (`disponible = stock - reservado`).
- Control de crédito (bloqueo por exceso/deuda vencida).
- Piso de precio / alerta de margen. Landed cost prorrateado.

**FASE 4 — Velocidad del vendedor (mostrador)** · L (~2-3 sem) · sin backend · parcial datos
- Índice de búsqueda normalizado (`W71275`→`W712/75`, últimos 6 dígitos, tolerancia) + debounce.
- Dropdown teclado-primero (flechas/Enter/Esc) + atajos (Ctrl+S, F2).
- `codFab → partNumbers[]` (múltiples números de parte) + equivalencias/cruces.
- Niveles de precio (mostrador/taller/flota). WhatsApp de cotización (`wa.me`).
- Formalizar multi-almacén (`almacenes[]`, corrige bug de `mer`) + ubicación física.

**FASE 5 — Backend + electrónica SUNAT** · XL (proyecto aparte) · **gatillo:** 2º usuario concurrente o emisión obligatoria
- Backend como capa de sync detrás del `repo` (offline-first).
- Facturación electrónica (XML UBL + firma + OSE/PSE + CDR + QR) detrás de `EmisorComprobante`.
- Guía de Remisión Electrónica. Export PLE SUNAT (Registro Ventas/Compras).

### Qué NO haremos ahora
Reescribir con framework · facturación electrónica en Fases 1-4 · compatibilidad vehicular completa (población de datos larga) · backend antes de tener `repo` + persistencia local confiable · landed cost antes de costo ponderado · pulido responsive antes de cerrar datos/velocidad.

### Recomendación: empezar por FASE 0
Tapa la fuga más barata y catastrófica (pérdida total + ventas perdidas en silencio por `save` sin await), elimina la ambigüedad del código muerto, no toca el modelo de datos (bajo riesgo) y es la rampa hacia el `repo`.
Orden: (1) borrar código muerto → (2) await+feedback en save → (3) load defensivo → (4) validar stock + anti-doble-emisión → (5) backup/export JSON.

---

---

## FASE 0 — EJECUTADA y VERIFICADA (2026-08-10)

**Cambios aplicados en `sistema.html`:**
- ✅ Borradas 458 líneas de código muerto/duplicado tras `</html>` (2438 → 1978 líneas base). Backup en `sistema.html.bak`.
- ✅ `SCHEMA_VERSION=1` + `load()` defensivo: ante error de LECTURA lanza `READ_FAIL` y NO siembra (protege los 897 productos). Boot con pantalla de error + reintento.
- ✅ Guardado confiable: `persist()` con indicador **Guardando… / ✓ Guardado / ⚠ No se guardó** (elemento `#saveStatus` en topbar).
- ✅ `emitirVenta` async con **validación de stock** (`validarStock`), **anti-doble-clic** (`emitLock`) y **rollback** in-memory (`snapshotStock`/`restoreStock`) si `persist()` falla. Igual patrón en `cotizAFactura` (valida stock), `emitirCompra`, `emitirCotiz`, `grabarNC` (await + guard + rollback/aviso).
- ✅ **Backup/Restore** de todo el blob a JSON en Configuración (`exportarBackup`/`importarBackup`).

**Verificación:** `tests/fase0.test.js` — 16/16 pasan sobre el código real (extrae funciones de `sistema.html`). Cubre: bloqueo de sobreventa (incl. mismo producto en 2 líneas), rollback exacto de stock, IGV/totales (caso 63.56→75.00), y `load()` defensivo (error→lanza sin sembrar / vacío→siembra / con datos→no reescribe). Re-correr con `node tests/fase0.test.js`.

**Publicado (link público sin login):** `https://ornatajewelryperu.com/sistema.html` (repo `ornatajewelry`, Pages). Solo se subió `sistema.html`; NO los CSV (para no exponer catálogo/precios).

**Deuda que Fase 0 NO resolvió (queda para su fase):** bug de `mer` que no se descuenta (Fase 4 multi-almacén); correlativos por `array.length` (Fase 2); costo=0 (Fase 3); IGV 0.18 hardcodeado (Fase 2). El rollback in-memory de Fase 0 es por-operación; la atomicidad vía capa `repo` es Fase 1.

---

---

## FASE 1 — EJECUTADA y VERIFICADA (2026-08-10)

**Cambios en `sistema.html`:**
- ✅ **`commit(mutate)`** — primitiva atómica: `structuredClone(DB)` → mutar → `persist()` → si algo falla, `DB = backup` (revierte TODO: stock, kardex, ventas, cotizaciones). Consolida el rollback por-operación de Fase 0.
- ✅ Las **5 emisiones** (venta, cotización→factura, compra, cotización, N.Crédito) ahora corren dentro de `commit` (una sola primitiva, menos código, cobertura total).
- ✅ **`runMigrations(d)`** en `load()`: motor idempotente y reversible; corre migraciones `{to,up}` en orden solo si `to>schemaVersion`; **backup-antes-de-migrar** bajo `db_prev_v<n>`. Hoy `MIGRATIONS=[]` (andamiaje listo para Fase 2).
- ✅ **Auto-backup rotativo** en IndexedDB (`db_autobackup`) cada 10 guardados (best-effort).
- ✅ **Boundary global de errores** (`error` + `unhandledrejection`) → ya nada falla en silencio.

**Verificación:** `tests/fase1.test.js` — 8/8 (commit aplica/​revierte por fallo de guardado o por excepción de la mutación; migración v1→v2 con backup único; idempotencia). Total suite: **24/24** (`node tests/fase0.test.js && node tests/fase1.test.js`).

**Nota de alcance (disciplina de tech lead):** la "capa `repo` (get/put/query)" del plan se implementó como su núcleo de valor — el **commit atómico** — sin reescribir los ~200 accesos `DB.*` existentes (habría sido un refactor riesgoso que viola "refactoriza solo lo que tocas"). La abstracción get/put/query completa se hará cuando la pida el backend (Fase 5); `commit` ya es la bisagra transaccional.

**Publicado:** `sistema.html` push a `main` (commit FASE 1). Link: `https://ornatajewelryperu.com/sistema.html`.

---

---

## FASE 2A — EJECUTADA y VERIFICADA (2026-08-10)  [primer lote de Fase 2]

**Cambios en `sistema.html` (SCHEMA_VERSION 1→2):**
- ✅ **Correlativos reales por serie.** Nuevo `DB.series[{tipo,serie,ultimo}]` + `nextNumero(tipo)` (padding y separador por tipo). Llamado DENTRO de `commit()` en las 5 emisiones → contador y documento atómicos (sin huecos ni colisiones). Elimina el `100000+array.length+25` (colisionaba al borrar; F y B compartían contador).
- ✅ **Migración v2** (primer uso real del motor): siembra los contadores desde los documentos existentes tomando el **mayor** número por serie → la numeración **continúa**, no reinicia. Con backup-antes-de-migrar (`db_prev_v1`). `seed()` fresh ya nace en v2 con series.
- ✅ **Comprobantes inmutables.** "Anular venta" ya **no borra** el documento (antes `DB.ventas.filter`): lo marca `estado='Anulada'` y **repone stock** vía `commit` (atómico). No se puede anular dos veces.

**Verificación:** `tests/fase2.test.js` — 12/12 (numeración continua por serie, series independientes F001/B001, padding, y migración que toma el máximo por serie desde docs). **Suite total: 36/36.**

**Publicado:** push `main` (FASE 2A) → `https://ornatajewelryperu.com/sistema.html`.

---

---

## FASE 2B-1 — EJECUTADA y VERIFICADA (2026-08-11)  [login + roles + auditoría]

**Cambios en `sistema.html` (SCHEMA_VERSION 2→3):**
- ✅ **Modelo `db.usuarios`** + **migración v3** (crea admin/vendedor por defecto si no existen). PINs por defecto: **admin/1234**, **vendedor/0000** (cambiar en Perfiles).
- ✅ **Login con PIN** por usuario (pantalla `#loginScreen`), sesión en memoria (`SESSION`), **logout** en la barra lateral (que ahora es dinámica).
- ✅ **Roles:** helper `esAdmin()` + clase `body.rol-vendedor` + CSS `.solo-admin{display:none}`. El **vendedor NO ve costos** (columnas Costo/Valor en Inventario, KPI valor, campo Costo del producto, export de inventario) ni **Configuración/Perfiles** (menús filtrados en `renderNav` + `ADMIN_VIEWS` bloquea el acceso directo en `go()`).
- ✅ **Auditoría:** cada **venta** y cada **movimiento de kardex** guardan `usuario` (y la venta `creado` timestamp).
- ✅ **Perfiles/Usuarios** (CRUD, solo admin) con salvaguardas: no borrar el último admin ni a uno mismo; usuario único.

**Verificación:** `tests/fase2b.test.js` — 7/7 (esAdmin/usuarioActual por rol; migración v3 crea admin y respeta usuarios existentes). **Suite total: 43/43** (`fase0/1/2/2b`).

**Pendiente de FASE 2B (siguiente lote):** stampar `usuario` también en compra/cotización/N.Crédito (hoy solo venta+kardex); **IGV configurable + redondeo por línea**; **activar Tipo de Cambio (CRUD) y Caja Chica (arqueo)**; modelo SUNAT-ready (tipo comprobante/identidad); NC/ND conformes.

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

---

---

## FASE 2B-2 — EJECUTADA y VERIFICADA (2026-08-11)

- ✅ **Tipo de Cambio** (`VIEWS.tipocambio` + `tcModal`): CRUD del dólar diario (compra/venta). `tcActual()` ya toma el **más reciente por fecha** (antes fijo 3.6). Cotización/venta lo usan por defecto.
- ✅ **Caja Chica** (`VIEWS.caja`, mapeada a `cajaingreso/cajaegreso/cajacierre`): apertura con monto inicial → ingresos/egresos → **cierre con ARQUEO** (esperado = apertura + ingresos − egresos; diferencia = contado − esperado). Referencia de ventas contado del día. Todo atómico (`commit`) y con `usuario`. Historial de cierres.
- ✅ **Auditoría completa:** `usuario` (+`creado`) también en compra, cotización y nota de crédito (antes solo venta+kardex).

**Verificación:** `tests/fase2c.test.js` — 6/6 (tcActual toma el más reciente / default; fórmula de arqueo esperado y diferencia; cierre guarda {esperado,contado,diferencia}). **Suite total: 49/49** (fase0/1/2/2b/2c).

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

**Diferido de Fase 2:** IGV configurable + redondeo por línea (baja urgencia: IGV Perú fijo 18%); modelo SUNAT-ready (tipo comprobante/identidad) y NC/ND 100% conformes → se retoman al acercarnos a Fase 5 (emisión electrónica).

---

---

## FASE 3 — EJECUTADA y VERIFICADA (2026-08-11)

- ✅ **Costo promedio ponderado** en `emitirCompra`: `nuevo = (stockPrev*costoPrev + cant*costoCompra)/(stockPrev+cant)`; si no había costo, la compra lo establece. (Antes se pisaba con el último costo → margen ficticio.)
- ✅ **Stock reservado:** `disponible(p) = stock − reservado`. `validarStock` usa **disponible** (no se puede vender lo reservado). Cotizaciones con estado **Vigente/Reservada/Facturada** + botones **Reservar/Liberar**; `cotizAFactura` valida contra disponible+su propia reserva, **libera** su reserva y marca la cotización **Facturada**. Borrar una cotización reservada libera su reserva.
- ✅ **Control de crédito** (`chequeoCredito`): venta a Crédito bloquea si el cliente no tiene línea o si (deuda pendiente + esta venta) supera su línea. **El admin puede autorizar** (queda registrado); el vendedor no.
- ✅ Buscadores de venta/cotización y ficha de producto muestran **DISPONIBLE** (no stock físico); ficha añade Reservado/Disponible.

**Verificación:** `tests/fase3.test.js` — 11/11 (disponible/reserva bloquea sobreventa; crédito: permite bajo línea, bloquea exceso y sin línea; ponderado 10@100+10@120→110). **Suite total: 60/60** (fase0/1/2/2b/2c/3).

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

---

---

## FASE 4 — EJECUTADA y VERIFICADA (2026-08-11)

- ✅ **Búsqueda normalizada** (`norm` + `prodBlob` cacheado en `Map _blob` + `buscarProductos`): ignora guiones/espacios/mayúsculas → **`W71275` encuentra `W712/75`**; "últimos dígitos" = subcadena; multi-palabra (tokens, todos deben estar); busca por código, reemplazo, nº de parte, desc, marca y línea. Aplicada a **6 buscadores** (productos, venta, cotización, kardex, ajuste, global). Caché invalidada al editar/importar/restaurar.
- ✅ **Números de parte múltiples** (`partNumbers[]`): editable en el producto (textarea, uno por línea), mostrado en la ficha (chips), y **buscable**.
- ✅ **Teclado:** Enter agrega el primer resultado en venta/cotización; **F2** = nueva venta; **Ctrl+S** = emite el documento activo.
- ✅ **WhatsApp** (`whatsappCotiz`): botón verde en el historial de cotizaciones → abre `wa.me` con resumen y total (usa el teléfono del cliente, prefijo 51).

**Verificación:** `tests/fase4.test.js` — 12/12 (norm; `w71275`→`W712/75`; últimos dígitos; multi-palabra; número de parte; vacío→[]; límite). **Suite total: 72/72** (fase0/1/2/2b/2c/3/4).

**Diferido de Fase 4:** niveles de precio (mostrador/taller/flota), ubicación física (zona/estante/nivel), navegación con flechas ↑↓ en el dropdown (hoy Enter agrega el primero). Se retoman en una Fase 4b si el usuario los pide.

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

---

---

## FASE 4b — EJECUTADA y VERIFICADA (2026-08-11)

- ✅ **Niveles de precio** Mostrador/Taller/Flota (`NIVELES`, `precioNivel`, `clienteNivel`): el producto tiene precio base + Taller + Flota; el cliente tiene `nivelPrecio`; venta y cotización **aplican automáticamente** el precio del nivel del cliente (se ve junto al selector de cliente y recalcula al cambiar de cliente).
- ✅ **Ubicación física** (`producto.ubicacion`, ej. Z1-E3-N2): editable, **buscable** (en el blob), mostrada en resultados (📍) y en la ficha.
- ✅ **Navegación con flechas** ↑↓ en la búsqueda de venta y cotización (resalta con `.sres.hl`) + **Enter** agrega el resaltado.

**Verificación:** `tests/fase4b.test.js` — 8/8 (precioNivel por nivel + fallback al base; clienteNivel con default mostrador). **Suite total: 80/80** (fase0/1/2/2b/2c/3/4/4b).

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

---

---

## REPORTES GERENCIALES (2026-08-11)  [post-Fase 4b, sin backend]

- ✅ **Snapshot de costo** (en soles) por línea de venta (`costoSoles` en `emitirVenta`/`cotizAFactura`) → margen exacto en ventas nuevas.
- ✅ **Rentabilidad / Margen** (`VIEWS.repmargen`, `agregarRentabilidad`) — **solo admin** (en `ADMIN_VIEWS`): ventas (sin IGV), costo de lo vendido, utilidad y margen %, y utilidad por producto. Avisa si hay productos vendidos sin costo (margen inflado).
- ✅ **Ventas por Vendedor** (`VIEWS.repvendedor`, antes placeholder): ranking por monto, nº ventas, ticket promedio, por usuario auditado.
- ✅ **Stock Muerto** (`VIEWS.repstockmuerto`): productos con stock que nunca se vendieron + capital inmovilizado.

**Verificación:** `tests/reportes.test.js` — 6/6 (agregación de utilidad, exclusión de anuladas, margen %). **Suite total: 86/86**.

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

---

## MÓDULOS OPERATIVOS (2026-08-11)  [réplica potenciada del sistema anterior, sin backend]

> Contexto del usuario: "esos módulos se usan en el sistema anterior, ahora quiero que sea de otro nivel y más potente" → NO se borran los placeholders, se **construyen mejor**. Dato clave: **la empresa importa sus propios repuestos** → el **landed cost** es central, no accesorio.

- ✅ **Órdenes de Compra** (`VIEWS.ordenescompra`): OC a proveedor con estado (Pendiente/Recibida), correlativo por serie, y **recepción que genera la compra** (sube stock + costo ponderado) atómicamente.
- ✅ **Gastos** (`VIEWS.gastos`): registro de egresos por categoría con total, filtro y export.
- ✅ **Importación / Costo Aterrizado** (`VIEWS.importaciones`, `landedCost`): prorratea flete + seguro + aduana + otros sobre el valor FOB de cada ítem → **costo real puesto en almacén**; la recepción de la importación actualiza costo ponderado y stock. Test dedicado.
- ✅ **Guía de Remisión** (`VIEWS.guiaremision`): traslado con motivo, transportista, punto partida/llegada, correlativo serie T001; imprimible.
- ✅ **Nota de Débito** (`VIEWS.notasdebito`): documento relacionado + motivo (intereses/gastos), serie propia, imprimible.
- ✅ **Letras / Canje** (`VIEWS.letras`, `generarLetras`): canje de una deuda en **N cuotas** con vencimientos mensuales (la última letra ajusta el redondeo → suma exacta), estados Pendiente/Pagada/**Vencida** (por fecha). Test dedicado.
- ✅ **Retenciones / Percepciones** (`VIEWS`, `tributoModal`): regímenes SUNAT, importe = base × tasa (redondeo 2 dec), correlativos R001/P001, comprobante imprimible de cada tipo. Test dedicado.

**Verificación:** `tests/importacion.test.js` 8/8 · `tests/letras.test.js` 9/9 · `tests/tributos.test.js` 8/8. **Suite total: 111/111.**

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

---

---

## UTILIDADES FINALES (2026-08-11)  [cierre al 100% de los módulos, sin backend]

Con SCHEMA_VERSION al día (`cierres:[]`, `empresas:[]` en seed + normalize) y menú/roles cableados:

- ✅ **Lista de Precios** (`VIEWS.listaprecios`): tabla filtrable de todo el catálogo con los 4 niveles (Mostrador/Por Mayor/Taller/Flota), **export CSV** e **impresión** con membrete. Visible a todos (son precios de venta).
- ✅ **Cierre Mensual** (`VIEWS.cierremensual`, **solo admin**): KPIs de valor de inventario a costo + unidades + SKUs; botón **Cerrar mes** que guarda una foto histórica `{mes,fecha,valor,unidades,skus,usuario}` en `DB.cierres` (atómico, no re-cierra un mes ya cerrado); historial.
- ✅ **Unión de Código** (`VIEWS.unioncodigo`, `unirCodigos`, **solo admin**): fusiona dos productos duplicados → suma stock por almacén al destino, **reasigna los movimientos del kardex** (origen→destino) y elimina el origen; confirmación explícita, atómico. Test dedicado (no se pierde stock ni movimientos).
- ✅ **Empresas** (`VIEWS.empresas`, **solo admin**): CRUD de razones sociales / sucursales (`DB.empresas`).

**Verificación:** `tests/union.test.js` — 6/6 (origen se elimina y queda destino; stock 5+10=15 sin pérdida; suma por almacén; movimientos reasignados con código del destino; kardex intacto). **Suite total: 117/117** (fase0/1/2/2b/2c/3/4/4b/reportes/importacion/letras/tributos/union).

**Estado del sistema:** todos los módulos del SGAE anterior están **replicados y potenciados**. Ya no queda ningún módulo en placeholder genérico. El sistema es funcionalmente completo como ERP local (single-file + IndexedDB).

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

---

---

## CUENTAS CORRIENTES — Cobranzas / Pagos reales (2026-08-12)  [SCHEMA_VERSION 3→4]

> Origen: el usuario mostró capturas de su SGAE (Letras de Compra, CxP, CxC, Nota de Crédito, Registro de Compras, Kardex) — "algo así es y tiene que ser mucho mejor y profesional y potente". Mis CxC/CxP eran triviales (marcaban el documento entero como Pagado). Reconstruidas como **registros de cobranza/pago de verdad**, espejo entre sí (un solo motor).

- ✅ **Modelo v4:** cada venta/compra tiene `saldo` + `abonado`. **Migración v4** inicializa desde el estado actual (Pagada→saldo 0; resto→saldo=total), crea `cobranzas[]`/`pagosprov[]` y los correlativos **RC01** (recibo de cobranza) / **EG01** (egreso/pago), con backup-antes-de-migrar. Verificada idempotente sobre BD v3 simulada. Documentos nuevos (venta, compra, cotización→factura, recepción de OC) nacen con saldo/abonado.
- ✅ **Motor de abonos** (puro, aislado, testeado): `docSaldo` (defensivo con docs pre-v4), `aplicarAbonos` (abono parcial *a cuenta* con **tope: no se puede pagar más que el saldo**), `revertirAbonos` (al anular un recibo devuelve el saldo), `estadoPorSaldo` (Pagada/Parcial/Pendiente).
- ✅ **CxC / CxP (VIEWS.cobrar / VIEWS.pagos = `renderCuentas`):** pestañas **Registrar / Historial**. Registro: filtro por cliente/proveedor + estado, tabla de documentos con **A cuenta** (input) y **Saldo nuevo en vivo**, botón "Todo" por fila; panel de pago con **medio de pago, banco, N° operación, cobrador (CxC) / fecha diferida de cheque (CxP), caja, moneda, TC, observación**; total a cobrar/pagar en vivo. **GRABAR** aplica los abonos atómicamente (`commit`), genera **recibo** (RC01/EG01) e imprime. Historial: lista de recibos con **Imprimir** y **Anular** (reversa el saldo, no borra).
- ✅ **KPIs por saldo real:** dashboard, Ventas, Compras, Reportes y el control de crédito (`deudaCliente`) ahora usan `docSaldo` → el "por cobrar/pagar" **baja con cada abono parcial** (antes mostraba el total aunque estuviera parcialmente pagado).

**Verificación:** `tests/cobranzas.test.js` — 13/13 (abono parcial deja saldo exacto; segundo abono cierra; **rechaza pagar de más**; un recibo a varios docs; anular devuelve saldo; docSaldo defensivo). **Suite total: 130/130.**

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

**Siguiente (según capturas del usuario, en orden):** Letras de **Compra** (proveedor → adjuntar facturas → generar letras con vencimientos; hoy Letras es un canje genérico); **Kardex** con saldo corrido (Inicial/Ingreso/Salida/Final + almacén/TC/costo por movimiento); **Registro de Compras** con período tributario, guía, distrito y atajos F1–F6.

---

---

## LETRAS DE COMPRA — Canje de facturas (2026-08-12)

> Captura del usuario: "Registro de Letras de Compra" (proveedor → adjuntar facturas → generar letras con vencimientos; Consulta con saldo/estado/PDF). Mi módulo Letras era un canje de un monto tecleado. Ahora canjea **facturas reales seleccionadas**.

- ✅ **`canjearDocs(docs, ids, n, venc0, meta)`** (puro, testeado): toma las facturas seleccionadas (compras o ventas), **transfiere su saldo a N letras que suman EXACTO el total** (la última ajusta el redondeo, vía `generarLetras`), y marca cada factura como **'Canjeada'** con saldo 0 → sale de CxC/CxP. La deuda no se pierde: pasa de "facturas" a "letras".
- ✅ **UI de canje** (`canjeDocModal` + `cjRenderBox`/`cjRefreshPreview`): botón "Canje de facturas" en Letras. Elige proveedor/cliente → ve sus facturas pendientes (checkboxes) → configura Nº de letras + 1er vencimiento + banco → **panel espejo Facturas ↔ Letras** con verificación de que **Total facturas = Total letras** (verde/rojo). GRABAR crea las letras (`commit` atómico) y canjea las facturas. Sirve para Letras de **Compra** (tab Por Pagar) y de **Venta** (tab Por Cobrar).
- ✅ **Control de crédito honesto:** `deudaCliente` ahora suma también las **letras por cobrar pendientes** del cliente → canjear una factura a letra no libera crédito indebidamente (la factura se canjeó, pero el cliente sigue debiendo).

**Verificación:** `tests/letras.test.js` ampliado a 9 (canje: total 500+300=800 preservado en 4 letras; facturas quedan Canjeadas/saldo 0; letras por pagar del proveedor; referencia a las facturas; doc sin saldo no genera letras). **Suite total: 137/137.**

**Publicado:** push `main` → `https://ornatajewelryperu.com/sistema.html`.

**Siguiente:** Kardex con saldo corrido (Inicial/Ingreso/Salida/Final + almacén/TC/costo) y Registro de Compras con período/guía/distrito/atajos F1–F6. Pendiente menor de este módulo: reversa del canje (hoy no restaura la factura si borras la letra) e integrar letras por pagar dentro del panel de CxP.

---

---

## PENDIENTE / decisión del usuario
- **Dominio propio:** el usuario TIENE un dominio (nombre por confirmar). Opción rápida sin costo: publicar el sistema en su dominio vía GitHub Pages (sigue siendo datos por-PC). Se interrumpió la pregunta; retomar cuando lo indique.
- **FASE 5 (Backend + SUNAT):** la única que exige servidor (multiusuario real + facturación electrónica). Costo mensual + proveedor OSE/PSE. Proyecto grande. **Es el único gran bloque que falta** ahora que los módulos están completos.
- Ideas menores sin backend si las pide: CxC con antigüedad 30/60/90 + estado de cuenta PDF; navegación con flechas en más buscadores; dashboards adicionales.

## Próximo paso — FASE 5 (Backend + SUNAT) — la ÚNICA que exige servidor
Gatillo: un 2º usuario concurrente o la obligación de emitir electrónicamente. Implica: backend como capa de sync detrás de la capa de datos (offline-first), facturación electrónica (XML UBL + firma + OSE/PSE + CDR + QR), GRE, export PLE. Es un proyecto en sí mismo (semanas). La bisagra ya existe (`commit`).
Alternativa antes de Fase 5: **Fase 4b** (niveles de precio, ubicación física) o pulido, todo aún sin backend.
Esperando indicación del usuario.
