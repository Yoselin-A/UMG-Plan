/** Adaptador de listas select; recibe registros como primer argumento, no un objeto. */
export function buildOptions(items=[],labelKey='name',includeInactive=false,render){
 if(!Array.isArray(items))return [];
 return items.filter(x=>includeInactive||x.active!==false).map(x=>({value:x.id,label:render?render(x):(x[labelKey]??x.code)}));
}
