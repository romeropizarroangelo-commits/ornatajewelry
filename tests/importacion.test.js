/* Verificación — Importación / costo aterrizado (prorrateo de flete+seguro+aduana).
   Correr: node tests/importacion.test.js */
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
const near=(a,b)=>Math.abs(a-b)<1e-6;

(function(){
  console.log('\n[1] Costo aterrizado (landedCost) — prorrateo por valor FOB');
  eval(extractFn('landedCost'));

  // Producto A: 10 u x $100 = $1000 FOB ; Producto B: 10 u x $100 = $1000 FOB. Total FOB $2000.
  // Costos extra: flete 200 + aduana 200 = 400. Prorrateo 50/50 → +200 c/u → +20/u.
  let r=landedCost([{fob:100,cant:10},{fob:100,cant:10}], {flete:200,aduana:200});
  ok(near(r[0].landedUnit,120), 'reparto parejo: FOB 100 + prorrateo 20 = 120/u');
  ok(near(r[0].prorrateo,200) && near(r[1].prorrateo,200), 'cada línea recibe 200 de los 400 de costos');

  // Prorrateo PROPORCIONAL al FOB: A=$1500 (75%), B=$500 (25%). Extra 400 → A:300, B:100.
  r=landedCost([{fob:150,cant:10},{fob:50,cant:10}], {flete:400});
  ok(near(r[0].prorrateo,300), 'la línea de mayor valor FOB absorbe más costo (300)');
  ok(near(r[1].prorrateo,100), 'la de menor valor absorbe menos (100)');
  ok(near(r[0].landedUnit,180) && near(r[1].landedUnit,60), 'aterrizado: 180/u y 60/u');

  // Suma de aterrizados = FOB total + costos (no se pierde ni inventa dinero)
  const totalLanded=r.reduce((s,l)=>s+l.landedTotal,0);
  ok(near(totalLanded, 150*10+50*10+400), 'la suma aterrizada = FOB total + costos (2400)');

  // Sin costos extra → aterrizado = FOB
  r=landedCost([{fob:80,cant:5}], {});
  ok(near(r[0].landedUnit,80), 'sin costos de importación, aterrizado = FOB');

  // FOB total 0 → reparte parejo (no divide por cero)
  r=landedCost([{fob:0,cant:2},{fob:0,cant:2}], {aduana:100});
  ok(near(r[0].prorrateo,50) && near(r[1].prorrateo,50), 'FOB 0 → reparte los costos por partes iguales (sin dividir por cero)');

  console.log('\n[2] Factor % (recargo sobre el FOB)');
  // FOB total 1000, factor 10% → +100 de costo prorrateado. 1 sola línea → +100/10u = +10/u.
  r=landedCost([{fob:100,cant:10}], {}, 10);
  ok(near(r[0].landedUnit,110), 'Factor 10% sobre FOB 100 → aterrizado 110/u');
  // Factor + costos itemizados se suman
  r=landedCost([{fob:100,cant:10}], {flete:200}, 10);
  ok(near(r[0].landedUnit,130), 'Factor 10% (+100) + flete 200 → 300/10 = +30/u → 130/u');
  ok(near(landedCost([{fob:50,cant:4}], {}, 0)[0].landedUnit,50), 'Factor 0 no cambia nada (compatibilidad)');

  console.log('\n[2b] Precio de venta sugerido (costo aterrizado + margen %)');
  eval(extractFn('precioSugerido'));
  ok(near(precioSugerido(100,40),140), 'costo 100 + margen 40% = 140');
  ok(near(precioSugerido(12.5,60),20), 'costo 12.50 + 60% = 20.00');
  ok(near(precioSugerido(33.33,50),50), 'redondea a 2 decimales (33.33×1.5 = 49.995 → 50.00)');
  ok(near(precioSugerido(80,0),80), 'margen 0 → precio = costo');

  console.log('\n[3] Carga masiva: parseImportCSV');
  eval(extractFn('parseImportCSV'));
  let rows=parseImportCSV('codigo,cantidad,fob\nW712/75,10,3.50\nBKR6E,24,1.20\n');
  ok(rows.length===2, 'ignora el encabezado y lee 2 filas');
  ok(rows[0].codfab==='W712/75' && rows[0].cant===10 && near(rows[0].fob,3.5), 'primera fila: código W712/75, cant 10, FOB 3.50');
  ok(parseImportCSV('AB-1;5;2\nCD-2;3;4')[0].cant===5, 'acepta separador ; (Excel europeo)');

  console.log('\n[4] Carga masiva: matchImportRows (empareja por código de fábrica)');
  eval(extractFn('matchImportRows'));
  const productos=[
    {id:'p1', codigo:'FIL-001', codFab:'W712/75', desc:'Filtro'},
    {id:'p2', codigo:'BUJ-330', codFab:'BKR6E', desc:'Bujía', partNumbers:[{numero:'BKR6E-11'}]},
  ];
  let m=matchImportRows([{codfab:'W71275',cant:10,fob:3.5},{codfab:'BKR6E-11',cant:24,fob:1.2}], productos);
  ok(m.matched.length===2, 'empareja 2 (W71275≈W712/75 normalizado, y por número de parte)');
  ok(m.matched[0].prodId==='p1', 'ignora guiones/barras al emparejar el código de fábrica');
  m=matchImportRows([{codfab:'NOEXISTE',cant:1,fob:1},{codfab:'W712/75',cant:0,fob:3},{codfab:'W712/75',cant:5,fob:3},{codfab:'W712/75',cant:2,fob:3}], productos);
  const motivos=m.inconvenientes.map(x=>x.motivo);
  ok(motivos.includes('No existe en el catálogo'), 'marca los que no están en el catálogo');
  ok(motivos.includes('Cantidad inválida'), 'marca cantidad inválida (0)');
  ok(motivos.includes('Duplicado en el archivo'), 'marca duplicados dentro del archivo');
  ok(m.matched.length===1, 'de las 4 filas, solo 1 válida entra');

  console.log('\n================  RESULTADO IMPORTACIÓN  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('========================================================');
  process.exit(fail?1:0);
})();
