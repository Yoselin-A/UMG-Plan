/** Modelo conceptual SP-II del documento (págs. 79-85).
 * NO es un esquema SQL Server inspeccionado; representa el contrato que deberá
 * confirmar el backend mediante INFORMATION_SCHEMA y RESTORE del .bak.
 */
export const DB_SECTIONS={
 'Acceso e identidad':['rol','usuario','dato_usuario','estado_usuario','sesion_usuario','modulo_sistema','permiso_rol_modulo','bitacora_acceso','tipo_accion_auditoria','bitacora_auditoria','tipo_notificacion','notificacion'],
 'Personal académico':['profesor','disponibilidad_docente','tipo_autoridad','autoridad_institucional','planificacion_autoridad','horario_coordinacion'],
 'Estructura académica':['institucion','centro_universitario','carrera','modalidad','plan_estudio','ciclo','curso','plan_estudio_curso','historial_costo_curso','periodo_academico','inscrito_historico','salon','horario','seccion'],
 'Planificación y revisión':['estado_planificacion','planificacion_semestral','planificacion_seccion','historial_planificacion','planificacion_detalle','estado_confirmacion','revision_docente','observacion_docente'],
 'Autorización y reportes':['estado_autorizacion','reporte_generado','autorizacion','evidencia_autorizacion','acceso_reporte']
};
export const TABLE_NAMES=Object.values(DB_SECTIONS).flat();
export const STORAGE_MAP={
 usuario:'users',profesor:'teachers',notificacion:'notifications',disponibilidad_docente:'availability',
 tipo_autoridad:'authorityTypes',autoridad_institucional:'authorities',planificacion_autoridad:'planningAuthorities',
 horario_coordinacion:'coordinationSlots',institucion:'institutions',centro_universitario:'centers',
 carrera:'careers',modalidad:'modalities',plan_estudio:'studyPlans',ciclo:'cycles',curso:'courses',
 plan_estudio_curso:'curriculum',historial_costo_curso:'costHistory',periodo_academico:'periods',
 inscrito_historico:'enrollments',salon:'rooms',horario:'slots',seccion:'sections',
 planificacion_semestral:'plannings',planificacion_detalle:'assignments',revision_docente:'reviews',
 reporte_generado:'reports',autorizacion:'authorizations',bitacora_auditoria:'audit'
};
const toRows=(items)=>Array.isArray(items)?items.map(x=>({...x})):[];
const catalog=(values)=>values.map((v,i)=>({id:i+1,code:v.code||v.value,name:v.name||v.label||v.value,active:true}));
export function makeRelationalPreview(db){
 const tables=Object.fromEntries(TABLE_NAMES.map(k=>[k,toRows(db[STORAGE_MAP[k]])]));
 tables.rol=catalog([{code:'admin',name:'Administrador'},{code:'coordinator',name:'Coordinador de Carrera'},{code:'teacher',name:'Docente'}]);
 tables.dato_usuario=(db.users||[]).map(u=>({usuario_id:u.id,nombre:u.name,correo:u.email||'',telefono:u.phone||''}));
 tables.estado_usuario=[];tables.sesion_usuario=[];tables.bitacora_acceso=[];
 tables.modulo_sistema=catalog([{code:'usuarios',name:'Usuarios / Profesores'},{code:'gestion_academica',name:'Gestión académica'},{code:'cursos',name:'Cursos'},{code:'planificacion',name:'Planificación y autorización'},{code:'reportes',name:'Reportes'}]);
 tables.permiso_rol_modulo=[...['usuarios','gestion_academica','cursos'].map(m=>({rol:'admin',modulo:m,crud:true})),{rol:'coordinator',modulo:'planificacion',crud:true},{rol:'coordinator',modulo:'reportes',crud:false},{rol:'teacher',modulo:'planificacion',accion:'confirmar_solo_propias'}];
 tables.tipo_accion_auditoria=catalog([{code:'crear',name:'Crear'},{code:'modificar',name:'Modificar'},{code:'eliminar',name:'Eliminar'},{code:'autorizacion',name:'Registrar resolución'}]);
 tables.tipo_notificacion=catalog([{code:'docente',name:'Revisión docente'},{code:'mensaje',name:'Mensaje'},{code:'estado',name:'Cambio de estado'}]);
 tables.estado_planificacion=catalog(['borrador','revision','correccion','consolidada','pendiente','autorizada','denegada'].map(x=>({value:x}))) ;
 tables.estado_confirmacion=catalog([{code:'pendiente'},{code:'confirmada'},{code:'inconveniente'}]);
 tables.estado_autorizacion=catalog([{code:'pendiente'},{code:'autorizada'},{code:'denegada'}]);
 tables.planificacion_seccion=(db.sections||[]).map(s=>({id:`join-${s.id}`,planificacion_id:s.planningId,seccion_id:s.id}));
 tables.historial_planificacion=(db.audit||[]).filter(a=>/Planificación|revisi[oó]n|autoriza|consolida|correcci[oó]n/i.test(a.action||'')).map(a=>({id:a.id,fecha:a.at,usuario_id:a.userId,descripcion:a.action}));
 tables.observacion_docente=(db.reviews||[]).filter(r=>r.status==='inconveniente').map(r=>({id:`obs-${r.id}`,revision_id:r.id,profesor_id:r.teacherId,observacion:r.note,fecha:r.respondedAt}));
 tables.evidencia_autorizacion=(db.authorizations||[]).filter(a=>a.evidence).map(a=>({id:`ev-${a.id}`,autorizacion_id:a.id,referencia:a.evidence,fecha:a.recordedAt}));
 tables.acceso_reporte=[];
 return {source:'modelo-conceptual-SP-II-no-SQL-restaurado',generatedAt:new Date().toISOString(),tables};
}
export function validateLocalRelations(db){
 const errors=[];
 const check=(table,field,parent)=>{for(const row of db[table]||[]){if(!row[field]){errors.push(`${table}.${field}: referencia ausente (${row.id})`);continue;}if(!(db[parent]||[]).some(x=>x.id===row[field]))errors.push(`${table}.${field}: ${row[field]} no existe en ${parent}`)}};
 for(const [a,b,c] of [['centers','institutionId','institutions'],['careers','centerId','centers'],['authorities','typeId','authorityTypes'],['authorities','centerId','centers'],['planningAuthorities','planningId','plannings'],['planningAuthorities','authorityId','authorities'],['costHistory','courseId','courses'],['curriculum','courseId','courses'],['curriculum','planId','studyPlans'],['curriculum','cycleId','cycles'],['availability','teacherId','teachers'],['availability','periodId','periods'],['availability','slotId','slots'],['coordinationSlots','periodId','periods'],['coordinationSlots','slotId','slots'],['enrollments','planId','studyPlans'],['enrollments','periodId','periods'],['enrollments','cycleId','cycles'],['sections','planningId','plannings'],['sections','cycleId','cycles'],['assignments','planningId','plannings'],['assignments','sectionId','sections'],['assignments','courseId','courses'],['assignments','teacherId','teachers'],['assignments','slotId','slots'],['assignments','roomId','rooms']])check(a,b,c);
 return errors;
}
