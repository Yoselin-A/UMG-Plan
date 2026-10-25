import React from 'react';
import {AtSign} from 'lucide-react';
export const UMG_EMAIL_DOMAIN='@miumg.edu.gt';
export function appendInstitutionalDomain(value){const text=String(value||'').trim();if(!text)return '';const name=text.split('@')[0].replace(/\s+/g,'.').toLowerCase();return `${name}${UMG_EMAIL_DOMAIN}`;}
export function EmailInstitutional({value,onChange,...props}){return <div className="umg-email-input"><input type="email" className="input" placeholder="usuario@miumg.edu.gt" value={value||''} onChange={onChange} {...props}/><button type="button" title="Completar correo institucional" onClick={()=>onChange({target:{value:appendInstitutionalDomain(value)}})}><AtSign size={15}/> Completar @miumg.edu.gt</button></div>}
