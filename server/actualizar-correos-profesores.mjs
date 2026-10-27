import {pool,query,transaction} from './db.mjs';
import {migrate} from './store.mjs';
import {updateTeacherEmails} from './correos-profesores.mjs';
import {assert} from './security.mjs';
try{
 await migrate();
 const database=(await query(pool,'SELECT DB_NAME() AS name'))[0].name;
 assert(database==='UMGPlan_Dev'||/^UMGPlan_Test_[A-Za-z0-9_]+$/.test(database),'Solo se permite modificar la base local de desarrollo o una copia de prueba.');
 const updated=await transaction(updateTeacherEmails);
 console.log(`${updated.length} correo(s) de profesores actualizados. Son direcciones de ejemplo.`);
}finally{await pool.close();}
