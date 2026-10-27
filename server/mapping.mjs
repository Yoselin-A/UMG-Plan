// Mapping verified against the restored SP_II backup, not the conceptual UI model.
// UI-only attributes live in app.Entity; mapped columns also write to dbo in the same transaction.
export const mappings={
 institutions:['institucion','id_institucion',{name:'nombre_oficial',abbreviation:'abreviatura',active:'activo'}],
 centers:['centro_universitario','id_centro_universitario',{institutionId:['id_institucion','institutions'],code:'codigo_centro',name:'nombre_centro',location:'ubicacion',active:'activo'}],
 careers:['carrera','id_carrera',{code:'codigo_carrera',name:'nombre_carrera',active:'activo'}],
 modalities:['modalidad','id_modalidad',{name:'nombre_modalidad',description:'descripcion',active:'activo'}],
 authorityTypes:['tipo_autoridad','id_tipo_autoridad',{name:'nombre_tipo',description:'descripcion',active:'activo'}],
 customRoles:['rol','id_rol',{name:'nombre_rol',description:'descripcion',active:'activo'}],
 users:['usuario','id_usuario',{email:'correo',active:'activo'}],
 teachers:['profesor','id_profesor',{code:'codigo_profesor',email:'correo',phone:'telefono',active:'activo'}],
 cycles:['ciclo','id_ciclo',{code:'codigo_ciclo',name:'nombre_ciclo',number:'orden_ciclo',active:'activo'}],
 periods:['periodo_academico','id_periodo_academico',{code:'codigo_periodo',label:'nombre_periodo',year:'anio',active:'activo'}],
 rooms:['salon','id_salon',{code:'codigo_salon',name:'nombre_salon',capacity:'capacidad',type:'tipo_salon',active:'activo'}],
 slots:['horario','id_horario',{day:'dia_semana',start:'hora_inicio',end:'hora_fin',active:'activo'}],
 studyPlans:['plan_estudio','id_plan_estudio',{careerId:['id_carrera','careers'],modalityId:['id_modalidad','modalities'],code:'codigo_plan',name:'nombre_plan',year:'anio_vigencia',jornada:'jornada',active:'activo'}],
 courses:['curso','id_curso',{code:'codigo_curso',name:'nombre_curso',lab:'tiene_laboratorio',active:'activo'}],
 curriculum:['plan_estudio_curso','id_plan_estudio_curso',{planId:['id_plan_estudio','studyPlans'],courseId:['id_curso','courses'],cycleId:['id_ciclo','cycles'],order:'orden_academico',active:'activo'}],
 costHistory:['historial_costo_curso','id_historial_costo_curso',{courseId:['id_curso','courses'],cost:'costo_laboratorio',effectiveDate:'fecha_inicio_vigencia',active:'activo'}],
 authorities:['autoridad_institucional','id_autoridad_institucional',{code:'codigo_autoridad',name:'nombre_completo',typeId:['id_tipo_autoridad','authorityTypes'],centerId:['id_centro_universitario','centers'],active:'activo'}],
 plannings:['planificacion_semestral','id_planificacion_semestral',{periodId:['id_periodo_academico','periods'],planId:['id_plan_estudio','studyPlans'],createdBy:['id_usuario_coordinador','users']}],
 sections:['seccion','id_seccion',{cycleId:['id_ciclo','cycles'],code:'codigo_seccion',capacity:'cupo',active:'activo'}],
 assignments:['planificacion_detalle','id_planificacion_detalle',{courseId:['id_curso','courses'],teacherId:['id_profesor','teachers'],slotId:['id_horario','slots'],roomId:['id_salon','rooms']}],
 availability:['disponibilidad_docente','id_disponibilidad_docente',{teacherId:['id_profesor','teachers'],periodId:['id_periodo_academico','periods'],slotId:['id_horario','slots'],available:'disponible',observation:'observacion'}],
 enrollments:['inscrito_historico','id_inscrito_historico',{cycleId:['id_ciclo','cycles'],periodId:['id_periodo_academico','periods'],count:'cantidad_inscritos'}],
 planningAuthorities:['planificacion_autoridad','id_planificacion_autoridad',{planningId:['id_planificacion_semestral','plannings'],authorityId:['id_autoridad_institucional','authorities']}],
 coordinationSlots:['horario_coordinacion','id_horario_coordinacion',{coordinatorId:['id_usuario_coordinador','users'],slotId:['id_horario','slots'],notes:'observacion'}],
 reviews:['revision_docente','id_revision_docente',{assignmentId:['id_planificacion_detalle','assignments'],teacherId:['id_profesor','teachers']}],
 reports:['reporte_generado','id_reporte_generado',{planningId:['id_planificacion_semestral','plannings'],userId:['id_usuario_generador','users'],version:'version_reporte',kind:'tipo_reporte'}],
 authorizations:['autorizacion','id_autorizacion',{planningId:['id_planificacion_semestral','plannings'],reportId:['id_reporte_generado','reports'],userId:['id_usuario_registro','users'],date:'fecha_decision',notes:'observaciones'}],
 notifications:['notificacion','id_notificacion',{userId:['id_usuario','users'],title:'titulo',body:'mensaje',read:'leida',link:'enlace'}],
 audit:['bitacora_auditoria','id_bitacora_auditoria',{userId:['id_usuario','users']}],
};
export const extraCollections=['messages','passwordRequests','systemRoles'];
export const collections=[...Object.keys(mappings),...extraCollections];
export const sqlId=(key,id)=>`${key}:sql:${id}`;
const iso=v=>v instanceof Date?v.toISOString():v;
const date=v=>v?String(iso(v)).slice(0,10):'';
const time=v=>v instanceof Date?v.toISOString().slice(11,16):String(v||'').includes('T')?String(v).slice(11,16):String(v||'').slice(0,5);
const fullname=r=>[r.primer_nombre,r.segundo_nombre,r.primer_apellido,r.segundo_apellido].filter(Boolean).join(' ');
export function importDatabase(tables){
 const db={schemaVersion:8,roleDescriptions:{}};
 for(const [key,[table,pk,fields]] of Object.entries(mappings))db[key]=tables[table].map(r=>{
  const item={id:sqlId(key,r[pk]),source:'respaldo-SP_II'};
  for(const [field,column] of Object.entries(fields)){
   item[field]=Array.isArray(column)?(r[column[0]]==null?'':sqlId(column[1],r[column[0]])):iso(r[column]);
   if(['active','lab','available','read'].includes(field))item[field]=!!item[field];
  }
  item._sqlId=r[pk];return item;
 });
 const find=(key,id)=>db[key].find(x=>x.id===id);
 for(const [i,u] of db.users.entries()){
  const raw=tables.usuario[i],profile=tables.dato_usuario.find(x=>x.id_usuario===raw.id_usuario);
  const role=tables.rol.find(x=>x.id_rol===raw.id_rol);
  const label=(role?.nombre_rol||'').toLowerCase();
  u.role=label.includes('admin')?'admin':label.includes('coordin')?'coordinator':'teacher';
  u.username=profile?.nombre_usuario||`usuario${raw.id_usuario}`;u.name=profile?fullname(profile):u.username;
  const teacher=tables.profesor.find(x=>x.id_usuario===raw.id_usuario);u.teacherId=teacher?sqlId('teachers',teacher.id_profesor):'';
 }
 // Existing nonstandard roles are preserved as metadata but never grant access by name alone.
 db.customRoles=[];
 for(const [i,t] of db.teachers.entries())t.name=fullname(tables.profesor[i]);
 for(const r of db.institutions)r.code=r.abbreviation||`INST-${r._sqlId}`;
 for(const key of ['modalities','authorityTypes'])for(const r of db[key])r.code=`${key}-${r._sqlId}`;
 for(const r of db.careers){
  const plan=tables.plan_estudio.find(x=>x.id_carrera===r._sqlId);
  const planning=tables.planificacion_semestral.find(x=>x.id_plan_estudio===plan?.id_plan_estudio);
  r.centerId=db.centers.find(x=>x._sqlId===planning?.id_centro_universitario)?.id||db.centers[0]?.id||'';
 } // No direct FK exists in the source; inferred from the plan's existing planning.
 for(const r of db.periods)r.termType='Semestral';
 for(const r of db.slots){r.start=time(r.start);r.end=time(r.end);}
 for(const p of db.studyPlans){
  const planning=tables.planificacion_semestral.find(x=>x.id_plan_estudio===p._sqlId);
  const center=db.centers.find(x=>x._sqlId===planning?.id_centro_universitario)||db.centers[0];
  p.centerId=center?.id||'';p.institutionId=center?.institutionId||'';
  p.center=center?.name||'';p.university=find('institutions',p.institutionId)?.name||'';
  p.mode=find('modalities',p.modalityId)?.name||'';p.careerCode=find('careers',p.careerId)?.code||'';
 }
 for(const c of db.courses){const rel=db.curriculum.find(x=>x.courseId===c.id);c.planId=rel?.planId||'';c.cycleId=rel?.cycleId||'';c.labCost=db.costHistory.filter(x=>x.courseId===c.id).at(-1)?.cost||0;}
 for(const c of db.costHistory)c.effectiveDate=date(c.effectiveDate);
 for(const [i,p] of db.plannings.entries()){
  const raw=tables.planificacion_semestral[i];p.status='autorizada';
  p.code=`SP-II-${p._sqlId}`;p.createdAt=iso(raw.created_at);p.updatedAt=iso(raw.updated_at||raw.created_at);
  const state=tables.estado_planificacion.find(x=>x.id_estado_planificacion===raw.id_estado_planificacion)?.nombre_estado?.toLowerCase()||'';
  if(!state.includes('autorizada'))p.status=state.includes('borrador')?'borrador':state.includes('deneg')?'denegada':state.includes('consolid')?'consolidada':state.includes('revisi')?'revision':state.includes('correc')?'correccion':'pendiente';
 }
 for(const s of db.sections){const rel=tables.planificacion_seccion.find(x=>x.id_seccion===s._sqlId);s.planningId=rel?sqlId('plannings',rel.id_planificacion_semestral):'';}
 for(const [i,a] of db.assignments.entries()){
  const rel=tables.planificacion_seccion.find(x=>x.id_planificacion_seccion===tables.planificacion_detalle[i].id_planificacion_seccion);
  a.sectionId=rel?sqlId('sections',rel.id_seccion):'';a.planningId=rel?sqlId('plannings',rel.id_planificacion_semestral):'';
 }
 for(const [i,r] of db.reviews.entries()){r.status='confirmada';r.respondedAt=iso(tables.revision_docente[i].fecha_respuesta);r.note=tables.observacion_docente.find(x=>x.id_revision_docente===r._sqlId)?.descripcion||'';}
 for(const [i,r] of db.reports.entries()){r.kind=r.kind?.toLowerCase().includes('final')?'final':'director';r.createdAt=iso(tables.reporte_generado[i].fecha_generacion);r.snapshot=null;}
 for(const [i,r] of db.authorizations.entries()){const raw=tables.autorizacion[i];r.decision='autorizada';r.date=date(r.date);r.authority=db.authorities.find(x=>x._sqlId===raw.id_autoridad_institucional)?.name||'';r.evidence=tables.evidencia_autorizacion.find(x=>x.id_autorizacion===r._sqlId)?.referencia||'';}
 for(const [i,r] of db.coordinationSlots.entries()){const raw=tables.horario_coordinacion[i];r.planningId=sqlId('plannings',raw.id_planificacion_semestral);r.periodId=find('plannings',r.planningId)?.periodId||'';}
 for(const [i,r] of db.enrollments.entries()){const raw=tables.inscrito_historico[i];r.planId=db.studyPlans.find(x=>x.careerId===sqlId('careers',raw.id_carrera))?.id||'';r.historicalCapacity=30;}
 for(const [i,r] of db.notifications.entries())r.at=iso(tables.notificacion[i].fecha_envio);
 for(const [i,r] of db.audit.entries()){r.at=iso(tables.bitacora_auditoria[i].fecha_accion);r.action=`Registro del respaldo: ${tables.bitacora_auditoria[i].entidad||'actividad'}`;}
 db.messages=[];db.passwordRequests=[];db.systemRoles=[];
 return db;
}
