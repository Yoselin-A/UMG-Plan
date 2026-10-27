import test from 'node:test';
import assert from 'node:assert/strict';
import {signIn,signOut,forgetCsrf} from '../src/lib/api.mjs';

test('cerrar sesión envía POST con cookie y CSRF, y admite la respuesta 204',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push({url,options});
  return url.endsWith('/login')?new Response(JSON.stringify({csrf:'csrf-de-la-sesion'}),{status:200,headers:{'Content-Type':'application/json'}}):new Response(null,{status:204});
 });
 forgetCsrf();await signIn('usuario','password');assert.equal(await signOut(),null);
 const request=calls[1];assert.equal(request.url,'/api/v1/auth/logout');
 assert.equal(request.options.method,'POST');assert.equal(request.options.credentials,'same-origin');
 assert.equal(request.options.headers['X-CSRF-Token'],'csrf-de-la-sesion');assert.deepEqual(JSON.parse(request.options.body),{});
 forgetCsrf();
});

test('un cierre rechazado no se confunde con un cierre confirmado',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({message:'Actualiza la sesión.'}),{status:403,headers:{'Content-Type':'application/json'}}));
 await assert.rejects(signOut(),error=>error.status===403&&error.message==='Actualiza la sesión.');
 forgetCsrf();
});
