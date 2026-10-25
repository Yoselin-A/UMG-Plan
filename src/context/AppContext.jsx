import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {createId,nowISO} from '../lib/domain.mjs';
import {makeSeed,extendSeed} from '../lib/seed';
import {userForSession,getBaseRole} from '../lib/roles.mjs';
import {isStrongPassword,newPasswordRequest,decidePasswordRequest} from '../lib/passwordRequests.mjs';
import {localRepository,LOCAL_DATA_KEY} from '../lib/repository.mjs';
const Ctx=createContext(null);
export const DATA_KEY=LOCAL_DATA_KEY;
const AUTH_KEY='umgplan-credentials-v3';
const SESSION_KEY='umgplan-user-v3';
const SEED_PASSWORD='Demo2026!';
function getData(){
 try{
  const saved=localRepository.load();
  if(saved){if(saved && Array.isArray(saved.users)&&Array.isArray(saved.courses)&&Array.isArray(saved.plannings)){const version=Number(saved.schemaVersion)||0;const upgraded=extendSeed(saved);if(version<7)localRepository.save(upgraded);return upgraded;}}
  const oldRaw=localStorage.getItem('umgplan-local-v3');
  if(oldRaw){
   const old=JSON.parse(oldRaw),fresh=makeSeed();
   if(old&&Array.isArray(old.users)&&Array.isArray(old.courses)&&Array.isArray(old.plannings)){
    // Se conserva la información ya ingresada. Solo se anexan registros nuevos
    // evitando sobrescribir los IDs existentes de versiones anteriores.
    for(const [key,arr] of Object.entries(fresh))if(['users','teachers','studyPlans','cycles','periods','rooms','slots','courses'].includes(key)){
     const already=Array.isArray(old[key])?old[key]:[];
     const ids=new Set(already.map(x=>x.id));
     old[key]=[...already,...arr.filter(x=>!ids.has(x.id))];
    }
    for(const [key,arr] of Object.entries(fresh))if(Array.isArray(arr)&&!Array.isArray(old[key]))old[key]=[];
    extendSeed(old);localRepository.save(old);return old;
   }
  }
  return makeSeed();
 }catch{return makeSeed();}
}
const defaults={};
function initialCredentials(){try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')||defaults}catch{return defaults}}
async function hash(value){
 const bytes=new TextEncoder().encode(value);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function noteForChanges(oldDb,newDb,currentUser){
 const at=nowISO();
 const makeNotice=(id,title,body,link)=>{if(!id||id===currentUser)return;newDb.notifications.push({id:createId('notif'),userId:id,title,body,link,at,read:false});};
 const coordinators=newDb.users.filter(u=>getBaseRole(newDb,u.role)==='coordinator'&&u.active);
 const teachersForPlanning=planningId=>new Set(newDb.assignments.filter(a=>a.planningId===planningId).map(a=>a.teacherId));
 for(const p of newDb.plannings){const was=oldDb.plannings.find(x=>x.id===p.id);if(!was||was.status===p.status)continue;
   if(p.status==='revision') for(const tId of teachersForPlanning(p.id))for(const u of newDb.users.filter(u=>getBaseRole(newDb,u.role)==='teacher'&&u.teacherId===tId&&u.active))makeNotice(u.id,'Planificación para revisar',`${p.code}: revisa tus asignaciones y confirma tu disponibilidad.`, '/mis-asignaciones');
   if(['autorizada','denegada'].includes(p.status))for(const u of coordinators)makeNotice(u.id,'Resolución registrada',`${p.code}: ${p.status}.`,'/planificaciones/'+p.id);
 }
 for(const r of newDb.reviews.filter(r=>!oldDb.reviews.some(x=>x.id===r.id))){const a=newDb.assignments.find(a=>a.id===r.assignmentId);if(!a)continue;const teacher=newDb.teachers.find(t=>t.id===r.teacherId);for(const u of coordinators)makeNotice(u.id,'Respuesta del docente',`${teacher?.name||'Docente'}: ${r.status}.`,'/planificaciones/'+a.planningId+'?tab=revision');}
 for(const m of newDb.messages.filter(m=>!oldDb.messages.some(x=>x.id===m.id))){const teacherUser=newDb.users.find(u=>getBaseRole(newDb,u.role)==='teacher'&&u.teacherId===m.teacherId&&u.active);const recipients=m.senderId===teacherUser?.id?coordinators:[teacherUser].filter(Boolean);for(const u of recipients)makeNotice(u.id,'Mensaje nuevo',`Nuevo mensaje en la planificación ${newDb.plannings.find(p=>p.id===m.planningId)?.code||''}.`,'/chat?plan='+encodeURIComponent(m.planningId)+'&teacher='+encodeURIComponent(m.teacherId));}
}
export function AppProvider({children}){
 const [db,setDb]=useState(getData),[user,setUser]=useState(null),[ready,setReady]=useState(false),[notice,setNotice]=useState(null);
 const dbRef=useRef(db),userRef=useRef(null);
 const notify=(text,type='success')=>setNotice({id:Date.now(),text,type});
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(null),4600);return()=>clearTimeout(t)},[notice]);
 useEffect(()=>{
  const current=getData();dbRef.current=current;setDb(current);
  const sess=sessionStorage.getItem(SESSION_KEY);const active=current.users.find(u=>u.id===sess&&u.active);
  if(active){const sessionUser=userForSession(current,active);userRef.current=sessionUser;setUser(sessionUser)}
  setReady(true);
  function receive(e){if(e.key!==DATA_KEY)return;const updated=getData();dbRef.current=updated;setDb(updated);const id=userRef.current?.id;if(id){const fresh=updated.users.find(u=>u.id===id&&u.active);if(fresh){const sessionUser=userForSession(updated,fresh);userRef.current=sessionUser;setUser(sessionUser)}else{userRef.current=null;setUser(null);sessionStorage.removeItem(SESSION_KEY)}}}
  window.addEventListener('storage',receive);return()=>window.removeEventListener('storage',receive);
 },[]);
 const login=async(username,password)=>{
  const current=dbRef.current;const candidate=current.users.find(u=>(u.username.toLowerCase()===String(username).trim().toLowerCase()||u.email?.toLowerCase()===String(username).trim().toLowerCase())&&u.active);
  if(!candidate||!userForSession(current,candidate)){notify('Usuario o contraseña incorrectos, o rol deshabilitado.','error');return false}
  const credentials=initialCredentials();const entered=await hash(password);
  const wanted=credentials[candidate.id]||(await hash(SEED_PASSWORD));
  if(entered!==wanted){notify('Usuario o contraseña incorrectos.','error');return false}
  const sessionUser=userForSession(current,candidate);userRef.current=sessionUser;setUser(sessionUser);sessionStorage.setItem(SESSION_KEY,candidate.id);notify(`Bienvenido, ${candidate.name}`);return true;
 };
 const logout=async()=>{userRef.current=null;setUser(null);sessionStorage.removeItem(SESSION_KEY)};
 const mutate=(work,action='Cambios guardados')=>{
  try{
   if(!userRef.current)throw Error('Inicia sesión para continuar.');
   const old=dbRef.current,next=structuredClone(old);work(next);
   noteForChanges(old,next,userRef.current.id);
   next.audit=Array.isArray(next.audit)?next.audit:[];
   next.audit.unshift({id:createId('audit'),at:nowISO(),userId:userRef.current.id,action});
   if(next.audit.length>400)next.audit.length=400;
   localRepository.save(next);dbRef.current=next;setDb(next);
   const current=next.users.find(x=>x.id===userRef.current.id&&x.active);
   if(current){const sessionUser=userForSession(next,current);userRef.current=sessionUser;setUser(sessionUser)}else{userRef.current=null;setUser(null);sessionStorage.removeItem(SESSION_KEY)}
   notify(action);return true;
  }catch(e){notify(e.name==='QuotaExceededError'?'Se agotó el espacio del navegador. Exporta un respaldo y libera almacenamiento.':e.message,'error');return false}
 };
 // Solicitud local. Se guarda únicamente un hash de la contraseña propuesta, nunca el texto escrito.
 const requestPasswordChange=async(identity,newPassword)=>{
  if(!isStrongPassword(newPassword)){notify('Usa 10 caracteres, mayúscula, minúscula, número y carácter especial.','error');return false;}
  const current=dbRef.current;
  const candidate=current.users.find(u=>u.active!==false&&(u.username.toLowerCase()===String(identity).trim().toLowerCase()||u.email?.toLowerCase()===String(identity).trim().toLowerCase()));
  if(!candidate){notify('Cuenta no encontrada. Verifica el usuario o correo.','error');return false;}
  try{
   const next=structuredClone(current);next.passwordRequests=next.passwordRequests||[];
   const request=newPasswordRequest(next,{id:createId('pwreq'),userId:candidate.id,passwordHash:await hash(newPassword),at:nowISO()});
   next.passwordRequests.unshift(request);
   next.notifications=next.notifications||[];
   for(const admin of next.users.filter(u=>u.active!==false&&u.role==='admin'))next.notifications.push({id:createId('notif'),userId:admin.id,title:'Solicitud de contraseña pendiente',body:`${candidate.username} solicita cambiar su contraseña.`,link:'/solicitudes-contrasena',at:nowISO(),read:false});
   next.audit=next.audit||[];next.audit.unshift({id:createId('audit'),at:nowISO(),userId:candidate.id,action:'Solicitud de cambio de contraseña enviada al Administrador'});
   localRepository.save(next);dbRef.current=next;setDb(next);notify('Solicitud enviada. El Administrador debe autorizarla; tu contraseña anterior sigue activa.');return true;
  }catch(e){notify(e.message,'error');return false;}
 };
 const resolvePasswordRequest=(requestId,decision,note='')=>{
  if(userRef.current?.roleId!=='admin'){notify('Únicamente el Administrador principal puede atender solicitudes.','error');return false;}
  try{
   const current=dbRef.current,next=structuredClone(current);const {item,acceptedHash}=decidePasswordRequest(next,requestId,decision,userRef.current.id,note,nowISO());
   const target=next.users.find(u=>u.id===item.userId);if(!target)throw Error('Usuario inexistente');
   next.notifications=next.notifications||[];next.notifications.push({id:createId('notif'),userId:target.id,title:decision==='approved'?'Cambio de contraseña autorizado':'Cambio de contraseña denegado',body:decision==='approved'?'Ya puedes ingresar con tu nueva contraseña.':'Tu contraseña anterior permanece activa.'+(note?' Motivo: '+note:''),link:'/ajustes',at:nowISO(),read:false});
   next.audit=next.audit||[];next.audit.unshift({id:createId('audit'),at:nowISO(),userId:userRef.current.id,action:`Solicitud de contraseña ${decision==='approved'?'autorizada':'denegada'} para ${target.username}`});
   localRepository.save(next);
   if(acceptedHash){const credentials=initialCredentials();credentials[target.id]=acceptedHash;localStorage.setItem(AUTH_KEY,JSON.stringify(credentials));}
   dbRef.current=next;setDb(next);notify(decision==='approved'?'Solicitud autorizada; nueva contraseña habilitada.':'Solicitud denegada; no se modificó la contraseña.');return true;
  }catch(e){notify(e.message,'error');return false;}
 };
 const replaceData=(data)=>{
  if(userRef.current?.role!=='admin')throw Error('Solo el administrador puede importar datos.');
  const keys=['users','teachers','studyPlans','cycles','periods','rooms','slots','courses','enrollments','plannings','sections','assignments','reviews','reports','authorizations','messages','notifications','audit'];
  if(!data||!keys.every(k=>Array.isArray(data[k])))throw Error('JSON inválido: faltan colecciones necesarias para UMG Plan.');
  if(!data.users.some(u=>u.id===userRef.current.id&&u.active&&u.role==='admin'))throw Error('El respaldo debe conservar tu cuenta de administrador activa.');
  const safe=extendSeed(structuredClone(data));localRepository.save(safe);dbRef.current=safe;setDb(safe);notify('Respaldo local importado correctamente.');
 };
 const resetData=()=>{if(userRef.current?.role!=='admin')throw Error('Solo el administrador puede reiniciar datos.');const fresh=makeSeed();localRepository.save(fresh);localStorage.removeItem(AUTH_KEY);dbRef.current=fresh;setDb(fresh);userRef.current=null;setUser(null);sessionStorage.removeItem(SESSION_KEY);notify('Datos de ejemplo restablecidos. Ingresa de nuevo.')};
 return <Ctx.Provider value={{db,user,ready,mutate,login,logout,notice,notify,requestPasswordChange,resolvePasswordRequest,replaceData,resetData,refresh:()=>{let state=getData();dbRef.current=state;setDb(state)}}}>{children}</Ctx.Provider>;
}
export function useApp(){const v=useContext(Ctx);if(!v)throw Error('Falta AppProvider');return v}
