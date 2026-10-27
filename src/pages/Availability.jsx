import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {MessageCircle,Save,Trash2,Edit3} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {createId} from '../lib/domain.mjs';
import {Alert,Button,Card,Field,PageHeading,Select,Table,TextInput} from '../components/UI';
import {listForRef} from '../lib/maintenance.mjs';
const blank={periodId:'',slotId:'',available:true,observation:''};
export function AvailabilityPage(){
 const {db,mutate,user}=useApp(),teacher=user.role==='teacher',[form,setForm]=useState(blank),[editing,setEditing]=useState(''),[selected,setSelected]=useState('');
 const [filter,setFilter]=useState('');const items=(db.availability||[]).filter(a=>(teacher?a.teacherId===user.teacherId:!filter||a.teacherId===filter));
 const submit=async e=>{e.preventDefault();const ok=await mutate(d=>{
  const teacherId=teacher?user.teacherId:form.teacherId;
  if(!teacherId)throw Error('Selecciona un profesor.');
  if(!d.periods.some(p=>p.id===form.periodId&&p.active)||!d.slots.some(s=>s.id===form.slotId&&s.active))throw Error('Selecciona un período y horario activos.');
  if(d.availability.some(a=>a.id!==editing&&a.teacherId===teacherId&&a.periodId===form.periodId&&a.slotId===form.slotId))throw Error('Ya existe una disponibilidad en ese período y bloque.');
  const value={...form,teacherId,observation:String(form.observation||'').trim()};
  if(editing){const r=d.availability.find(a=>a.id===editing&&(!teacher||a.teacherId===user.teacherId));if(!r)throw Error('No puedes editar ese registro.');Object.assign(r,value)}
  else d.availability.push({id:createId('disp'),...value,active:true});
 },editing?'Disponibilidad docente actualizada':'Disponibilidad docente registrada');if(ok){setEditing('');setForm(blank)} };
 const edit=r=>{setEditing(r.id);setForm({...r})};
 const del=async r=>{if(!window.confirm('¿Eliminar esta disponibilidad?'))return;await mutate(d=>{const target=d.availability.find(x=>x.id===r.id);if(!target||teacher&&target.teacherId!==user.teacherId)throw Error('Sin permiso para eliminar esta disponibilidad.');d.availability=d.availability.filter(x=>x.id!==r.id)},'Disponibilidad eliminada')};
 return <><PageHeading title={teacher?'Mi disponibilidad docente':'Consulta de disponibilidad docente'} subtitle="Días y bloques que sirven como referencia al preparar o corregir una planificación."/>
 <Alert>La disponibilidad es una referencia para Coordinación. No reemplaza la confirmación formal de cada asignación durante la revisión docente.</Alert>
 {teacher?<Card title={editing?'Editar mi disponibilidad':'Registrar mi disponibilidad'}><form onSubmit={submit}><div className="form-grid"><Field label="Período" required><Select required value={form.periodId} onChange={v=>setForm({...form,periodId:v})} options={listForRef(db,'periods')}/></Field><Field label="Día y horario" required><Select required value={form.slotId} onChange={v=>setForm({...form,slotId:v})} options={listForRef(db,'slots')}/></Field><Field label="¿Puedes impartir clase en este bloque?"><label className="inline-check"><input type="checkbox" checked={!!form.available} onChange={e=>setForm({...form,available:e.target.checked})}/> Disponible</label></Field><Field label="Observaciones"><TextInput value={form.observation||''} onChange={e=>setForm({...form,observation:e.target.value})} placeholder="Ej. solo disponible a partir de 11:00"/></Field></div><div className="form-actions"><Button type="submit"><Save size={15}/>{editing?'Guardar cambios':'Agregar horario'}</Button>{editing&&<Button variant="light" type="button" onClick={()=>{setForm(blank);setEditing('')}}>Cancelar</Button>}</div></form></Card>:<Card title="Filtrar por profesor"><Field label="Docente"><Select value={filter} onChange={setFilter} options={listForRef(db,'teachers')} placeholder="Todos los profesores"/></Field></Card>}
 <Card title={teacher?'Mis registros de disponibilidad':'Disponibilidad registrada'}><Table rows={items} columns={[{label:'Docente',render:r=>db.teachers.find(t=>t.id===r.teacherId)?.name||'—'},{label:'Semestre',render:r=>db.periods.find(p=>p.id===r.periodId)?.label||'—'},{label:'Horario',render:r=>{const h=db.slots.find(x=>x.id===r.slotId);return h?`${h.day} ${h.start}–${h.end}`:'—'}},{label:'Disponible',render:r=><span className={`status status-${r.available?'autorizada':'denegada'}`}>{r.available?'Sí':'No'}</span>},{label:'Observación',key:'observation'},{label:'Acciones',render:r=>teacher?<div className="action-row"><Button type="button" variant="light" onClick={()=>edit(r)}><Edit3 size={13}/> Editar</Button><Button type="button" variant="danger" onClick={()=>del(r)}><Trash2 size={13}/> Eliminar</Button></div>:<Link className="btn btn-light" to={`/chat?teacher=${r.teacherId}`}><MessageCircle size={13}/> Consultar en chat</Link>}]}/></Card></>;
}
