import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
export const PENSUM_SOURCE='pensum-5090-2014';
export const readPensum=async()=>JSON.parse(await readFile(new URL('../datos/pensum-5090-2014.json',import.meta.url),'utf8'));
export function replaceCourseCatalog(before,pensum,adminId){
 assert(pensum.code==='5090-2014'&&pensum.courses.length===50,'Pénsum incompleto.');
 const codes=new Set(pensum.courses.map(x=>x.code));
 assert(codes.size===50&&pensum.courses.every((c,i)=>c.code===String(i+1).padStart(3,'0')&&c.cycle===Math.floor(i/5)+1),'Códigos o ciclos inválidos.');
 const next=structuredClone(before);
 const upsert=(key,id,values)=>{
  let row=next[key].find(x=>x.id===id);
  if(!row){row={id};next[key].push(row);}
  Object.assign(row,values);return row;
 };
 const institution=upsert('institutions','pensum5090-institution',{code:'UMG',name:pensum.institution,abbreviation:'UMG',address:'',active:true,source:PENSUM_SOURCE});
 const center=upsert('centers','pensum5090-center',{code:'VN-5090',name:pensum.center,institutionId:institution.id,location:'Villa Nueva',active:true,source:PENSUM_SOURCE});
 const career=upsert('careers','pensum5090-career',{code:pensum.careerCode,name:pensum.career,centerId:center.id,active:true,source:PENSUM_SOURCE});
 const mode=next.modalities.find(x=>x.name==='No especificada'&&x.active)||upsert('modalities','modality-unspecified',{code:'SIN-ESPECIFICAR',name:'No especificada',description:'Modalidad pendiente de confirmar.',active:true});
 const plan=upsert('studyPlans','pensum5090-plan',{code:pensum.code,name:pensum.career,year:pensum.year,careerId:career.id,careerCode:career.code,centerId:center.id,center:center.name,institutionId:institution.id,university:institution.name,modalityId:mode.id,mode:mode.name,jornada:pensum.mode,active:true,source:PENSUM_SOURCE});
 const cycleNames=['Primer','Segundo','Tercer','Cuarto','Quinto','Sexto','Séptimo','Octavo','Noveno','Décimo'];
 const cycles=new Map();
 for(let number=1;number<=10;number++){
  const existing=next.cycles.find(c=>Number(c.number)===number);
  const cycle=upsert('cycles',existing?.id||`pensum5090-cycle-${number}`,{code:`C${String(number).padStart(2,'0')}`,name:`${cycleNames[number-1]} ciclo`,number,active:true});cycles.set(number,cycle.id);
 }
 // Retire previous catalog rows; never rewrite courses that belong to authorized history.
 for(const course of next.courses)if(course.source!==PENSUM_SOURCE)course.active=false;
 for(const relation of next.curriculum)if(next.courses.some(c=>c.id===relation.courseId&&c.source!==PENSUM_SOURCE))relation.active=false;
 for(const item of pensum.courses){
  const course=upsert('courses',`pensum5090-course-${item.code}`,{code:item.code,name:item.name,planId:plan.id,cycleId:cycles.get(item.cycle),lab:false,labCost:0,active:true,source:PENSUM_SOURCE});
  delete course.credits;delete course.prerequisites;
  upsert('curriculum',`pensum5090-curriculum-${item.code}`,{planId:plan.id,courseId:course.id,cycleId:course.cycleId,order:Number(item.code),active:true,source:PENSUM_SOURCE});
 }
 next.audit.push({id:randomUUID(),userId:adminId,at:new Date().toISOString(),action:'Catálogo sustituido por los 50 cursos del pénsum 5090 (2014), 10 ciclos. Cursos anteriores inactivados; historial conservado.'});
 return next;
}
