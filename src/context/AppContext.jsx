import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {makeSeed} from '../lib/seed';
import {api,diffState,signIn,signOut,forgetCsrf} from '../lib/api.mjs';
const Ctx=createContext(null);
export const DATA_KEY='umgplan-server-v1';
const empty=()=>Object.fromEntries(Object.entries(makeSeed()).map(([key,value])=>[key,Array.isArray(value)?[]:value]));
export function AppProvider({children}){
 const [db,setDb]=useState(empty),[user,setUser]=useState(null),[ready,setReady]=useState(false),[notice,setNotice]=useState(null);
 const stateRef=useRef({db:empty(),revision:0,user:null}),busy=useRef(false),authGeneration=useRef(0);
 const notify=(text,type='success')=>setNotice({id:Date.now(),text,type});
 const accept=data=>{stateRef.current=data;setDb(data.db);setUser(data.user);};
 const clear=()=>{authGeneration.current++;stateRef.current={db:empty(),revision:0,user:null};setDb(empty());setUser(null);};
 const refresh=async()=>{
  if(!stateRef.current.user)return;
  const generation=authGeneration.current;
  try{const data=await api('/session');if(generation===authGeneration.current&&stateRef.current.user)accept(data);}
  catch(error){if(generation!==authGeneration.current)return;if(error.status===401)clear();else throw error;}
 };
 useEffect(()=>{
  // A new page load always requires explicit sign-in, even if a cookie remains.
  setReady(true);
  const interval=setInterval(()=>{if(stateRef.current.user&&!busy.current)refresh().catch(()=>{});},10000);
  return()=>{clearInterval(interval);};
 },[]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),6000);return()=>clearTimeout(timer);},[notice]);
 const login=async(username,password)=>{
  const generation=++authGeneration.current;
  try{const data=await signIn(username,password);if(generation!==authGeneration.current)return false;accept(data);notify('Sesión iniciada.');return true;}catch(error){if(generation===authGeneration.current)notify(error.message,'error');return false;}
 };
 const logout=async()=>{
  clear();setNotice(null);const generation=authGeneration.current;
  try{await signOut();}catch(error){if(generation===authGeneration.current&&error.status!==401)notify(error.message,'error');}
  finally{if(generation===authGeneration.current)forgetCsrf();}
 };
 const mutate=async(work,action='Cambios guardados')=>{
  if(busy.current){notify('Espera a que termine el guardado anterior.','error');return false;}
  busy.current=true;
  const generation=authGeneration.current;
  try{
   if(!stateRef.current.user)throw Error('Inicia sesión para continuar.');
   const current=stateRef.current,next=structuredClone(current.db);work(next);
   const changes=diffState(current.db,next);if(!changes.length)return true;
   const data=await api('/changes',{revision:current.revision,changes,action});
   if(generation!==authGeneration.current||!stateRef.current.user)return false;
   accept(data);notify(action);return true;
  }catch(error){
   if(generation!==authGeneration.current)return false;
   if(error.status===409)await refresh().catch(()=>{});
   if(error.status===401)clear();notify(error.message,'error');return false;
  }finally{busy.current=false;}
 };
 const requestPasswordChange=async(identity,password)=>{
  try{const result=await api('/password-requests',{identity,password});notify(result.message);if(stateRef.current.user)await refresh();return true;}catch(error){notify(error.message,'error');return false;}
 };
 const resolvePasswordRequest=async(id,decision,note='')=>{
  try{await api('/password-requests/'+encodeURIComponent(id)+'/decision',{decision,note});await refresh();notify('Solicitud atendida.');return true;}catch(error){notify(error.message,'error');return false;}
 };
 const replaceData=()=>{throw Error('La restauración se realiza con SQL Server. Consulta docs/BACKEND.md.');};
 const resetData=()=>{throw Error('Los datos del servidor no se pueden reiniciar desde el navegador.');};
 const getReport=id=>stateRef.current.db.reports.find(x=>x.id===id);
 return <Ctx.Provider value={{db,user,ready,mutate,login,logout,notice,notify,requestPasswordChange,resolvePasswordRequest,replaceData,resetData,refresh,getReport}}>{children}</Ctx.Provider>;
}
export function useApp(){const value=useContext(Ctx);if(!value)throw Error('Falta AppProvider');return value;}
