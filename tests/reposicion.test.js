/* Verificación — Reposición / compras sugeridas (stock mínimo → cantidad a comprar).
   Correr: node tests/reposicion.test.js */
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
eval(extractFn('sugerenciaReposicion'));
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }

(function(){
  const prods=[
    {id:'a', codigo:'A', stock:2, stockMin:10, costo:5, moneda:'S/'},   // bajo mínimo
    {id:'b', codigo:'B', stock:50, stockMin:10, costo:5},                // por encima → no aplica
    {id:'c', codigo:'C', stock:0, stockMin:4, reservado:0, costo:100},   // agotado
    {id:'d', codigo:'D', stock:3, stockMin:0, costo:9},                  // sin mínimo → no aplica
    {id:'e', codigo:'E', stock:8, stockMin:10, reservado:5, costo:2},    // disp 3 (<=10) aplica
  ];

  console.log('\n[1] Reponer al 2× del mínimo (default)');
  let r=sugerenciaReposicion(prods, 2);
  ok(r.length===3, 'solo A, C y E entran (B está por encima, D no tiene mínimo)');
  const A=r.find(x=>x.codigo==='A');
  ok(A.sugerido===18, 'A: objetivo 20 (10×2) − disponible 2 = 18');
  ok(R2(A.valorEstimado)===90, 'A: inversión = 18 × costo 5 = 90');
  const E=r.find(x=>x.codigo==='E');
  ok(E.disponible===3, 'E: disponible = stock 8 − reservado 5 = 3');
  ok(E.sugerido===17, 'E: 20 − 3 = 17 (usa disponible, no el stock físico)');

  console.log('\n[2] Ordenado por inversión estimada (desc)');
  const C=r.find(x=>x.codigo==='C');
  ok(C.sugerido===8 && R2(C.valorEstimado)===800, 'C: 8 unidades × 100 = 800');
  ok(r[0].codigo==='C', 'C (800) va primero por mayor inversión');

  console.log('\n[3] Factor 1 = solo llegar al mínimo');
  r=sugerenciaReposicion(prods, 1);
  ok(r.find(x=>x.codigo==='A').sugerido===8, 'A con factor 1: 10 − 2 = 8');

  console.log('\n[4] Sin productos bajo mínimo → lista vacía');
  ok(sugerenciaReposicion([{id:'z',codigo:'Z',stock:100,stockMin:10,costo:1}],2).length===0, 'todo con stock suficiente → nada que reponer');

  console.log('\n================  RESULTADO REPOSICIÓN  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('=======================================================');
  process.exit(fail?1:0);
})();
