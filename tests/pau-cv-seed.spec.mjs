import {expect,test} from '@playwright/test';
test('el banco inicial PAU CV se instala una vez, persiste y respeta las bajas',async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await expect(bank.locator('.atl-bank-card')).toHaveCount(88,{timeout:30000});
 await bank.getByRole('combobox',{name:'Filtrar textos por curso'}).selectOption('2bach');
 await expect(bank.locator('.atl-bank-card')).toHaveCount(88);
 const card=bank.locator('.atl-bank-card').filter({hasText:'CATÓN RECIBE EL GOBIERNO'});
 await expect(card).toHaveCount(1);
 await card.click();
 const modal=frame.locator('.modal').last();
 await expect(modal.getByRole('textbox',{name:'Título didáctico'})).toHaveValue('CATÓN RECIBE EL GOBIERNO DE LA HISPANIA CITERIOR');
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.reload();
 await expect(bank.locator('.atl-bank-card')).toHaveCount(88);
});
