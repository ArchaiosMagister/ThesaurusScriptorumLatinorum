import test from 'node:test';
import assert from 'node:assert/strict';
import {SupabaseWorkspaceTransport,compareWorkspaceHashes,validateConnection,
  workspaceHash,SyncCloudError} from './supabase-workspace-client.js';

const base='https://example-project.supabase.co';
const config={url:base,publishableKey:'sb_publishable_TEST123'};
const login={userId:'11111111-1111-4111-8111-111111111111',accessToken:'jwt-example'};
const snapshot={workspaceRevision:0,corpus:null,editions:[],history:[],migration:null};

test('bloquea claves secretas, dominios no Supabase y URLs con credenciales',()=>{
  assert.deepEqual(validateConnection(config),config);
  assert.throws(()=>validateConnection({...config,publishableKey:'sb_secret_123'}),SyncCloudError);
  assert.throws(()=>validateConnection({...config,url:'https://phishing.example'}),SyncCloudError);
  assert.throws(()=>validateConnection({...config,url:'http://example-project.supabase.co'}),SyncCloudError);
});

test('inicio de sesión por contraseña sin almacenar ni devolver el password',async()=>{
  let request:{url:string;options:RequestInit}|null=null;
  const fetcher:typeof fetch=async(input,options)=>{
    request={url:String(input),options:options??{}};
    return new Response(JSON.stringify({access_token:'safe-token',user:{id:login.userId}}),{status:200});
  };
  const client=new SupabaseWorkspaceTransport(config,fetcher);
  const session=await client.login('docente@example.org','password-provisional');
  assert.equal(session.userId,login.userId);
  assert.equal(session.accessToken,'safe-token');
  assert.match(request!.url,/grant_type=password/);
  assert.equal(JSON.parse(String(request!.options.body)).email,'docente@example.org');
});

test('lectura de la nube usa bearer y devuelve el snapshot validado',async()=>{
  const client=new SupabaseWorkspaceTransport(config,async(_url,options)=>{
    assert.equal((options?.headers as Record<string,string>)?.Authorization,'Bearer jwt-example');
    assert.equal(options?.method,'GET');
    return new Response(JSON.stringify([{revision:4,payload:snapshot}]),{status:200});
  });
  assert.deepEqual(await client.read(login),{revision:4,snapshot});
});

test('subida inicial solo con INSERT y clave privada del usuario autenticado',async()=>{
  const client=new SupabaseWorkspaceTransport(config,async(_url,options)=>{
    assert.equal(options?.method,'POST');
    const data=JSON.parse(String(options?.body));
    assert.equal(data.owner_id,login.userId);
    assert.equal(data.revision,1);
    assert.deepEqual(data.payload,snapshot);
    return new Response(JSON.stringify([{revision:1,payload:snapshot}]),{status:201});
  });
  assert.equal((await client.write(login,snapshot,0)).revision,1);
});

test('actualización CAS exige revisión antigua y nunca considera éxito la fila no cambiada',async()=>{
  const client=new SupabaseWorkspaceTransport(config,async(input,options)=>{
    assert.equal(options?.method,'PATCH');
    assert.match(String(input),/revision=eq\.7/);
    assert.equal(JSON.parse(String(options?.body)).revision,8);
    return new Response('[]',{status:200});
  });
  await assert.rejects(client.write(login,snapshot,7),error=>
    error instanceof SyncCloudError&&error.status===409);
});

test('dos dispositivos no sobrescriben al arrancar con datos diferentes',()=>{
  assert.equal(compareWorkspaceHashes('a','b',null),'conflict');
  assert.equal(compareWorkspaceHashes('a','b','a'),'download');
  assert.equal(compareWorkspaceHashes('a','b','b'),'upload');
  assert.equal(compareWorkspaceHashes(null,'b',null),'download');
  assert.equal(compareWorkspaceHashes('a',null,null),'upload');
  assert.equal(compareWorkspaceHashes('a','a',null),'equal');
  assert.equal(compareWorkspaceHashes('c','d','b'),'conflict');
  assert.equal(compareWorkspaceHashes('a',null,'a'),'conflict');
});

test('la revisión de workspace no falsea el hash de una restauración',async()=>{
  const first=await workspaceHash(snapshot);
  const restored=await workspaceHash({...snapshot,workspaceRevision:2});
  assert.equal(first,restored);
});

test('hash de nube permanece igual aunque JSONB reordene las claves',async()=>{
  const cloud={
    migration:null,history:[],editions:[],corpus:null,workspaceRevision:0,
  };
  assert.equal(await workspaceHash(snapshot),await workspaceHash(cloud));
});
