/** Reglas SP-II: funciones puras y reutilizables por API/servidor. */
export const ROLES = {admin:'Administrador', coordinator:'Coordinador de Carrera', teacher:'Docente'};
export const STATES = {
  borrador:'Borrador', revision:'En revisión docente', correccion:'En corrección',
  consolidada:'Consolidada', pendiente:'Pendiente de autorización',
  autorizada:'Autorizada', denegada:'Denegada'
};
export const nowISO = () => new Date().toISOString();
export const createId = (prefix='id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
export const label = (items,id,key='name') => items.find(x=>x.id===id)?.[key] ?? '—';
export const fmtDate = value => value ? new Date(value).toLocaleDateString('es-GT',{year:'numeric',month:'short',day:'numeric'}) : '—';
export const clean = str => String(str??'').trim();
export const isActive = item => item && item.active!==false;
export const intervalOverlap = (a,b,c,d) => a<d && c<b;
export const getPlanAssignments = (db, planningId) => db.assignments.filter(a=>a.planningId===planningId);
export const planSections = (db,planningId) => db.sections.filter(s=>s.planningId===planningId);
export const getReviews = (db,planningId) => {
  const ids = new Set(getPlanAssignments(db,planningId).map(a=>a.id));
  return db.reviews.filter(r=>ids.has(r.assignmentId));
};
export function checkAssignment(db, planningId, candidate, excludeId='') {
  const reasons=[];
  const planning=db.plannings.find(p=>p.id===planningId);
  const section=db.sections.find(s=>s.id===candidate.sectionId);
  const teacher=db.teachers.find(t=>t.id===candidate.teacherId);
  const course=db.courses.find(c=>c.id===candidate.courseId);
  const slot=db.slots.find(s=>s.id===candidate.slotId);
  const room=db.rooms.find(r=>r.id===candidate.roomId);
  if(!planning) return ['No se encontró la planificación.'];
  if(!section || section.planningId!==planningId) reasons.push('Selecciona una sección válida de esta planificación.');
  if(!isActive(teacher)) reasons.push('Selecciona un docente activo.');
  if(!isActive(course)) reasons.push('Selecciona un curso activo.');
  if(!isActive(slot)) reasons.push('Selecciona un horario activo.');
  if(!isActive(room)) reasons.push('Selecciona un salón activo.');
  if(section && course && (course.cycleId!==section.cycleId || course.planId!==planning.planId)) reasons.push('El curso no pertenece al ciclo y plan de estudio de la sección.');
  if(section && room && Number(room.capacity)<Number(section.capacity)) reasons.push(`El salón tiene capacidad ${room.capacity}, menor que el cupo ${section.capacity}.`);
  const curr=db.assignments.filter(a=>a.id!==excludeId);
  const samePlan=curr.filter(a=>a.planningId===planningId);
  if(samePlan.some(a=>a.sectionId===candidate.sectionId && a.courseId===candidate.courseId)) reasons.push('Este curso ya está asignado a esa sección.');
  if(samePlan.some(a=>a.sectionId===candidate.sectionId && a.teacherId===candidate.teacherId)) reasons.push('R2: Un profesor no puede impartir más de un curso en la misma sección.');
  const samePeriod=curr.filter(a=>db.plannings.some(p=>p.id===a.planningId && p.periodId===planning.periodId));
  if(samePeriod.filter(a=>a.teacherId===candidate.teacherId).length>=4) reasons.push('R1: El docente ya tiene cuatro asignaciones en este semestre.');
  if(slot){
    for(const assignment of samePeriod){
      const occupied=db.slots.find(s=>s.id===assignment.slotId);
      if(!occupied || occupied.day!==slot.day || !intervalOverlap(occupied.start,occupied.end,slot.start,slot.end)) continue;
      if(assignment.teacherId===candidate.teacherId){reasons.push('R3: Cruce de horarios del profesor en el mismo día y período.');break;}
    }
    if(samePeriod.some(a=>{const other=db.slots.find(s=>s.id===a.slotId);return a.roomId===candidate.roomId && other?.day===slot.day && intervalOverlap(other.start,other.end,slot.start,slot.end);})) reasons.push('El salón ya está ocupado en ese horario.');
    if(samePlan.some(a=>{const other=db.slots.find(s=>s.id===a.slotId);return a.sectionId===candidate.sectionId && other?.day===slot.day && intervalOverlap(other.start,other.end,slot.start,slot.end);})) reasons.push('La sección ya tiene otra clase en ese horario.');
  }
  return [...new Set(reasons)];
}
export function validatePlanning(db, planningId){
  const sections=planSections(db,planningId);
  const assignments=getPlanAssignments(db,planningId);
  const errors=[];
  if(!sections.length) errors.push('Debe existir al menos una sección.');
  if(!assignments.length) errors.push('Debe existir al menos una asignación.');
  for(const sec of sections){
    if(!assignments.some(a=>a.sectionId===sec.id)) errors.push(`La sección ${sec.code} todavía no tiene cursos asignados.`);
  }
  for(const a of assignments){for(const e of checkAssignment(db,planningId,a,a.id))errors.push(`${label(sections,a.sectionId,'code')}: ${e}`);}
  return [...new Set(errors)];
}
export function reviewSummary(db,planningId){
  const all=getPlanAssignments(db,planningId);
  const pending=all.filter(a=>!db.reviews.some(r=>r.assignmentId===a.id));
  const issues=all.filter(a=>db.reviews.some(r=>r.assignmentId===a.id && r.status==='inconveniente'));
  const confirmed=all.filter(a=>db.reviews.some(r=>r.assignmentId===a.id && r.status==='confirmada'));
  return {total:all.length,pending:pending.length,issues:issues.length,confirmed:confirmed.length,ready:all.length>0 && !pending.length && !issues.length};
}
export function allowed(role, action){
  const map={
    admin:['catalogs','users','teachers','read','audit','backup'],
    coordinator:['planning','sections','assignment','reviews','decision','reports','read'],
    teacher:['my-assignments','respond','read']
  };
  return (map[role]??[]).includes(action);
}
