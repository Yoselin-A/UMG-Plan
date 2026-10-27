import React,{useMemo,useState,useEffect,useRef} from 'react';
import {useSearchParams,Link} from 'react-router-dom';
import {MessageCircle,Send,MessageSquare} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {createId,nowISO} from '../lib/domain.mjs';
import {Button,Card,PageHeading,Alert} from '../components/UI';
export function ChatPage(){
 const {db,user,mutate}=useApp();const [params,setParams]=useSearchParams();const [body,setBody]=useState('');const bottom=useRef(null);
 const conversations=useMemo(()=>{
  let list=db.assignments.filter(a=>user.role==='coordinator'||a.teacherId===user.teacherId);
  const keys=new Set();return list.flatMap(a=>{const key=a.planningId+'|'+a.teacherId;if(keys.has(key))return [];keys.add(key);const p=db.plannings.find(p=>p.id===a.planningId),t=db.teachers.find(t=>t.id===a.teacherId);if(!p||!t)return [];return [{planId:p.id,teacherId:t.id,plan:p,teacher:t,key}]}).sort((a,b)=>a.teacher.name.localeCompare(b.teacher.name));
 },[db.assignments,db.plannings,db.teachers,user]);
 let selected=conversations.find(c=>c.planId===params.get('plan')&&c.teacherId===params.get('teacher'))||conversations[0];
 const rows=(db.messages||[]).filter(m=>selected&&m.planningId===selected.planId&&m.teacherId===selected.teacherId).sort((a,b)=>a.at.localeCompare(b.at));
 useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'})},[rows.length,selected?.key]);
 const send=async e=>{e.preventDefault();const text=body.trim();if(!text||!selected)return;const ok=await mutate(d=>{d.messages.push({id:createId('msg'),planningId:selected.planId,teacherId:selected.teacherId,senderId:user.id,body:text,at:nowISO()})},'Mensaje enviado al chat');if(ok)setBody('')};
 return <><PageHeading title="Chat de planificación docente" subtitle="Comunicación entre Coordinación y el profesor para consultar disponibilidad y solicitar ajustes."/>
 <Alert>El historial de mensajes no se puede editar ni eliminar. Los mensajes se guardan en SQL Server. Una solicitud por chat no modifica automáticamente el horario: el Coordinador debe corregir la asignación y solicitar una nueva confirmación.</Alert>
 <div className="chat-layout"><aside className="chat-list"><h3>Conversaciones</h3>{!conversations.length&&<p className="hint">No existen asignaciones vinculadas. Crea una planificación y asigna profesores.</p>}{conversations.map(c=><button key={c.key} className={`chat-person ${selected?.key===c.key?'active':''}`} onClick={()=>setParams({plan:c.planId,teacher:c.teacherId})}><span className="chat-avatar">{c.teacher.name.charAt(0)}</span><span><b>{c.teacher.name}</b><small>{c.plan.code} · {db.periods.find(x=>x.id===c.plan.periodId)?.label}</small></span></button>)}</aside>
 <section className="chat-conversation">{selected?<><div className="chat-header"><MessageCircle size={19}/><div><b>{selected.teacher.name}</b><small>{selected.plan.code} · Chat institucional de planificación</small></div></div><div className="chat-messages" role="log" aria-label="Historial de mensajes">{!rows.length&&<div className="chat-empty"><MessageSquare size={32}/><b>Inicia la conversación</b><p>Consulta si el horario propuesto está bien o si el docente necesita cambios.</p></div>}{rows.map(m=><div className={`bubble-row ${m.senderId===user.id?'mine':''}`} key={m.id}><div className="bubble"><p>{m.body}</p><small>{db.users.find(u=>u.id===m.senderId)?.name||'Docente'} · {new Date(m.at).toLocaleString('es-GT',{dateStyle:'short',timeStyle:'short'})}{m.editedAt?' · Editado':''}</small></div></div>)}<div ref={bottom}/></div><form className="chat-compose" onSubmit={send}><input className="input" value={body} maxLength={1500} onChange={e=>setBody(e.target.value)} placeholder="Escribe un mensaje para consultar o solicitar cambios…" aria-label="Nuevo mensaje"/><Button type="submit" disabled={!body.trim()}><Send size={16}/> Enviar</Button></form></>:<div className="chat-empty"><p>Aún no tienes conversaciones de planificación.</p></div>}</section></div></>;
}
