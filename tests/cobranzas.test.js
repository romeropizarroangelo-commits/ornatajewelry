/* Verificación — Cuentas por Cobrar / Pagar (motor de abonos: a cuenta, saldo nuevo, anulación).
   Correr: node tests/cobranzas.test.js */
const fs=require('fs'), path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','sistema.html'),'utf8');
function extractFn(name){
  let i=HTML.indexOf('async function '+name+'('); if(i<0) i=HTML.indexOf('function '+name+'(');
  if(i<0) throw new Error('no fn: '+name);
  const b=HTML.indexOf('{',i); let d=0,j=b,s=null;
  for(;j<HTML.length;j++){ const c=HTML[j],p=HTML[j-1];
    if(s){ if(c===s&&p!=='\\') s=null; continue; }
    if(c==='"'||c==="'"||c==='`'){ s=c; continue; }
    if(c==='{') d++; else if(c==='}'){ d--; if(d===0){ j++; break; } } }
  return HTML.slice(i,j);
}
// Motor real extraído del sistema (R2 + saldo + estado + aplicar + revertir):
const src=[
  (HTML.match(/const R2 = [^\n]+/)||[''])[0],
  extractFn('docSaldo'), extractFn('estadoPorSaldo'),
  extractFn('aplicarAbonos'), extractFn('revertirAbonos'),
].join('\n');
eval(src);

let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }
const near=(a,b)=>Math.abs(a-b)<0.005;

(function(){
  console.log('\n[1] Abono parcial (a cuenta) — saldo nuevo exacto');
  const f={id:'f1', num:'F001-1', total:1000, saldo:1000, abonado:0, estado:'Pendiente'};
  let r=aplicarAbonos([f], [{docId:'f1', abono:300}]);
  ok(near(r.aplicado,300) && !r.errores.length, 'aplica 300 sin errores');
  ok(near(f.saldo,700) && near(f.abonado,300), 'saldo 1000 − 300 = 700, abonado 300');
  ok(f.estado==='Parcial', 'estado pasa a Parcial (pago incompleto)');

  console.log('\n[2] Segundo abono cierra la deuda');
  r=aplicarAbonos([f], [{docId:'f1', abono:700}]);
  ok(near(f.saldo,0) && f.estado==='Pagada', 'salda el resto → saldo 0, estado Pagada');

  console.log('\n[3] No se puede pagar MÁS que el saldo');
  const g={id:'g1', num:'F001-2', total:500, saldo:500, abonado:0, estado:'Pendiente'};
  r=aplicarAbonos([g], [{docId:'g1', abono:600}]);
  ok(r.errores.length===1, 'un abono de 600 sobre saldo 500 → error');
  ok(g.saldo===500 && g.abonado===0 && g.estado==='Pendiente', 'el documento NO se modifica si el abono es inválido');

  console.log('\n[4] Un recibo aplica a varios documentos');
  const a={id:'a', num:'A', total:100, saldo:100, abonado:0, estado:'Pendiente'};
  const b={id:'b', num:'B', total:200, saldo:200, abonado:0, estado:'Pendiente'};
  r=aplicarAbonos([a,b], [{docId:'a',abono:100},{docId:'b',abono:50}]);
  ok(near(r.aplicado,150), 'total aplicado = 100 + 50 = 150');
  ok(a.estado==='Pagada' && b.estado==='Parcial' && near(b.saldo,150), 'A queda Pagada, B Parcial con saldo 150');

  console.log('\n[5] Anular recibo devuelve el saldo (revertirAbonos)');
  revertirAbonos([a,b], [{docId:'a',abono:100},{docId:'b',abono:50}]);
  ok(near(a.saldo,100) && a.estado==='Pendiente', 'A vuelve a saldo 100 / Pendiente');
  ok(near(b.saldo,200) && b.estado==='Pendiente' && near(b.abonado,0), 'B vuelve a saldo 200 / Pendiente / abonado 0');

  console.log('\n[6] docSaldo defensivo (documentos previos a la migración v4)');
  ok(docSaldo({estado:'Pendiente', total:500})===500, 'sin campo saldo y Pendiente → usa el total (500)');
  ok(docSaldo({estado:'Pagada', total:500})===0, 'sin campo saldo y Pagada → 0');
  ok(docSaldo({estado:'Anulada', total:500, saldo:500})===0, 'Anulada → 0 (no cuenta como deuda)');

  console.log('\n================  RESULTADO COBRANZAS/PAGOS  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('============================================================');
  process.exit(fail?1:0);
})();
