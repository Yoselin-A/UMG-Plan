import React,{useState} from 'react';
import {useApp} from '../context/AppContext';
import {teacherCoursesForPeriod} from '../lib/domain.mjs';
import {Card,PageHeading,Table,Status,Select,Field,Options} from '../components/UI';
export function StatsPage(){
 const {db}=useApp();const [periodId,setPeriodId]=useState('');
 const teachers=db.teachers.map(t=>({...t,count:periodId?teacherCoursesForPeriod(db,t.id,periodId).size:null})).sort((a,b)=>(b.count??0)-(a.count??0));
 return <><PageHeading title="Estadísticas académicas" subtitle="Selecciona un período para consultar los cursos distintos asignados a cada docente."/><div className="stats-overview">{[['Planificaciones',db.plannings.length],['Asignaciones',db.assignments.length],['Secciones',db.sections.length],['Docentes activos',db.teachers.filter(x=>x.active).length]].map(([s,n])=><div className="stat" key={s}><span>{s}</span><strong>{n}</strong></div>)}</div><div className="grid cols-2"><Card title="Carga académica docente"><Field label="Período"><Select value={periodId} onChange={setPeriodId} options={Options(db.periods,'label')} placeholder="Selecciona un período"/></Field><Table rows={teachers} columns={[{label:'Docente',render:t=>t.name},{label:'Código',key:'code'},{label:'Cursos distintos',render:t=><b>{t.count??'Selecciona un período'}</b>}]}/></Card><Card title="Estado de las planificaciones"><Table rows={db.plannings} columns={[{label:'Planificación',key:'code'},{label:'Estado',render:p=><Status status={p.status}/>},{label:'Asignaciones',render:p=>db.assignments.filter(a=>a.planningId===p.id).length}]}/></Card></div></>
}
