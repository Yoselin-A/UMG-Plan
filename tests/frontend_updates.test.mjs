import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSeed} from '../src/lib/seed.js';
import {makeTablePdfBlob} from '../src/lib/pdf.js';
test('las cuentas demo usan formato institucional, sin atribuir correos a referentes históricos',()=>{
 const db=makeSeed();
 assert.ok(db.users.every(u=>/@miumg\.edu\.gt$/.test(u.email)), 'Las cuentas demo tienen un correo institucional ficticio');
 assert.ok(db.teachers.filter(t=>t.source==='demostracion').every(t=>t.email.endsWith('@miumg.edu.gt')));
 assert.ok(db.teachers.filter(t=>t.source==='documento-base-2025').every(t=>!t.email));
});
test('el PDF de registros se genera con encabezado válido',async()=>{
 const pdf=makeTablePdfBlob('Carreras',[{key:'code',label:'Código'},{key:'name',label:'Carrera'}],[{code:'ISC',name:'Sistemas'}]);
 assert.ok(pdf.size>1200);
 const bytes=new Uint8Array(await pdf.arrayBuffer());
 assert.equal(new TextDecoder().decode(bytes.slice(0,8)),'%PDF-1.4');
});
test('el PDF de registros genera varias páginas para tablas extensas',async()=>{
 const records=Array.from({length:38},(_,i)=>({code:`T${i}`,name:`Registro ${i}`}));
 const blob=makeTablePdfBlob('Listado extendido',[{key:'code',label:'Código'},{key:'name',label:'Nombre'}],records);
 const bytes=new Uint8Array(await blob.arrayBuffer());
 const text=new TextDecoder('latin1').decode(bytes);
 assert.ok(text.includes('/Count 3')); 
});
