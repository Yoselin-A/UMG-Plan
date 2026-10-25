import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSeed} from '../src/lib/seed.js';
import {checkAssignment,validatePlanning} from '../src/lib/domain.mjs';
import {createPlanning,addSection,saveAssignment,removeAssignment,sendToTeachers,teacherResponse,consolidate,prepareDirectorReport,recordDecision,createFinalReport,startCorrection} from '../src/lib/actions.js';
import {deleteCatalogRecord,deleteUserRecord,deletePlanningRecord,deleteEnrollment,editCatalogSafe} from '../src/lib/localCrud.mjs';
import {makePdfBlob} from '../src/lib/pdf.js';
import {buildOptions} from '../src/lib/selectOptions.mjs';
const reset=()=>structuredClone(makeSeed());
const assertThrows=(f,re)=>assert.throws(f,re);
test('datos iniciales del modelo SP-II',()=>{const db=reset();for(const key of ['users','teachers','studyPlans','cycles','periods','rooms','slots','courses','enrollments','plannings','sections','assignments','reviews','reports','authorizations','messages','notifications','audit'])assert(Array.isArray(db[key]),key)});
test('datos de ejemplo consistentes',()=>{const db=reset();assert.deepEqual(validatePlanning(db,'planning-1'),[]);});
test('rechazar docente sin identificador',()=>{const db=reset();const c=db.assignments[0];assert(checkAssignment(db,'planning-1',{...c,teacherId:''}).length>0)});
test('R2 impide dos cursos profesor en misma sección',()=>{const db=reset();const x={planningId:'planning-1',sectionId:'section-a',courseId:'course-3',teacherId:'t-1',slotId:'slot-4',roomId:'room-3'};assert(checkAssignment(db,'planning-1',x).some(s=>s.includes('R2')))});
test('R3 impide cruces de horario docente',()=>{const db=reset();db.slots.push({id:'superpuesto',day:'Sábado',start:'08:00',end:'10:00',active:true});const x={planningId:'planning-1',sectionId:'section-b',courseId:'course-4',teacherId:'t-1',slotId:'superpuesto',roomId:'room-4'};assert(checkAssignment(db,'planning-1',x).some(s=>s.includes('R3')))});
test('R1 impide superar 4 asignaciones en el semestre',()=>{const db=reset();db.sections.push({id:'section-c',planningId:'planning-1',cycleId:'cy-8',code:'C',capacity:20});db.assignments.push({id:'new1',planningId:'planning-1',sectionId:'section-c',courseId:'course-4',teacherId:'t-1',slotId:'slot-4',roomId:'room-4'},{id:'new2',planningId:'planning-1',sectionId:'section-c',courseId:'course-2',teacherId:'t-1',slotId:'slot-5',roomId:'room-4'},{id:'new3',planningId:'planning-1',sectionId:'section-c',courseId:'course-3',teacherId:'t-1',slotId:'slot-6',roomId:'room-4'});const candidate={sectionId:'section-b',courseId:'course-4',teacherId:'t-1',slotId:'slot-6',roomId:'room-3'};assert(checkAssignment(db,'planning-1',candidate).some(s=>s.includes('R1')))});
test('impide doble reserva de salón',()=>{const db=reset();const x={sectionId:'section-b',courseId:'course-4',teacherId:'t-3',slotId:'slot-1',roomId:'room-1'};assert(checkAssignment(db,'planning-1',x).some(s=>s.includes('salón')))});
test('impide asignación que supere capacidad de salón',()=>{const db=reset();const x={sectionId:'section-a',courseId:'course-3',teacherId:'t-3',slotId:'slot-4',roomId:'room-3'};db.rooms.find(x=>x.id==='room-3').capacity=20;assert(checkAssignment(db,'planning-1',x).some(s=>s.includes('capacidad')))});
test('guarda asignación válida y la elimina',()=>{const db=reset();saveAssignment(db,'planning-1',{sectionId:'section-b',courseId:'course-11',teacherId:'t-3',slotId:'slot-5',roomId:'room-2'});const x=db.assignments.at(-1);assert.equal(x.teacherId,'t-3');removeAssignment(db,'planning-1',x.id);assert(!db.assignments.some(a=>a.id===x.id))});
test('no se envía a docentes una planificación vacía',()=>{const db=reset();const p=createPlanning(db,{planId:'plan-sistemas',periodId:'period-2027-1'},'u-coord');assertThrows(()=>sendToTeachers(db,p.id),/sección/i)});
test('docente solo confirma sus asignaciones',()=>{const db=reset();sendToTeachers(db,'planning-1');assertThrows(()=>teacherResponse(db,'asgn-1','t-3','confirmada',''),/acceso/)});
test('docente registra inconveniente y el coordinador no puede consolidar',()=>{const db=reset();sendToTeachers(db,'planning-1');teacherResponse(db,'asgn-1','t-1','inconveniente','Solo martes y viernes');assertThrows(()=>consolidate(db,'planning-1'),/Pendientes|inconvenientes/)});
test('revisión docente exitosa permite consolidar',()=>{const db=reset();sendToTeachers(db,'planning-1');for(const a of db.assignments.filter(a=>a.planningId==='planning-1'))teacherResponse(db,a.id,a.teacherId,'confirmada','');consolidate(db,'planning-1');assert.equal(db.plannings[0].status,'consolidada')});
test('genera PDF y registra autorización externa',()=>{const db=reset();sendToTeachers(db,'planning-1');for(const a of db.assignments.filter(a=>a.planningId==='planning-1'))teacherResponse(db,a.id,a.teacherId,'confirmada','');consolidate(db,'planning-1');const rep=prepareDirectorReport(db,'planning-1','u-coord');assert.equal(rep.kind,'director');recordDecision(db,'planning-1',{decision:'autorizada',authority:'Director Académico',date:'2026-10-22',evidence:'Oficio de autorización',notes:'Todo conforme'},'u-coord');const final=createFinalReport(db,'planning-1','u-coord');assert.equal(final.kind,'final');assert(makePdfBlob(final).size>1000);assert.equal(db.plannings[0].status,'autorizada');assertThrows(()=>saveAssignment(db,'planning-1',{sectionId:'section-a'}),/no permite edición/)});
test('no elimina un curso asignado',()=>{const db=reset();assertThrows(()=>deleteCatalogRecord(db,'courses','course-1'),/utiliza/)});
test('elimina un catálogo que no está en uso',()=>{const db=reset();const id='course-5';deleteCatalogRecord(db,'courses',id);assert(!db.courses.some(x=>x.id===id))});
test('no elimina un docente con cuenta',()=>{const db=reset();assertThrows(()=>deleteCatalogRecord(db,'teachers','t-1'),/utiliza/)});
test('no permite borrar cuenta propia de administrador',()=>{const db=reset();assertThrows(()=>deleteUserRecord(db,'u-admin','u-admin'),/propio/)});
test('permite eliminar un usuario no referenciado',()=>{const db=reset();db.users.push({id:'unused',username:'test',role:'teacher',active:true});deleteUserRecord(db,'unused','u-admin');assert(!db.users.some(u=>u.id==='unused'))});
test('elimina planificación borrador y sus relaciones',()=>{const db=reset();deletePlanningRecord(db,'planning-1');assert(!db.plannings.some(p=>p.id==='planning-1'));assert(!db.sections.some(x=>x.planningId==='planning-1'));assert(!db.assignments.some(x=>x.planningId==='planning-1'))});
test('impide eliminar una planificación autorizada',()=>{const db=reset();db.plannings[0].status='autorizada';assertThrows(()=>deletePlanningRecord(db,'planning-1'),/no se puede eliminar/i)});
test('elimina referencia de inscritos',()=>{const db=reset();deleteEnrollment(db,'plan-sistemas','period-2026-2','cy-8');assert(!db.enrollments.some(x=>x.planId==='plan-sistemas'&&x.periodId==='period-2026-2'&&x.cycleId==='cy-8'))});
test('prohibe cambiar plan de curso que tiene asignaciones',()=>{const db=reset();assertThrows(()=>editCatalogSafe(db,'courses',db.courses[0],{...db.courses[0],cycleId:'cy-7'}),/conserva/)});
test('prohibe reducir cupo del salón por debajo de sección asignada',()=>{const db=reset();assertThrows(()=>editCatalogSafe(db,'rooms',db.rooms[0],{...db.rooms[0],capacity:10}),/insuficiente/)});

test('listas de selección aceptan arreglos y evitan la pantalla en blanco',()=>{const d=reset();const opts=buildOptions(d.courses,'name');assert.equal(opts.length,d.courses.length);assert.equal(opts[0].label,'Telecomunicaciones');assert.deepEqual(buildOptions(null),[])});
test('precarga diez ciclos, 38 periodos y horarios de lunes a domingo',()=>{const d=reset();assert.equal(d.cycles.length,10);assert(d.periods.length>=38);assert(d.slots.length>=110);assert.deepEqual(new Set(d.slots.map(x=>x.day)),new Set(['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']))});
test('incluye datos históricos separados y etiquetados',()=>{const d=reset();const c=d.courses.find(x=>x.code==='9989-008');assert(c);assert.equal(c.labCost,110);assert.equal(c.planId,'plan-portales');assert.equal(c.source,'documento-base-2025');assert(d.teachers.some(t=>t.code==='2745'))});
test('ocho asignaciones de demostración sin conflictos',()=>{const d=reset();assert.equal(d.assignments.filter(x=>x.planningId==='planning-1').length,8);for(const a of d.assignments.filter(a=>a.planningId==='planning-1'))assert.deepEqual(checkAssignment(d,'planning-1',a,a.id),[])});
test('PDF institucional conserva columnas y logotipo',async()=>{const d=reset();const {snapshot}=await import('../src/lib/actions.js');const rep={version:1,kind:'director',snapshot:snapshot(d,'planning-1')};const pdf=await makePdfBlob(rep).text();assert(pdf.includes('/Im1'));assert(pdf.includes('/Type /Page'));assert(pdf.includes('Vo.Bo.'));assert(pdf.includes('HORARIO'))});
test('profesores ficticios no se confunden con catálogo histórico',()=>{const d=reset();assert(d.teachers.some(t=>t.source==='demostracion'));assert(d.teachers.some(t=>t.source==='documento-base-2025'));assert(d.studyPlans.some(p=>p.id==='plan-portales'&&p.center.includes('Portales')))});

// Recuperación de contraseña desde el login (simulación local)
test('generación de código local de seis dígitos',async()=>{
 const {generateDemoRecoveryCode}=await import('../src/lib/recovery.mjs');
 assert.match(generateDemoRecoveryCode(new Uint32Array([0])),/^\d{6}$/);
 assert.equal(generateDemoRecoveryCode(new Uint32Array([0])),'100000');
});
test('código de recuperación válido antes de caducar',async()=>{
 const {createRecoveryChallenge,validateRecoveryChallenge}=await import('../src/lib/recovery.mjs');
 const c=createRecoveryChallenge('u-admin','hash-123',1000);
 assert.equal(validateRecoveryChallenge(c,'u-admin','hash-123',5000).ok,true);
 assert.equal(validateRecoveryChallenge(c,'otro','hash-123',5000).ok,false);
 assert.equal(validateRecoveryChallenge(c,'u-admin','hash-distinto',5000).reason,'invalid');
});
test('caducidad y límite de intentos del código temporal',async()=>{
 const {createRecoveryChallenge,validateRecoveryChallenge,incrementRecoveryAttempts}=await import('../src/lib/recovery.mjs');
 let c=createRecoveryChallenge('u-docente','hash',1000);
 assert.equal(validateRecoveryChallenge(c,'u-docente','hash',1000+10*60000).reason,'expired');
 for(let i=0;i<5;i++)c=incrementRecoveryAttempts(c);
 assert.equal(validateRecoveryChallenge(c,'u-docente','hash',1000+100).reason,'locked');
});
test('nueva contraseña de recuperación requiere diez caracteres',async()=>{
 const {validNewPassword}=await import('../src/lib/recovery.mjs');
 assert.equal(validNewPassword('corta'),false);
 assert.equal(validNewPassword('ClaveSegura2026!'),true);
});
