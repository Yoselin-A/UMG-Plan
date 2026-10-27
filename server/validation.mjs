import {assert} from './security.mjs';
import {collections,mappings} from './mapping.mjs';
import {getBaseRole,userForSession,canOpenPath,defaultPaths} from '../src/lib/roles.mjs';
import {checkAssignment,validatePlanning,reviewSummary} from '../src/lib/domain.mjs';
import {maintenanceTables,validateMaintenance,checkMaintenanceDelete} from '../src/lib/maintenance.mjs';
import {deleteCatalogRecord,deleteUserRecord,deletePlanningRecord,editCatalogSafe} from '../src/lib/localCrud.mjs';
import {sendToTeachers,startCorrection,consolidate,prepareDirectorReport,recordDecision,createFinalReport} from '../src/lib/actions.js';

export const fieldLists={
 institutions:'id code name abbreviation address active source',centers:'id code name institutionId location active source',
 careers:'id code name centerId active source',modalities:'id code name description active source',authorityTypes:'id code name description active source',
 authorities:'id code name typeId centerId active source',systemRoles:'id name description paths',customRoles:'id name description baseRole paths active',
 users:'id name username email role teacherId active',teachers:'id code name email phone specialty emailExample active source',
 cycles:'id code number name active source',periods:'id code label year termType startDate endDate active source',
 rooms:'id code name capacity type active source',slots:'id day start end active source',
 studyPlans:'id code name careerCode center mode jornada university institutionId centerId careerId modalityId year active source',
 courses:'id code name planId cycleId lab labCost active source',curriculum:'id planId courseId cycleId order active source',
 costHistory:'id courseId cost effectiveDate active source',availability:'id teacherId periodId slotId available observation active source',
 enrollments:'id planId periodId cycleId count historicalCapacity active source',
 plannings:'id code planId periodId status createdAt updatedAt createdBy',sections:'id planningId cycleId code capacity active',
 assignments:'id planningId sectionId courseId teacherId slotId roomId',reviews:'id assignmentId teacherId status note respondedAt',
 reports:'id planningId kind version userId createdAt snapshot',authorizations:'id planningId reportId userId decision authority date notes evidence recordedAt',
 planningAuthorities:'id planningId authorityId function active source',coordinationSlots:'id coordinatorId periodId planningId slotId notes active source',
 messages:'id planningId teacherId senderId body at',notifications:'id userId title body link at read',
};
const catalogKeys=['teachers','studyPlans','cycles','periods','rooms','slots','courses'];
const coordinatorKeys=['plannings','sections','assignments','enrollments','reviews','reports','authorizations','messages'];
const teacherKeys=['reviews','availability','messages'];
const routeFor={users:'/usuarios',customRoles:'/roles',systemRoles:'/roles',teachers:'/catalogos/profesores',courses:'/catalogos/cursos',studyPlans:'/catalogos/academica',cycles:'/catalogos/academica',periods:'/catalogos/academica',rooms:'/catalogos/academica',slots:'/catalogos/academica',availability:'/disponibilidad',messages:'/chat',reviews:'/mis-asignaciones'};
export function sanitized(state,user){
 const db=structuredClone(state),role=getBaseRole(db,user.role);
 for(const key of collections)for(const item of db[key]){delete item._sqlId;delete item.proposedHash;}
 db.passwordRequests=db.passwordRequests.filter(x=>role==='admin'||x.userId===user.id);
 db.notifications=db.notifications.filter(x=>x.userId===user.id);
 if(role!=='admin'){
  db.audit=[];
  db.users=db.users.filter(x=>x.id===user.id||getBaseRole(db,x.role)==='coordinator').map(({email,...u})=>({...u,email:u.id===user.id?email:''}));
 }
 if(role==='teacher'){
  db.assignments=db.assignments.filter(x=>x.teacherId===user.teacherId);
  const ids=new Set(db.assignments.map(x=>x.planningId));
  db.plannings=db.plannings.filter(x=>ids.has(x.id));db.sections=db.sections.filter(x=>ids.has(x.planningId));
  db.reviews=db.reviews.filter(x=>x.teacherId===user.teacherId);db.availability=db.availability.filter(x=>x.teacherId===user.teacherId);
  db.messages=db.messages.filter(x=>x.teacherId===user.teacherId);db.teachers=db.teachers.filter(x=>x.id===user.teacherId);
  db.authorizations=[];db.reports=[];db.enrollments=[];
 }
 return db;
}
export function applyChanges(before,changes,user){
 assert(Array.isArray(changes)&&changes.length>0&&changes.length<=300,'Cantidad de cambios inválida.');
 const next=structuredClone(before),role=getBaseRole(before,user.role),session=userForSession(before,user);
 const seen=new Set();
 for(const change of changes){
  const {collection:key,id,op,value}=change;
  assert(fieldLists[key]&&['upsert','delete'].includes(op),'Operación no admitida.');
  assert(typeof id==='string'&&id.length>0&&id.length<=150,'Identificador inválido.');
  assert(!seen.has(`${key}:${id}`),'Cambio duplicado.');seen.add(`${key}:${id}`);
  const old=before[key].find(x=>x.id===id);
  let permitted=key==='notifications'||role==='admin'&&![...coordinatorKeys,'availability'].includes(key)||role==='coordinator'&&coordinatorKeys.includes(key)||role==='teacher'&&teacherKeys.includes(key);
  assert(permitted,'Tu rol no permite esta operación.',403);
  let path=routeFor[key]||((role==='admin')?'/mantenimientos':'/planificaciones');
  if(key==='reviews'&&role==='coordinator')path='/planificaciones';
  assert(key==='notifications'||canOpenPath(session,path),'El módulo no está habilitado para tu rol.',403);
  if(op==='delete'){
   assert(old,'Registro inexistente.',404);
   if(maintenanceTables[key])checkMaintenanceDelete(before,key,id);
   if(catalogKeys.includes(key))deleteCatalogRecord(structuredClone(before),key,id);
   if(key==='users')deleteUserRecord(structuredClone(before),id,user.id);
   if(key==='plannings')deletePlanningRecord(structuredClone(before),id);
   assert(!['messages','reports','authorizations','notifications'].includes(key),'El historial no puede eliminarse.');
   if(key==='customRoles')assert(!before.users.some(x=>x.role===id),'El rol está asignado a usuarios.');
   if(key==='systemRoles')assert(false,'Los roles esenciales no se pueden eliminar.');
   if(key==='reviews'){
    const assignment=before.assignments.find(x=>x.id===old.assignmentId);
    const replacing=changes.some(x=>x.collection==='reviews'&&x.op==='upsert'&&x.value?.assignmentId===old.assignmentId);
    const changingAssignment=changes.some(x=>x.collection==='assignments'&&x.id===old.assignmentId);
    assert(role==='teacher'?old.teacherId===user.teacherId&&replacing:role==='coordinator'&&changingAssignment,'No puedes eliminar esta revisión.',403);
    assert(assignment,'Asignación inexistente.');
   }
   if(['sections','assignments'].includes(key))assert(['borrador','correccion','denegada'].includes(before.plannings.find(x=>x.id===old.planningId)?.status),'La planificación no admite edición.');
   if(key==='availability')assert(old.teacherId===user.teacherId,'Solo puedes gestionar tu disponibilidad.',403);
   next[key]=next[key].filter(x=>x.id!==id);continue;
  }
  assert(value&&value.id===id&&typeof value==='object'&&!Array.isArray(value),'Registro inválido.');
  const allowed=[...fieldLists[key].split(' '),'source'];
  assert(Object.keys(value).every(k=>allowed.includes(k)),`Campos no permitidos en ${key}.`);
  assert(JSON.stringify(value).length<=2000000,'Registro demasiado grande.');
  const row={...value};if(old)row._sqlId=old._sqlId;
  if(key==='notifications')assert(old&&old.userId===user.id&&Object.keys(value).every(k=>k==='read'||JSON.stringify(value[k])===JSON.stringify(old[k])),'Solo puedes marcar tus propias notificaciones.',403);
  if(key==='messages'){
   assert(!old,'Los mensajes no pueden editarse.');
   assert(row.senderId===user.id&&typeof row.body==='string'&&row.body.trim().length>0&&row.body.length<=1500,'Mensaje inválido.');
   assert(before.assignments.some(x=>x.planningId===row.planningId&&x.teacherId===row.teacherId),'Conversación inexistente.');
   if(role==='teacher')assert(row.teacherId===user.teacherId,'Conversación ajena.',403);
   row.at=new Date().toISOString();
  }
  if(key==='availability'||key==='reviews')assert(row.teacherId===user.teacherId,'Solo el docente vinculado puede registrar su respuesta o disponibilidad.',403);
  if(key==='plannings'){
   assert(old||row.status==='borrador','Una planificación nueva debe ser borrador.');
   assert(old?row.createdBy===old.createdBy:row.createdBy===user.id,'Coordinador inválido.');
   if(!old){row.createdAt=new Date().toISOString();row.updatedAt=row.createdAt;}
   if(old&&(old.planId!==row.planId||old.periodId!==row.periodId))assert(['borrador','correccion','denegada'].includes(old.status)&&!before.sections.some(x=>x.planningId===old.id),'No se puede cambiar el plan o período con secciones o en estado bloqueado.');
  }
  if(['reports','authorizations'].includes(key))assert(!old&&row.userId===user.id,'El historial es inmutable.');
  const index=next[key].findIndex(x=>x.id===id);if(index<0)next[key].push(row);else next[key][index]=row;
 }
 for(const change of changes){
  const key=change.collection,row=next[key].find(x=>x.id===change.id),old=before[key].find(x=>x.id===change.id);
  if(key==='plannings'||['sections','assignments','reports','authorizations'].includes(key)){
   const planning=key==='plannings'?(old||row):before.plannings.find(x=>x.id===(old||row)?.planningId)||next.plannings.find(x=>x.id===(old||row)?.planningId);
   assert(planning&&planning.createdBy===user.id,'Solo el coordinador responsable puede modificar esta planificación.',403);
  }
  if(!row)continue;
  if(maintenanceTables[key])validateMaintenance(next,key,row,row.id);
  for(const [field,col] of Object.entries(mappings[key]?.[2]||{}))if(Array.isArray(col)&&row[field])assert(next[col[1]].some(x=>x.id===row[field]),`Referencia inválida: ${field}.`);
  if(catalogKeys.includes(key)&&old)editCatalogSafe(next,key,old,row);
  if(key==='users'){
   assert(typeof row.name==='string'&&row.name.trim().length>1,'Nombre requerido.');
   assert(/^(?=.{3,40}$)[a-z0-9._-]+(?: [a-z0-9._-]+)*$/i.test(row.username||'')&&((old&&row.email===old.email)||/^[a-z0-9._%+-]+@miumg\.edu\.gt$/i.test(row.email||'')),'Usuario o correo institucional inválido.');
   assert(getBaseRole(next,row.role),'Rol inexistente.');
   assert(!next.users.some(x=>x.id!==row.id&&(x.username.toLowerCase()===row.username.toLowerCase()||x.email.toLowerCase()===row.email.toLowerCase())),'Usuario o correo duplicado.');
   if(row.id===user.id)assert(row.active&&row.role==='admin','No puedes quitar tu propio acceso.');
   if(getBaseRole(next,row.role)==='teacher')assert(next.teachers.some(x=>x.id===row.teacherId)&&!next.users.some(x=>x.id!==row.id&&x.teacherId===row.teacherId),'Vinculación de docente inválida.');
  }
  if(key==='systemRoles'){
   assert(['admin','coordinator','teacher'].includes(row.id)&&typeof row.name==='string'&&row.name.trim().length>0&&row.name.length<=70&&typeof row.description==='string'&&row.description.length<=350,'Rol esencial inválido.');
   assert(Array.isArray(row.paths)&&row.paths.length>0&&row.paths.every(x=>defaultPaths(row.id).includes(x))&&new Set(row.paths).size===row.paths.length,'Permisos inválidos.');
   if(row.id==='admin')assert(row.paths.includes('/roles')&&row.paths.includes('/usuarios'),'El administrador debe conservar acceso a roles y usuarios.');
   assert(!next.customRoles.some(x=>x.name.toLowerCase()===row.name.trim().toLowerCase())&&!next.systemRoles.some(x=>x.id!==row.id&&x.name.toLowerCase()===row.name.trim().toLowerCase()),'Rol duplicado.');
  }
  if(key==='customRoles'){
   assert(['admin','coordinator','teacher'].includes(row.baseRole)&&Array.isArray(row.paths)&&row.paths.length&&row.paths.every(x=>defaultPaths(row.baseRole).includes(x)),'Permisos inválidos.');
   assert(!next.customRoles.some(x=>x.id!==row.id&&x.name.toLowerCase()===row.name.toLowerCase()),'Rol duplicado.');
   if(old&&before.users.some(x=>x.role===old.id))assert(old.baseRole===row.baseRole,'No puedes cambiar el perfil de un rol asignado.');
  }
  if(key==='teachers')assert(row.name?.trim()&&row.code?.trim()&&((old&&row.email===old.email)||/^[a-z0-9._%+-]+@miumg\.edu\.gt$/i.test(row.email||'')),'Datos o correo del docente inválidos.');
  if(key==='teachers'&&row.emailExample!==undefined)assert(typeof row.emailExample==='boolean','Origen del correo inválido.');
  if(key==='rooms')assert(Number.isInteger(row.capacity)&&row.capacity>0,'Capacidad inválida.');
  if(key==='slots')assert(['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].includes(row.day)&&/^\d{2}:\d{2}$/.test(row.start)&&/^\d{2}:\d{2}$/.test(row.end)&&row.start<row.end,'Horario inválido.');
  if(key==='periods')assert(Number.isInteger(row.year)&&row.year>=2020,'Período inválido.');
  if(key==='cycles')assert(Number.isInteger(row.number)&&row.number>0,'Ciclo inválido.');
  if(key==='courses')assert(next.studyPlans.some(x=>x.id===row.planId&&x.active)&&next.cycles.some(x=>x.id===row.cycleId&&x.active)&&Number.isFinite(Number(row.labCost))&&Number(row.labCost)>=0,'Curso inválido.');
  if(key==='studyPlans'){assert(next.centers.some(x=>x.id===row.centerId&&x.institutionId===row.institutionId)&&next.careers.some(x=>x.id===row.careerId&&x.centerId===row.centerId)&&next.modalities.some(x=>x.id===row.modalityId),'Relaciones del plan inválidas.');assert(typeof row.jornada==='string'&&row.jornada.trim().length>0&&row.jornada.length<=100,'Jornada inválida.');}
  if(catalogKeys.includes(key)){
   const identity=key==='slots'?['day','start','end']:key==='cycles'?['number']:key==='periods'?['label']:key==='courses'?['code','planId']:['code'];
   assert(!next[key].some(x=>x.id!==row.id&&identity.every(f=>String(x[f]).toLowerCase()===String(row[f]).toLowerCase())),'Registro duplicado.');
  }
  if(['sections','assignments'].includes(key)){
   const p=before.plannings.find(x=>x.id===row.planningId)||next.plannings.find(x=>x.id===row.planningId);
   assert(['borrador','correccion','denegada'].includes(p?.status),'La planificación no admite edición.');
   if(key==='sections')assert(next.cycles.some(x=>x.id===row.cycleId&&x.active)&&row.code?.trim()&&Number.isInteger(row.capacity)&&row.capacity>0,'Sección inválida.');
   else {const reasons=checkAssignment(next,row.planningId,row,row.id);assert(!reasons.length,reasons.join(' • '));}
  }
  if(key==='sections'){
   assert(!next.sections.some(x=>x.id!==row.id&&x.planningId===row.planningId&&x.cycleId===row.cycleId&&x.code.toLowerCase()===row.code.toLowerCase()),'Sección duplicada.');
   for(const a of next.assignments.filter(x=>x.sectionId===row.id)){const errors=checkAssignment(next,row.planningId,a,a.id);assert(!errors.length,errors.join(' • '));}
  }
  if(key==='reviews'){
   const a=before.assignments.find(x=>x.id===row.assignmentId);
   assert(a&&a.teacherId===user.teacherId&&before.plannings.find(x=>x.id===a.planningId)?.status==='revision','La asignación no está disponible para tu revisión.',403);
   assert(['confirmada','inconveniente'].includes(row.status)&&(row.status!=='inconveniente'||row.note?.trim().length>=5),'Respuesta inválida.');
   row.respondedAt=new Date().toISOString();
   assert(!next.reviews.some(x=>x.id!==row.id&&x.assignmentId===row.assignmentId),'Ya existe una respuesta para esta asignación.');
  }
 }
 assert(next.users.some(u=>u.role==='admin'&&u.active),'Debe conservarse un administrador activo.');
 for(const p of next.plannings){
  const old=before.plannings.find(x=>x.id===p.id);
  if(!old)assert(!next.plannings.some(x=>x.id!==p.id&&x.planId===p.planId&&x.periodId===p.periodId),'Planificación duplicada.');
  if(!old||old.status===p.status)continue;
  const work=structuredClone(next);work.plannings.find(x=>x.id===p.id).status=old.status;
  if(p.status==='revision')sendToTeachers(work,p.id);
  else if(p.status==='correccion')startCorrection(work,p.id);
  else if(p.status==='consolidada')consolidate(work,p.id);
  else if(p.status==='pendiente'){
   const report=next.reports.find(x=>x.planningId===p.id&&!before.reports.some(r=>r.id===x.id));assert(report?.kind==='director','Falta el reporte para el Director.');prepareDirectorReport(work,p.id,user.id);
  }else if(['autorizada','denegada'].includes(p.status)){
   const decision=next.authorizations.find(x=>x.planningId===p.id&&!before.authorizations.some(r=>r.id===x.id));assert(decision&&decision.decision===p.status,'Falta una resolución válida.');recordDecision(work,p.id,decision,user.id);
  }else assert(false,'Transición de planificación inválida.');
 }
 for(const r of next.reports.filter(x=>!before.reports.some(y=>y.id===x.id))){
  const old=before.plannings.find(x=>x.id===r.planningId);assert(r.kind==='director'?old?.status==='consolidada':r.kind==='final'&&old?.status==='autorizada','No se permite generar ese reporte todavía.');
  assert(r.version===1+before.reports.filter(x=>x.planningId===r.planningId&&x.kind===r.kind).length,'Versión del reporte inválida.');
 }
 for(const r of next.authorizations.filter(x=>!before.authorizations.some(y=>y.id===x.id)))assert(before.plannings.find(x=>x.id===r.planningId)?.status==='pendiente'&&next.plannings.find(x=>x.id===r.planningId)?.status===r.decision,'La resolución debe corresponder a una planificación pendiente.');
 return next;
}
