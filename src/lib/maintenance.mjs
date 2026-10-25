/** Catálogos complementarios conforme al modelo lógico de SP-II, páginas 79-85.
 * IDs locales estables: las claves reales de SQL Server se mapearán en backend.
 */
export const maintenanceGroups = [
 {id:'institucional',name:'Institución y oferta académica',tables:['institutions','centers','careers','modalities']},
 {id:'autoridades',name:'Autoridades y vistos buenos',tables:['authorityTypes','authorities','planningAuthorities','coordinationSlots']},
 {id:'academico',name:'Control académico y pensum',tables:['curriculum','costHistory','enrollments','availability']},
];
// Campos: [atributo, etiqueta, tipo de formulario, obligatoriedad]
export const maintenanceTables={
 institutions:{label:'Instituciones',sql:'institucion',singular:'institución',fields:[['code','Código','text'],['name','Nombre oficial','text'],['abbreviation','Abreviatura','text'],['address','Dirección','optional']]},
 centers:{label:'Centros universitarios',sql:'centro_universitario',singular:'centro universitario',fields:[['code','Código de sede','text'],['name','Nombre de sede','text'],['institutionId','Universidad','ref:institutions'],['location','Ubicación','optional']]},
 careers:{label:'Carreras',sql:'carrera',singular:'carrera',fields:[['code','Código de carrera','text'],['name','Nombre de carrera','text'],['centerId','Centro universitario','ref:centers']]},
 modalities:{label:'Modalidades y jornadas',sql:'modalidad',singular:'modalidad',fields:[['code','Código','text'],['name','Modalidad','text'],['description','Descripción','optional']]},
 authorityTypes:{label:'Tipos de autoridad',sql:'tipo_autoridad',singular:'tipo de autoridad',fields:[['code','Código','text'],['name','Cargo institucional','text'],['description','Descripción','optional']]},
 authorities:{label:'Autoridades institucionales',sql:'autoridad_institucional',singular:'autoridad',fields:[['code','Código','text'],['name','Nombre de la autoridad','text'],['typeId','Cargo','ref:authorityTypes'],['centerId','Sede','ref:centers']]},
 planningAuthorities:{label:'Autoridades de planificación',sql:'planificacion_autoridad',singular:'asignación de autoridad',fields:[['planningId','Planificación','ref:plannings'],['authorityId','Autoridad','ref:authorities'],['function','Función en el documento','text']]},
 coordinationSlots:{label:'Horario de coordinación',sql:'horario_coordinacion',singular:'horario de coordinación',fields:[['coordinatorId','Usuario coordinador','ref:coordinators'],['periodId','Período','ref:periods'],['slotId','Horario','ref:slots'],['notes','Observación','optional']]},
 curriculum:{label:'Cursos por plan de estudio',sql:'plan_estudio_curso',singular:'relación curso/pensum',fields:[['planId','Pensum','ref:studyPlans'],['courseId','Curso','ref:courses'],['cycleId','Ciclo','ref:cycles'],['order','Orden académico','number']]},
 costHistory:{label:'Historial de costos de laboratorio',sql:'historial_costo_curso',singular:'costo histórico',fields:[['courseId','Curso','ref:courses'],['effectiveDate','Vigente desde','date'],['cost','Costo en quetzales','decimal']]},
 enrollments:{label:'Inscritos históricos y cupos',sql:'inscrito_historico',singular:'registro histórico',fields:[['planId','Pensum','ref:studyPlans'],['periodId','Período','ref:periods'],['cycleId','Ciclo','ref:cycles'],['count','Estudiantes inscritos','number'],['historicalCapacity','Cupo histórico recomendado','number']]},
 availability:{label:'Disponibilidad docente',sql:'disponibilidad_docente',singular:'disponibilidad',fields:[['teacherId','Docente','ref:teachers'],['periodId','Período','ref:periods'],['slotId','Bloque de horario','ref:slots'],['available','¿Disponible?','boolean'],['observation','Observación','optional']]},
};
export const listForRef=(db,ref)=>{
 const arr=ref==='coordinators'?(db.users||[]).filter(u=>u.role==='coordinator'):(db[ref]||[]);
 return arr.filter(x=>x.active!==false).map(x=>({value:x.id,label:ref==='slots'?`${x.day} ${x.start}–${x.end}`:ref==='plannings'?x.code:ref==='periods'?x.label:ref==='cycles'?x.name:ref==='courses'?`${x.code} · ${x.name}`:ref==='studyPlans'?`${x.code} · ${x.name}`:ref==='teachers'||ref==='coordinators'?`${x.code||x.username} · ${x.name}`:`${x.code||''} ${x.name||''}`.trim()}));
};
const dependencies={
 institutions:[['centers','institutionId']],centers:[['careers','centerId'],['authorities','centerId']],careers:[],
 modalities:[],authorityTypes:[['authorities','typeId']],authorities:[['planningAuthorities','authorityId']],
 planningAuthorities:[],coordinationSlots:[],curriculum:[],costHistory:[],
 enrollments:[],availability:[]
};
export function checkMaintenanceDelete(db,key,id){
 for(const [collection,field] of dependencies[key]||[]){if((db[collection]||[]).some(x=>x[field]===id))throw Error(`No puedes eliminar este registro porque está relacionado con ${maintenanceTables[collection]?.label||collection}. Inactívalo o corrige primero sus relaciones.`)}
 if(key==='institutions'&&(db.studyPlans||[]).some(x=>x.institutionId===id))throw Error('Esta institución está asociada a un plan de estudio.');
 if(key==='centers'&&(db.studyPlans||[]).some(x=>x.centerId===id))throw Error('Este centro universitario está asociado a un plan de estudio.');
 if(key==='modalities'&&(db.studyPlans||[]).some(x=>x.modalityId===id))throw Error('Esta modalidad está asociada a un plan de estudio.');
 if(key==='careers'&&(db.studyPlans||[]).some(x=>x.careerId===id))throw Error('Esta carrera está asociada a un plan de estudio.');
 if(key==='curriculum'){const rel=db.curriculum.find(x=>x.id===id);if(rel&&db.assignments.some(a=>{const c=db.courses.find(x=>x.id===a.courseId);return c?.id===rel.courseId&&c?.planId===rel.planId;}))throw Error('No puedes quitar del pensum un curso utilizado en asignaciones; primero resuelve la planificación.');}
}
export function validateMaintenance(db,key,value,excludeId){
 const cfg=maintenanceTables[key];if(!cfg)throw Error('Tabla no admitida.');
 const result={...value};
 for(const [field,label,type] of cfg.fields){
  if(type==='boolean'){result[field]=!!result[field];continue}
  if(type==='number'||type==='decimal'){const number=Number(result[field]);if(!Number.isFinite(number)||number<0||(type==='number'&&!Number.isInteger(number)))throw Error(`${label}: valor numérico inválido.`);result[field]=number;continue}
  result[field]=String(result[field]??'').trim();
  if(type!=='optional'&&!result[field])throw Error(`${label} es obligatorio.`);
  if(type.startsWith('ref:')&&result[field]){
   const ref=type.slice(4),list=ref==='coordinators'?db.users:db[ref];
   if(!(list||[]).some(x=>x.id===result[field]&&x.active!==false&&(ref!=='coordinators'||x.role==='coordinator')))throw Error(`${label}: selecciona un registro activo.`);
  }
 }
 const dup=(db[key]||[]).find(x=>x.id!==excludeId && (
  (['institutions','centers','careers','modalities','authorityTypes','authorities'].includes(key)&&x.code.toLowerCase()===result.code?.toLowerCase())||
  (key==='curriculum'&&x.planId===result.planId&&x.courseId===result.courseId)||
  (key==='planningAuthorities'&&x.planningId===result.planningId&&x.authorityId===result.authorityId)||
  (key==='availability'&&x.teacherId===result.teacherId&&x.periodId===result.periodId&&x.slotId===result.slotId)||
  (key==='coordinationSlots'&&x.coordinatorId===result.coordinatorId&&x.periodId===result.periodId&&x.slotId===result.slotId)||
  (key==='enrollments'&&x.planId===result.planId&&x.periodId===result.periodId&&x.cycleId===result.cycleId)||
  (key==='costHistory'&&x.courseId===result.courseId&&x.effectiveDate===result.effectiveDate)
 ));
 if(dup)throw Error('Ya existe un registro con la misma identificación o relación.');
 if(key==='curriculum'){
  const course=db.courses.find(c=>c.id===result.courseId);
  if(course?.planId!==result.planId||course?.cycleId!==result.cycleId)throw Error('La relación pensum/curso/ciclo debe coincidir con el catálogo de cursos.');
 }
 if(key==='availability'){
  const user=db.users.find(u=>u.role==='teacher'&&u.teacherId===result.teacherId);
  if(!user)throw Error('Vincula primero al docente con una cuenta de usuario para gestionar su disponibilidad.');
 }
 return result;
}
