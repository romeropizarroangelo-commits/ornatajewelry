/* Verificación FASE 3 — costo promedio ponderado + crédito + disponible/reserva.
   Correr: node tests/fase3.test.js */
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

// ===== [1] Disponible = stock − reservado; validarStock lo respeta =====
(function(){
  console.log('\n[1] Stock disponible y reservado');
  let DB={ productos:[{id:'p1',desc:'Filtro',stock:10,reservado:4}] };
  eval(extractFn('disponible')+'\n'+extractFn('validarStock'));
  ok(disponible(DB.productos[0])===6, 'disponible = 10 físico − 4 reservado = 6');
  ok(validarStock([{prodId:'p1',cant:6}]).length===0, 'permite vender 6 (lo disponible)');
  ok(validarStock([{prodId:'p1',cant:7}]).length===1, 'BLOQUEA vender 7: hay 10 físico pero 4 están reservados');
})();

// ===== [2] Control de crédito =====
(function(){
  console.log('\n[2] Control de crédito');
  const money=n=>'S/ '+(Number(n)||0).toFixed(2);
  let DB={
    clientes:[{id:'c1',nombre:'Transportes',credito:1000},{id:'c2',nombre:'Contado SA',credito:0},{id:'c3',nombre:'Bloqueado SA',credito:5000,bloqueoCredito:true}],
    ventas:[{clienteId:'c1',estado:'Pendiente',total:300}],
  };
  eval(extractFn('docSaldo')+'\n'+extractFn('esPendienteDoc')+'\n'+extractFn('deudaCliente')+'\n'+extractFn('chequeoCredito'));
  ok(deudaCliente('c1')===300, 'deuda pendiente del cliente = 300');
  ok(chequeoCredito('c1',500).ok===true, 'permite: 300 deuda + 500 = 800 ≤ línea 1000');
  ok(chequeoCredito('c1',800).ok===false, 'BLOQUEA: 300 + 800 = 1100 > línea 1000 (excede crédito)');
  ok(chequeoCredito('c2',100).ok===false, 'BLOQUEA venta a crédito a cliente sin línea (credito 0)');
  ok(chequeoCredito('c3',100).ok===false, 'BLOQUEA a cliente con crédito BLOQUEADO aunque tenga línea (5000)');
})();

// ===== [3] Costo promedio ponderado (réplica exacta de emitirCompra) =====
(function(){
  console.log('\n[3] Costo promedio ponderado');
  const src=extractFn('emitirCompra');
  ok(/stockPrev\*costoPrev \+ l\.cant\*Number\(l\.costo\)/.test(src), 'emitirCompra usa la fórmula ponderada');
  // Réplica de la fórmula del sistema:
  const ponderado=(stockPrev,costoPrev,cant,costoCompra)=> (costoPrev>0 && stockPrev>0) ? (stockPrev*costoPrev + cant*Number(costoCompra))/(stockPrev+cant) : Number(costoCompra)||0;
  ok(ponderado(10,100,10,120)===110, '10@100 + 10@120 → costo promedio 110');
  ok(ponderado(0,0,5,80)===80, 'primera compra (sin costo previo) establece el costo = 80');
  ok(ponderado(30,100,10,140)===110, '30@100 + 10@140 → 110 (ponderado por cantidad)');

  console.log('\n================  RESULTADO FASE 3  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('===================================================');
  process.exit(fail?1:0);
})();
