/* Verificación — Dashboard (resumen de ventas del mes: total, base, costo, utilidad).
   Correr: node tests/dashboard.test.js */
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
const R2=n=>Math.round((Number(n)||0)*100)/100;
let DB;  // resumenMesVentas usa DB global
eval(extractFn('resumenMesVentas'));
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }
const near=(a,b)=>Math.abs(a-b)<0.005;

(function(){
  DB={ ventas:[
    {fecha:'2026-08-05', estado:'Pagada', total:118, subtotal:100, lineas:[{cant:2,costoSoles:30}]},   // base 100, costo 60
    {fecha:'2026-08-20', estado:'Pagada', total:59,  subtotal:50,  lineas:[{cant:1,costoSoles:20}]},   // base 50, costo 20
    {fecha:'2026-08-25', estado:'Anulada',total:999, subtotal:800, lineas:[{cant:9,costoSoles:50}]},   // ignorada
    {fecha:'2026-07-10', estado:'Pagada', total:200, subtotal:170, lineas:[{cant:1,costoSoles:100}]},  // otro mes
  ]};
  const ago=resumenMesVentas({desde:'2026-08-01', hasta:'2026-08-31'});
  ok(ago.n===2, 'cuenta 2 ventas de agosto (excluye la anulada y la de julio)');
  ok(near(ago.total,177), 'ventas del mes (con IGV) = 118 + 59 = 177');
  ok(near(ago.base,150), 'base imponible del mes = 100 + 50 = 150');
  ok(near(ago.costo,80), 'costo vendido = 2×30 + 1×20 = 80');
  ok(near(ago.utilidad,70), 'utilidad = base 150 − costo 80 = 70');

  const jul=resumenMesVentas({desde:'2026-07-01', hasta:'2026-07-31'});
  ok(jul.n===1 && near(jul.total,200), 'julio: 1 venta, total 200 (aísla por mes)');
  ok(near(jul.utilidad,70), 'julio utilidad = 170 − 100 = 70');

  const vacio=resumenMesVentas({desde:'2026-01-01', hasta:'2026-01-31'});
  ok(vacio.n===0 && vacio.total===0 && vacio.utilidad===0, 'mes sin ventas → todo 0 (no rompe)');

  console.log('\n================  RESULTADO DASHBOARD  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('======================================================');
  process.exit(fail?1:0);
})();
