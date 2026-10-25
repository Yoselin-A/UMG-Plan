export const REQUEST_STATUS={pending:'Pendiente',approved:'Autorizada',denied:'Denegada'};
export const PASSWORD_CRITERIA=[
 ['longitud','Mínimo 10 caracteres',s=>s.length>=10],
 ['mayuscula','Al menos una letra mayúscula',s=>/[A-Z]/.test(s)],
 ['minuscula','Al menos una letra minúscula',s=>/[a-z]/.test(s)],
 ['numero','Al menos un número',s=>/[0-9]/.test(s)],
 ['especial','Al menos un carácter especial',s=>/[^A-Za-z0-9]/.test(s)]
];
export function isStrongPassword(value){const s=String(value||'');return PASSWORD_CRITERIA.every(([, , fn])=>fn(s));}
export function newPasswordRequest(db,{id,userId,passwordHash,at}){
 if(!db.users.some(u=>u.id===userId&&u.active!==false))throw Error('No existe una cuenta activa para la solicitud.');
 if((db.passwordRequests||[]).some(r=>r.userId===userId&&r.status==='pending'))throw Error('Ya existe una solicitud pendiente para esta cuenta.');
 return {id,userId,proposedHash:passwordHash,status:'pending',createdAt:at,decidedAt:null,decidedBy:null,note:''};
}
export function decidePasswordRequest(db,id,status,adminId,note,at){
 if(!['approved','denied'].includes(status))throw Error('Decisión inválida');
 const item=(db.passwordRequests||[]).find(x=>x.id===id);
 if(!item||item.status!=='pending')throw Error('La solicitud ya fue atendida o no existe.');
 if(!db.users.some(u=>u.id===adminId&&u.role==='admin'&&u.active!==false))throw Error('Solo la cuenta Administrador principal puede autorizar solicitudes.');
 item.status=status;item.decidedAt=at;item.decidedBy=adminId;item.note=String(note||'').trim();
 // La contraseña propuesta únicamente se conserva mientras esté pendiente.
 const acceptedHash=status==='approved'?item.proposedHash:null;
 delete item.proposedHash;
 return {item,acceptedHash};
}
