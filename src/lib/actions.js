import {checkAssignment,clean,createId,nowISO,reviewSummary,validatePlanning} from './domain.mjs';
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
export const ensureEditable=p=>assert(p && ['borrador','correccion','denegada'].includes(p.status),'La planificación no permite edición en su estado actual.');
export function createPlanning(db,{planId,periodId},user){
 assert(db.studyPlans.some(x=>x.id===planId&&x.active),'Selecciona un plan vigente.');
 assert(db.periods.some(x=>x.id===periodId&&x.active),'Selecciona un período vigente.');
 assert(!db.plannings.some(x=>x.planId===planId&&x.periodId===periodId ),'Ya existe una planificación de ese plan y período.');
 const p={id:createId('pl'),code:`PL-${Date.now().toString().slice(-8)}`,planId,periodId,status:'borrador',createdAt:nowISO(),updatedAt:nowISO(),createdBy:user};
 db.plannings.push(p);return p;
}
export function addSection(db,planningId,form){
 const p=db.plannings.find(x=>x.id===planningId);ensureEditable(p);
 const code=clean(form.code).toUpperCase();const capacity=Number(form.capacity);
 assert(code.length>0,'Indica un nombre de sección.');
 assert(db.cycles.some(c=>c.id===form.cycleId&&c.active),'Selecciona un ciclo válido.');
 assert(Number.isInteger(capacity)&&capacity>0,'El cupo debe ser un entero mayor que cero.');
 assert(!db.sections.some(s=>s.planningId===planningId&&s.cycleId===form.cycleId&&s.code.toUpperCase()===code),'Ya existe la sección de ese ciclo.');
 db.sections.push({id:createId('sec'),planningId,cycleId:form.cycleId,code,capacity});p.updatedAt=nowISO();
}
export function saveAssignment(db,planningId,form,editId=''){
 const p=db.plannings.find(x=>x.id===planningId);ensureEditable(p);
 const candidate={planningId,sectionId:form.sectionId,courseId:form.courseId,teacherId:form.teacherId,slotId:form.slotId,roomId:form.roomId};
 const reasons=checkAssignment(db,planningId,candidate,editId);
 assert(reasons.length===0,reasons.join(' • '));
 if(editId){const target=db.assignments.find(x=>x.id===editId&&x.planningId===planningId);assert(target,'No se encontró la asignación.');Object.assign(target,candidate);db.reviews=db.reviews.filter(r=>r.assignmentId!==editId);}else db.assignments.push({id:createId('asg'),...candidate});
 if(p.status==='denegada')p.status='correccion';p.updatedAt=nowISO();
}
export function removeAssignment(db,planningId,id){
 const p=db.plannings.find(x=>x.id===planningId);ensureEditable(p);
 assert(db.assignments.some(a=>a.id===id&&a.planningId===planningId),'Asignación inexistente');
 db.assignments=db.assignments.filter(a=>a.id!==id);db.reviews=db.reviews.filter(r=>r.assignmentId!==id);
 if(p.status==='denegada')p.status='correccion';p.updatedAt=nowISO();
}
export function sendToTeachers(db,planningId){
 const p=db.plannings.find(x=>x.id===planningId);
 assert(p && ['borrador','correccion','revision','denegada'].includes(p.status),'Estado incompatible con revisión.');
 const errors=validatePlanning(db,planningId);assert(!errors.length,errors.join(' • '));
 // Se conservan solamente confirmaciones asociadas a asignaciones sin cambios.
 p.status='revision';p.updatedAt=nowISO();
}
export function teacherResponse(db,assignmentId,teacherId,status,note){
 const assignment=db.assignments.find(a=>a.id===assignmentId);
 assert(assignment&&assignment.teacherId===teacherId,'No tienes acceso a esa asignación.');
 const p=db.plannings.find(p=>p.id===assignment.planningId);
 assert(p?.status==='revision','Esta planificación no está en revisión docente.');
 assert(['confirmada','inconveniente'].includes(status),'Selecciona una respuesta válida.');
 if(status==='inconveniente')assert(clean(note).length>=5,'Describe brevemente tu inconveniente.');
 const record={id:createId('rev'),assignmentId,teacherId,status,note:status==='confirmada'?'':clean(note),respondedAt:nowISO()};
 db.reviews=db.reviews.filter(r=>r.assignmentId!==assignmentId);db.reviews.push(record);return record;
}
export function startCorrection(db,planningId){
 const p=db.plannings.find(x=>x.id===planningId);
 assert(p&&['revision','denegada'].includes(p.status),'Esta planificación no puede abrirse para corrección.');
 p.status='correccion';p.updatedAt=nowISO();
}
export function consolidate(db,planningId){
 const p=db.plannings.find(x=>x.id===planningId);assert(p?.status==='revision','La planificación debe estar en revisión docente.');
 const errors=validatePlanning(db,planningId);assert(!errors.length,errors.join(' • '));
 const summary=reviewSummary(db,planningId);assert(summary.ready,`No se puede consolidar. Pendientes: ${summary.pending}; inconvenientes: ${summary.issues}.`);
 p.status='consolidada';p.updatedAt=nowISO();
}
export function snapshot(db,planningId){
 const plan=db.plannings.find(x=>x.id===planningId);assert(plan,'Planificación inexistente');
 const studyPlan=db.studyPlans.find(x=>x.id===plan.planId);const period=db.periods.find(x=>x.id===plan.periodId);
 const sections=db.sections.filter(s=>s.planningId===planningId).map(s=>({...s,cycle:db.cycles.find(c=>c.id===s.cycleId)?.name??'—'}));
 const rows=db.assignments.filter(a=>a.planningId===planningId).map(a=>{
  const s=db.sections.find(x=>x.id===a.sectionId), c=db.courses.find(x=>x.id===a.courseId), t=db.teachers.find(x=>x.id===a.teacherId), h=db.slots.find(x=>x.id===a.slotId),r=db.rooms.find(x=>x.id===a.roomId);
  return {id:a.id,section:s?.code??'—',cycle:db.cycles.find(x=>x.id===s?.cycleId)?.name??'—',capacity:s?.capacity??0,courseCode:c?.code??'—',course:c?.name??'—',labCost:c?.lab?Number(c.labCost):null,teacherCode:t?.code??'—',teacher:t?.name??'—',day:h?.day??'—',start:h?.start??'—',end:h?.end??'—',room:r?.code??'—'};
 });
 const usedDays=new Set(rows.map(r=>r.day));const slots=db.slots.filter(s=>s.active&&usedDays.has(s.day)).map(s=>({day:s.day,start:s.start,end:s.end}));
 const listed=(db.planningAuthorities||[]).filter(x=>x.planningId===planningId&&x.active!==false).map(x=>{
  const authority=db.authorities?.find(a=>a.id===x.authorityId);
  const type=db.authorityTypes?.find(t=>t.id===authority?.typeId);
  return {name:authority?.name||'Por confirmar',role:type?.name||x.function,function:x.function,code:authority?.code||''};
 });
 return {code:plan.code,studyPlan:structuredClone(studyPlan),period:structuredClone(period),sections,rows,slots,authorities:listed,generatedAt:nowISO()};
}
export function prepareDirectorReport(db,planningId,userId){
 const p=db.plannings.find(x=>x.id===planningId);assert(p?.status==='consolidada','Primero debes consolidar la planificación.');
 const version=1+db.reports.filter(r=>r.planningId===planningId&&r.kind==='director').length;
 const report={id:createId('pdf'),planningId,kind:'director',version,createdAt:nowISO(),userId,snapshot:snapshot(db,planningId)};
 db.reports.push(report);p.status='pendiente';p.updatedAt=nowISO();return report;
}
export function recordDecision(db,planningId,form,userId){
 const p=db.plannings.find(x=>x.id===planningId);assert(p?.status==='pendiente','Primero genera el PDF consolidado para revisión externa.');
 assert(['autorizada','denegada'].includes(form.decision),'Selecciona una decisión válida.');
 assert(clean(form.authority).length>2,'Ingresa el nombre del Director que tomó la decisión.');
 assert(Boolean(form.date),'Indica la fecha de la decisión.');
 assert(clean(form.evidence).length>=5,'Registra una referencia verificable a la comunicación del Director.');
 const last=db.reports.filter(r=>r.planningId===planningId&&r.kind==='director').at(-1);assert(last,'No se encontró el PDF enviado al Director.');
 const item={id:createId('aut'),planningId,reportId:last.id,decision:form.decision,authority:clean(form.authority),date:form.date,notes:clean(form.notes),evidence:clean(form.evidence),recordedAt:nowISO(),userId};
 db.authorizations.push(item);p.status=form.decision;p.updatedAt=nowISO();return item;
}
export function createFinalReport(db,planningId,userId){
 const p=db.plannings.find(x=>x.id===planningId);assert(p?.status==='autorizada','Solo se puede generar el reporte final autorizado.');
 const existing=db.reports.find(r=>r.planningId===planningId&&r.kind==='final');if(existing)return existing;
 const version=1+db.reports.filter(r=>r.planningId===planningId&&r.kind==='final').length;
 const report={id:createId('pdf'),planningId,kind:'final',version,createdAt:nowISO(),userId,snapshot:snapshot(db,planningId)};
 db.reports.push(report);return report;
}
