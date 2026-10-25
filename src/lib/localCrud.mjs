/** Eliminar datos maestros sin dejar claves foráneas huérfanas. Equivalente al control RESTRICT. */
const usage={
 teachers:[['users','teacherId'],['assignments','teacherId'],['reviews','teacherId'],['messages','teacherId'],['availability','teacherId']],
 studyPlans:[['courses','planId'],['plannings','planId'],['enrollments','planId'],['curriculum','planId']],
 cycles:[['courses','cycleId'],['sections','cycleId'],['enrollments','cycleId'],['curriculum','cycleId']],
 periods:[['plannings','periodId'],['enrollments','periodId'],['availability','periodId'],['coordinationSlots','periodId']],
 rooms:[['assignments','roomId']],
 slots:[['assignments','slotId'],['availability','slotId'],['coordinationSlots','slotId']],
 courses:[['assignments','courseId']]
};
export function deleteCatalogRecord(db,type,id){
 const source=db[type];if(!Array.isArray(source)||!source.some(x=>x.id===id))throw Error('Registro inexistente.');
 for(const [collection,key] of usage[type]||[]){if((db[collection]||[]).some(x=>x[key]===id))throw Error(`No se puede eliminar: el registro se utiliza en ${collection}. Primero elimina o corrige esas relaciones, o inactívalo.`)}
 if(type==='courses'){db.curriculum=(db.curriculum||[]).filter(x=>x.courseId!==id);db.costHistory=(db.costHistory||[]).filter(x=>x.courseId!==id)}
 db[type]=source.filter(x=>x.id!==id);
}
export function deleteUserRecord(db,id,currentId){
 const user=db.users.find(x=>x.id===id);if(!user)throw Error('Usuario inexistente.');
 if(id===currentId)throw Error('No puedes eliminar tu propio usuario.');
 if(db.users.filter(x=>x.active&&x.role==='admin').length===1&&user.active&&user.role==='admin')throw Error('Debe existir al menos un administrador activo.');
 if(db.plannings.some(x=>x.createdBy===id)||db.authorizations.some(x=>x.userId===id)||db.messages.some(x=>x.senderId===id))throw Error('No puedes eliminar un usuario con actividad académica histórica; puedes inactivarlo.');
 db.users=db.users.filter(x=>x.id!==id);db.notifications=db.notifications.filter(x=>x.userId!==id);
}
export function deletePlanningRecord(db,id){
 const p=db.plannings.find(x=>x.id===id);if(!p)throw Error('Planificación inexistente.');
 if(!['borrador','correccion','denegada'].includes(p.status))throw Error('No se puede eliminar una planificación en revisión, consolidada o autorizada.');
 if(db.reports.some(r=>r.planningId===id)||db.authorizations.some(a=>a.planningId===id))throw Error('Conserva la planificación que ya tiene versiones o resoluciones.');
 const aid=new Set(db.assignments.filter(a=>a.planningId===id).map(a=>a.id));
 db.plannings=db.plannings.filter(x=>x.id!==id);
 db.sections=db.sections.filter(x=>x.planningId!==id);
 db.assignments=db.assignments.filter(x=>x.planningId!==id);
 db.reviews=db.reviews.filter(x=>!aid.has(x.assignmentId));
 db.messages=db.messages.filter(x=>x.planningId!==id);
 db.planningAuthorities=(db.planningAuthorities||[]).filter(x=>x.planningId!==id);
}
export function deleteEnrollment(db,planId,periodId,cycleId){
 const idx=db.enrollments.findIndex(x=>x.planId===planId&&x.periodId===periodId&&x.cycleId===cycleId);
 if(idx<0)throw Error('Referencia de inscritos inexistente.');
 db.enrollments.splice(idx,1);
}
export function editCatalogSafe(db,type,old,newData){
 if(!old)return;
 const blocked={courses:['cycleId','planId'],sections:['cycleId'],studyPlans:['code','careerCode'],periods:['year','semester'],cycles:['number']};
 const dependents={courses:db.assignments.some(a=>a.courseId===old.id),studyPlans:db.plannings.some(p=>p.planId===old.id),periods:db.plannings.some(p=>p.periodId===old.id),cycles:db.sections.some(s=>s.cycleId===old.id)};
 if(dependents[type] && (blocked[type]||[]).some(k=>String(old[k])!==String(newData[k])))throw Error('Este registro ya participa en una planificación. Para conservar la integridad, no cambies sus datos de identificación o estructura; crea uno nuevo.');
 if(type==='rooms'&&db.assignments.some(a=>a.roomId===old.id && Number(newData.capacity)<(db.sections.find(s=>s.id===a.sectionId)?.capacity||0)))throw Error('La nueva capacidad del salón es insuficiente para una sección existente.');
}
