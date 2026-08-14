/* Verificación — Estado de Cuenta (antigüedad de deuda 30/60/90).
   Correr: node tests/estadocuenta.test.js */
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
eval(extractFn('ecToDays')+'\n'+extractFn('diasVencido')+'\n'+extractFn('bucketAntiguedad')+'\n'+extractFn('resumenAntiguedad'));
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ FALLA: '+m);} }
const near=(a,b)=>Math.abs(a-b)<0.005;

(function(){
  console.log('\n[1] Días vencidos (usa vcto; si no hay, la emisión)');
  ok(diasVencido({vcto:'2026-08-01'}, '2026-08-11')===10, 'vencía 01/08, hoy 11/08 → 10 días vencido');
  ok(diasVencido({vcto:'2026-09-01'}, '2026-08-11')===-21, 'vence 01/09 → aún no vence (negativo)');
  ok(diasVencido({fecha:'2026-08-01'}, '2026-08-11')===10, 'sin vcto usa la emisión');

  console.log('\n[2] Buckets de antigüedad');
  ok(bucketAntiguedad(-5)==='porVencer', 'no vencido → Por vencer');
  ok(bucketAntiguedad(0)==='porVencer', 'vence hoy → Por vencer');
  ok(bucketAntiguedad(1)==='d1_30' && bucketAntiguedad(30)==='d1_30', '1 y 30 → 1–30');
  ok(bucketAntiguedad(31)==='d31_60' && bucketAntiguedad(60)==='d31_60', '31 y 60 → 31–60');
  ok(bucketAntiguedad(61)==='d61_90' && bucketAntiguedad(90)==='d61_90', '61 y 90 → 61–90');
  ok(bucketAntiguedad(91)==='d90', '91 → +90');

  console.log('\n[3] Resumen: suma cada saldo en su tramo');
  const docs=[
    {saldo:100, dias:-3},   // por vencer
    {saldo:200, dias:15},   // 1-30
    {saldo:50,  dias:45},   // 31-60
    {saldo:300, dias:80},   // 61-90
    {saldo:400, dias:120},  // +90
    {saldo:25,  dias:20},   // 1-30
  ];
  const r=resumenAntiguedad(docs);
  ok(near(r.porVencer,100), 'Por vencer = 100');
  ok(near(r.d1_30,225), '1–30 = 200 + 25 = 225');
  ok(near(r.d31_60,50), '31–60 = 50');
  ok(near(r.d61_90,300), '61–90 = 300');
  ok(near(r.d90,400), '+90 = 400');
  ok(near(r.total,1075), 'TOTAL = 1075 (suma de todos los saldos)');

  console.log('\n================  RESULTADO ESTADO DE CUENTA  ================');
  console.log(`  PASARON: ${pass}   FALLARON: ${fail}`);
  console.log('=============================================================');
  process.exit(fail?1:0);
})();
