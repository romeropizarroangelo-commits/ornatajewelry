/* Verificación — Letras (canje en N cuotas + vencidas).
   Correr: node tests/letras.test.js */
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
const near=(a,b)=>Math.abs(a-b)<1e-9;

(function(){
  function R2(n){ return Math.round((Number(n)||0)*100)/100; } // disponible para las funciones eval'd
  console.log('\n[1] Canje de una deuda en N letras (generarLetras)');
  eval(extractFn('addMonths')+'\n'+extractFn('generarLetras'));

  // 1000 en 3 letras: 333.33 + 333.33 + 333.34 = 1000 exacto (la última ajusta)
  let r=generarLetras(1000, 3, '2026-08-11');
  ok(r.length===3, 'genera 3 letras');
  ok(near(r.reduce((s,l)=>s+l.monto,0), 1000), 'la suma de las 3 letras = 1000 EXACTO (no se pierde ni sobra)');
  ok(r[0].monto===333.33 && r[2].monto===333.34, 'la última letra ajusta el redondeo (333.34)');
  ok(r[0].fechaVencimiento==='2026-08-11' && r[1].fechaVencimiento==='2026-09-11' && r[2].fechaVencimiento==='2026-10-11', 'vencimientos mensuales correctos');

  // 1 sola letra = el total
  r=generarLetras(500, 1, '2026-08-11');
  ok(r.length===1 && r[0].monto===500, '1 letra = monto total');

  // cruce de año en vencimientos
  r=generarLetras(200, 2, '2026-12-15');
  ok(r[1].fechaVencimiento==='2027-01-15', 'el vencimiento cruza de año correctamente (dic→ene)');

  console.log('\n[2] Estado Vencida');
  eval(extractFn('letraSaldo')+'\n'+extractFn('letraEstado'));
  const ayer='2000-01-01';
  ok(letraEstado({estado:'Pendiente',monto:100,saldo:100,fechaVencimiento:ayer})==='Vencida', 'pendiente con fecha pasada → Vencida');
  ok(letraEstado({estado:'Pagada',monto:100,saldo:0,fechaVencimiento:ayer})==='Pagada', 'pagada nunca es vencida');
  ok(letraEstado({estado:'Pendiente',monto:100,saldo:100,fechaVencimiento:'2999-01-01'})==='Pendiente', 'pendiente futura → Pendiente');
  ok(letraEstado({estado:'Parcial',monto:100,saldo:40,fechaVencimiento:'2999-01-01'})==='Parcial', 'con abono parcial y sin vencer → Parcial');

  console.log('\n[3] Canje de facturas en letras (Letras de Compra)');
  let _u=0; function uid(){ return 'u'+(++_u); }
  eval((HTML.match(/const R2 = [^\n]+/)||[''])[0]+'\n'+extractFn('docSaldo')+'\n'+extractFn('esPendienteDoc')+'\n'+extractFn('canjearDocs'));
  const compras=[
    {id:'c1', num:'F-100', fecha:'2026-08-01', total:500, saldo:500, abonado:0, estado:'Pendiente'},
    {id:'c2', num:'F-101', fecha:'2026-08-02', total:300, saldo:300, abonado:0, estado:'Pendiente'},
  ];
  const rc=canjearDocs(compras, ['c1','c2'], 4, '2026-09-01', {grupo:'g1', base:'LC-1', tipo:'pagar', entidad:'Proveedor X', hoy:'2026-08-12'});
  ok(near(rc.total,800), 'total canjeado = 500 + 300 = 800');
  ok(rc.letras.length===4, 'genera 4 letras');
  ok(near(rc.letras.reduce((s,l)=>s+l.monto,0),800), 'las 4 letras suman EXACTO 800 (no se pierde deuda)');
  ok(compras.every(c=>c.estado==='Canjeada' && docSaldo(c)===0), 'las facturas quedan Canjeadas con saldo 0 (salen de CxP)');
  ok(rc.letras.every(l=>l.tipo==='pagar' && l.entidad==='Proveedor X'), 'las letras son por pagar del proveedor');
  ok(rc.letras[0].docRef==='F-100, F-101', 'la letra referencia las facturas canjeadas');
  const rc2=canjearDocs([{id:'p',num:'F-9',total:100,saldo:0,estado:'Pagada'}], ['p'], 1, '2026-09-01', {grupo:'g',base:'LC-2',tipo:'pagar',entidad:'X',hoy:'2026-08-12'});
  ok(rc2.letras.length===0, 'un documento sin saldo NO genera letras');

  console.log('\n[4] Anular canje restaura las facturas (revertirCanje)');
  eval(extractFn('estadoPorSaldo')+'\n'+extractFn('revertirCanje'));
  var DB={ ventas:[], compras:[
    {id:'x1', num:'F-200', total:500, saldo:500, abonado:0, estado:'Pendiente'},
    {id:'x2', num:'F-201', total:300, saldo:300, abonado:0, estado:'Pendiente'},
  ], letras:[] };
  const rr=canjearDocs(DB.compras, ['x1','x2'], 3, '2026-09-01', {grupo:'gX', base:'LC-9', tipo:'pagar', entidad:'Prov', hoy:'2026-08-12'});
  rr.letras.forEach(l=>DB.letras.push(l));
  ok(DB.compras.every(c=>c.estado==='Canjeada') && DB.letras.length===3, 'canje: 2 facturas Canjeadas + 3 letras');
  revertirCanje('gX');
  ok(DB.letras.length===0, 'anular el canje elimina las 3 letras del grupo');
  ok(DB.compras.find(c=>c.id==='x1').estado==='Pendiente' && docSaldo(DB.compras.find(c=>c.id==='x1'))===500, 'F-200 vuelve a Pendiente con saldo 500');
  ok(DB.compras.find(c=>c.id==='x2').saldo===300, 'F-201 vuelve a saldo 300 (deuda restaurada, no se pierde)');

  console.log('\n[5] Saldo de letra (pago parcial)');
  eval(extractFn('letraSaldo'));
  ok(letraSaldo({monto:300,saldo:300,estado:'Pendiente'})===300, 'saldo inicial = monto');
  ok(letraSaldo({monto:300,saldo:120,estado:'Parcial'})===120, 'con abono, el saldo refleja lo que falta (120)');
  ok(letraSaldo({monto:300,estado:'Pagada'})===0, 'pagada → saldo 0');
  ok(letraSaldo({monto:300})===300, 'letra antigua sin campo saldo → usa el monto');

  console.log('\n================  RESULTADO LETRAS  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('===================================================');
  process.exit(fail?1:0);
})();
