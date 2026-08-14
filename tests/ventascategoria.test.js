/* Verificación — Ventas por Línea/Marca (agrupación con rango de fechas).
   Correr: node tests/ventascategoria.test.js */
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
eval(extractFn('ventasPorCategoria'));
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }
const near=(a,b)=>Math.abs(a-b)<0.005;

(function(){
  const productos=[
    {id:'p1', codigo:'FIL-1', linea:'Filtros', marca:'MANN'},
    {id:'p2', codigo:'FIL-2', linea:'Filtros', marca:'BOSCH'},
    {id:'p3', codigo:'FRE-1', linea:'Frenos',  marca:'BREMBO'},
  ];
  const ventas=[
    {fecha:'2026-08-01', estado:'Pagada', lineas:[{prodId:'p1',cant:2,precio:100},{prodId:'p3',cant:1,precio:300}]}, // Filtros 200, Frenos 300
    {fecha:'2026-08-10', estado:'Pagada', lineas:[{prodId:'p2',cant:5,precio:20}]},                                   // Filtros 100
    {fecha:'2026-08-20', estado:'Anulada', lineas:[{prodId:'p3',cant:9,precio:300}]},                                  // ignorada (anulada)
  ];

  console.log('\n[1] Agrupar por Línea');
  let r=ventasPorCategoria(ventas, productos, 'linea', '', '');
  const filtros=r.find(x=>x.cat==='Filtros'), frenos=r.find(x=>x.cat==='Frenos');
  ok(near(filtros.importe,300) && filtros.cant===7, 'Filtros = 200 + 100 = 300 (7 unidades)');
  ok(near(frenos.importe,300) && frenos.cant===1, 'Frenos = 300 (1 unidad)');
  ok(r[0].importe>=r[1].importe, 'ordenado por importe descendente');
  ok(!r.some(x=>x.cat==='Frenos' && x.cant===9), 'la venta ANULADA no cuenta');

  console.log('\n[2] Agrupar por Marca');
  r=ventasPorCategoria(ventas, productos, 'marca', '', '');
  ok(near(r.find(x=>x.cat==='MANN').importe,200), 'MANN = 200');
  ok(near(r.find(x=>x.cat==='BOSCH').importe,100), 'BOSCH = 100');
  ok(near(r.find(x=>x.cat==='BREMBO').importe,300), 'BREMBO = 300');

  console.log('\n[3] Rango de fechas');
  r=ventasPorCategoria(ventas, productos, 'linea', '2026-08-05', '2026-08-15');
  ok(r.length===1 && r[0].cat==='Filtros' && near(r[0].importe,100), 'del 05 al 15 solo entra la 2da venta (Filtros 100)');

  console.log('\n[4] Producto sin categoría');
  const r2=ventasPorCategoria([{fecha:'2026-08-01',estado:'Pagada',lineas:[{prodId:'zzz',codigo:'NA',cant:1,precio:50}]}], productos, 'linea', '', '');
  ok(r2[0].cat==='(sin línea)' && near(r2[0].importe,50), 'línea desconocida → "(sin línea)"');

  console.log('\n================  RESULTADO VENTAS POR CATEGORÍA  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('=================================================================');
  process.exit(fail?1:0);
})();
