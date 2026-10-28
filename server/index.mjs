import express from 'express';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {pool,query,transaction} from './db.mjs';
import {migrate,load,persist} from './store.mjs';
import {sanitized,applyChanges} from './validation.mjs';
import {assert,token,digest,hashPassword,verifyPassword} from './security.mjs';
import {userForSession,getBaseRole} from '../src/lib/roles.mjs';
import {isStrongPassword} from '../src/lib/passwordRequests.mjs';

export const app=express();
app.disable('x-powered-by');
app.use((req,res,next)=>{
 res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'});
 if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');
 next();
});
app.use(express.json({limit:'3mb'}));
const allowedOrigins=new Set((process.env.ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001').split(','));
app.use('/api',(req,res,next)=>{
 if(!['GET','HEAD','OPTIONS'].includes(req.method))assert(!req.get('Origin')||allowedOrigins.has(req.get('Origin')),'Origen no autorizado.',403);
 next();
});
const buckets=new Map();
function rateLimit(req,res,next){
 const key=req.ip+'|'+req.path,now=Date.now();let item=buckets.get(key);
 if(!item||now>item.until){item={count:0,until:now+600000};buckets.set(key,item);}
 if(buckets.size>10000)for(const [id,b] of buckets)if(b.until<now)buckets.delete(id);
 assert(++item.count<=20,'Demasiados intentos. Espera diez minutos.',429);next();
}
function cookie(req){return req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('umg_session='))?.slice(12)||'';}
const secure=process.env.COOKIE_SECURE==='true';
function setCookie(res,value,maxAge=28800){res.setHeader('Set-Cookie',`umg_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`);}
async function identify(req){
 const session=(await query(pool,'SELECT user_id,csrf FROM app.Session WHERE token_hash=@hash AND expires_at>SYSUTCDATETIME()',{hash:digest(cookie(req))}))[0];
 assert(session,'Inicia sesión para continuar.',401);
 const loaded=await load();const user=loaded.state.users.find(x=>x.id===session.user_id&&x.active);
 assert(user&&userForSession(loaded.state,user),'La cuenta está deshabilitada.',401);
 if(!['GET','HEAD'].includes(req.method))assert(req.get('X-CSRF-Token')===session.csrf,'Actualiza la sesión e intenta de nuevo.',403);
 return {...loaded,user,session};
}
const response=(loaded,user,csrf)=>({db:sanitized(loaded.state,user),revision:loaded.revision,user:userForSession(loaded.state,(({_sqlId,...rest})=>rest)(user)),csrf});
app.get('/api/v1/health',async(req,res)=>{await query(pool,'SELECT 1 AS ok');res.json({status:'ok',database:'connected'});});
app.post('/api/v1/auth/login',rateLimit,async(req,res)=>{
 const {username,password}=req.body||{};assert(typeof username==='string'&&typeof password==='string'&&password.length<=256,'Credenciales inválidas.',400);
 const loaded=await load(),identity=username.trim().toLowerCase();
 const user=loaded.state.users.find(x=>x.username.toLowerCase()===identity||x.email?.toLowerCase()===identity);
 const cred=user?(await query(pool,'SELECT password_hash FROM app.Credential WHERE user_id=@id',{id:user.id}))[0]:null;
 const valid=await verifyPassword(password,cred?.password_hash||dummyPassword);
 await query(pool,'INSERT dbo.bitacora_acceso(id_usuario,correo_intento,exitoso,direccion_ip,user_agent,motivo) VALUES(@id,@identity,@ok,@ip,@agent,@reason)',{id:user?._sqlId||null,identity:identity.slice(0,150),ok:!!(user?.active&&valid),ip:String(req.ip).slice(0,45),agent:String(req.get('User-Agent')||'').slice(0,250),reason:valid?'Acceso validado por UMG Plan':'Credenciales inválidas'});
 assert(user?.active&&userForSession(loaded.state,user)&&valid,'Usuario o contraseña incorrectos.',401);
 const sessionToken=token(),csrf=token();
 await query(pool,'DELETE app.Session WHERE expires_at<SYSUTCDATETIME() OR token_hash=@previous; INSERT app.Session(token_hash,user_id,csrf,expires_at) VALUES(@hash,@id,@csrf,DATEADD(hour,8,SYSUTCDATETIME()))',{previous:digest(cookie(req)),hash:digest(sessionToken),id:user.id,csrf});
 if(user._sqlId)await query(pool,'UPDATE dbo.usuario SET ultimo_acceso=SYSUTCDATETIME() WHERE id_usuario=@id',{id:user._sqlId});
 setCookie(res,sessionToken);res.json(response(loaded,user,csrf));
});
app.get('/api/v1/session',async(req,res)=>{const loaded=await identify(req);res.json(response(loaded,loaded.user,loaded.session.csrf));});
app.post('/api/v1/auth/logout',async(req,res)=>{
 const hash=digest(cookie(req));
 const active=(await query(pool,'SELECT csrf FROM app.Session WHERE token_hash=@hash AND expires_at>SYSUTCDATETIME()',{hash}))[0];
 if(active)assert(req.get('X-CSRF-Token')===active.csrf,'Actualiza la sesión e intenta de nuevo.',403);
 await query(pool,'DELETE app.Session WHERE token_hash=@hash',{hash});setCookie(res,'',0);res.sendStatus(204);
});
app.post('/api/v1/changes',async(req,res)=>{
 const auth=await identify(req);
 await transaction(async tx=>{
  const {state,revision}=await load(tx,true);assert(req.body.revision===revision,'Otra sesión modificó los datos. Actualiza e intenta de nuevo.',409);
  const current=state.users.find(x=>x.id===auth.user.id&&x.active);assert(current,'Sesión inválida.',401);
  let next;try{next=applyChanges(state,req.body.changes,current);}catch(error){if(!error.status)error.status=422;throw error;}
  const action=String(req.body.action||'Datos actualizados').slice(0,500);
  next.audit.push({id:randomUUID(),userId:current.id,at:new Date().toISOString(),action});
  createNotices(state,next,current);
  await persist(tx,state,next);
 });
 const loaded=await load();const user=loaded.state.users.find(x=>x.id===auth.user.id);res.json(response(loaded,user,auth.session.csrf));
});
app.post('/api/v1/password-requests',rateLimit,async(req,res)=>{
 const {identity,password}=req.body||{};
 assert(typeof identity==='string'&&typeof password==='string'&&password.length<=256&&isStrongPassword(password),'Usa al menos 10 caracteres, mayúscula, minúscula, número y símbolo.');
 const passwordHash=await hashPassword(password);
 await transaction(async tx=>{
  const {state}=await load(tx,true),next=structuredClone(state);
  const user=state.users.find(x=>x.active&&(x.username.toLowerCase()===identity.trim().toLowerCase()||x.email?.toLowerCase()===identity.trim().toLowerCase()));
  if(!user||state.passwordRequests.some(x=>x.userId===user.id&&x.status==='pending'))return;
  const id=randomUUID();next.passwordRequests.push({id,userId:user.id,status:'pending',createdAt:new Date().toISOString(),decidedAt:null,decidedBy:null,note:''});
  await query(tx,'INSERT app.PendingPassword(id,password_hash) VALUES(@id,@hash)',{id,hash:passwordHash});
  for(const admin of state.users.filter(x=>x.role==='admin'&&x.active))next.notifications.push({id:randomUUID(),userId:admin.id,title:'Solicitud de contraseña pendiente',body:`${user.username} solicita una contraseña. Verifica su identidad antes de aprobar.`,link:`/solicitudes-contrasena?solicitud=${id}`,at:new Date().toISOString(),read:false});
  await persist(tx,state,next);
 });res.json({message:'Si los datos corresponden a una cuenta activa, el administrador revisará la solicitud. Si ya hay una pendiente, se conserva la primera contraseña propuesta.'});
});
app.post('/api/v1/password-requests/:id/decision',async(req,res)=>{
 const auth=await identify(req);assert(auth.user.role==='admin','Solo el Administrador principal puede decidir.',403);
 const {decision,note}=req.body||{};assert(['approved','denied'].includes(decision),'Decisión inválida.');
 await transaction(async tx=>{
  const {state}=await load(tx,true),next=structuredClone(state);
  const request=next.passwordRequests.find(x=>x.id===req.params.id&&x.status==='pending');assert(request,'Solicitud inexistente o atendida.',404);
  const proposed=(await query(tx,'SELECT password_hash FROM app.PendingPassword WHERE id=@id',{id:request.id}))[0];assert(proposed,'Solicitud inválida.');
  if(decision==='approved'){
   await query(tx,`UPDATE app.Credential SET password_hash=@hash WHERE user_id=@uid; IF @@ROWCOUNT=0 INSERT app.Credential(user_id,password_hash) VALUES(@uid,@hash); DELETE app.Session WHERE user_id=@uid;`,{uid:request.userId,hash:proposed.password_hash});
   const user=state.users.find(x=>x.id===request.userId);await query(tx,'UPDATE dbo.usuario SET password_hash=@hash WHERE id_usuario=@id',{id:user._sqlId,hash:proposed.password_hash});
  }
  await query(tx,'DELETE app.PendingPassword WHERE id=@id',{id:request.id});
  Object.assign(request,{status:decision,decidedAt:new Date().toISOString(),decidedBy:auth.user.id,note:String(note||'').slice(0,1000)});
  const username=state.users.find(u=>u.id===request.userId)?.username;
  for(const n of next.notifications)if(n.title==='Solicitud de contraseña pendiente'&&(n.link===`/solicitudes-contrasena?solicitud=${request.id}`||n.link==='/solicitudes-contrasena'&&username&&n.body===`${username} solicita una contraseña. Verifica su identidad antes de aprobar.`))n.read=true;
  next.audit.push({id:randomUUID(),userId:auth.user.id,at:new Date().toISOString(),action:`Solicitud de contraseña ${decision} para ${request.userId}`});
  next.notifications.push({id:randomUUID(),userId:request.userId,title:decision==='approved'?'Cambio de contraseña autorizado':'Cambio de contraseña denegado',body:String(note||'La solicitud fue atendida.'),link:'/ajustes',at:new Date().toISOString(),read:false});
  await persist(tx,state,next);
 });res.json({message:'Solicitud atendida.'});
});
function createNotices(old,next,user){
 const notice=(userId,title,body,link)=>{if(userId!==user.id)next.notifications.push({id:randomUUID(),userId,title,body,link,at:new Date().toISOString(),read:false});};
 for(const p of next.plannings){
  if(old.plannings.find(x=>x.id===p.id)?.status===p.status)continue;
  if(p.status==='revision')for(const u of next.users.filter(x=>getBaseRole(next,x.role)==='teacher'&&next.assignments.some(a=>a.planningId===p.id&&a.teacherId===x.teacherId)))notice(u.id,'Planificación para revisar',p.code,'/mis-asignaciones');
 }
 for(const r of next.reviews.filter(x=>!old.reviews.some(y=>y.id===x.id))){const a=next.assignments.find(x=>x.id===r.assignmentId),p=next.plannings.find(x=>x.id===a?.planningId);if(p)notice(p.createdBy,'Respuesta del docente',r.status,`/planificaciones/${p.id}?tab=revision`);}
 for(const m of next.messages.filter(x=>!old.messages.some(y=>y.id===x.id))){const p=next.plannings.find(x=>x.id===m.planningId),t=next.users.find(x=>x.teacherId===m.teacherId);const recipient=m.senderId===t?.id?p?.createdBy:t?.id;if(recipient)notice(recipient,'Mensaje nuevo','Tienes un mensaje en el chat.',`/chat?plan=${m.planningId}&teacher=${m.teacherId}`);}
}
app.use(express.static(fileURLToPath(new URL('../dist/',import.meta.url))));
app.get('/{*path}',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({message:'Ruta inexistente.'});res.sendFile(path.resolve(fileURLToPath(new URL('../dist/index.html',import.meta.url))));});
app.use((error,req,res,next)=>{
 if(error.status)return res.status(error.status).json({message:error.message});
 if(error.type==='entity.parse.failed')return res.status(400).json({message:'JSON inválido.'});
 if(error.type==='entity.too.large')return res.status(413).json({message:'Solicitud demasiado grande.'});
 if(error.number===547||error.originalError?.info?.number===547)return res.status(409).json({message:'El registro tiene referencias en SQL Server. Conserva su historial o inactívalo.'});
 if([2601,2627].includes(error.number))return res.status(409).json({message:'Ya existe un registro con ese identificador.'});
 if([2628,8152].includes(error.number))return res.status(422).json({message:'Uno de los campos supera la longitud permitida en SQL Server.'});
 console.error(error);res.status(500).json({message:'No se pudo completar la operación. Consulta el registro del servidor.'});
});
const dummyPassword=await hashPassword(token());
if(process.argv[1]===fileURLToPath(import.meta.url)){
 await migrate();const port=Number(process.env.PORT||3001);
 const host=process.env.HOST||'127.0.0.1';const server=app.listen(port,host,()=>console.log(`UMG Plan: http://localhost:${port}`));
 const stop=()=>server.close(async()=>{await pool.close();process.exit(0);});process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
