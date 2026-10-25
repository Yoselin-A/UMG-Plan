import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSeed,extendSeed} from '../src/lib/seed.js';
import {normalizeSearch,recordMatches,findAcrossCollections} from '../src/lib/fullSearch.mjs';
import {validateLocalRelations} from '../src/lib/relationalModel.mjs';
test('múltiples sedes y carreras demo etiquetadas sin atribución oficial',()=>{
 const data=makeSeed();assert.equal(data.schemaVersion,7);assert(data.centers.length>=6);assert(data.careers.length>=14);
 assert(data.centers.filter(x=>x.id.startsWith('demo-')).every(x=>x.name.includes('no oficial')));
 assert(data.studyPlans.filter(x=>x.source==='demostracion'&&x.code.includes('DEMO')).length>=12);
});
test('búsqueda sin depender de acentos y por campos no visibles',()=>{
 const d=makeSeed();assert.equal(normalizeSearch('Miércoles'),'miercoles');
 const teacher=d.teachers.find(x=>x.code==='CAT-001');assert(recordMatches(d,teacher,'carlos mendoza'));
 assert(recordMatches(d,teacher,'@miumg.edu.gt'));
 const h=d.slots.find(x=>x.day==='Miércoles');assert(recordMatches(d,h,'miercoles'));
 assert(recordMatches(d,d.courses.find(x=>x.id==='course-1'),'Villa Nueva')); // relación con pensum
 assert(findAcrossCollections(d,'Domingo',['slots']).length>0);
});
test('horarios de toda la semana y horarios nocturnos',()=>{
 const d=makeSeed();assert.equal(new Set(d.slots.map(s=>s.day)).size,7);
 for(const day of ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']){
  assert(d.slots.some(s=>s.day===day));
  assert(!d.slots.some(s=>s.day===day&&s.start>=s.end));
 }
 assert(d.slots.some(s=>s.day==='Lunes'&&s.end==='21:00'));
 assert(d.slots.some(s=>s.day==='Domingo'&&s.end==='20:00'));
});
test('semilla idempotente al guardar cambios con versión nueva',()=>{
 const d=makeSeed();const before=d.courses.length;d.courses[0].name='CAMBIO LOCAL';
 const upgraded=extendSeed(d);assert.equal(upgraded.courses.length,before);assert.equal(upgraded.courses[0].name,'CAMBIO LOCAL');
});
test('datos ampliados no dejan claves locales huérfanas',()=>assert.deepEqual(validateLocalRelations(makeSeed()),[]));
