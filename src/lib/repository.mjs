/** Frontera explícita entre interfaz y persistencia.
 * En esta entrega SOLO se utiliza el adaptador local (sin API ni SQL Server).
 * En producción se sustituirá por servicios REST, jamás por credenciales SQL en React.
 */
export const LOCAL_DATA_KEY='umgplan-local-v4';
export const localRepository={
 load(){const raw=localStorage.getItem(LOCAL_DATA_KEY);if(!raw)return null;return JSON.parse(raw)},
 save(state){localStorage.setItem(LOCAL_DATA_KEY,JSON.stringify(state));return state},
 clear(){localStorage.removeItem(LOCAL_DATA_KEY)}
};
/** Ejemplo explícito de interfaz futura: no se invoca en esta versión.
 * La API real debe comprobar permisos, reglas R1-R3 y escribir transaccionalmente.
 */
export function createApiRepository(base='/api/v1'){
 async function request(path,opts={}){
  const response=await fetch(base+path,{credentials:'include',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
  if(!response.ok)throw Error((await response.json().catch(()=>({message:'Error de servidor'}))).message||'Error de servidor');
  return response.status===204?null:response.json();
 }
 return {
  list:resource=>request('/'+encodeURIComponent(resource)),
  create:(resource,body)=>request('/'+encodeURIComponent(resource),{method:'POST',body:JSON.stringify(body)}),
  update:(resource,id,body)=>request('/'+encodeURIComponent(resource)+'/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(body)}),
  remove:(resource,id)=>request('/'+encodeURIComponent(resource)+'/'+encodeURIComponent(id),{method:'DELETE'}),
  sendToReview:id=>request('/planificaciones/'+encodeURIComponent(id)+'/enviar-revision',{method:'POST'}),
  reply:(assignmentId,body)=>request('/asignaciones/'+encodeURIComponent(assignmentId)+'/respuesta',{method:'POST',body:JSON.stringify(body)}),
  authorize:(planningId,body)=>request('/planificaciones/'+encodeURIComponent(planningId)+'/resolucion',{method:'POST',body:JSON.stringify(body)})
 };
}
