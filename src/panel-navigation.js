// All modal exits use the same callback, without passing DOM events to screens.
export function createPanelNavigation(overlay){
 let back=null;
 const dismiss=()=>{
  if(!back||!overlay.querySelector('.panel'))return false;
  const previous=back;back=null;previous();return true;
 };
 return {
  setBack(callback){back=callback;},
  clear(){back=null;},
  dismiss,
  handleEscape(event){
   if(event.key!=='Escape'||event.isComposing||!back||!overlay.querySelector('.panel'))return false;
   event.preventDefault();return dismiss();
  },
  handleBackdropClick(event){return event.target===overlay?dismiss():false;}
 };
}
