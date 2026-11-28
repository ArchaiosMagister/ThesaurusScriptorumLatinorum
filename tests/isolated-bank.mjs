import {test as base,expect} from '@playwright/test';
// Legacy cases intentionally construct their own banks. The dedicated PAU test
// uses the real dataset; other cases isolate only the initial seed.
export async function isolateBank(context, seeds = ['cv', 'national']) {
  await context.addInitScript(seeds=>{
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(resource,options)=>{
      const url=typeof resource==='string'?resource:resource instanceof URL?resource.href:resource.url;
      if(seeds.some(seed => url?.endsWith('/atl-pau-' + seed + '-seed.json')))return Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}}));
      return nativeFetch(resource,options);
    };
  }, seeds);
}
export const test=base.extend({
  context: async({context},use)=>{
    await isolateBank(context);
    await use(context);
  }
});
export {expect};
