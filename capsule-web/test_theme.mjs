import { chromium } from 'playwright'
const APP='http://localhost:5180'
const b=await chromium.launch({headless:false,channel:'chrome',args:['--no-sandbox']})
const p=await(await b.newContext({viewport:{width:1440,height:900}})).newPage()
await p.goto(APP+'/login',{waitUntil:'networkidle'})
await p.fill('#username','admin');await p.fill('#password','capsule-admin')
await p.getByRole('button',{name:/sign in/i}).click(); await p.waitForTimeout(3000)
await p.goto(APP+'/documents',{waitUntil:'networkidle'}); await p.waitForTimeout(2500)
const probe=async()=>p.evaluate(()=>{
  const g=(sel,prop='backgroundColor')=>{const el=document.querySelector(sel);return el?getComputedStyle(el)[prop]:'n/a'}
  return {
    header:g('.cds--header'), headerText:g('.cds--header__name','color'),
    sideNav:g('.cds--side-nav'), content:g('.capsule-content'),
    tableContainer:g('.cds--data-table-container'),
    tableRowCell:g('.cds--data-table tbody td'),
    tableHeadCell:g('.cds--data-table thead th'),
  }
})
const light=await probe()
await p.screenshot({path:'/tmp/theme-light-documents.png'})
// dark
await p.locator('[data-testid="theme-toggle"]').click(); await p.waitForTimeout(1200)
const dark=await probe()
await p.screenshot({path:'/tmp/theme-dark-documents.png'})
// dashboard dark for tiles+sidenav
await p.goto(APP+'/dashboard',{waitUntil:'networkidle'}); await p.waitForTimeout(2000)
await p.screenshot({path:'/tmp/theme-dark-dashboard.png'})
await b.close()
console.log('LIGHT',JSON.stringify(light))
console.log('DARK ',JSON.stringify(dark))
console.log('THEMETESTDONE')
