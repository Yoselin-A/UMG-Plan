import test from 'node:test';
import assert from 'node:assert/strict';
import {planTeacherEmails} from '../server/correos-profesores.mjs';

test('propone direcciones de ejemplo sin tildes ni duplicados y conserva otros correos',()=>{
 const state={users:[{email:'jose.munoz.demo@miumg.edu.gt'}],teachers:[
  {id:'1',_sqlId:1,email:'demo.sp2@example.com'},
  {id:'2',_sqlId:2,email:'demo.sp2.02@example.com'},
  {id:'3',_sqlId:3,email:'alguien@miumg.edu.gt'}
 ]};
 const professors=[{id_profesor:1,primer_nombre:'José',primer_apellido:'Muñoz'},{id_profesor:2,primer_nombre:'Jose',primer_apellido:'Muñoz'}];
 const result=planTeacherEmails(state,professors);
 assert.deepEqual(result.map(x=>x.email),['jose.munoz.demo2@miumg.edu.gt','jose.munoz.demo3@miumg.edu.gt']);
 assert(!result.some(x=>x.id==='3'));
});
