import {randomBytes,scrypt as derive,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export const token=()=>randomBytes(32).toString('hex');
export const digest=s=>createHash('sha256').update(s).digest('hex');
export async function hashPassword(password){
 const salt=randomBytes(16).toString('hex');
 const key=await scrypt(password,salt,64);
 return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password,encoded){
 if(typeof encoded!=='string')return false;
 const [kind,salt,key]=encoded.split('$');
 if(kind!=='scrypt'||!salt||!/^[a-f0-9]{128}$/.test(key||''))return false;
 const actual=await scrypt(password,salt,64);
 return timingSafeEqual(actual,Buffer.from(key,'hex'));
}
export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export const assert=(ok,message,status=422)=>{if(!ok)throw new HttpError(status,message);};
