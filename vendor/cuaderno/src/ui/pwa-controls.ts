/** Instalación PWA y actualización explícita sin cambiar la persistencia local. */
interface InstallPromptEvent extends Event {
  prompt():Promise<void>;
  userChoice:Promise<{outcome:string}>;
}
type SaveBeforeReload=()=>Promise<boolean>;

const mounted=new Set<HTMLElement>();
let registration:ServiceWorkerRegistration|null=null;
let registrationTask:Promise<void>|null=null;
let installPrompt:InstallPromptEvent|null=null;
let checking=false;
let applying=false;
let reloadRequested=false;
let message='';
let updateWaiting=false;

function installed():boolean{
  return window.matchMedia('(display-mode: standalone)').matches||
    Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
}
function iosSafari():boolean{
  return /iPad|iPhone|iPod/iu.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function refresh():void{
  for(const area of mounted){
    if(!area.isConnected){mounted.delete(area);continue;}
    const check=area.querySelector<HTMLButtonElement>('[data-pwa-check]');
    const install=area.querySelector<HTMLButtonElement>('[data-pwa-install]');
    const status=area.querySelector<HTMLElement>('[data-pwa-status]');
    if(check){
      check.disabled=checking||applying;
      check.textContent=applying?'Aplicando actualización…':checking?'Buscando…':
        updateWaiting?'Aplicar actualización':'Buscar actualizaciones';
      check.classList.toggle('cuaderno-pwa-update-ready',updateWaiting);
    }
    if(install){
      install.hidden=installed();
      install.textContent=installPrompt?'Instalar aplicación':'Cómo instalar';
    }
    if(status){status.textContent=message;status.hidden=!message;}
  }
}
function announce(text:string):void{message=text;refresh();}
function monitor(reg:ServiceWorkerRegistration):void{
  const watch=(worker:ServiceWorker|null):void=>{
    if(!worker)return;
    const changed=()=>{
      if(reg.waiting&&navigator.serviceWorker.controller){
        updateWaiting=true;
        announce('Hay una versión nueva. Guarda tus cambios y pulsa «Aplicar actualización».');
      }else if(worker.state==='redundant'){
        announce('No se pudo preparar la actualización. Vuelve a comprobarla.');
      }
    };
    worker.addEventListener('statechange',changed);
    changed();
  };
  reg.addEventListener('updatefound',()=>watch(reg.installing));
  watch(reg.installing);
  if(reg.waiting&&navigator.serviceWorker.controller){
    updateWaiting=true;announce('Hay una versión nueva disponible.');
  }
}
export function startCuadernoPwa():Promise<void>{
  if(registrationTask)return registrationTask;
  registrationTask=(async()=>{
    if(!('serviceWorker' in navigator)||!window.isSecureContext){
      announce('Instalación y actualizaciones disponibles al abrir la web con HTTPS.');
      return;
    }
    const worker=new URL('../examinator-cuadernos/service-worker.js',import.meta.url);
    try{
      registration=await navigator.serviceWorker.register(worker.href,{
        scope:new URL('../examinator-cuadernos/',import.meta.url).href,
        updateViaCache:'none',
      });
      monitor(registration);
      let previouslyControlled=Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        const wasUpdate=previouslyControlled;
        previouslyControlled=true;
        if(reloadRequested){
          reloadRequested=false;
          window.location.reload();
        }else{
          updateWaiting=false;
          announce(wasUpdate
            ?'Se ha instalado una versión nueva. Guarda los cambios y recarga cuando quieras.'
            :'Modo sin conexión preparado. Puedes comprobar actualizaciones cuando quieras.');
        }
      });
    }catch(error){
      // Fallos temporales de registro (sin conexión, cuota, etc.) deben poder
      // reintentarse desde «Buscar actualizaciones» sin recargar ni perder datos.
      registration=null;
      registrationTask=null;
      console.warn('No se pudo registrar el modo sin conexión:',error);
      announce('No se pudo preparar el modo sin conexión. Comprueba la conexión.');
    }
  })();
  return registrationTask;
}
async function checkForUpdates():Promise<void>{
  if(checking||applying)return;
  checking=true;
  announce('Comprobando si hay una versión nueva…');
  try{
    await startCuadernoPwa();
    if(!registration)throw Error('No se ha podido registrar la aplicación.');
    if(!navigator.onLine)throw Error('No hay conexión. Vuelve a comprobar cuando tengas internet.');
    await registration.update();
    if(registration.waiting&&navigator.serviceWorker.controller){
      updateWaiting=true;
      announce('Nueva versión disponible. Pulsa «Aplicar actualización» para instalarla.');
    }else if(registration.installing&&registration.active){
      announce('Se está descargando la actualización. Vuelve a comprobar en un momento.');
    }else{
      updateWaiting=false;
      announce('La aplicación está actualizada.');
    }
  }catch(error){
    announce('No se ha podido comprobar: '+(error instanceof Error?error.message:String(error)));
  }finally{checking=false;refresh();}
}
async function applyUpdate(save:SaveBeforeReload):Promise<void>{
  if(applying||!registration?.waiting)return;
  // No descartar formularios abiertos todavía sin confirmar en el banco.
  if(document.querySelector('.modal:not([hidden])')){
    announce('Guarda o cierra el formulario abierto antes de actualizar.');
    return;
  }
  if(!window.confirm('¿Aplicar la nueva versión? Se guardará el cuaderno y se recargará la página.'))return;
  applying=true;refresh();
  try{
    if(!await save()){
      announce('No se han podido guardar los cambios. La actualización no se ha aplicado.');
      return;
    }
    const waiting=registration.waiting;
    if(!waiting){
      updateWaiting=false;
      announce('La versión ya se ha instalado. Puedes recargar cuando hayas guardado.');
      return;
    }
    reloadRequested=true;
    announce('Actualizando… Se recargará después de activar la nueva versión.');
    waiting.postMessage({type:'APPLY_UPDATE'});
  }catch(error){
    reloadRequested=false;
    announce('No se ha aplicado la actualización: '+String(error));
  }finally{applying=false;refresh();}
}
function installHelp():void{
  if(installed()){announce('La aplicación ya está instalada.');return;}
  if(iosSafari()){
    announce('En Safari: Compartir → Añadir a la pantalla de inicio. El cuaderno se abrirá como aplicación.');
  }else{
    announce('En el menú del navegador, elige «Instalar aplicación» o «Añadir a pantalla de inicio».');
  }
}
async function install():Promise<void>{
  const prompt=installPrompt;
  if(!prompt){installHelp();return;}
  installPrompt=null;refresh();
  try{
    await prompt.prompt();
    const choice=await prompt.userChoice;
    announce(choice.outcome==='accepted'?'Instalación aceptada.':'Instalación cancelada.');
  }catch(error){announce('No se pudo iniciar la instalación: '+String(error));}
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event as InstallPromptEvent;
  refresh();
});
window.addEventListener('appinstalled',()=>{
  installPrompt=null;announce('Aplicación instalada correctamente.');
});
export function createCuadernoPwaControls(save:SaveBeforeReload):HTMLElement{
  const panel=document.createElement('div');
  panel.className='cuaderno-pwa-controls';
  panel.setAttribute('aria-label','Instalación y actualizaciones');
  const buttons=document.createElement('div');buttons.className='cuaderno-pwa-actions';
  const check=document.createElement('button');
  check.type='button';check.className='hbtn';check.dataset.pwaCheck='';
  check.addEventListener('click',()=>{void(updateWaiting?applyUpdate(save):checkForUpdates());});
  const installButton=document.createElement('button');
  installButton.type='button';installButton.className='hbtn';
  installButton.dataset.pwaInstall='';
  installButton.addEventListener('click',()=>{void install();});
  const status=document.createElement('span');status.className='cuaderno-pwa-status';
  status.dataset.pwaStatus='';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  buttons.append(check,installButton);
  panel.append(buttons,status);
  // Renderizar varias veces la portada no debe retener controles desmontados.
  for(const old of mounted)if(!old.isConnected)mounted.delete(old);
  mounted.add(panel);
  // En la portada puede crearse antes de insertarse en el documento.
  check.textContent='Buscar actualizaciones';
  installButton.textContent=installPrompt?'Instalar aplicación':'Cómo instalar';
  status.textContent=message;status.hidden=!message;
  check.disabled=checking||applying;
  if(updateWaiting)check.textContent='Aplicar actualización';
  installButton.hidden=installed();
  return panel;
}
