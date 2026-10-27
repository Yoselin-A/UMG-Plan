import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {migrate,load,persist} from './store.mjs';
import {query,transaction,pool} from './db.mjs';
import {hashPassword} from './security.mjs';
import {isStrongPassword} from '../src/lib/passwordRequests.mjs';

try{
 await migrate();
 const password=process.env.BOOTSTRAP_PASSWORD||`UmG!${randomBytes(18).toString('base64url')}7a`;
 if(!isStrongPassword(password))throw Error('BOOTSTRAP_PASSWORD no cumple los requisitos.');
 const hash=await hashPassword(password);let created=false;
 await transaction(async tx=>{
  const {state}=await load(tx,true);
  if(state.users.some(x=>x.role==='admin'&&x.active)){console.log('Ya existe un administrador; no se modifica su contraseña.');return;}
  const next=structuredClone(state),id=randomUUID();
  next.users.push({id,username:'admin',name:'Administrador UMG Plan',email:process.env.BOOTSTRAP_EMAIL||'admin@miumg.edu.gt',role:'admin',teacherId:'',active:true});
  await persist(tx,state,next);
  await query(tx,'INSERT app.Credential(user_id,password_hash) VALUES(@id,@hash)',{id,hash});
  await query(tx,'UPDATE dbo.usuario SET password_hash=@hash WHERE id_usuario=@id',{id:next.users.find(x=>x.id===id)._sqlId,hash});created=true;
 });
 if(created){await writeFile('ACCESO_LOCAL.txt',`UMG Plan — acceso local\nUsuario: admin\nContraseña: ${password}\n\nArchivo privado, excluido de Git. No compartir.\nPara habilitar otras cuentas: solicitar contraseña en la pantalla de acceso y aprobar desde el Administrador.\n`);console.log('Administrador creado. Consulta ACCESO_LOCAL.txt (excluido de Git).');}
}finally{await pool.close();}
