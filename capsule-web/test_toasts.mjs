import { chromium } from 'playwright'
const APP='http://localhost:5180', API='http://localhost:8800/api/v4'
const TOKEN=(await (await fetch(`${API}/auth/token/obtain/`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({username:'admin',password:'capsule-admin'})})).json()).token
const H={Authorization:`Token ${TOKEN}`,Accept:'application/json'}
const b=await chromium.launch({headless:false,channel:'chrome',args:['--no-sandbox']})
const p=await(await b.newContext({viewport:{width:1440,height:900}})).newPage()
const out=[]
await p.goto(APP+'/login',{waitUntil:'networkidle'})
await p.fill('#username','admin');await p.fill('#password','capsule-admin')
await p.getByRole('button',{name:/sign in/i}).click(); await p.waitForTimeout(2500)
const stamp=Date.now()%100000
// create -> success toast
await p.goto(APP+'/admin/document-types',{waitUntil:'networkidle'}); await p.waitForTimeout(1500)
await p.getByRole('button',{name:/^new$/i}).click(); await p.waitForTimeout(500)
await p.fill('#f-label','ToastType'+stamp)
await p.getByRole('button',{name:/^save$/i}).click(); await p.waitForTimeout(1500)
const createToast=await p.locator('.cds--toast-notification').count()
const toastText=await p.locator('.cds--toast-notification__title').first().innerText().catch(()=>'')
out.push({step:'create success toast',toasts:createToast,text:toastText})
await p.screenshot({path:'/tmp/toast-create.png'})
// delete -> confirm modal -> toast
await p.waitForTimeout(4000) // let toast clear
const row=p.locator('.cds--data-table tbody tr', {hasText:'ToastType'+stamp})
await row.locator('.cds--overflow-menu').click(); await p.waitForTimeout(500)
await p.getByRole('menuitem',{name:/delete/i}).click(); await p.waitForTimeout(700)
const modalOpen=await p.locator('.cds--modal.is-visible, .cds--modal--danger').count()
const modalHeading=await p.locator('.cds--modal-header__heading').first().innerText().catch(()=>'')
out.push({step:'delete confirm modal',modalOpen,heading:modalHeading})
await p.screenshot({path:'/tmp/toast-confirm.png'})
await p.locator('.cds--modal.is-visible .cds--btn--danger, .cds--modal--danger .cds--btn--danger').first().click().catch(()=>{})
await p.waitForTimeout(1500)
const delToast=await p.locator('.cds--toast-notification__title').first().innerText().catch(()=>'')
out.push({step:'delete success toast',text:delToast})
await b.close()
// cleanup any leftover
const d=await(await fetch(`${API}/document_types/?page_size=200`,{headers:H})).json()
for(const t of d.results||[]) if((t.label||'').includes(String(stamp))) await fetch(`${API}/document_types/${t.id}/`,{method:'DELETE',headers:H})
for(const o of out) console.log(JSON.stringify(o))
console.log('TOASTTESTDONE')
