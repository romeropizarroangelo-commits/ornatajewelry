/* Verificación — Unión de Código (fusión de productos sin perder stock ni movimientos).
   Correr: node tests/union.test.js */
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
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }

(function(){
  console.log('\n[1] Unión de código — no se pierde stock ni movimientos');
  let DB={
    productos:[
      {id:'o', codigo:'DUP-1', desc:'Filtro (duplicado)', pri:3, cie:2, vit:0, mer:0, stock:5},
      {id:'d', codigo:'FIL-1', desc:'Filtro (bueno)',     pri:10,cie:0, vit:0, mer:0, stock:10},
    ],
    movimientos:[ {id:'m1',prodId:'o',codigo:'DUP-1',tipo:'VENTA',cant:-1}, {id:'m2',prodId:'d',codigo:'FIL-1',tipo:'COMPRA',cant:5} ],
  };
  function invalidarBlob(){}
  eval(extractFn('unirCodigos'));
  const o=DB.productos.find(p=>p.id==='o'), d=DB.productos.find(p=>p.id==='d');
  const stockTotalAntes=o.stock+d.stock;
  unirCodigos(o,d);

  ok(DB.productos.length===1 && DB.productos[0].id==='d', 'el producto origen se elimina, queda el destino');
  ok(DB.productos[0].stock===stockTotalAntes, `el stock se suma sin perderse (5+10=${stockTotalAntes})`);
  ok(DB.productos[0].pri===13 && DB.productos[0].cie===2, 'suma por almacén (pri 3+10=13, cie 2+0=2)');
  ok(DB.movimientos.every(m=>m.prodId==='d'), 'los movimientos del origen se reasignan al destino');
  ok(DB.movimientos.find(m=>m.id==='m1').codigo==='FIL-1', 'el movimiento reasignado toma el código del destino');
  ok(DB.movimientos.length===2, 'no se pierde ningún movimiento del kardex');

  console.log('\n================  RESULTADO UNIÓN  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('==================================================');
  process.exit(fail?1:0);
})();
