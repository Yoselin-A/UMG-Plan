import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSeed,extendSeed} from '../src/lib/seed.js';
import {newPasswordRequest,decidePasswordRequest,isStrongPassword} from '../src/lib/passwordRequests.mjs';
import {getBaseRole,userForSession,canOpenPath,defaultPaths,displayRole} from '../src/lib/roles.mjs';

test('contraseña fuerte requiere al menos 10 caracteres y categorías',()=>{
 assert.equal(isStrongPassword('Ventas1234$'),true);
 assert.equal(isStrongPassword('demo'),false);
 assert.equal(isStrongPassword('soloMINUSCULAS123'),false);
});
test('solicitud se crea pendiente sin cambiar cuentas',()=>{
 const db=makeSeed();const req=newPasswordRequest(db,{id:'pw-test',userId:'u-doc1',passwordHash:'hash_de_prueba',at:'2026-10-24T18:00:00Z'});
 assert.equal(req.status,'pending');assert.equal(req.userId,'u-doc1');assert.equal(db.users.find(u=>u.id==='u-doc1').username,'docente1');
 db.passwordRequests.push(req);assert.throws(()=>newPasswordRequest(db,{id:'pw2',userId:'u-doc1',passwordHash:'otro',at:'2026-10-24T18:01:00Z'}),/pendiente/);
});
test('autorización devuelve hash solo en aprobación y borra hash temporal',()=>{
 const db=makeSeed();db.passwordRequests=[newPasswordRequest(db,{id:'pw-test',userId:'u-doc1',passwordHash:'hash_de_prueba',at:'2026-10-24T18:00:00Z'})];
 const {acceptedHash,item}=decidePasswordRequest(db,'pw-test','approved','u-admin','Identidad confirmada','2026-10-24T18:10:00Z');
 assert.equal(acceptedHash,'hash_de_prueba');assert.equal(item.status,'approved');assert.equal('proposedHash' in item,false);
 assert.throws(()=>decidePasswordRequest(db,'pw-test','approved','u-admin','', '2026-10-24T18:11:00Z'),/atendida/);
});
test('denegar descarta hash y devuelve null',()=>{
 const db=makeSeed();db.passwordRequests=[newPasswordRequest(db,{id:'pw-test',userId:'u-doc1',passwordHash:'hash_solicitado',at:'2026-10-24T18:00:00Z'})];
 const {acceptedHash,item}=decidePasswordRequest(db,'pw-test','denied','u-admin','Solicitud denegada','2026-10-24T18:10:00Z');
 assert.equal(acceptedHash,null);assert.equal(item.status,'denied');assert.equal(item.note,'Solicitud denegada');assert.equal('proposedHash' in item,false);
});
test('solamente administrador principal puede decidir',()=>{
 const db=makeSeed();db.passwordRequests=[newPasswordRequest(db,{id:'pw-test',userId:'u-doc1',passwordHash:'hash',at:'2026-10-24T18:00:00Z'})];
 assert.throws(()=>decidePasswordRequest(db,'pw-test','approved','u-coord','','2026-10-24T18:10:00Z'),/Administrador/);
});
test('roles personalizados heredan perfil y restringen rutas',()=>{
 const db=makeSeed();db.customRoles=[{id:'role-aux',name:'Asistente de Carrera',baseRole:'coordinator',paths:['/dashboard','/chat','/ajustes'],active:true}];
 const user=userForSession(db,{id:'custom-user',name:'Ana',role:'role-aux',active:true});
 assert.equal(getBaseRole(db,'role-aux'),'coordinator');assert.equal(displayRole(db,'role-aux'),'Asistente de Carrera');
 assert.equal(user.role,'coordinator');assert.equal(user.roleId,'role-aux');
 assert.equal(canOpenPath(user,'/chat'),true);assert.equal(canOpenPath(user,'/autorizacion'),false);
 db.customRoles[0].active=false;assert.equal(userForSession(db,{id:'custom-user',role:'role-aux'}),null);
});
test('migración incluye roles y solicitudes incluso con datos locales antiguos',()=>{
 const db=makeSeed();delete db.customRoles;delete db.passwordRequests;extendSeed(db);
 assert.ok(Array.isArray(db.customRoles));assert.ok(Array.isArray(db.passwordRequests));
 assert.ok(defaultPaths('teacher').includes('/mis-asignaciones'));
});
