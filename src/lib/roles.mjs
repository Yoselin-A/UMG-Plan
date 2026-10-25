/** Perfiles locales configurables. El backend definitivo debe validar permisos otra vez. */
export const BASE_ROLE_LABELS={admin:'Administrador',coordinator:'Coordinador de Carrera',teacher:'Docente'};
export const ROUTE_OPTIONS={
 admin:[['/dashboard','Inicio'],['/catalogos/cursos','Cursos'],['/catalogos/profesores','Profesores'],['/catalogos/academica','Gestión académica'],['/mantenimientos','Mantenimientos'],['/usuarios','Usuarios'],['/roles','Roles y permisos'],['/auditoria','Auditoría y respaldos'],['/reportes','Reportes'],['/estadisticas','Estadísticas'],['/ajustes','Ajustes']],
 coordinator:[['/dashboard','Inicio'],['/planificaciones','Planificaciones y propuestas'],['/asignacion-horarios','Asignación de horarios'],['/revision-docente','Revisión docente'],['/autorizacion','Autorizaciones'],['/disponibilidad','Disponibilidad docente'],['/chat','Chat docente'],['/reportes','Reportes'],['/estadisticas','Estadísticas'],['/ajustes','Ajustes']],
 teacher:[['/dashboard','Inicio'],['/mis-asignaciones','Mis asignaciones'],['/disponibilidad','Mi disponibilidad'],['/chat','Chat con Coordinación'],['/ajustes','Ajustes']]
};
export const defaultPaths=kind=>ROUTE_OPTIONS[kind]?.map(x=>x[0])||[];
export function getRoleDefinition(db,id){return db.customRoles?.find(r=>r.id===id&&r.active!==false)||null}
export function getBaseRole(db,id){return BASE_ROLE_LABELS[id]?id:getRoleDefinition(db,id)?.baseRole||null}
export function displayRole(db,id){return BASE_ROLE_LABELS[id]||getRoleDefinition(db,id)?.name||'Rol inexistente'}
export function userForSession(db,user){if(!user)return null;const def=getRoleDefinition(db,user.role);const kind=getBaseRole(db,user.role);if(!kind)return null;return {...user,role:kind,roleId:user.role,roleName:displayRole(db,user.role),allowedRoutes:def?.paths||null};}
export function canOpenPath(user,path){if(!user)return false;if(!user.allowedRoutes)return true;if(path==='/dashboard'||path==='/ajustes')return true;const current=path.startsWith('/planificaciones/')?'/planificaciones':path.startsWith('/catalogos/')?path:path;return user.allowedRoutes.includes(current);}
export function roleCanTeach(db,id){return getBaseRole(db,id)==='teacher'}
export function roleCanCoordinate(db,id){return getBaseRole(db,id)==='coordinator'}
export function roleCanAdminister(db,id){return getBaseRole(db,id)==='admin'}
