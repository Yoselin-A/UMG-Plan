import {writeFile,mkdir} from 'node:fs/promises';
import {pool,query,transaction} from './db.mjs';
import {migrate,load,persist} from './store.mjs';
import {readPensum,replaceCourseCatalog,PENSUM_SOURCE} from './pensum.mjs';
import {assert} from './security.mjs';
try{
 await migrate();const database=(await query(pool,'SELECT DB_NAME() AS name'))[0].name;
 assert(database==='UMGPlan_Dev'||/^UMGPlan_Test_[A-Za-z0-9_]+$/.test(database),'La importación solo se permite en desarrollo o pruebas.');
 const pensum=await readPensum();
 await transaction(async tx=>{
  const {state}=await load(tx,true),admin=state.users.find(x=>x.role==='admin'&&x.active);assert(admin,'Falta un administrador activo.');
  if(database==='UMGPlan_Dev'){
   await mkdir('.local/pensum',{recursive:true});
   await writeFile(`.local/pensum/catalogo-anterior-${Date.now()}.json`,JSON.stringify(state,null,2));
  }
  const next=replaceCourseCatalog(state,pensum,admin.id);await persist(tx,state,next);
  const count=next.courses.filter(x=>x.active&&x.source===PENSUM_SOURCE).length;assert(count===50,'La carga no contiene 50 cursos activos.');
  console.log(`Pénsum ${pensum.code}: ${count} cursos activos en 10 ciclos. Historial anterior conservado.`);
 });
}finally{await pool.close();}
