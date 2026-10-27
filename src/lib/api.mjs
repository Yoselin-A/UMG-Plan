let csrf='';
export const forgetCsrf=()=>{csrf='';};
export async function api(path,body,method=body===undefined?'GET':'POST'){
 const response=await fetch('/api/v1'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=response.status===204?null:await response.json().catch(()=>({message:'El servidor no está disponible.'}));
 if(!response.ok){const error=Error(data?.message||'No se pudo completar la solicitud.');error.status=response.status;throw error;}
 if(data?.csrf)csrf=data.csrf;return data;
}
export const signIn=(username,password)=>api('/auth/login',{username,password},'POST');
export const signOut=()=>api('/auth/logout',{},'POST');
export function diffState(before,next){
 const changes=[];
 for(const [key,rows] of Object.entries(next)){
  if(!Array.isArray(rows)||['audit','passwordRequests'].includes(key))continue;
  const previous=before[key]||[],byId=new Map(previous.map(x=>[x.id,x]));
  for(const row of rows)if(JSON.stringify(byId.get(row.id))!==JSON.stringify(row))changes.push({collection:key,id:row.id,op:'upsert',value:row});
  const ids=new Set(rows.map(x=>x.id));for(const row of previous)if(!ids.has(row.id))changes.push({collection:key,id:row.id,op:'delete'});
 }
 return changes;
}
