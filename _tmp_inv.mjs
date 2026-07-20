import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
// wait for org_logo migration
let ready=false;
for (let i=0;i<20;i++){ try{ await p.organization.findFirst({select:{logo:true}}); ready=true; break;}catch{ await new Promise(r=>setTimeout(r,6000)); } }
if(!ready){ console.log('MIGRATION NOT READY'); process.exit(0); }
const b = await p.booking.findFirst({ where:{ landAmount:{gt:0} }, select:{ id:true, customerName:true, invoiceNo:true } });
console.log('booking:', b.id, b.customerName, 'existingInvoice:', b.invoiceNo);
await p.booking.update({ where:{id:b.id}, data:{ invoiceNo:'__TESTINV__', invoiceDate:new Date() } });
console.log('SET_TEMP_INVOICE', b.id);
await p.$disconnect();
