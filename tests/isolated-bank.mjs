import {test as base,expect} from '@playwright/test';
// Legacy cases intentionally construct their own banks. Stub only the optional initial dataset,
// not service workers, storage, validation or the importer's PDF reader.
export const test=base.extend({
  page: async({page},use)=>{
    await page.addInitScript(()=>{
      const nativeFetch=window.fetch.bind(window);
      window.fetch=(resource,options)=>{
        const url=typeof resource==='string'?resource:resource instanceof URL?resource.href:resource.url;
        if(url?.endsWith('/atl-pau-cv-seed.json'))return Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}}));
        return nativeFetch(resource,options);
      };
    });
    await use(page);
  }
});
export {expect};
