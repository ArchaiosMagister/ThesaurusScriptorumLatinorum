import {test as base,expect} from '@playwright/test';
// Legacy cases intentionally construct their own banks. The dedicated PAU test
// uses the real dataset; other cases isolate only the initial seed.
export async function isolateBank(context) {
  await context.addInitScript(()=>{
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(resource,options)=>{
      const url=typeof resource==='string'?resource:resource instanceof URL?resource.href:resource.url;
      if(url?.endsWith('/atl-pau-cv-seed.json'))return Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}}));
      return nativeFetch(resource,options);
    };
  });
}
export const test=base.extend({
  context: async({context},use)=>{
    await isolateBank(context);
    await use(context);
  }
});
export {expect};
