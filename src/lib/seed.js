import {enrichSeedForDemo} from './seedExpanded.mjs';
/** Datos iniciales: escenario ficticio 2026 Villa Nueva y catálogo histórico de referencia
 * transcrito del documento institucional: Centro Universitario Portales, semestre II 2025.
 * Los nombres históricos no significan disponibilidad ni adscripción actual a Villa Nueva.
 */
const period='period-2026-2';
const university='Universidad Mariano Gálvez de Guatemala';
const career='Ingeniería en Sistemas de la Información y Ciencias de la Computación';
const teachersDemo=[
 ['t-1','CAT-001','Carlos Mendoza'],['t-2','CAT-002','María López'],
 ['t-3','CAT-003','Andrea Martínez'],['t-4','CAT-004','Luis González'],
 ['t-5','CAT-005','Rosa Herrera'],['t-6','CAT-006','Pedro Ramírez'],
 ['t-7','CAT-007','Claudia Méndez'],['t-8','CAT-008','José Hernández']
].map(([id,code,name])=>({id,code,name,email:`${code.toLowerCase()}@miumg.edu.gt`,phone:'',specialty:'Informática / Sistemas',active:true,source:'demostracion'}));
const historicalTeachers=[
 ['2745','Edgar Orlando Rodríguez Morales'],['10311','Mario Alberto Hernández Alvarado'],
 ['4676','Mario René de León García'],['9318','Diana Beatriz Ruiz Cifuentes'],
 ['13978','Fabio Humberto Sanabria Salazar'],['14482','Byron Raúl Miranda Toledo'],
 ['5035','Roger Marcoantonio Navas Coronado'],['14848','David Emanuel Marroquín Marroquín'],
 ['7176','Eladio Antonio Girón Hernández'],['11687','Nancy Vanessa López Cifuentes'],
 ['12621','Nery Rubiny Paz Najarro'],['13728','Walter Emilio Ramírez Córdova'],
 ['3127','Domingo Antonio Alvarado Bamaca'],['14367','Carmen Lorena España Jurado'],
 ['11006','José Samuel Bulux Calderón'],['11018','Axel Emmanuel Aguilar Carrillo'],
 ['12659','Dorian Soraya de León González'],['6647','José Eduardo Milián Martínez'],
 ['10919','María Lourdes García Mateo'],['10084','Jorge Mario Moya'],
 ['9452','Ernesto Rabindranath Azurdia'],['12487','Marlon Lenin Girón Vielman'],
 ['9695','Aldo Ismael López Amaya'],['8561','Kevin Roberto Hernández Tavico'],
 ['16535','Carlos José Martínez Bolaños'],['14558','Gerald Alexander Espinales Molina'],
 ['9619','Iver Adolfo Vargas Villanueva'],['5093','Byron René Prado Jui']
].map(([code,name])=>({id:`th-${code}`,code,name,email:'',phone:'',specialty:'Referencia histórica 2025',active:true,source:'documento-base-2025'}));
const referenceCourses=[
 [2,'006','Precálculo',0],[2,'007','Álgebra Lineal',0],[2,'008','Algoritmos',110],[2,'009','Contabilidad II',0],[2,'010','Matemática Discreta',0],
 [4,'016','Microeconomía',0],[4,'017','Programación II',110],[4,'018','Cálculo II',0],[4,'019','Estadística I',0],[4,'020','Física II',0],
 [6,'026','Investigación de Operaciones',0],[6,'027','Bases de Datos I',110],[6,'028','Autómatas y Lenguajes Formales',0],[6,'029','Sistemas Operativos I',0],[6,'030','Electrónica Digital',0],
 [8,'036','Desarrollo Web',110],[8,'037','Análisis de Sistemas II',0],[8,'038','Redes de Computadoras I',0],[8,'039','Ética Profesional',0],[8,'040','Arquitectura de Computadoras II',0],
 [10,'046','Telecomunicaciones',0],[10,'047','Seminario de Tecnología de Información',0],[10,'048','Aseguramiento de la Calidad de Software',0],[10,'049','Proyecto de Graduación II',0],[10,'050','Seguridad y Auditoría de Sistemas',0]
].map(([cycle,code,name,cost])=>({id:`ref-course-${code}`,code:`9989-${code}`,name,planId:'plan-portales',cycleId:`cy-${cycle}`,lab:cost>0,labCost:cost,active:true,source:'documento-base-2025'}));
const demoCourses=[
 ['course-1','046','Telecomunicaciones',8,0],['course-2','047','Seguridad y Auditoría de Sistemas',8,0],
 ['course-3','048','Aseguramiento de la Calidad del Software',8,100],['course-4','049','Administración de Proyectos Informáticos',8,0],
 ['course-5','041','Redes de Computadoras',7,100],['course-6','042','Bases de Datos II',7,100],
 ['course-7','043','Ingeniería de Software',7,0],['course-8','044','Sistemas Operativos',7,0],
 ['course-9','050','Proyecto Integrador',9,0],['course-10','051','Gestión de Tecnología',9,0],['course-11','052','Gestión de Incidentes',8,0]
].map(([id,code,name,cycle,cost])=>({id,code,name,planId:'plan-sistemas',cycleId:`cy-${cycle}`,lab:cost>0,labCost:cost,active:true,source:'demostracion'}));
const slots=['07:00-09:00','09:00-11:00','11:00-13:00','14:00-16:00','16:00-18:00'].map((time,i)=>({id:`slot-${i+1}`,day:'Sábado',start:time.split('-')[0],end:time.split('-')[1],active:true}));
const weekdays=['Lunes','Martes','Miércoles','Jueves','Viernes'];
for(const d of weekdays){for(const [i,time] of ['07:00-08:35','08:35-10:10','10:10-11:45','11:45-13:20','14:00-15:35','15:35-17:10'].entries())slots.push({id:`slot-${d}-${i+1}`,day:d,start:time.split('-')[0],end:time.split('-')[1],active:true});}
const assignments=[];
for(const [index,section,room,teacher] of [
 [0,'section-a','room-1','t-1'],[1,'section-a','room-1','t-2'],
 [2,'section-a','room-1','t-3'],[3,'section-a','room-1','t-4'],
 [0,'section-b','room-2','t-5'],[1,'section-b','room-2','t-6'],
 [2,'section-b','room-2','t-7'],[3,'section-b','room-2','t-8']
])assignments.push({id:`asgn-${assignments.length+1}`,planningId:'planning-1',sectionId:section,courseId:`course-${index+1}`,teacherId:teacher,slotId:`slot-${index+1}`,roomId:room});
const makeBaseSeed=()=>({
 schemaVersion:4,
 users:[
  {id:'u-admin',username:'admin',name:'Administrador UMG Plan',role:'admin',teacherId:'',email:'admin@miumg.edu.gt',active:true},
  {id:'u-coord',username:'coordinador',name:'Coordinador de Carrera',role:'coordinator',teacherId:'',email:'coordinador@miumg.edu.gt',active:true},
  ...teachersDemo.map((t,i)=>({id:`u-doc${i+1}`,username:`docente${i+1}`,name:t.name,role:'teacher',teacherId:t.id,email:`docente${i+1}@miumg.edu.gt`,active:true}))
 ],
 teachers:[...teachersDemo,...historicalTeachers],
 studyPlans:[
  {id:'plan-sistemas',code:'ISC-2026',careerCode:'ISC',name:career,center:'Centro Universitario Villa Nueva',mode:'Plan Sábado',university,active:true,source:'demostracion'},
  {id:'plan-portales',code:'9989/2013',careerCode:'9989/2013',name:'Ingeniería en Sistemas de Información y Ciencias de la Computación',center:'Centro Universitario Portales',mode:'Plan Sábado',university,active:true,source:'documento-base-2025'}
 ],
 cycles:Array.from({length:10},(_,i)=>({id:`cy-${i+1}`,number:i+1,name:['Primero','Segundo','Tercero','Cuarto','Quinto','Sexto','Séptimo','Octavo','Noveno','Décimo'][i]+' ciclo',active:true})),
 periods:[2025,2026,2027].flatMap(year=>[1,2].map(semester=>({id:`period-${year}-${semester}`,label:`${semester===1?'Primer':'Segundo'} semestre ${year}`,year,active:true}))),
 rooms:[...['A-101','A-102','A-201','A-301','B-101','B-201','B-301','B-401','LAB-01','LAB-02'].map((code,i)=>({id:i===0?'room-1':i===1?'room-2':`room-${i+1}`,code,capacity:i>=8?30:40,type:i>=8?'Laboratorio':'Salón',active:true}))],
 slots,
 courses:[...demoCourses,...referenceCourses],
 enrollments:[{id:'enroll-1',planId:'plan-sistemas',periodId:period,cycleId:'cy-8',count:58,historicalCapacity:30},{id:'enroll-2',planId:'plan-sistemas',periodId:period,cycleId:'cy-7',count:42,historicalCapacity:30}],
 plannings:[{id:'planning-1',code:'PL-2026-002',planId:'plan-sistemas',periodId:period,status:'borrador',createdAt:'2026-10-01T09:00:00.000Z',updatedAt:'2026-10-01T09:00:00.000Z',createdBy:'u-coord'}],
 sections:[{id:'section-a',planningId:'planning-1',cycleId:'cy-8',code:'A',capacity:30},{id:'section-b',planningId:'planning-1',cycleId:'cy-8',code:'B',capacity:28}],
 assignments,
 reviews:[],reports:[],authorizations:[],
 messages:[{id:'msg-example',planningId:'planning-1',teacherId:'t-1',senderId:'u-coord',text:'Buen día. Por favor revisa tu horario propuesto y confirma si tienes disponibilidad.',at:'2026-10-01T09:10:00.000Z'}],
 notifications:[{id:'noti-example',userId:'u-doc1',title:'Bienvenido a UMG Plan',body:'Revisa tu planificación de demostración cuando se envíe a revisión docente.',link:'/mis-asignaciones',at:'2026-10-01T09:10:00.000Z',read:false}],
 audit:[{id:'evt-1',at:'2026-10-01T09:00:00.000Z',userId:'u-coord',action:'Inicialización del escenario de demostración y catálogos históricos de referencia'}]
});

// Nuevos mantenimientos derivados del modelo SP-II. Los datos actuales son
// demostrativos salvo catálogos expresamente identificados como referencia.
export function extendSeed(seed){
 const uni='inst-umg',vn='cent-vn',port='cent-port',carV='car-vn',carP='car-port',mod='mod-sab';
 const plus={
  institutions:[{id:uni,code:'UMG',name:'Universidad Mariano Gálvez de Guatemala',abbreviation:'UMG',address:'Guatemala',active:true,source:'institucional'}],
  centers:[{id:vn,code:'VN',name:'Centro Universitario Villa Nueva',institutionId:uni,location:'Villa Nueva, Guatemala',active:true,source:'demostracion'},
   {id:port,code:'PORT',name:'Centro Universitario Portales',institutionId:uni,location:'Guatemala',active:true,source:'documento-base-2025'}],
  careers:[{id:carV,code:'ISC',name:career,centerId:vn,active:true,source:'demostracion'},
    {id:carP,code:'9989/2013',name:'Ingeniería en Sistemas de Información y Ciencias de la Computación',centerId:port,active:true,source:'documento-base-2025'}],
  modalities:[{id:mod,code:'SAB',name:'Plan Sábado',description:'Cursos concentrados en sábado',active:true},
    {id:'mod-dia',code:'DIARIO',name:'Plan Diario',description:'Jornada regular (referencial)',active:true}],
  authorityTypes:[{id:'auttype-coord',code:'COORD',name:'Coordinación de Carrera',description:'Responsable de elaborar el plan',active:true},
   {id:'auttype-director',code:'DIRECTOR',name:'Dirección de Sede / Campus',description:'Revisión y decisión externa',active:true},
   {id:'auttype-decano',code:'DECANO',name:'Decanato',description:'Espacio de visto bueno institucional',active:true},
   {id:'auttype-general',code:'DGCU',name:'Dirección General de Centros Universitarios',description:'Espacio de visto bueno institucional',active:true}],
  authorities:[{id:'aut-coord',code:'COORD-VN',name:'Coordinador por confirmar (demo)',typeId:'auttype-coord',centerId:vn,active:true,source:'demostracion'},
   {id:'aut-director',code:'DIR-VN',name:'Director por confirmar (demo)',typeId:'auttype-director',centerId:vn,active:true,source:'demostracion'},
   {id:'aut-decano',code:'DEC-VN',name:'Decano por confirmar (demo)',typeId:'auttype-decano',centerId:vn,active:true,source:'demostracion'},
   {id:'aut-general',code:'DGCU-VN',name:'Dirección General por confirmar (demo)',typeId:'auttype-general',centerId:vn,active:true,source:'demostracion'}],
  planningAuthorities:['aut-coord','aut-director','aut-decano','aut-general'].map((id,i)=>({id:'pa-'+(i+1),planningId:'planning-1',authorityId:id,function:['Visto bueno Coordinación','Decisión externa del Director','Visto bueno Decanato','Visto bueno Dirección General'][i],active:true})),
  coordinationSlots:[{id:'coord-slot-1',coordinatorId:'u-coord',periodId:'period-2026-2',slotId:'slot-1',notes:'Horario sugerido de coordinación (demostración)',active:true}],
  curriculum:seed.courses.map((c,i)=>({id:'pc-'+c.id,planId:c.planId,courseId:c.id,cycleId:c.cycleId,order:i+1,active:c.active,source:c.source})),
  costHistory:seed.courses.filter(c=>c.lab).map(c=>({id:'cost-'+c.id,courseId:c.id,effectiveDate:c.source==='documento-base-2025'?'2025-01-01':'2026-01-01',cost:c.labCost,active:true,source:c.source})),
  availability:teachersDemo.slice(0,3).map((t,i)=>({id:'disp-'+(i+1),teacherId:t.id,periodId:'period-2026-2',slotId:'slot-'+(i+1),available:true,observation:'Disponibilidad de demostración; verificar antes de asignar',active:true})),
 };
 for(const [k,v] of Object.entries(plus))if(!Array.isArray(seed[k]))seed[k]=v;
 const meta={'plan-sistemas':{institutionId:uni,centerId:vn,careerId:carV,modalityId:mod},'plan-portales':{institutionId:uni,centerId:port,careerId:carP,modalityId:mod}};
 for(const p of seed.studyPlans||[])if(meta[p.id])for(const [k,v] of Object.entries(meta[p.id]))if(!p[k])p[k]=v;
 for(const u of seed.users||[]){if(!u.email&&['admin','coordinador'].includes(u.username))u.email=`${u.username}@miumg.edu.gt`;if(!u.email&&/^docente\d+$/.test(u.username))u.email=`${u.username}@miumg.edu.gt`;}
 // Normaliza solamente los correos ficticios del escenario demo. No inventa correos para profesores históricos.
 for(const t of seed.teachers||[]){if(t.source==='demostracion'&&t.email?.endsWith('@ejemplo.edu.gt'))t.email=t.email.replace('@ejemplo.edu.gt','@miumg.edu.gt');}
 for(const m of seed.messages||[]){if(m.text&&!m.body){m.body=m.text;delete m.text;}}
 if(!Array.isArray(seed.customRoles))seed.customRoles=[];
 if(!Array.isArray(seed.systemRoles))seed.systemRoles=[];
 if(!Array.isArray(seed.passwordRequests))seed.passwordRequests=[];
 return enrichSeedForDemo(seed);
}
export const makeSeed=()=>extendSeed(makeBaseSeed());
