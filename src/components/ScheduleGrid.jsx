import React from 'react';
import {label} from '../lib/domain.mjs';
import {Card,Empty} from './UI';
const rank={'Lunes':1,'Martes':2,'Miércoles':3,'Jueves':4,'Viernes':5,'Sábado':6,'Domingo':7};
export function ScheduleGrid({db,sections,assignments}){
 const usedDays=new Set(assignments.map(a=>db.slots.find(h=>h.id===a.slotId)?.day));
 const slots=db.slots.filter(h=>h.active&&usedDays.has(h.day)).sort((a,b)=>(rank[a.day]||9)-(rank[b.day]||9)||a.start.localeCompare(b.start));
 return <Card title="Vista de cuadrícula · Planificación semestral"><p className="hint">Organización equivalente a una hoja sábana: por sección y bloque horario, utilizando los datos guardados de las asignaciones.</p>{!assignments.length?<Empty title="La cuadrícula aún está vacía" text="Asigna cursos para visualizar la programación."/>:<div className="table-wrap"><table className="data-table schedule"><thead><tr><th>Bloque horario</th>{sections.map(s=><th key={s.id}>{label(db.cycles,s.cycleId)} · Sección {s.code}<small>Cupo {s.capacity}</small></th>)}</tr></thead><tbody>{slots.map(h=><tr key={h.id}><td><strong>{h.day}</strong><div className="muted">{h.start}–{h.end}</div></td>{sections.map(s=>{const match=assignments.find(a=>a.sectionId===s.id&&a.slotId===h.id);const course=db.courses.find(c=>c.id===match?.courseId),prof=db.teachers.find(t=>t.id===match?.teacherId),room=db.rooms.find(r=>r.id===match?.roomId);return <td key={s.id}>{match?<div className="schedule-course"><strong>{course?.code} · {course?.name}</strong><span>{prof?.name}</span><small>Salón {room?.code}</small></div>:<span className="muted">—</span>}</td>})}</tr>)}</tbody></table></div>}</Card>
}
