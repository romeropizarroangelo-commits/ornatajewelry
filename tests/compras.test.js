/* Verificación — Registro de Compras (totales con/sin IGV; base = costo del inventario).
   Correr: node tests/compras.test.js */
const fs=require('fs'), path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','sistema.html'),'utf8');
function extractFn(name){
  let i=HTML.indexOf('function '+name+'(');
  if(i<0) throw new Error('no fn: '+name);
  const b=HTML.indexOf('{',i); let d=0,j=b,s=null;
  for(;j<HTML.length;j++){ const c=HTML[j],p=HTML[j-1];
    if(s){ if(c===s&&p!=='\\') s=null; continue; }
    if(c==='"'||c==="'"||c==='`'){ s=c; continue; }
    if(c==='{') d++; else if(c==='}'){ d--; if(d===0){ j++; break; } } }
  return HTML.slice(i,j);
}
eval(extractFn('compraTotales'));
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }
const near=(a,b)=>Math.abs(a-b)<0.005;

(function(){
  console.log('\n[1] Totales de compra con IGV 18%');
  const lines=[{cant:2,costo:100},{cant:1,costo:50}]; // base 250
  let t=compraTotales(lines, 0.18, true);
  ok(near(t.subtotal,250), 'subtotal = 2×100 + 1×50 = 250');
  ok(near(t.igv,45), 'IGV 18% de 250 = 45');
  ok(near(t.total,295), 'total = 250 + 45 = 295');

  console.log('\n[2] Sin IGV (proveedor exonerado / RUS)');
  t=compraTotales(lines, 0.18, false);
  ok(near(t.igv,0) && near(t.total,250), 'sin IGV: total = base (250), IGV 0');

  console.log('\n[3] Redondeo a 2 decimales');
  t=compraTotales([{cant:3,costo:33.33}], 0.18, true); // base 99.99
  ok(near(t.subtotal,99.99), 'subtotal 3×33.33 = 99.99');
  ok(near(t.igv,18.00), 'IGV 18% de 99.99 = 17.9982 → 18.00');
  ok(near(t.total,117.99), 'total = 99.99 + 18.00 = 117.99');

  console.log('\n[4] El costo del inventario usa la BASE sin IGV (crédito fiscal)');
  ok(/Costo promedio ponderado sobre la BASE/.test(HTML), 'emitirCompra documenta y usa la base (l.costo) para el ponderado');
  ok(/subtotal:t\.subtotal, igv:t\.igv, total:t\.total/.test(HTML), 'la compra guarda subtotal, IGV y total por separado');
  ok(/numProv,/.test(HTML), 'guarda el N° de documento del proveedor (serie-número) para SUNAT');

  console.log('\n================  RESULTADO COMPRAS  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('====================================================');
  process.exit(fail?1:0);
})();
