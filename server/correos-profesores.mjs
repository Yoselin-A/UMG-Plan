import {randomUUID} from 'node:crypto';
import {query} from './db.mjs';
import {load} from './store.mjs';
import {assert} from './security.mjs';

const oldDemoAddress=/^demo\.sp2(?:\.\d+)?@example\.com$/i;
const cleanName=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

export function planTeacherEmails(state,professors){
 const targets=state.teachers.filter(t=>oldDemoAddress.test(t.email||''));
 const targetIds=new Set(targets.map(t=>t.id));
 const used=new Set([...state.users.map(u=>u.email),...state.teachers.filter(t=>!targetIds.has(t.id)).map(t=>t.email)].filter(Boolean).map(s=>s.toLowerCase()));
 return targets.sort((a,b)=>a._sqlId-b._sqlId).map(teacher=>{
  const original=professors.find(p=>p.id_profesor===teacher._sqlId);
  assert(original,'No se encontró el profesor en SQL Server.');
  const first=cleanName(original.primer_nombre).slice(0,25)||'docente';
  const last=cleanName(original.primer_apellido).slice(0,25)||String(teacher._sqlId);
  const base=`${first}.${last}.demo`;
  let candidate=`${base}@miumg.edu.gt`,suffix=2;
  while(used.has(candidate))candidate=`${base}${suffix++}@miumg.edu.gt`;
  used.add(candidate);
  return {id:teacher.id,sqlId:teacher._sqlId,email:candidate};
 });
}

export async function updateTeacherEmails(tx){
 const {state}=await load(tx,true);
 const professors=await query(tx,'SELECT id_profesor,primer_nombre,primer_apellido FROM dbo.profesor');
 const changes=planTeacherEmails(state,professors);
 if(!changes.length)return changes;
 const admin=state.users.find(u=>u.role==='admin'&&u.active);
 assert(admin?._sqlId,'No se encontró un administrador activo para registrar la actualización.');
 for(const item of changes){
  await query(tx,'UPDATE dbo.profesor SET correo=@email WHERE id_profesor=@id',{email:item.email,id:item.sqlId});
  await query(tx,`UPDATE app.Entity SET payload=JSON_MODIFY(JSON_MODIFY(payload,'$.email',@email),'$.emailExample',CAST(1 AS bit)) WHERE collection='teachers' AND id=@id`,{email:item.email,id:item.id});
 }
 const action=`Se actualizaron ${changes.length} correos de profesores con direcciones de ejemplo @miumg.edu.gt.`;
 const auditId=randomUUID(),at=new Date().toISOString();
 const audit=(await query(tx,`INSERT dbo.bitacora_auditoria(id_usuario,id_tipo_accion,entidad,datos_nuevos)
  OUTPUT inserted.id_bitacora_auditoria AS id
  VALUES(@user,(SELECT TOP 1 id_tipo_accion FROM dbo.tipo_accion_auditoria ORDER BY id_tipo_accion),'UMGPlan',@details)`,{user:admin._sqlId,details:JSON.stringify({action})}))[0];
 await query(tx,'INSERT app.Entity(collection,id,sql_id,payload) VALUES(@collection,@id,@sqlId,@payload)',{collection:'audit',id:auditId,sqlId:audit.id,payload:JSON.stringify({id:auditId,userId:admin.id,at,action})});
 await query(tx,'UPDATE app.Version SET revision=revision+1 WHERE id=1');
 return changes;
}
