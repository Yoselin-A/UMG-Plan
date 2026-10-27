import {pool,query,transaction} from './db.mjs';
import {mappings,collections,importDatabase} from './mapping.mjs';
import {assert} from './security.mjs';
import {snapshot} from '../src/lib/actions.js';

export async function migrate(){
 await pool.connect();
 await query(pool,`IF SCHEMA_ID('app') IS NULL EXEC('CREATE SCHEMA app');
 IF OBJECT_ID('app.Entity') IS NULL CREATE TABLE app.Entity(
  collection nvarchar(50) NOT NULL,id nvarchar(150) NOT NULL,sql_id int NULL,
  payload nvarchar(max) NOT NULL CHECK(ISJSON(payload)=1),PRIMARY KEY(collection,id));
 IF OBJECT_ID('app.Version') IS NULL BEGIN CREATE TABLE app.Version(id int PRIMARY KEY,revision int NOT NULL);INSERT app.Version VALUES(1,0);END;
 IF OBJECT_ID('app.Credential') IS NULL CREATE TABLE app.Credential(user_id nvarchar(150) PRIMARY KEY,password_hash nvarchar(300) NOT NULL);
 IF OBJECT_ID('app.Session') IS NULL CREATE TABLE app.Session(token_hash char(64) PRIMARY KEY,user_id nvarchar(150) NOT NULL,csrf char(64) NOT NULL,expires_at datetime2 NOT NULL);
 IF OBJECT_ID('app.PendingPassword') IS NULL CREATE TABLE app.PendingPassword(id nvarchar(150) PRIMARY KEY,password_hash nvarchar(300) NOT NULL);
 IF OBJECT_ID('app.Migration') IS NULL CREATE TABLE app.Migration(id int PRIMARY KEY);
 IF COL_LENGTH('dbo.plan_estudio','jornada') IS NULL ALTER TABLE dbo.plan_estudio ADD jornada nvarchar(100) NULL;
 `);
 await transaction(async tx=>{
  const version=(await query(tx,'SELECT revision FROM app.Version WITH(UPDLOCK,HOLDLOCK) WHERE id=1'))[0];
  if(version.revision!==0)return;
  const tables={};
  for(const table of new Set([...Object.values(mappings).map(x=>x[0]),'dato_usuario','rol','planificacion_seccion','estado_planificacion','estado_confirmacion','estado_autorizacion','observacion_docente','evidencia_autorizacion']))tables[table]=await query(tx,`SELECT * FROM dbo.[${table}]`);
  const state=importDatabase(tables);
  for(const report of state.reports){report.snapshot=snapshot(state,report.planningId);report.snapshot.restoredReference=true;}
  for(const key of collections)for(const row of state[key])await writeEntity(tx,key,row);
  await query(tx,'UPDATE app.Version SET revision=1 WHERE id=1');
 });
 await transaction(async tx=>{
  const {state}=await load(tx,true);
  if((await query(tx,'SELECT id FROM app.Migration WHERE id=2')).length)return;
  const slots=await query(tx,'SELECT id_horario,CONVERT(varchar(5),hora_inicio,108) AS start,CONVERT(varchar(5),hora_fin,108) AS finish FROM dbo.horario');
  for(const row of state.slots){const raw=slots.find(x=>x.id_horario===row._sqlId);if(raw){row.start=raw.start;row.end=raw.finish;await writeEntity(tx,'slots',row);}}
  for(const row of state.careers){const plan=state.studyPlans.find(x=>x.careerId===row.id);if(plan){row.centerId=plan.centerId;await writeEntity(tx,'careers',row);}}
  for(const row of state.reports)if(!row.snapshot){row.snapshot=snapshot(state,row.planningId);row.snapshot.restoredReference=true;await writeEntity(tx,'reports',row);}
  await query(tx,'INSERT app.Migration(id) VALUES(2); UPDATE app.Version SET revision=revision+1 WHERE id=1');
 });
 await transaction(async tx=>{
  await query(tx,'SELECT revision FROM app.Version WITH(UPDLOCK,HOLDLOCK) WHERE id=1');
  if((await query(tx,'SELECT id FROM app.Migration WHERE id=3')).length)return;
  await query(tx,`UPDATE app.Entity SET payload=JSON_MODIFY(JSON_MODIFY(payload,'$.credits',NULL),'$.prerequisites',NULL)
   WHERE collection='courses' AND EXISTS (SELECT 1 FROM OPENJSON(payload) WHERE [key] IN ('credits','prerequisites'));
   IF @@ROWCOUNT>0 UPDATE app.Version SET revision=revision+1 WHERE id=1;
   INSERT app.Migration(id) VALUES(3);`);
 });
 await transaction(async tx=>{
  const {state}=await load(tx,true);
  if((await query(tx,'SELECT id FROM app.Migration WHERE id=4')).length)return;
  const next=structuredClone(state);
  let unknown=next.modalities.find(x=>x.name==='No especificada'&&x.active);
  if(!unknown){unknown={id:'modality-unspecified',code:'SIN-ESPECIFICAR',name:'No especificada',description:'Modalidad pendiente de confirmar.',active:true};next.modalities.push(unknown);}
  const schedules=new Set(['Diario matutina','Diario vespertina','Sábado','Domingo','Plan mixto']);
  for(const plan of next.studyPlans){
   const mode=next.modalities.find(x=>x.id===plan.modalityId);
   if(schedules.has(mode?.name)){plan.jornada=mode.name;plan.mode=unknown.name;plan.modalityId=unknown.id;}
   else if(!plan.jornada)plan.jornada='No especificada';
  }
  for(const mode of next.modalities)if(schedules.has(mode.name))mode.active=false;
  await persist(tx,state,next);
  await query(tx,'INSERT app.Migration(id) VALUES(4)');
 });
 await transaction(async tx=>{
  await query(tx,'SELECT revision FROM app.Version WITH(UPDLOCK,HOLDLOCK) WHERE id=1');
  if((await query(tx,'SELECT id FROM app.Migration WHERE id=5')).length)return;
  await query(tx,`IF COL_LENGTH('dbo.periodo_academico','semestre') IS NOT NULL
  BEGIN
   DECLARE @dropChecks nvarchar(max)=N'';
   SELECT @dropChecks=@dropChecks+N'ALTER TABLE dbo.periodo_academico DROP CONSTRAINT '+QUOTENAME(c.name)+N';'
   FROM sys.check_constraints c WHERE c.parent_object_id=OBJECT_ID('dbo.periodo_academico') AND (c.parent_column_id=COLUMNPROPERTY(OBJECT_ID('dbo.periodo_academico'),'semestre','ColumnId') OR c.definition LIKE '%[[]semestre[]]%');
   EXEC sp_executesql @dropChecks;
   ALTER TABLE dbo.periodo_academico DROP COLUMN semestre;
  END;
  UPDATE app.Entity SET payload=JSON_MODIFY(payload,'$.semester',NULL) WHERE collection='periods' AND EXISTS (SELECT 1 FROM OPENJSON(payload) WHERE [key]='semester');
  INSERT app.Migration(id) VALUES(5);
  UPDATE app.Version SET revision=revision+1 WHERE id=1;`);
 });
}
async function writeEntity(tx,key,row){
 const { _sqlId,...payload}=row;
 await query(tx,`UPDATE app.Entity SET payload=@payload,sql_id=@sqlId WHERE collection=@key AND id=@id;
 IF @@ROWCOUNT=0 INSERT app.Entity(collection,id,sql_id,payload) VALUES(@key,@id,@sqlId,@payload);`,{key,id:row.id,sqlId:_sqlId??null,payload:JSON.stringify(payload)});
}
export async function load(tx=pool,lock=false){
 const revision=(await query(tx,`SELECT revision FROM app.Version ${lock?'WITH(UPDLOCK,HOLDLOCK)':''} WHERE id=1`))[0].revision;
 const state={schemaVersion:8,roleDescriptions:{}};
 for(const key of collections)state[key]=[];
 for(const row of await query(tx,'SELECT collection,payload,sql_id FROM app.Entity'))state[row.collection]?.push({...JSON.parse(row.payload),_sqlId:row.sql_id});
 return {state,revision};
}
const parts=name=>{const words=String(name||'').trim().split(/\s+/);return {primer_nombre:words.shift()||'Sin nombre',primer_apellido:words.pop()||'Sin apellido',segundo_nombre:words.join(' ')||null};};
async function saveRelational(tx,key,row,previous,state){
 const mapping=mappings[key];if(!mapping)return;
 const [table,pk,fields]=mapping;
 const ref=(k,id)=>{if(!id)return null;const record=state[k].find(x=>x.id===id);assert(record?._sqlId,`Relación SQL no encontrada en ${k}.`);return record._sqlId;};
 const data={};
 for(const [field,col] of Object.entries(fields))if(row[field]!==undefined){
  if(Array.isArray(col))data[col[0]]=ref(col[1],row[field]);else data[col]=row[field];
 }
 const get=(k,id)=>state[k].find(x=>x.id===id);
 const stateId=async(table,pk,label)=>{
  let existing=(await query(tx,`SELECT [${pk}] AS id FROM dbo.[${table}] WHERE nombre_estado=@label`,{label}))[0];
  if(!existing)existing=(await query(tx,`INSERT dbo.[${table}](nombre_estado) OUTPUT inserted.[${pk}] AS id VALUES(@label)`,{label}))[0];
  return existing.id;
 };
 if(key==='cycles')data.codigo_ciclo=row.code||`C-${row.number}`;
 if(key==='periods'){data.codigo_periodo=row.code||row.id;data.fecha_inicio=row.startDate||`${row.year}-01-01`;data.fecha_fin=row.endDate||`${row.year}-12-31`;}
 if(key==='rooms')data.nombre_salon=row.name||row.code;
 if(key==='studyPlans')data.anio_vigencia=row.year||new Date().getFullYear();
 if(key==='teachers'){Object.assign(data,parts(row.name));data.id_usuario=ref('users',state.users.find(x=>x.teacherId===row.id)?.id);}
 if(key==='users'){
  if(['admin','coordinator','teacher'].includes(row.role)){
   const roleName={admin:'Administrador UMG Plan',coordinator:'Coordinador UMG Plan',teacher:'Docente UMG Plan'}[row.role];
   let role=(await query(tx,'SELECT id_rol FROM dbo.rol WHERE nombre_rol=@name',{name:roleName}))[0];
   if(!role)role=(await query(tx,'INSERT dbo.rol(nombre_rol,activo) OUTPUT inserted.id_rol VALUES(@name,1)',{name:roleName}))[0];
   data.id_rol=role.id_rol;
  }else data.id_rol=ref('customRoles',row.role);
  if(!previous)data.password_hash='CUENTA_SIN_CREDENCIAL_APP';
 }
 if(key==='plannings'){
  data.id_centro_universitario=ref('centers',get('studyPlans',row.planId)?.centerId);
  data.id_estado_planificacion=await stateId('estado_planificacion','id_estado_planificacion',row.status);
 }
 if(key==='sections'){
  const planning=get('plannings',row.planningId),plan=get('studyPlans',planning?.planId);
  data.id_carrera=ref('careers',plan?.careerId);data.id_periodo_academico=ref('periods',planning?.periodId);
 }
 if(key==='assignments'){
  const section=ref('sections',row.sectionId),planning=ref('plannings',row.planningId);
  let rel=(await query(tx,'SELECT id_planificacion_seccion FROM dbo.planificacion_seccion WHERE id_seccion=@section AND id_planificacion_semestral=@planning',{section,planning}))[0];
  if(!rel)rel=(await query(tx,'INSERT dbo.planificacion_seccion(id_seccion,id_planificacion_semestral,activo) OUTPUT inserted.id_planificacion_seccion VALUES(@section,@planning,1)',{section,planning}))[0];
  data.id_planificacion_seccion=rel.id_planificacion_seccion;
 }
 if(key==='enrollments')data.id_carrera=ref('careers',get('studyPlans',row.planId)?.careerId);
 if(key==='coordinationSlots'){
  const planning=state.plannings.find(x=>x.id===row.planningId)||state.plannings.find(x=>x.periodId===row.periodId&&x.createdBy===row.coordinatorId);
  assert(planning,'Crea primero una planificación de ese coordinador y período.');data.id_planificacion_semestral=ref('plannings',planning.id);
 }
 if(key==='reviews')data.id_estado_confirmacion=await stateId('estado_confirmacion','id_estado_confirmacion',row.status);
 if(key==='reports'){data.nombre_archivo=`${row.id}.pdf`;data.ruta_archivo=`umgplan://report/${row.id}`;data.estado='generado';}
 if(key==='authorizations'){
  data.id_estado_autorizacion=await stateId('estado_autorizacion','id_estado_autorizacion',row.decision);
  let authority=state.authorities.find(x=>x.name===row.authority);
  assert(authority,'Registra al Director en Autoridades con el mismo nombre antes de guardar la resolución.');
  data.id_autoridad_institucional=ref('authorities',authority.id);
 }
 if(key==='notifications')data.id_tipo_notificacion=(await query(tx,'SELECT TOP 1 id_tipo_notificacion AS id FROM dbo.tipo_notificacion ORDER BY id_tipo_notificacion'))[0].id;
 if(key==='audit'){data.id_tipo_accion=(await query(tx,'SELECT TOP 1 id_tipo_accion AS id FROM dbo.tipo_accion_auditoria ORDER BY id_tipo_accion'))[0].id;data.entidad='UMGPlan';data.datos_nuevos=JSON.stringify({action:row.action});}
 const columns=Object.keys(data),values=Object.fromEntries(columns.map((c,i)=>[`value_${i}`,data[c]]));
 if(previous?._sqlId){
  row._sqlId=previous._sqlId;
  if(columns.length)await query(tx,`UPDATE dbo.[${table}] SET ${columns.map((c,i)=>`[${c}]=@value_${i}`).join(',')} WHERE [${pk}]=@id`,{...values,id:row._sqlId});
 }else{
  const result=await query(tx,`INSERT dbo.[${table}](${columns.map(c=>`[${c}]`).join(',')}) OUTPUT inserted.[${pk}] AS id VALUES(${columns.map((_,i)=>`@value_${i}`).join(',')})`,values);
  row._sqlId=result[0].id;
 }
 if(key==='users'){
  const names=parts(row.name);const values={uid:row._sqlId,username:row.username,...names};
  await query(tx,`UPDATE dbo.dato_usuario SET nombre_usuario=@username,primer_nombre=@primer_nombre,primer_apellido=@primer_apellido,segundo_nombre=@segundo_nombre WHERE id_usuario=@uid;
   IF @@ROWCOUNT=0 INSERT dbo.dato_usuario(id_usuario,nombre_usuario,primer_nombre,primer_apellido,segundo_nombre) VALUES(@uid,@username,@primer_nombre,@primer_apellido,@segundo_nombre);`,values);
  await query(tx,'UPDATE dbo.profesor SET id_usuario=NULL WHERE id_usuario=@uid;',{uid:row._sqlId});
  if(row.teacherId)await query(tx,'UPDATE dbo.profesor SET id_usuario=@uid WHERE id_profesor=@teacher',{uid:row._sqlId,teacher:ref('teachers',row.teacherId)});
 }
 if(key==='reviews'&&row.note)await query(tx,`INSERT dbo.observacion_docente(id_revision_docente,descripcion,atendida) VALUES(@id,@note,0)`,{id:row._sqlId,note:row.note});
 if(key==='authorizations'&&row.evidence)await query(tx,`INSERT dbo.evidencia_autorizacion(id_autorizacion,tipo_evidencia,referencia) VALUES(@id,N'referencia',@evidence)`,{id:row._sqlId,evidence:row.evidence});
}
export async function persist(tx,before,next){
 // Dependent records are removed first; real foreign keys retain historical records.
 for(const key of [...collections].reverse())for(const row of before[key])if(!next[key].some(x=>x.id===row.id)){
  const mapping=mappings[key];
  if(mapping&&row._sqlId){
   if(key==='sections')await query(tx,'DELETE dbo.planificacion_seccion WHERE id_seccion=@id',{id:row._sqlId});
   if(key==='reviews')await query(tx,'DELETE dbo.observacion_docente WHERE id_revision_docente=@id',{id:row._sqlId});
   if(key==='users'){
    await query(tx,'DELETE dbo.dato_usuario WHERE id_usuario=@id; UPDATE dbo.profesor SET id_usuario=NULL WHERE id_usuario=@id;',{id:row._sqlId});
    await query(tx,'DELETE app.Credential WHERE user_id=@id; DELETE app.Session WHERE user_id=@id;',{id:row.id});
   }
   await query(tx,`DELETE dbo.[${mapping[0]}] WHERE [${mapping[1]}]=@id`,{id:row._sqlId});
  }
  await query(tx,'DELETE app.Entity WHERE collection=@key AND id=@id',{key,id:row.id});
 }
 for(const key of collections)for(const row of next[key]){
  const old=before[key].find(x=>x.id===row.id);
  if(JSON.stringify(old)===JSON.stringify(row))continue;
  if(key==='reports'&&!old)row.snapshot=snapshot(next,row.planningId);
  await saveRelational(tx,key,row,old,next);await writeEntity(tx,key,row);
 }
 await query(tx,'UPDATE app.Version SET revision=revision+1 WHERE id=1');
}
