/**
 * Read optional browser state without letting a torn localStorage write prevent boot.
 * Callers still decide the valid state: this helper never manufactures game data.
 */
export function readStoredJson<T>(storage:Storage,key:string,report:(message:string,error:unknown)=>void):T|null{
 const raw=storage.getItem(key);
 if(raw===null)return null;
 try{return JSON.parse(raw) as T;}
 catch(error){
  report(`Discarded malformed local state for ${key}`,error);
  try{storage.removeItem(key);}catch(removeError){report(`Could not remove malformed local state for ${key}`,removeError);}
  return null;
 }
}
