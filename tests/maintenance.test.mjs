import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSeed,extendSeed} from '../src/lib/seed.js';
import {maintenanceTables,validateMaintenance,checkMaintenanceDelete,listForRef} from '../src/lib/maintenance.mjs';
import {TABLE_NAMES,makeRelationalPreview,validateLocalRelations,DB_SECTIONS} from '../src/lib/relationalModel.mjs';
import {snapshot} from '../src/lib/actions.js';
import {createApiRepository} from '../src/lib/repository.mjs';

test('modelo conceptual contiene las 45 tablas del documento',()=>{
 assert.equal(TABLE_NAMES.length,45);
 assert.equal(new Set(TABLE_NAMES).size,TABLE_NAMES.length);
 assert.equal(Object.keys(DB_SECTIONS).length,5);
});
test('12 mantenimientos complementarios implementados',()=>assert.equal(Object.keys(maintenanceTables).length,12));
test('catálogos institucionales iniciales tienen relaciones válidas',()=>{
 const db=makeSeed();assert.equal(db.institutions.length,1);assert(db.centers.length>=6);
 assert.deepEqual(validateLocalRelations(db),[]);
});
test('carreras tienen sedes, pensum y modalidad asociadas',()=>{
 const db=makeSeed();const p=db.studyPlans.find(x=>x.id==='plan-sistemas');
 assert.ok(db.careers.some(x=>x.id===p.careerId));
 assert.ok(db.modalities.some(x=>x.id===p.modalityId));
 assert.ok(db.centers.some(x=>x.id===p.centerId));
});
test('no permite eliminar sede vinculada a carrera',()=>{
 const db=makeSeed();assert.throws(()=>checkMaintenanceDelete(db,'centers','cent-vn'),/relacionado/);
});
test('no permite eliminar curso del pensum utilizado en una asignación',()=>{
 const db=makeSeed();assert.throws(()=>checkMaintenanceDelete(db,'curriculum','pc-course-1'),/asignaciones/);
});
test('validación de mantenimiento bloquea relaciones huérfanas',()=>{
 const db=makeSeed();assert.throws(()=>validateMaintenance(db,'careers',{code:'ZZ',name:'Carrera de prueba',centerId:'no-existe'}),/activo/);
});
test('validación de mantenimiento detecta duplicados',()=>{
 const db=makeSeed();assert.throws(()=>validateMaintenance(db,'centers',{code:'VN',name:'Sede duplicada',institutionId:'inst-umg'}),/existe/);
});
test('plan_estudio_curso exige correspondencia con ciclo y plan del curso',()=>{
 const db=makeSeed();assert.throws(()=>validateMaintenance(db,'curriculum',{planId:'plan-portales',courseId:'course-1',cycleId:'cy-8',order:1}),/coincidir/);
});
test('modificación de costo histórico valida costo numérico',()=>{
 const db=makeSeed();assert.throws(()=>validateMaintenance(db,'costHistory',{courseId:'course-1',effectiveDate:'2026-01-01',cost:-10}),/numérico/);
});
test('exportación conceptual incluye soporte, planificación y auditoría',()=>{
 const d=makeRelationalPreview(makeSeed());assert.equal(Object.keys(d.tables).length,45);
 assert(d.tables.planificacion_detalle.length>=13);assert.equal(d.tables.planificacion_autoridad.length,4);
 assert(d.tables.profesor.length>=54);assert.ok(Array.isArray(d.tables.bitacora_acceso));
});
test('planificación conserva autoridades institucionales en snapshot PDF',()=>{
 const shot=snapshot(makeSeed(),'planning-1');assert.equal(shot.authorities.length,4);
 assert.ok(shot.authorities[0].name.includes('por confirmar'));
});
test('migración desde datos locales previos conserva registros y crea nuevas colecciones',()=>{
 const old=makeSeed();delete old.institutions;delete old.centers;delete old.authorities;old.users[0].name='Nombre personalizado';
 const after=extendSeed(old);assert.equal(after.users[0].name,'Nombre personalizado');assert.equal(after.centers.length,2);
 assert.equal(after.authorities.length,4);
});
test('select de horarios y docentes tiene etiquetas legibles',()=>{
 const d=makeSeed();assert.match(listForRef(d,'slots')[0].label,/Sábado/);
 assert.match(listForRef(d,'teachers')[0].label,/CAT-001/);
});
test('repositorio API es una interfaz futura inactiva hasta su invocación',()=>{
 const repo=createApiRepository();assert.equal(typeof repo.list,'function');assert.equal(typeof repo.authorize,'function');
});
test('eliminación de curso no asignado elimina relaciones y costo asociados',async()=>{
 const {deleteCatalogRecord}=await import('../src/lib/localCrud.mjs');
 const d=makeSeed();deleteCatalogRecord(d,'courses','ref-course-008');
 assert.equal(d.curriculum.filter(x=>x.courseId==='ref-course-008').length,0);
 assert.equal(d.costHistory.filter(x=>x.courseId==='ref-course-008').length,0);
 assert.deepEqual(validateLocalRelations(d),[]);
});
test('eliminación de un bloque referenciado por disponibilidad se impide',async()=>{
 const {deleteCatalogRecord}=await import('../src/lib/localCrud.mjs');
 const d=makeSeed();assert.throws(()=>deleteCatalogRecord(d,'slots','slot-1'),/availability|assignments|coordinationSlots/);
});
