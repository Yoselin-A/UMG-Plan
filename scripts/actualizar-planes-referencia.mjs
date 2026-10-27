import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {pool,query,transaction} from '../server/db.mjs';
import {migrate,load,persist} from '../server/store.mjs';
import {assert} from '../server/security.mjs';

const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const slug=s=>normalize(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export async function updateReferencePlans(tx){
 const dataset=JSON.parse(await readFile(new URL('../datos/planes-referencia-umg.json',import.meta.url),'utf8'));
 const {state}=await load(tx,true),next=structuredClone(state);
 const institution=next.institutions.find(x=>x.id==='pensum5090-institution');
 const admin=next.users.find(x=>x.role==='admin'&&x.active);
 assert(institution&&admin,'Falta la institución UMG o un administrador activo.');
 let added=0;
 for(const item of dataset.planes){
  assert(/^\d{4}$/.test(item.codigo)&&Number.isInteger(item.anio)&&item.sede&&item.jornada&&item.carrera&&item.fuente.startsWith('https://'),'Datos de referencia inválidos.');
  const code=`${item.codigo}-${item.anio}`;
  if(next.studyPlans.some(p=>p.code===code))continue;
  let center=next.centers.find(x=>normalize(x.name)===normalize(item.sede)&&x.institutionId===institution.id);
  if(!center){center={id:`ref-center-${slug(item.sede)}`,code:`REF-${slug(item.sede).toUpperCase()}`,name:item.sede,institutionId:institution.id,location:item.sede,active:true,source:'referencia-pensum'};next.centers.push(center);}
  let mode=next.modalities.find(x=>x.name==='No especificada'&&x.active);
  if(!mode){mode={id:'modality-unspecified',code:'SIN-ESPECIFICAR',name:'No especificada',description:'Modalidad pendiente de confirmar.',active:true};next.modalities.push(mode);}
  let career=next.careers.find(x=>x.code===item.codigo);
  if(career)assert(career.centerId===center.id&&normalize(career.name)===normalize(item.carrera),`El código ${item.codigo} ya corresponde a otra carrera o sede.`);
  else{career={id:`ref-career-${item.codigo}`,code:item.codigo,name:item.carrera,centerId:center.id,active:true,source:'referencia-pensum'};next.careers.push(career);}
  next.studyPlans.push({id:`ref-plan-${code}`,code,name:item.carrera,year:item.anio,careerId:career.id,careerCode:career.code,centerId:center.id,center:center.name,institutionId:institution.id,university:institution.name,modalityId:mode.id,mode:mode.name,jornada:item.jornada,active:true,source:'referencia-pensum'});
  added++;
 }
 let retired=0;
 for(const plan of next.studyPlans){if(plan.source==='respaldo-SP_II'&&/^DEMO-PLAN-2026(?:-\d+)?$/i.test(plan.code)&&plan.active){plan.active=false;retired++;}}
 if(added||retired){next.audit.push({id:randomUUID(),userId:admin.id,at:new Date().toISOString(),action:`Planes académicos: ${added} referencias añadidas y ${retired} ejemplos inactivados.`});await persist(tx,state,next);}
 return {added,retired};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{await migrate();const name=(await query(pool,'SELECT DB_NAME() AS name'))[0].name;assert(name==='UMGPlan_Dev'||/^UMGPlan_Test_[A-Za-z0-9_]+$/.test(name),'Solo se permite usar la base de desarrollo o pruebas.');console.log(JSON.stringify(await transaction(updateReferencePlans)));}finally{await pool.close();}
}
