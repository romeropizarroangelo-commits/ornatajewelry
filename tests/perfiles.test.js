/* Verificación — Perfiles (permisos granulares por página/acción; herencia por rol).
   Correr: node tests/perfiles.test.js */
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
// ADMIN_VIEWS que usa permActual (réplica del set real):
const ADMIN_VIEWS=new Set(['configuracion','perfiles','repmargen','cierremensual','unioncodigo','empresas','reppagos']);
eval(extractFn('permActual'));
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }

(function(){
  console.log('\n[1] Herencia por rol cuando NO hay matriz definida');
  ok(permActual({}, 'clientes', 'ver')===true, 'usuario sin matriz: puede VER una página normal (clientes)');
  ok(permActual({}, 'clientes', 'eliminar')===true, 'usuario sin matriz: puede eliminar en página normal (comportamiento actual)');
  ok(permActual({}, 'configuracion', 'ver')===false, 'usuario sin matriz: NO ve una vista de admin (configuración)');
  ok(permActual({}, 'perfiles', 'ver')===false, 'usuario sin matriz: NO ve Perfiles (admin)');

  console.log('\n[2] La matriz explícita manda sobre la herencia');
  ok(permActual({permisos:{clientes:{ver:false}}}, 'clientes', 'ver')===false, 'si le quitas VER a clientes → no ve clientes');
  ok(permActual({permisos:{ventas:{anular:false}}}, 'ventas', 'anular')===false, 'si le quitas ANULAR en ventas → no puede anular');
  ok(permActual({permisos:{ventas:{anular:true}}}, 'ventas', 'anular')===true, 'si le das ANULAR en ventas → puede anular');
  ok(permActual({permisos:{configuracion:{ver:true}}}, 'configuracion', 'ver')===true, 'un admin puede conceder VER de una vista admin a un vendedor');

  console.log('\n[3] Acciones no definidas caen a la herencia');
  ok(permActual({permisos:{clientes:{ver:true}}}, 'clientes', 'registrar')===true, 'define VER pero no REGISTRAR → registrar hereda (permitido en página normal)');
  ok(permActual({permisos:{configuracion:{ver:true}}}, 'configuracion', 'editar')===false, 'concede VER config pero EDITAR no definido → hereda (bloqueado, vista admin)');

  console.log('\n================  RESULTADO PERFILES  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('=====================================================');
  process.exit(fail?1:0);
})();
