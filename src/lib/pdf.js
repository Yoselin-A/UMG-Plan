import {UMG_JPEG_BASE64} from './logoData.js';
/** Reporte institucional en A4 horizontal, inspirado en el documento base de programación
 * por bloque horario y hasta tres secciones por página. No depende de red, API ni SQL.
 */
const W=842,H=595;
const cp1252={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
const latin=s=>Array.from(String(s??'')).map(c=>c.charCodeAt(0)<=255?c.charCodeAt(0):cp1252[c]??63).map(c=>String.fromCharCode(c)).join('');
const esc=s=>latin(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[\r\n]/g,' ');
const f=n=>Number(n).toFixed(2);
function wrap(s,limit=42,max=3){const parts=String(s??'').split(/\s+/), lines=[];let current='';for(const word of parts){if((current+' '+word).trim().length>limit&&current){lines.push(current);current=word;}else current=(current+' '+word).trim()}if(current)lines.push(current);if(lines.length>max){const a=lines.slice(0,max);a[max-1]=a[max-1].slice(0,Math.max(0,limit-2))+'…';return a}return lines.length?lines:[''];}
class Page{
 constructor(){this.commands=[]}
 rect(x,y,w,h,color='white'){const map={white:[1,1,1],navy:[0.01,.27,.46],blue:[.86,.92,.98],pale:[.945,.965,.985],line:[.72,.78,.84],black:[.08,.15,.24]};const c=map[color]||map.white;this.commands.push(`${c.join(' ')} rg ${f(x)} ${f(H-y-h)} ${f(w)} ${f(h)} re f`)}
 line(x,y,X,Y,color='line'){const c=color==='navy'?'0.01 .27 .46':'.72 .78 .84';this.commands.push(`${c} RG .55 w ${f(x)} ${f(H-y)} m ${f(X)} ${f(H-Y)} l S`)}
 text(x,y,s,size=9,bold=false,color='black'){const colors={black:'.08 .15 .24',navy:'.01 .27 .46',muted:'.34 .40 .48',white:'1 1 1'};this.commands.push(`${colors[color]||colors.black} rg BT /${bold?'F1':'F2'} ${size} Tf 1 0 0 1 ${f(x)} ${f(H-y)} Tm (${esc(s)}) Tj ET`)}
}
const dayOrder=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const sortSlots=(a,b)=>dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day)||a.start.localeCompare(b.start);
const chunks=(array,n)=>{const out=[];for(let i=0;i<array.length;i+=n)out.push(array.slice(i,i+n));return out};
function renderPage(page,report,decision,sections,slots,number,total){
 const snap=report.snapshot;const sp=snap.studyPlan||{},pd=snap.period||{};
 page.rect(0,0,W,5,'navy');page.commands.push(`q 42 0 0 42 25 ${H-20-42} cm /Im1 Do Q`);
 page.text(76,26,'UNIVERSIDAD MARIANO GÁLVEZ DE GUATEMALA',11,true,'navy');
 page.text(644,26,sp.jornada?`Jornada: ${sp.jornada}`:(sp.mode||'Sin especificar'),9,true,'navy');
 if(sp.jornada)page.text(644,40,`Modalidad: ${sp.mode||'Sin especificar'}`,8,false,'muted');
 page.text(76,43,`Código de carrera: ${sp.careerCode||'—'}    |    Centro universitario: ${sp.center||'—'}`,9);
 for(const [i,line] of wrap(`Carrera: ${sp.name||'—'}`,115,2).entries())page.text(76,58+i*12,line,9);
 page.text(25,84,`PROGRAMACIÓN ${String(pd.label||'SEMESTRAL').toUpperCase()}`,13,true,'navy');
 page.text(25,99,`Plan ${sp.code||'—'}  |  ${snap.code}  |  Versión ${report.version}  |  ${report.kind==='final'?'REPORTE FINAL AUTORIZADO':'CONSOLIDADA PARA REVISIÓN EXTERNA'}`,8,true,'muted');
 const lx=25,tableW=792,hw=85,colW=(tableW-hw)/Math.max(1,sections.length),tableTop=114,rowH=59;
 page.rect(lx,tableTop,tableW,27,'pale');page.text(lx+7,tableTop+17,'HORARIO',9,true,'navy');
 sections.forEach((s,j)=>{let x=lx+hw+j*colW;page.text(x+6,tableTop+11,`${s.cycle}   Sección "${s.code}"`,8.8,true,'navy');page.text(x+6,tableTop+23,`Cupo: ${s.capacity}`,8,false,'muted');page.line(x,tableTop,x,tableTop+27+rowH*slots.length)});
 page.line(lx,tableTop+27,lx+tableW,tableTop+27,'navy');
 slots.forEach((slot,i)=>{
  const y=tableTop+27+i*rowH;
  if(i%2===1)page.rect(lx,y,tableW,rowH,'pale');
  page.text(lx+8,y+16,slot.day,8,true,'navy');page.text(lx+8,y+29,slot.start,8);page.text(lx+8,y+41,slot.end,8);
  sections.forEach((s,j)=>{
   const x=lx+hw+j*colW,cell=snap.rows.find(r=>r.cycle===s.cycle&&r.section===s.code&&r.day===slot.day&&r.start===slot.start&&r.end===slot.end);
   if(cell){page.text(x+5,y+13,cell.courseCode,8,true,'navy');
    const course=wrap(cell.course,39,2);course.forEach((line,k)=>page.text(x+5,y+24+11*k,line,8.5,true));
    page.text(x+5,y+44,`Docente: ${cell.teacherCode} ${String(cell.teacher).slice(0,25)}`,7.5);
    page.text(x+5,y+54,`Salón ${cell.room}${cell.labCost!=null?'  ·  Laboratorio Q'+Number(cell.labCost).toFixed(2):''}`,7.1,false,'muted');
   } else page.text(x+8,y+30,'—',9,false,'muted');
  });page.line(lx,y+rowH,lx+tableW,y+rowH);
 });
 const bottom=tableTop+27+slots.length*rowH;page.line(lx,tableTop,lx+tableW,tableTop,'navy');page.line(lx,bottom,lx+tableW,bottom,'navy');page.line(lx,tableTop,lx,bottom,'navy');page.line(lx+tableW,tableTop,lx+tableW,bottom,'navy');
 const dY=Math.min(465,bottom+15);page.text(28,dY,decision?`Estado: ${String(decision.decision).toUpperCase()}  |  Director: ${decision.authority}  |  Fecha: ${decision.date}`:'Estado: PENDIENTE DE DECISIÓN DEL DIRECTOR',8.5,true,'navy');
 if(decision?.notes)page.text(28,dY+12,`Observaciones: ${decision.notes.slice(0,126)}`,7.5);
 const names=['Vo.Bo. Coordinación de Carrera','Vo.Bo. Dirección de Sede / Campus','Vo.Bo. Decanato','Vo.Bo. Dirección General de Centros Universitarios'];
 const authorities=(snap.authorities||[]);
 for(let i=0;i<4;i++){
  const col=i%2,row=Math.floor(i/2),x=32+col*407,y=502+row*30;
  page.line(x,y,x+355,y);
  const authority=authorities[i];
  page.text(x+8,y+10,authority?`${authority.name.slice(0,58)} · ${authority.role.slice(0,24)}`:names[i],7.3,false,'muted');
  if(authority)page.text(x+8,y+20,names[i],6.8,false,'muted');
 }
 page.line(25,568,817,568);page.text(25,582,'UMG Plan · Documento generado localmente · Verificar antes de remitir oficialmente',7,false,'muted');page.text(752,582,`Página ${number}/${total}`,7,false,'muted');
}
function pagesFor(report,decision){
 const snap=report.snapshot;const rawSections=snap.sections?.length?snap.sections:[];
 let sections=rawSections.map(s=>({cycle:s.cycle,code:s.code,capacity:s.capacity}));
 if(!sections.length)sections=[...new Map(snap.rows.map(r=>[`${r.cycle}/${r.section}`,{cycle:r.cycle,code:r.section,capacity:r.capacity}])).values()];
 sections.sort((a,b)=>String(a.cycle).localeCompare(String(b.cycle),'es')||String(a.code).localeCompare(String(b.code)));
 const allSlots=(snap.slots?.length?snap.slots:snap.rows.map(r=>({day:r.day,start:r.start,end:r.end})));
 const slots=[...new Map(allSlots.map(r=>[`${r.day}/${r.start}/${r.end}`,{day:r.day,start:r.start,end:r.end}])).values()].sort(sortSlots);
 const groups=chunks(sections.length?sections:[{cycle:'Sin ciclo',code:'—',capacity:0}],3);
 const slotGroups=chunks(slots.length?slots:[{day:'Sábado',start:'07:00',end:'09:00'}],5);
 const params=groups.flatMap(gs=>slotGroups.map(hours=>[gs,hours]));
 return params.map(([gs,hours],i)=>{const pg=new Page();renderPage(pg,report,decision,gs,hours,i+1,params.length);return pg;});
}
function buildPDF(pages){
 const objects=[];const add=v=>{objects.push(v);return objects.length},catalog=add(''),list=add('');
 const jpeg=atob(UMG_JPEG_BASE64),imgBytes=jpeg.length;
 const image=add(`<< /Type /XObject /Subtype /Image /Width 90 /Height 90 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes} >>\nstream\n${jpeg}\nendstream`);
 const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const regular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 const nums=[];
 for(const pg of pages){const stream=pg.commands.join('\n')+'\n';const bytes=latin(stream);const content=add(`<< /Length ${bytes.length} >>\nstream\n${bytes}endstream`);nums.push(add(`<< /Type /Page /Parent ${list} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im1 ${image} 0 R >> /Font << /F1 ${bold} 0 R /F2 ${regular} 0 R >> >> /Contents ${content} 0 R >>`));}
 objects[catalog-1]=`<< /Type /Catalog /Pages ${list} 0 R >>`;objects[list-1]=`<< /Type /Pages /Kids [${nums.map(n=>n+' 0 R').join(' ')}] /Count ${nums.length} >>`;
 let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offs=[0];objects.forEach((obj,i)=>{offs.push(out.length);out+=`${i+1} 0 obj\n${obj}\nendobj\n`});const xref=out.length;out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offs.length;i++)out+=String(offs[i]).padStart(10,'0')+' 00000 n \n';out+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new Blob([Uint8Array.from(out,c=>c.charCodeAt(0)&255)],{type:'application/pdf'});
}
export function makePdfBlob(report,decision){return buildPDF(pagesFor(report,decision))}
export function downloadPDF(report,decision){const blob=makePdfBlob(report,decision),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`UMG_Plan_${report.snapshot.code}_${report.kind}_v${report.version}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
export function downloadJSON(data,name='respaldo-umg-plan.json'){const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}

/** PDF de registros de mantenimientos. Todos los valores se escapan en el generador interno. */
export function makeTablePdfBlob(title,columns,rows,who='Administrador'){
 const pageW=W, margin=27, usable=W-2*margin, rowH=22, colW=usable/Math.max(1,columns.length);
 const pages=[];let pg=null,count=0;
 const begin=()=>{pg=new Page();pages.push(pg);pg.rect(0,0,W,5,'navy');pg.commands.push(`q 38 0 0 38 25 ${H-20-38} cm /Im1 Do Q`);pg.text(78,32,'UNIVERSIDAD MARIANO GÁLVEZ DE GUATEMALA',10,true,'navy');pg.text(78,49,'UMG Plan · Reporte de mantenimiento',8,false,'muted');pg.text(margin,85,String(title).slice(0,100),15,true,'navy');pg.text(margin,104,`Generado: ${new Date().toLocaleString('es-GT')}  |  Usuario: ${who}  |  Registros: ${rows.length}`,8);pg.rect(margin,121,usable,27,'navy');columns.forEach((col,i)=>pg.text(margin+i*colW+5,138,String(col.label).slice(0,Math.floor(colW/5)),7.4,true,'white'));count=0};
 begin();for(const entry of rows){if(count>=17)begin();const y=148+count*rowH;if(count%2===1)pg.rect(margin,y,usable,rowH,'pale');columns.forEach((col,i)=>{const v=String(entry[col.key]??'—').replace(/[\r\n]+/g,' ');pg.text(margin+i*colW+5,y+14,v.slice(0,Math.max(6,Math.floor((colW-10)/4.6))),7.2)});pg.line(margin,y+rowH,W-margin,y+rowH);count++}
 pages.forEach((x,i)=>{x.line(margin,H-35,W-margin,H-35);x.text(margin,H-22,'Reporte local · Para uso de revisión y pruebas',7,false,'muted');x.text(W-95,H-22,`Página ${i+1}/${pages.length}`,7,false,'muted')});
 return buildPDF(pages);
}
export function downloadTablePDF(title,columns,rows,who='Administrador'){
 const blob=makeTablePdfBlob(title,columns,rows,who);const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`UMGPlan_${String(title).replace(/[^A-Za-z0-9_-]+/g,'_')}.pdf`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
