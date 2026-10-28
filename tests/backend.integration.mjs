// Runs ONLY against an explicitly configured disposable UMGPlan_Test_* database.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pool,query,transaction} from '../server/db.mjs';
import {migrate,load,persist} from '../server/store.mjs';
import {hashPassword} from '../server/security.mjs';
import {app} from '../server/index.mjs';
import {diffState} from '../src/lib/api.mjs';
import * as actions from '../src/lib/actions.js';
import {readPensum,replaceCourseCatalog,PENSUM_SOURCE} from '../server/pensum.mjs';
import {updateTeacherEmails} from '../server/correos-profesores.mjs';
import {updateReferencePlans} from '../scripts/actualizar-planes-referencia.mjs';

await pool.connect();
const name=(await query(pool,'SELECT DB_NAME() AS name'))[0].name;
assert.match(name,/^UMGPlan_Test_[A-Za-z0-9_]+$/,'Configura SQL_CONNECTION_STRING con una base desechable UMGPlan_Test_*.');
await migrate();
assert.equal((await query(pool,"SELECT COUNT(*) AS total FROM sys.columns WHERE object_id=OBJECT_ID('dbo.periodo_academico') AND name='semestre'"))[0].total,0);
assert((await load()).state.periods.every(p=>!('semester' in p)));
const adminId=randomUUID(),password='QA_backend_2026!';let checks=0;
await transaction(async tx=>{
 const {state}=await load(tx,true),next=structuredClone(state);
 next.users.push({id:adminId,username:'qa_admin',name:'Administrador QA',email:'qa_admin@miumg.edu.gt',role:'admin',teacherId:'',active:true});
 await persist(tx,state,next);await query(tx,'INSERT app.Credential(user_id,password_hash) VALUES(@id,@hash)',{id:adminId,hash:await hashPassword(password)});
});
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}/api/v1`;
async function request(client,path,body,status=200,headers={}){
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(client?.cookie?{Cookie:client.cookie,'X-CSRF-Token':client.csrf}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=response.status===204?null:await response.json();
 assert.equal(response.status,status,`${path}: ${JSON.stringify(data)}`);checks++;
 if(client&&response.ok){if(response.headers.get('set-cookie'))client.cookie=response.headers.get('set-cookie').split(';')[0];if(data?.csrf)client.csrf=data.csrf;if(data?.db)client.data=data;}
 return data;
}
async function refresh(client){return request(client,'/session');}
async function mutate(client,work,action='Prueba de integración',status=200){
 await refresh(client);const state=structuredClone(client.data.db);work(state);
 return request(client,'/changes',{revision:client.data.revision,changes:diffState(client.data.db,state),action},status);
}
const add=(key,row)=>state=>state[key].push(row);
try{
 await request(null,'/health');await request(null,'/session',undefined,401);
 await request(null,'/auth/login',{username:'qa_admin',password:'incorrecta'},401);
 const admin={};await request(admin,'/auth/login',{username:'qa_admin',password});
 const rawBefore=await query(pool,'SELECT id_profesor,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido FROM dbo.profesor ORDER BY id_profesor');
 const usersBefore=(await load()).state.users.map(({id,email})=>({id,email}));
 const generated=await transaction(updateTeacherEmails);assert.equal(generated.length,10);checks++;
 assert.equal(new Set(generated.map(x=>x.email)).size,10);checks++;
 const afterEmails=(await load()).state;
 assert(afterEmails.teachers.every(x=>x.emailExample&&x.email.endsWith('.demo@miumg.edu.gt')));checks++;
 assert.deepEqual(afterEmails.users.map(({id,email})=>({id,email})),usersBefore);checks++;
 assert.deepEqual(await query(pool,'SELECT id_profesor,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido FROM dbo.profesor ORDER BY id_profesor'),rawBefore);checks++;
 assert.equal((await transaction(updateTeacherEmails)).length,0);checks++;
 await refresh(admin);
 assert(admin.data.db.users.length>=11&&admin.data.db.users.some(x=>x.id===adminId));checks++;
 assert(!JSON.stringify(admin.data).includes('password_hash'));checks++;
 await request(admin,'/changes',{revision:admin.data.revision,changes:[]},403,{'X-CSRF-Token':''});
 await request(admin,'/changes',{revision:admin.data.revision,changes:[]},403,{Origin:'https://sitio-ajeno.invalid'});
 const roomId=randomUUID();await mutate(admin,add('rooms',{id:roomId,code:'QA-ROOM',capacity:40,type:'Salón',active:true}));
 const sqlRoom=(await query(pool,"SELECT id_salon,capacidad FROM dbo.salon WHERE codigo_salon='QA-ROOM'"))[0];assert.equal(sqlRoom.capacidad,40);checks++;
 const revision=admin.data.revision;
 await mutate(admin,s=>{s.rooms.find(x=>x.id===roomId).capacity=50;});
 await request(admin,'/changes',{revision,changes:[{collection:'rooms',id:roomId,op:'delete'}]},409);
 await mutate(admin,s=>{s.rooms=s.rooms.filter(x=>x.id!==roomId);});assert.equal((await query(pool,"SELECT * FROM dbo.salon WHERE codigo_salon='QA-ROOM'")).length,0);checks++;
 await mutate(admin,s=>{
  s.rooms.push({id:randomUUID(),code:'QA-ROLLBACK',capacity:30,type:'Salón',active:true});
  s.rooms.push({id:randomUUID(),code:'X'.repeat(600),capacity:30,type:'Salón',active:true});
 },'Reversión ante error SQL',422);
 assert.equal((await query(pool,"SELECT * FROM dbo.salon WHERE codigo_salon='QA-ROLLBACK'")).length,0);checks++;
 await mutate(admin,s=>{s.rooms[0]._sqlId=9999;},'Identificador SQL rechazado',422);
 const teacherId=randomUUID(),coordinatorId=randomUUID(),teacherUserId=randomUUID(),periodId=randomUUID();
 await mutate(admin,add('teachers',{id:teacherId,code:'QA-PROF',name:'Docente Pruebas',email:'qa_docente@miumg.edu.gt',phone:'',specialty:'Pruebas',active:true}));
 await mutate(admin,add('users',{id:coordinatorId,username:'qa coord',name:'Coordinador Pruebas',email:'qa_coord@miumg.edu.gt',role:'coordinator',teacherId:'',active:true}));
 await mutate(admin,add('users',{id:teacherUserId,username:'qa_teacher',name:'Docente Pruebas',email:'qa_teacher@miumg.edu.gt',role:'teacher',teacherId,active:true}));
 await mutate(admin,add('periods',{id:periodId,label:'QA 2027',year:2027,termType:'Semestral',active:true}));
 for(const identity of ['qa coord','qa_teacher']){
  await request(null,'/password-requests',{identity,password});await refresh(admin);
  const uid=identity==='qa coord'?coordinatorId:teacherUserId;
  const pending=admin.data.db.passwordRequests.find(x=>x.userId===uid&&x.status==='pending');assert(pending);checks++;
  assert(!JSON.stringify(admin.data).includes('scrypt$'));checks++;
  assert(admin.data.db.notifications.some(n=>n.title==='Solicitud de contraseña pendiente'&&n.body.includes(identity)));checks++;
  if(identity==='qa coord'){await request(null,'/password-requests',{identity,password:'Otra_clave_2026!'});await refresh(admin);assert.equal(admin.data.db.passwordRequests.filter(x=>x.userId===uid&&x.status==='pending').length,1);checks++;}
  await request(admin,`/password-requests/${pending.id}/decision`,{decision:'approved',note:'Identidad de prueba verificada'});
  await refresh(admin);assert(admin.data.db.notifications.some(n=>n.link===`/solicitudes-contrasena?solicitud=${pending.id}`&&n.read));checks++;
 }
 await request(null,'/auth/login',{username:'qa coord',password:'Otra_clave_2026!'},401);
 await mutate(admin,add('systemRoles',{id:'teacher',name:'Docente de prueba',description:'Perfil editable',paths:['/dashboard','/ajustes']}));
 await mutate(admin,add('systemRoles',{id:'admin',name:'Administrador',description:'Perfil protegido',paths:['/dashboard']}),'Protección de administración',422);
 const coord={},teacher={};await request(coord,'/auth/login',{username:'qa coord',password});await request(teacher,'/auth/login',{username:'qa_teacher',password});
 assert.equal(teacher.data.user.roleName,'Docente de prueba');assert(!teacher.data.user.allowedRoutes.includes('/mis-asignaciones'));checks++;
 await mutate(admin,s=>{s.systemRoles.find(r=>r.id==='teacher').paths=['/dashboard','/mis-asignaciones','/disponibilidad','/chat','/ajustes'];});
 await refresh(teacher);assert(teacher.data.user.allowedRoutes.includes('/mis-asignaciones'));checks++;
 await mutate(teacher,s=>{s.users.find(x=>x.id===teacherUserId).role='admin';},'Escalamiento rechazado',403);
 await mutate(coord,add('rooms',{id:randomUUID(),code:'FORGED',capacity:999,active:true}),'Catálogo rechazado',403);
 let planningId,sectionId;
 const plan=coord.data.db.studyPlans[0],cycleId=coord.data.db.courses.find(x=>x.planId===plan.id).cycleId;
 await mutate(coord,s=>{planningId=actions.createPlanning(s,{planId:plan.id,periodId},coordinatorId).id;});
 await mutate(coord,s=>{actions.addSection(s,planningId,{cycleId,code:'QA-A',capacity:20});sectionId=s.sections.at(-1).id;});
 const course=coord.data.db.courses.find(x=>x.planId===plan.id&&x.cycleId===cycleId);
 let assignmentId;
 await mutate(coord,s=>{actions.saveAssignment(s,planningId,{sectionId,courseId:course.id,teacherId,slotId:s.slots[0].id,roomId:s.rooms[0].id});assignmentId=s.assignments.at(-1).id;});
 await mutate(coord,s=>{const a=s.assignments.find(x=>x.id===assignmentId);s.assignments.push({...a,id:randomUUID()});},'Conflicto académico rechazado',422);
 // La carga se calcula por cursos distintos en todo el período, no por secciones.
 const qaCourses=[];for(let i=0;i<4;i++){const id=randomUUID();qaCourses.push(id);await mutate(admin,add('courses',{id,code:'QA-CARGA-'+i,name:'Curso de prueba '+i,planId:plan.id,cycleId,lab:false,labCost:0,active:true}));}
 const qaSlots=[];for(const [i,day] of ['Lunes','Martes','Miércoles','Jueves','Viernes'].entries()){const id=randomUUID();qaSlots.push(id);await mutate(admin,add('slots',{id,day,start:'19:00',end:'20:00',active:true}));}
 for(let i=0;i<3;i++)await mutate(coord,s=>actions.saveAssignment(s,planningId,{sectionId,courseId:qaCourses[i],teacherId,slotId:qaSlots[i],roomId:s.rooms[0].id}));
 await mutate(coord,s=>{const id=randomUUID();s.assignments.push({id,planningId,sectionId,courseId:qaCourses[3],teacherId,slotId:qaSlots[3],roomId:s.rooms[0].id});},'Quinto curso distinto rechazado',422);
 let secondSection;await mutate(coord,s=>{actions.addSection(s,planningId,{cycleId,code:'QA-B',capacity:20});secondSection=s.sections.at(-1).id;});
 await mutate(coord,s=>actions.saveAssignment(s,planningId,{sectionId:secondSection,courseId:qaCourses[0],teacherId,slotId:qaSlots[3],roomId:s.rooms[0].id}));
 await mutate(coord,s=>{s.assignments.push({id:randomUUID(),planningId,sectionId:secondSection,courseId:qaCourses[1],teacherId,slotId:qaSlots[0],roomId:s.rooms[0].id});},'Cruce de horario rechazado',422);
 await mutate(coord,s=>{for(const a of [...s.assignments].filter(x=>x.planningId===planningId&&x.id!==assignmentId))actions.removeAssignment(s,planningId,a.id);s.sections=s.sections.filter(x=>x.id!==secondSection);});
 await mutate(coord,s=>actions.sendToTeachers(s,planningId));
 await refresh(teacher);assert(teacher.data.db.assignments.every(x=>x.teacherId===teacherId));checks++;
 await mutate(coord,s=>{s.plannings.find(x=>x.id===planningId).status='consolidada';},'Consolidación sin respuesta rechazada',422);
 await mutate(teacher,s=>actions.teacherResponse(s,assignmentId,teacherId,'inconveniente','Necesito confirmar el horario.'));
 await mutate(teacher,s=>actions.teacherResponse(s,assignmentId,teacherId,'confirmada',''));
 await mutate(coord,s=>actions.consolidate(s,planningId));
 await mutate(coord,s=>actions.prepareDirectorReport(s,planningId,coordinatorId));
 await mutate(coord,s=>actions.recordDecision(s,planningId,{decision:'autorizada',authority:s.authorities[0].name,date:'2026-10-26',evidence:'Oficio QA de integración',notes:'Prueba'},coordinatorId));
 await mutate(coord,s=>actions.createFinalReport(s,planningId,coordinatorId));
 assert(coord.data.db.reports.some(x=>x.planningId===planningId&&x.kind==='final'&&x.snapshot.rows.length===1));checks++;
 const real=(await query(pool,'SELECT COUNT(*) AS total FROM dbo.planificacion_detalle WHERE id_profesor=(SELECT id_profesor FROM dbo.profesor WHERE codigo_profesor=@code)',{code:'QA-PROF'}))[0];assert.equal(real.total,1);checks++;
 await mutate(teacher,add('messages',{id:randomUUID(),planningId,teacherId,senderId:teacherUserId,body:'Mensaje de integración',at:new Date().toISOString()}));
 await mutate(teacher,add('availability',{id:randomUUID(),teacherId,periodId,slotId:teacher.data.db.slots[0].id,available:true,observation:'Disponible',active:true}));
 const loggedOutCookie=teacher.cookie;
 await request(teacher,'/auth/logout',{},204);await request(teacher,'/session',undefined,401);
 await request({cookie:loggedOutCookie,csrf:teacher.csrf},'/session',undefined,401);
 await request({cookie:loggedOutCookie,csrf:teacher.csrf},'/auth/logout',{},204);
 await request(null,'/auth/logout',{},204);
 const rotated={};await request(rotated,'/auth/login',{username:'qa_teacher',password});
 const previousCookie=rotated.cookie;await request(rotated,'/auth/login',{username:'qa_teacher',password});
 await request({cookie:previousCookie,csrf:rotated.csrf},'/session',undefined,401);
 await request(rotated,'/session');await request(rotated,'/auth/logout',{},204);
 const prior=(await load()).state;
 const history=JSON.stringify({assignments:prior.assignments,reports:prior.reports,authorizations:prior.authorizations});
 const pensum=await readPensum();
 for(let pass=0;pass<2;pass++)await transaction(async tx=>{const {state}=await load(tx,true);await persist(tx,state,replaceCourseCatalog(state,pensum,adminId));});
 const imported=(await load()).state;
 assert.equal(imported.courses.filter(x=>x.active).length,50);checks++;
 assert.equal(imported.courses.filter(x=>x.source===PENSUM_SOURCE).length,50);checks++;
 assert.equal(imported.curriculum.filter(x=>x.active).length,50);checks++;
 assert.equal(JSON.stringify({assignments:imported.assignments,reports:imported.reports,authorizations:imported.authorizations}),history);checks++;
 assert.equal((await query(pool,'SELECT COUNT(*) AS total FROM dbo.curso WHERE activo=1'))[0].total,50);checks++;
 assert(imported.courses.every(x=>!('credits' in x)&&!('prerequisites' in x)));checks++;
 for(let cycle=1;cycle<=10;cycle++){const id=imported.cycles.find(x=>x.number===cycle).id;assert.equal(imported.courses.filter(x=>x.active&&x.cycleId===id).length,5);checks++;}
 await mutate(admin,s=>{s.courses.find(x=>x.id==='pensum5090-course-001').name='CURSO DE PRUEBA';});
 assert.equal(admin.data.db.courses.find(x=>x.id==='pensum5090-course-001').name,'CURSO DE PRUEBA');checks++;
 await mutate(admin,s=>{s.courses.find(x=>x.id==='pensum5090-course-001').credits=5;},'Campo eliminado rechazado',422);
 await query(pool,`DELETE app.Migration WHERE id=3;
  UPDATE app.Entity SET payload=JSON_MODIFY(JSON_MODIFY(payload,'$.credits',4),'$.prerequisites','006') WHERE collection='courses' AND id='pensum5090-course-001';`);
 await migrate();
 const cleaned=(await load()).state.courses.find(x=>x.id==='pensum5090-course-001');
 assert(!('credits' in cleaned)&&!('prerequisites' in cleaned));checks++;
 assert.equal(cleaned.name,'CURSO DE PRUEBA');checks++;
 const historyBefore=(await load()).state;
 const update=await transaction(updateReferencePlans);assert.equal(update.added,6);checks++;
 const repeated=await transaction(updateReferencePlans);assert.equal(repeated.added,0);checks++;
 const referenced=(await load()).state;
 for(const code of ['5122-2015','5154-2014','5332-2014','2613-2019','9110-2014','1993-2018'])assert(referenced.studyPlans.some(x=>x.code===code&&x.active));checks++;
 assert.equal(referenced.studyPlans.find(x=>x.code==='5122-2015').jornada,'Sábado');checks++;
 assert.equal(referenced.studyPlans.find(x=>x.code==='5122-2015').mode,'No especificada');checks++;
 await mutate(admin,s=>{s.studyPlans.find(x=>x.code==='5122-2015').jornada='Domingo';});
 assert.equal((await query(pool,"SELECT jornada FROM dbo.plan_estudio WHERE codigo_plan='5122-2015'"))[0].jornada,'Domingo');checks++;
 assert.deepEqual(referenced.assignments,historyBefore.assignments);checks++;
 assert.deepEqual(referenced.authorizations,historyBefore.authorizations);checks++;
 assert.deepEqual(referenced.reports,historyBefore.reports);checks++;
 assert(referenced.studyPlans.filter(x=>x.source==='respaldo-SP_II').every(x=>!x.active));checks++;
 console.log(`Integración SQL Server: ${checks} comprobaciones aprobadas; flujo completo autorizado.`);
}finally{
 await new Promise(resolve=>server.close(resolve));await pool.close();
}
