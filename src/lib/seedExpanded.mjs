/**
 * Conjunto ampliado de PRUEBAS, nunca padrón institucional.
 * Solo universidad UMG y centros Villa Nueva / Portales están respaldados por
 * documentos del proyecto; los otros centros, carreras, docentes, registros de
 * inscripción y horarios son supuestos para probar interfaz y relaciones.
 * Esta migración se aplica una sola vez cuando schemaVersion < 7.
 */
const DAYS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const daysHours={
 Lunes:['06:00-07:30','07:30-09:00','09:00-10:30','10:30-12:00','12:00-13:30','13:30-15:00','15:00-16:30','16:30-18:00','18:00-19:30','19:30-21:00','20:00-21:30'],
 Martes:['06:00-07:30','07:30-09:00','09:00-10:30','10:30-12:00','12:00-13:30','13:30-15:00','15:00-16:30','16:30-18:00','18:00-19:30','19:30-21:00','20:00-21:30'],
 Miércoles:['06:00-07:30','07:30-09:00','09:00-10:30','10:30-12:00','12:00-13:30','13:30-15:00','15:00-16:30','16:30-18:00','18:00-19:30','19:30-21:00','20:00-21:30'],
 Jueves:['06:00-07:30','07:30-09:00','09:00-10:30','10:30-12:00','12:00-13:30','13:30-15:00','15:00-16:30','16:30-18:00','18:00-19:30','19:30-21:00','20:00-21:30'],
 Viernes:['06:00-07:30','07:30-09:00','09:00-10:30','10:30-12:00','12:00-13:30','13:30-15:00','15:00-16:30','16:30-18:00','18:00-19:30','19:30-21:00','20:00-21:30'],
 Sábado:['06:00-08:00','08:00-10:00','10:00-12:00','12:00-14:00','13:00-15:00','15:00-17:00','17:00-19:00','18:00-20:00','19:00-21:00'],
 Domingo:['07:00-09:00','08:00-10:00','09:00-11:00','10:00-12:00','11:00-13:00','12:00-14:00','13:00-15:00','14:00-16:00','15:00-17:00','16:00-18:00','17:00-19:00','18:00-20:00']
};
export const EXPANDED_SOURCE_NOTICE='Los registros marcados como demostración no están validados por la UMG. Los docentes/cursos de Portales son referencias históricas de 2025, no horarios vigentes.';
export function enrichSeedForDemo(seed){
 if(Number(seed.schemaVersion)>=7)return seed;
 const put=(table,record)=>{if(!Array.isArray(seed[table]))seed[table]=[];if(!seed[table].some(row=>row.id===record.id))seed[table].push(record);};
 const demo='demostracion';const uni='inst-umg',vn='cent-vn',port='cent-port',modSat='mod-sab';
 // Los centros adicionales son *simulados* y su nombre impide confundirlos
 // con centros universitarios oficiales.
 for(const [id,code,name,location] of [
  ['demo-cent-norte','N-PRUEBA','Sede de prueba Norte (no oficial)','Zona Norte — ejemplo'],
  ['demo-cent-sur','S-PRUEBA','Sede de prueba Sur (no oficial)','Zona Sur — ejemplo'],
  ['demo-cent-occ','O-PRUEBA','Sede de prueba Occidente (no oficial)','Occidente — ejemplo'],
  ['demo-cent-oriente','E-PRUEBA','Sede de prueba Oriente (no oficial)','Oriente — ejemplo']
 ])put('centers',{id,code,name,institutionId:uni,location,active:true,source:demo});
 const modalities=[
  ['mod-ves','VES','Jornada Vespertina','Tarde — horario referencial'],
  ['mod-noc','NOC','Plan Nocturno','Tarde/noche — horario referencial'],
  ['mod-dom','DOM','Plan Domingo','Domingos — modalidad de prueba'],
  ['mod-fin','FDS','Plan Fin de Semana','Sábados y domingos — prueba']
 ];
 for(const [id,code,name,description] of modalities)put('modalities',{id,code,name,description,active:true,source:demo});
 // Estas carreras y pensums son opciones ficticias de selección; su oferta por
 // centro o modalidad NO indica aprobación académica o actividad actual.
 const programs=[
  ['ADM','Administración de Empresas',vn,modSat],
  ['MER','Mercadotecnia',vn,'mod-dia'],
  ['CPA','Contaduría Pública y Auditoría',vn,'mod-ves'],
  ['DER','Ciencias Jurídicas y Sociales',vn,'mod-noc'],
  ['PSI','Psicología',vn,'mod-dom'],
  ['IND','Ingeniería Industrial',vn,'mod-dia'],
  ['ARQ','Arquitectura','demo-cent-norte','mod-dia'],
  ['ENF','Enfermería','demo-cent-sur','mod-fin'],
  ['TRA','Trabajo Social','demo-cent-occ',modSat],
  ['TUR','Administración Turística','demo-cent-oriente','mod-dom'],
  ['COM','Comunicación Social',port,'mod-ves'],
  ['PED','Pedagogía',port,'mod-dom'],
 ];
 const centerName=id=>seed.centers.find(x=>x.id===id)?.name||'';
 const modeName=id=>seed.modalities.find(x=>x.id===id)?.name||'';
 const uniName=seed.institutions.find(x=>x.id===uni)?.name||'Universidad Mariano Gálvez de Guatemala';
 for(const [code,name,centerId,modalityId] of programs){
  put('careers',{id:`demo-career-${code}`,code,name,centerId,active:true,source:demo});
  put('studyPlans',{id:`demo-plan-${code}`,code:`${code}-2026-DEMO`,careerCode:code,name,center:centerName(centerId),mode:modeName(modalityId),university:uniName,institutionId:uni,centerId,careerId:`demo-career-${code}`,modalityId,active:true,source:demo});
 }
 // Extiende los años históricos de ensayo, períodos regulares y ciclos no semestrales.
 for(const year of [2024,2028,2029,2030])for(const n of [1,2])put('periods',{id:`demo-period-${year}-${n}`,label:`${n===1?'Primer':'Segundo'} semestre ${year}`,year,semester:n,termType:'Semestral',active:true,source:demo});
 for(const year of [2026,2027,2028]){
  for(let n=1;n<=3;n++)put('periods',{id:`demo-trimestre-${year}-${n}`,label:`Trimestre ${n} ${year} (prueba)`,year,semester:n,termType:'Trimestral',active:true,source:demo});
  for(let n=1;n<=4;n++)put('periods',{id:`demo-cuatrimestre-${year}-${n}`,label:`Período ${n} ${year} (prueba)`,year,semester:n,termType:'Cuatrimestral',active:true,source:demo});
  put('periods',{id:`demo-interciclo-${year}`,label:`Interciclo ${year} (prueba)`,year,semester:3,termType:'Interciclo',active:true,source:demo});
 }
 for(const day of DAYS)for(const hours of daysHours[day]){
  const [start,end]=hours.split('-');
  if(!(seed.slots||[]).some(s=>s.day===day&&s.start===start&&s.end===end))put('slots',{id:`demo-slot-${DAYS.indexOf(day)+1}-${start.replace(':','')}-${end.replace(':','')}`,day,start,end,active:true,source:demo});
 }
 for(const [i,code,capacity,type] of [
  [1,'A-401',40,'Salón'],[2,'A-402',40,'Salón'],[3,'B-402',35,'Salón'],[4,'C-101',45,'Salón'],
  [5,'C-201',40,'Salón'],[6,'LAB-03',30,'Laboratorio'],[7,'LAB-04',25,'Laboratorio'],
  [8,'AUD-01',80,'Auditorio'],[9,'INF-01',30,'Aula de informática'],[10,'INF-02',30,'Aula de informática']
 ])put('rooms',{id:`demo-room-${i}`,code,capacity,type,active:true,source:demo});
 const demoNames=['Daniela Morales','Ricardo Fuentes','Patricia Aguilar','Gabriela Gómez','Andrea Cifuentes','Héctor Pérez','Sandra Reyes','Jorge Castillo','Verónica Hernández','Gabriel Escobar','Carmen Álvarez','Óscar García','María Fernanda Ruiz','Julio Méndez','Marisol Gómez','Fernando Castro','Natalia Mendoza','Diego Sánchez'];
 demoNames.forEach((name,i)=>put('teachers',{id:`demo-prof-${i+1}`,code:`DEMO-CAT-${String(i+1).padStart(3,'0')}`,name,email:`profesor.demo${i+1}@miumg.edu.gt`,phone:'',specialty:['Planificación académica (prueba)','Administración (prueba)','Tecnología (prueba)','Ciencias sociales (prueba)'][i%4],active:true,source:demo}));
 // Cursos de prueba creados para cada carrera. No sustituyen un pensum oficial.
 const subjects=[
  ['Fundamentos de la disciplina','Introducción a la carrera'],
  ['Comunicación y redacción','Herramientas digitales'],
  ['Estadística aplicada','Metodología de la investigación'],
  ['Ética profesional','Gestión de proyectos'],
  ['Seminario integrador','Investigación aplicada']
 ];
 programs.forEach(([code],pi)=>{
  const planId=`demo-plan-${code}`;
  subjects.forEach((pair,j)=>pair.forEach((title,k)=>{
   const number=j*2+k+1,cycleId=`cy-${Math.min(j+1,10)}`,courseId=`demo-course-${code}-${number}`;
   const lab=(k===1&&j===1),labCost=lab?85:0;
   put('courses',{id:courseId,code:`${code}-${String(number).padStart(3,'0')}`,name:`${title} (${code} · ejemplo)`,planId,cycleId,lab,labCost,active:true,source:demo});
   put('curriculum',{id:`demo-pensum-${code}-${number}`,planId,courseId,cycleId,order:number,active:true,source:demo});
   if(lab)put('costHistory',{id:`demo-costo-${code}-${number}`,courseId,effectiveDate:'2026-01-01',cost:labCost,active:true,source:demo});
  }));
  for(let cy=1;cy<=3;cy++)put('enrollments',{id:`demo-inscritos-${code}-${cy}`,planId,periodId:'period-2026-2',cycleId:`cy-${cy}`,count:28+((pi+cy*7)%41),historicalCapacity:30,active:true,source:demo});
 });
 // Las planificaciones de prueba no se marcan como aprobadas ni generan
 // decisiones atribuidas a personas reales.
 programs.slice(0,5).forEach(([code],i)=>{
  const id=`demo-planning-${code}`,sectionId=`demo-section-${code}`;
  put('plannings',{id,code:`PL-DEMO-${code}-2026`,planId:`demo-plan-${code}`,periodId:'period-2026-2',status:'borrador',createdAt:'2026-10-01T09:00:00.000Z',updatedAt:'2026-10-01T09:00:00.000Z',createdBy:'u-coord',source:demo});
  put('sections',{id:sectionId,planningId:id,cycleId:'cy-1',code:'A',capacity:30,source:demo});
  // Solo un curso por docente en cada sección. Las asignaciones son editables.
  put('assignments',{id:`demo-assignment-${code}`,planningId:id,sectionId,courseId:`demo-course-${code}-1`,teacherId:`demo-prof-${i+1}`,slotId:(seed.slots.find(s=>s.day==='Domingo'&&s.start==='07:00'&&s.end==='09:00')||seed.slots[0]).id,roomId:'demo-room-1',source:demo});
 });
 seed.schemaVersion=7;
 return seed;
}
