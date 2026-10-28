import test from 'node:test';
import assert from 'node:assert/strict';
import {slotMatchesTeacherShift,teacherCoursesForPeriod} from '../src/lib/domain.mjs';
test('jornadas limitan días y horarios como se solicita',()=>{
 assert(slotMatchesTeacherShift({day:'Lunes',start:'07:00',end:'08:30'},'Matutina'));
 assert(!slotMatchesTeacherShift({day:'Lunes',start:'17:00',end:'18:30'},'Matutina'));
 assert(slotMatchesTeacherShift({day:'Viernes',start:'20:05',end:'21:00'},'Vespertina'));
 assert(!slotMatchesTeacherShift({day:'Sábado',start:'17:00',end:'18:30'},'Vespertina'));
 assert(slotMatchesTeacherShift({day:'Sábado',start:'07:00',end:'08:30'},'Sábado'));
 assert(!slotMatchesTeacherShift({day:'Domingo',start:'07:00',end:'08:30'},'Sábado'));
});
test('la carga cuenta cursos distintos por período, no asignaciones',()=>{
 const db={plannings:[{id:'p1',periodId:'sem1'},{id:'p2',periodId:'sem1'},{id:'p3',periodId:'sem2'}],assignments:[{id:'a',planningId:'p1',teacherId:'t',courseId:'c1'},{id:'b',planningId:'p2',teacherId:'t',courseId:'c1'},{id:'c',planningId:'p2',teacherId:'t',courseId:'c2'},{id:'d',planningId:'p3',teacherId:'t',courseId:'c3'}]};
 assert.equal(teacherCoursesForPeriod(db,'t','sem1').size,2);assert.equal(teacherCoursesForPeriod(db,'t','sem2').size,1);
});
