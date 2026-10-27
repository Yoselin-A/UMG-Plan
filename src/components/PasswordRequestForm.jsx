import React,{useState} from 'react';
import {CheckCircle2,Eye,EyeOff,LockKeyhole,Mail,Send} from 'lucide-react';
import {PASSWORD_CRITERIA,isStrongPassword} from '../lib/passwordRequests.mjs';
import {Button} from './UI';
export function PasswordRequestForm({identity='',locked=false,onRequest,onCancel}){
 const [lookup,setLookup]=useState(identity),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[reveal,setReveal]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 async function submit(e){e.preventDefault();setError('');if(!lookup.trim())return setError('Ingresa tu usuario o correo institucional.');if(!isStrongPassword(password))return setError('La contraseña no cumple todos los requisitos.');if(password!==repeat)return setError('Las contraseñas no coinciden.');setPending(true);try{const success=await onRequest(lookup.trim(),password);if(success){setPassword('');setRepeat('');onCancel?.()}}catch(err){setError(err.message)}finally{setPending(false)}}
 return <form className="umg-request-form" onSubmit={submit}>
  <div className="umg-request-help">Escribe exactamente el usuario de acceso o correo registrado. La contraseña nueva se activará solo cuando el administrador autorice la solicitud. Si ya hay una solicitud pendiente, se conserva la contraseña que enviaste primero.</div>
  <label className="field"><span className="field-label">Usuario o correo institucional *</span><div className="umg-password-input"><Mail size={18}/><input className="input" required value={lookup} disabled={locked} onChange={e=>setLookup(e.target.value)} placeholder="usuario o correo@miumg.edu.gt"/></div></label>
  <label className="field"><span className="field-label">Nueva contraseña solicitada *</span><div className="umg-password-input"><LockKeyhole size={18}/><input required className="input" value={password} type={reveal?'text':'password'} autoComplete="new-password" onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setReveal(v=>!v)} title="Mostrar u ocultar contraseña">{reveal?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
  <div className="umg-password-checklist">{PASSWORD_CRITERIA.map(([key,title,fn])=><span key={key} className={fn(password)?'valid':''}><CheckCircle2 size={14}/>{title}</span>)}</div>
  <label className="field"><span className="field-label">Confirmar nueva contraseña *</span><div className="umg-password-input"><LockKeyhole size={18}/><input required className="input" value={repeat} type={reveal?'text':'password'} autoComplete="new-password" onChange={e=>setRepeat(e.target.value)}/></div></label>
  {error&&<div className="alert alert-danger" role="alert">{error}</div>}
  <div className="umg-form-actions"><Button type="button" variant="light" onClick={onCancel}>Cancelar</Button><Button disabled={pending} type="submit"><Send size={16}/> {pending?'Enviando…':'Enviar solicitud'}</Button></div>
 </form>
}
