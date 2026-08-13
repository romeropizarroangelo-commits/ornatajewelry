/* Verificación — Kardex con saldo corrido (reconcilia exactamente con el stock actual).
   Correr: node tests/kardex.test.js */
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
eval(extractFn('kardexCorrido'));
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }

(function(){
  console.log('\n[1] Saldo corrido reconstruido desde el stock actual');
  // Stock actual 10. Movimientos (cronológicos): compra +5, venta -3, ajuste +2  → neto +4
  // Saldo antes del primer movimiento = 10 − 4 = 6.
  const movs=[
    {tipo:'COMPRA', cant:5}, {tipo:'VENTA', cant:-3}, {tipo:'AJUSTE', cant:2},
  ];
  const kc=kardexCorrido(movs, 10);
  ok(kc.saldoBase===6, 'saldo inicial (antes del 1er movimiento) = 10 − 4 = 6');
  ok(kc.filas[0].antes===6 && kc.filas[0].saldo===11, '1º: 6 +5 = 11');
  ok(kc.filas[1].antes===11 && kc.filas[1].saldo===8, '2º: 11 −3 = 8');
  ok(kc.filas[2].saldo===10, '3º: 8 +2 = 10');
  ok(kc.saldoFinal===10, 'el saldo final del kardex = STOCK ACTUAL (cuadra siempre)');
  ok(kc.ingresos===7 && kc.salidas===3, 'ingresos 5+2=7, salidas 3');

  console.log('\n[2] Sin movimientos → saldo base = stock actual');
  const kc2=kardexCorrido([], 42);
  ok(kc2.saldoBase===42 && kc2.saldoFinal===42 && kc2.filas.length===0, 'stock 42 sin movimientos: base y final = 42');

  console.log('\n[3] recordMov guarda foto de costo y acepta razón social');
  const src=extractFn('recordMov');
  ok(/costo:Number\(p\.costo\)\|\|0/.test(src), 'cada movimiento guarda una foto del costo del producto');
  ok(/Object\.assign\(/.test(src) && /extra\|\|\{\}/.test(src), 'acepta datos extra (razón, precio, tc) sin romper llamadas antiguas');

  console.log('\n================  RESULTADO KARDEX  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('===================================================');
  process.exit(fail?1:0);
})();
