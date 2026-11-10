import {describe,expect,it,vi} from 'vitest';
import {readStoredJson} from '../src/platform/safeJson';

function storage(value:string|null){
 const values=new Map<string,string>();if(value!==null)values.set('session',value);
 return {getItem:(key:string)=>values.get(key)??null,removeItem:vi.fn((key:string)=>values.delete(key))} as unknown as Storage;
}

describe('stored JSON recovery',()=>{
 it('returns valid persisted data unchanged',()=>{
  const s=storage('{"balance":100}');const report=vi.fn();
  expect(readStoredJson<{balance:number}>(s,'session',report)).toEqual({balance:100});expect(report).not.toHaveBeenCalled();
 });
 it('removes a truncated value and reports the parse failure',()=>{
  const s=storage('{"balance":');const report=vi.fn();
  expect(readStoredJson(s,'session',report)).toBeNull();expect(s.removeItem).toHaveBeenCalledWith('session');expect(report).toHaveBeenCalledOnce();
 });
});
