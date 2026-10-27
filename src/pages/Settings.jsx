import React,{useState} from 'react';
import {LockKeyhole,UserRound} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {Button,Card,PageHeading,Alert} from '../components/UI';
import {Modal} from '../components/AdvancedUI';
import {PasswordRequestForm} from '../components/PasswordRequestForm';
export function SettingsPage({theme,setTheme}){
 const {user,requestPasswordChange,db}=useApp();const [open,setOpen]=useState(false);
 const requests=(db.passwordRequests||[]).filter(r=>r.userId===user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 return <><PageHeading title="Ajustes y perfil" subtitle="Preferencias visuales y solicitudes de seguridad de tu cuenta."/><div className="grid cols-2"><Card title="Apariencia del sistema"><div className="theme-choice"><button className={`theme-card ${theme==='light'?'active':''}`} onClick={()=>setTheme('light')}><span className="theme-preview theme-day"/><b>Modo claro</b></button><button className={`theme-card ${theme==='dark'?'active':''}`} onClick={()=>setTheme('dark')}><span className="theme-preview theme-night"/><b>Modo oscuro</b></button></div></Card><Card title="Mi cuenta"><div className="profile-info"><UserRound size={25}/><div><strong>{user.name}</strong><span>Usuario: {user.username} · Rol: {user.roleName||user.role}</span></div></div><Alert>Tu identidad y tus permisos se verifican en el servidor.</Alert></Card></div>
 <Card title="Solicitud de cambio de contraseña"><p>Por seguridad, el cambio requiere la autorización del Administrador. No se modificará tu contraseña hasta recibir una aprobación.</p><Button type="button" onClick={()=>setOpen(true)}><LockKeyhole size={17}/> Solicitar cambio de contraseña</Button><h3 className="umg-section-subtitle">Mis solicitudes</h3>{requests.length?<div className="umg-request-history">{requests.map(r=><div key={r.id}><b>{r.status==='pending'?'Pendiente':r.status==='approved'?'Autorizada':'Denegada'}</b><small>{new Date(r.createdAt).toLocaleString('es-GT')}{r.note?` · ${r.note}`:''}</small></div>)}</div>:<p className="hint">Todavía no tienes solicitudes registradas.</p>}</Card>
 <Modal open={open} title="Solicitar cambio de contraseña" subtitle="La solicitud será revisada por el Administrador." onClose={()=>setOpen(false)}><PasswordRequestForm identity={user.email||user.username} locked onRequest={requestPasswordChange} onCancel={()=>setOpen(false)}/></Modal></>;
}
