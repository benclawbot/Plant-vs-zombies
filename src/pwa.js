let installPrompt=null;
export const installed=matchMedia('(display-mode:fullscreen)').matches||matchMedia('(display-mode:standalone)').matches||navigator.standalone===true;
if(installed)document.body.classList.add('installed');
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{installPrompt=null;document.body.classList.add('installed');});
export async function installGame(){
 if(!installPrompt)return 'instructions';
 const prompt=installPrompt;installPrompt=null;await prompt.prompt();return (await prompt.userChoice).outcome;
}
export function lockLandscape(){return screen.orientation?.lock?.('landscape').catch(()=>{});}
if(import.meta.env.PROD&&'serviceWorker' in navigator){
 window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{document.body.dataset.offline='ready';}).catch(error=>{document.body.dataset.offline='unavailable';console.warn('Offline game setup did not finish:',error);}),{once:true});
}
