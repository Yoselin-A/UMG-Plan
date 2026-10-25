/** Búsqueda local completa con acentos opcionales y referencias legibles. */
export const normalizeSearch=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
const collections={institutionId:'institutions',centerId:'centers',careerId:'careers',modalityId:'modalities',planId:'studyPlans',courseId:'courses',cycleId:'cycles',teacherId:'teachers',periodId:'periods',slotId:'slots',roomId:'rooms',planningId:'plannings',authorityId:'authorities',typeId:'authorityTypes',coordinatorId:'users',sectionId:'sections',userId:'users',senderId:'users'};
const values=record=>Object.entries(record||{}).flatMap(([key,val])=>[key,typeof val==='object'?JSON.stringify(val):String(val??'')]);
export function searchTextForRecord(db,record,columns=[]){
 const found=values(record);
 for(const col of columns){try{found.push(String(col.value?col.value(record):record[col.key]??''))}catch{}}
 for(const [key,id] of Object.entries(record||{})){
  const collection=collections[key];if(!collection||!db?.[collection])continue;
  const match=db[collection].find(x=>x.id===id);
  if(match)found.push(...values(match).slice(0,25));
 }
 return normalizeSearch(found.join(' '));
}
export function recordMatches(db,record,query,columns=[]){
 const tokens=normalizeSearch(query).split(/\s+/).filter(Boolean);
 if(!tokens.length)return true;
 const text=searchTextForRecord(db,record,columns);
 return tokens.every(token=>text.includes(token));
}
export function findAcrossCollections(db,query,collectionsLimit=[]) {
 if(!normalizeSearch(query))return [];
 const collectionsToScan=collectionsLimit.length?collectionsLimit:Object.keys(db||{}).filter(k=>Array.isArray(db[k]));
 return collectionsToScan.flatMap(key=>(db[key]||[]).filter(record=>recordMatches(db,record,query)).map(record=>({collection:key,record})));
}
