/* Verificación — Importación de datos reales (mapeo de filas CSV a cliente/proveedor).
   Correr: node tests/importdatos.test.js */
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
eval(extractFn('mapClienteRow')+'\n'+extractFn('mapProveedorRow'));
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }

(function(){
  console.log('\n[1] Cliente — nombres de columna flexibles');
  let c=mapClienteRow({razonsocial:'Transportes SAC', ruc:'20512345678', lineacredito:'5000', correo:'a@b.pe', vendedor:'SILVIA'});
  ok(c.nombre==='Transportes SAC', 'razonsocial → nombre');
  ok(c.doc==='20512345678' && c.tipoDoc==='RUC' && c.tipoCliente==='Jurídica', 'RUC (11 díg.) → tipoDoc RUC, Jurídica');
  ok(c.credito===5000, 'lineacredito → credito numérico');
  ok(c.correo1==='a@b.pe' && c.email==='a@b.pe', 'correo → correo1 y email');
  ok(c.vendedor==='SILVIA' && c.estado==='Activo', 'vendedor y estado por defecto Activo');

  console.log('\n[2] Cliente — DNI detecta persona natural');
  c=mapClienteRow({nombre:'Juan Perez', dni:'45678901'});
  ok(c.tipoDoc==='DNI' && c.tipoCliente==='Natural', 'DNI (8 díg.) → DNI, Natural');

  console.log('\n[3] Proveedor');
  let p=mapProveedorRow({razonsocial:'Import Andinas', ruc:'20601122334', telefono:'014567890', correo:'c@d.pe'});
  ok(p.nombre==='Import Andinas' && p.doc==='20601122334', 'razonsocial→nombre, ruc→doc');
  ok(p.tel==='014567890' && p.email==='c@d.pe', 'telefono→tel, correo→email');

  console.log('\n[4] Sin nombre → objeto igual pero el import lo descarta (nombre vacío)');
  ok(mapClienteRow({ruc:'123'}).nombre==='', 'fila sin nombre → nombre vacío (se filtra al importar)');

  console.log('\n================  RESULTADO IMPORT DATOS  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('=========================================================');
  process.exit(fail?1:0);
})();
