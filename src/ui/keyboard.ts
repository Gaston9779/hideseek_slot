/**
 * Central, state-aware keyboard manager. The ONLY window-level keydown handler of the game.
 *
 * Rules
 *  - A feature/modal that owns the keyboard pushes a layer. While a layer is on top, Enter/Space/Escape never reach the
 *    global shortcuts or a focused button behind it; the layer decides what they mean (default: swallowed).
 *  - With no layer: Enter/Space spin only when the game says it is idle. When it is not idle they are swallowed even if a
 *    button (e.g. the Buy Bonus chest) still holds focus, so a residual focus can never trigger a hidden control.
 *  - Auto-repeat never triggers anything.
 *  - Native <dialog> elements keep their own focus trap and Escape handling.
 * The module is DOM-light on purpose (duck-typed events) so it is unit-testable in node.
 */
export interface KeyEventLike{code:string;repeat?:boolean;shiftKey?:boolean;target?:unknown;preventDefault():void;stopImmediatePropagation():void;stopPropagation?():void}
export interface KeyLayer{
 id:string;
 /** Return true when the key was handled. Unhandled Enter/Space/Escape are swallowed anyway. */
 handle?(e:KeyEventLike):boolean|void;
 /** Optional focus trap root: Tab cycles inside it. */
 root?:HTMLElement;
}
export interface KeyHooks{
 /** True when a Spin may start right now (idle, no feature or modal in progress). */
 canSpin():boolean;
 spin():void;
 /** True when a native <dialog> is open (it owns focus and Escape). */
 dialogOpen?():boolean;
}
const ACT=new Set(['Enter','NumpadEnter','Space']);
const tagOf=(t:unknown)=>String((t as {tagName?:string}|null)?.tagName??'').toUpperCase();
const isInteractive=(t:unknown)=>['BUTTON','A','INPUT','SELECT','TEXTAREA','SUMMARY'].includes(tagOf(t));
const FOCUSABLE='button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** After a layer (modal/feature screen) closes, Enter/Space stay inert for this long so a mashed key cannot fall through to SPIN. */
export const RELEASE_QUIET_MS=450;
export function createKeyboard(now:()=>number=()=>performance.now()){
 const stack:KeyLayer[]=[];let hooks:KeyHooks|null=null;let quietUntil=0;
 const swallow=(e:KeyEventLike)=>{e.preventDefault();e.stopImmediatePropagation();e.stopPropagation?.();};
 function trap(layer:KeyLayer,e:KeyEventLike){
  const root=layer.root;if(!root||e.code!=='Tab')return;
  const items=[...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(x=>!x.hidden&&x.offsetParent!==null);
  if(!items.length){e.preventDefault();return;}
  const first=items[0]!,last=items[items.length-1]!,active=document.activeElement;
  if(!root.contains(active)){e.preventDefault();first.focus();}
  else if(e.shiftKey&&active===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
 }
 function onKeyDown(e:KeyEventLike){
  const top=stack[stack.length-1];
  if(top){
   trap(top,e);
   if(top.handle?.(e)===true){swallow(e);return;}
   if(ACT.has(e.code)||e.code==='Escape')swallow(e);
   return;
  }
  if(!ACT.has(e.code)||!hooks)return;
  if(hooks.dialogOpen?.())return;                 // native dialog: its own buttons, its own Escape
  if(e.repeat||now()<quietUntil){swallow(e);return;}
  if(!hooks.canSpin()){swallow(e);return;}        // locked state: nothing may react, focused button or not
  // idle: Enter/Space spin, except when the player deliberately focused another control (then the browser activates that one)
  const t=e.target as {id?:string}|null;
  if(isInteractive(e.target)&&t?.id!=='spin')return;
  swallow(e);hooks.spin();
 }
 /** keyup: Space activates buttons on key release, so the release is neutralised whenever the press would have been. */
 function onKeyUp(e:KeyEventLike){if(!ACT.has(e.code)||!hooks)return;if(stack.length){swallow(e);return;}if(hooks.dialogOpen?.())return;const t=e.target as {id?:string}|null;if(!hooks.canSpin()||(isInteractive(e.target)&&t?.id==='spin'))swallow(e);}
 return {
  onKeyUp,
  configure(h:KeyHooks){hooks=h;},
  /** Take the keyboard. The returned release function is idempotent; layers can be released out of order. */
  push(layer:KeyLayer):()=>void{stack.push(layer);let done=false;return()=>{if(done)return;done=true;const i=stack.indexOf(layer);if(i>=0)stack.splice(i,1);quietUntil=now()+RELEASE_QUIET_MS;};},
  get depth(){return stack.length;},
  get topId(){return stack[stack.length-1]?.id??null;},
  onKeyDown,
  /** Registers the single window listener. Safe to call repeatedly (no double handler after a remount). */
  attach(target:Window|Document=window){const w=target as unknown as {__skhKeys?:(e:Event)=>void};if(w.__skhKeys){target.removeEventListener('keydown',w.__skhKeys,true);target.removeEventListener('keyup',(w as {__skhUp?:(e:Event)=>void}).__skhUp!,true);}const fn=(e:Event)=>onKeyDown(e as KeyboardEvent),up=(e:Event)=>onKeyUp(e as KeyboardEvent);w.__skhKeys=fn;(w as {__skhUp?:(e:Event)=>void}).__skhUp=up;target.addEventListener('keydown',fn,true);target.addEventListener('keyup',up,true);return()=>{target.removeEventListener('keydown',fn,true);target.removeEventListener('keyup',up,true);if(w.__skhKeys===fn)w.__skhKeys=undefined;};},
  reset(){stack.length=0;},
 };
}
export const keys=createKeyboard();
