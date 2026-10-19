const PRICE = 499;
const CURRENCY = "USD";
const CHARACTER_PRICE = 199;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COSMETIC_RE=/^[a-z0-9_]{2,64}$/;
const BUNDLE_RE=/^[a-z0-9_]{2,64}$/;
const ORDER_REF_RE=/^bnd_[0-9a-f]{32}$/;
const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{"content-type":"application/json","cache-control":"no-store"}});
function fail(status,message) { throw Object.assign(new Error(message),{status}); }
async function database(env,path,method="GET",body) {
 const r=await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`,{method,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,"Content-Type":"application/json",Prefer:"return=representation"},body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok) {
  const detail=await r.json().catch(()=>({}));
  console.error("Purchase storage failure",JSON.stringify({operation:method,resource:path.split("?")[0],status:r.status,code:detail.code}));
  throw new Error("Purchase storage unavailable");
 }
 return r.status===204?null:r.json();
}
async function square(env,path,body) {
 const host=env.SQUARE_ENVIRONMENT==="production"?"connect.squareup.com":"connect.squareupsandbox.com";
 const r=await fetch(`https://${host}/v2/${path}`,{method:body?"POST":"GET",headers:{Authorization:`Bearer ${env.SQUARE_ACCESS_TOKEN}`,"Square-Version":"2026-09-16","Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
 if(!r.ok) {
  const payload=await r.json().catch(()=>({}));
  const code=payload.errors?.[0]?.code;
  const codes=(payload.errors||[]).map(e=>e.code);
  console.error("Square API failure",JSON.stringify({operation:path.split("/")[0],status:r.status,errors:payload.errors?.map(e=>({code:e.code,category:e.category,field:e.field}))}));
  if(codes.includes("TRANSACTION_LIMIT"))fail(402,"Square declined this payment because of a transaction limit. Check with your card issuer before retrying. Also check that your billing ZIP matches your card.");
  if(codes.includes("ADDRESS_VERIFICATION_FAILURE"))fail(402,"Billing address verification failed. Check that the ZIP or postal code matches your card billing address.");
  if(["CARD_DECLINED","CVV_FAILURE","ADDRESS_VERIFICATION_FAILURE","CARD_EXPIRED","INSUFFICIENT_FUNDS","INVALID_CARD"].includes(code))fail(402,"Payment declined. Check the card details or try another card.");
  throw new Error("Square request failed");
 }
 return r.json();
}
async function user(request,env) {
 const token=request.headers.get("authorization");
 if(!token?.startsWith("Bearer ")) fail(401,"Please sign in first.");
 const r=await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:token}});
 if(!r.ok) fail(401,"Please sign in again.");
 const u=await r.json();if(!u.id) fail(401,"Please sign in again.");return u;
}
async function access(env,userId) {
 const profiles=env.SQUARE_ENVIRONMENT==="production" ? await database(env,`profiles?id=eq.${encodeURIComponent(userId)}&select=*`) : [];
 const complimentary=profiles.some(p=>p.supporter_complimentary===true);
 const orders=await database(env,`supporter_orders?user_id=eq.${encodeURIComponent(userId)}&environment=eq.${env.SQUARE_ENVIRONMENT}&select=id`);
 if(!orders.length) return {owned:complimentary,complimentary,purchases:[]};
 const rows=await database(env,`supporter_payments?order_id=in.(${orders.map(o=>o.id).join(",")})&select=payment_id,status,amount,refunded,currency,receipt_url,updated_at`);
 return {complimentary,owned:complimentary||rows.some(p=>p.status==="COMPLETED"&&p.currency===CURRENCY&&p.amount>=PRICE&&p.refunded===0),purchases:rows};
}
async function characterRow(env,cosmeticId) {
 const rows=await database(env,`cosmetic_catalog?id=eq.${encodeURIComponent(cosmeticId)}&select=id,display_name,price_cents,supporter_exclusive,active`);
 return rows[0]||null;
}
function purchasable(row) {
 return !!row&&row.active===true&&row.supporter_exclusive!==true&&Number(row.price_cents)===CHARACTER_PRICE;
}
async function characterOwned(env,userId,cosmeticId) {
 const rows=await database(env,`player_cosmetics?user_id=eq.${encodeURIComponent(userId)}&cosmetic_id=eq.${encodeURIComponent(cosmeticId)}&revoked_at=is.null&select=cosmetic_id`);
 return rows.length>0;
}
async function characterWebhook(env,payment,order) {
 const m=order.metadata||{};
 const userId=m.klyra_user_id||"",cosmeticId=m.klyra_cosmetic_id||"";
 if(!UUID_RE.test(userId)||!COSMETIC_RE.test(cosmeticId))return json({received:true});
 if(env.SQUARE_ENVIRONMENT!=="production")return json({received:true});
 const amount=Number(payment.amount_money?.amount||0),refunded=Number(payment.refunded_money?.amount||0);
 if(refunded>0&&refunded>=amount){
  await database(env,"rpc/revoke_player_cosmetic_by_payment","POST",{p_payment:payment.id});
  return json({received:true});
 }
 if(payment.status!=="COMPLETED")return json({received:true});
 if(amount!==CHARACTER_PRICE||payment.amount_money?.currency!==CURRENCY||Number(order.total_money?.amount)!==CHARACTER_PRICE||order.total_money?.currency!==CURRENCY){
  console.error("Character payment amount mismatch",JSON.stringify({amount,currency:payment.amount_money?.currency}));
  return json({received:true});
 }
 const row=await characterRow(env,cosmeticId);
 if(!purchasable(row)){console.error("Character not purchasable",cosmeticId);return json({received:true});}
 const result=await database(env,"rpc/grant_player_cosmetic","POST",{p_user:userId,p_cosmetic:cosmeticId,p_payment:payment.id});
 if(result!=="granted"&&result!=="already_granted")console.error("Character grant result",JSON.stringify({result,cosmeticId}));
 return json({received:true});
}
async function characterCheckout(request,env) {
 if(env.CHECKOUT_ENABLED!=="true"||env.CHARACTER_STORE_ENABLED!=="true")fail(503,"The character store is opening soon.");
 if(env.SQUARE_ENVIRONMENT!=="production")fail(503,"The character store is opening soon.");
 if(!env.SQUARE_LOCATION_ID||!env.SQUARE_ACCESS_TOKEN||!env.SQUARE_WEBHOOK_SIGNATURE_KEY)fail(503,"Checkout is not ready yet.");
 const u=await user(request,env);
 const body=await request.json().catch(()=>({}));
 const cosmeticId=String(body.cosmeticId||"");
 if(!COSMETIC_RE.test(cosmeticId))fail(400,"Unknown character.");
 let row;
 try{row=await characterRow(env,cosmeticId);}catch{fail(503,"The character store is opening soon.");}
 if(!row)fail(404,"Unknown character.");
 if(row.supporter_exclusive)fail(403,"This character comes with the Supporter Edition and cannot be bought on its own.");
 if(!purchasable(row))fail(409,"This character is not for sale right now.");
 if(await characterOwned(env,u.id,cosmeticId))fail(409,"You already own this character.");
 const id=crypto.randomUUID();
 const ref=`chr_${id.replace(/-/g,"")}`;
 const site=request.headers.get("origin")==="https://www.klyra.lol"&&env.SITE_ORIGIN==="https://klyra.lol"?"https://www.klyra.lol":env.SITE_ORIGIN;
 const name=`KLYRA Character: ${String(row.display_name||cosmeticId).slice(0,80)}`;
 const {payment_link}=await square(env,"online-checkout/payment-links",{idempotency_key:id,order:{location_id:env.SQUARE_LOCATION_ID,reference_id:ref,metadata:{klyra_kind:"character",klyra_user_id:u.id,klyra_cosmetic_id:cosmeticId},line_items:[{name,quantity:"1",base_price_money:{amount:CHARACTER_PRICE,currency:CURRENCY}}]},checkout_options:{redirect_url:`${site}/store/?checkout=returned&character=${encodeURIComponent(cosmeticId)}`,allow_tipping:false},pre_populated_data:{buyer_email:u.email}});
 if(!payment_link?.order_id||!payment_link?.url)throw new Error("Checkout unavailable");
 return json({url:payment_link.url});
}
async function bundleCheckout(request,env) {
 if(env.CHECKOUT_ENABLED!=="true"||env.CHARACTER_STORE_ENABLED!=="true")fail(503,"The character store is opening soon.");
 if(env.SQUARE_ENVIRONMENT!=="production")fail(503,"The character store is opening soon.");
 if(!env.SQUARE_LOCATION_ID||!env.SQUARE_ACCESS_TOKEN||!env.SQUARE_WEBHOOK_SIGNATURE_KEY)fail(503,"Checkout is not ready yet.");
 const u=await user(request,env);
 const body=await request.json().catch(()=>({}));
 const bundleId=String(body.bundleId||"");
 if(!BUNDLE_RE.test(bundleId))fail(400,"Unknown pack.");
 const id=crypto.randomUUID();
 const ref=`bnd_${id.replace(/-/g,"")}`;
 let rows;
 try{rows=await database(env,"rpc/create_bundle_order","POST",{p_user:u.id,p_bundle:bundleId,p_ref:ref});}catch{fail(503,"Packs are opening soon.");}
 const q=Array.isArray(rows)?rows[0]:rows;
 if(!q)fail(503,"Packs are opening soon.");
 if(!q.ok){
  if(q.reason==="all_owned")fail(409,"You already own every character in this pack.");
  if(q.reason==="not_found")fail(404,"Unknown pack.");
  fail(409,"This pack is not for sale right now.");
 }
 const amount=Number(q.expected_cents);
 if(!Number.isInteger(amount)||amount<199||!Array.isArray(q.items)||!q.items.length)throw new Error("Bundle quote invalid");
 const site=request.headers.get("origin")==="https://www.klyra.lol"&&env.SITE_ORIGIN==="https://klyra.lol"?"https://www.klyra.lol":env.SITE_ORIGIN;
 const name=`KLYRA ${String(q.display_name||bundleId).slice(0,60)} (${q.items.length} character${q.items.length===1?"":"s"})`;
 const {payment_link}=await square(env,"online-checkout/payment-links",{idempotency_key:id,order:{location_id:env.SQUARE_LOCATION_ID,reference_id:ref,metadata:{klyra_kind:"bundle",klyra_user_id:u.id,klyra_order_ref:ref,klyra_bundle_id:bundleId},line_items:[{name,quantity:"1",base_price_money:{amount,currency:CURRENCY}}]},checkout_options:{redirect_url:`${site}/store/?checkout=returned&bundle=${encodeURIComponent(bundleId)}`,allow_tipping:false},pre_populated_data:{buyer_email:u.email}});
 if(!payment_link?.order_id||!payment_link?.url)throw new Error("Checkout unavailable");
 await database(env,`store_orders?ref=eq.${ref}&user_id=eq.${u.id}`,"PATCH",{square_order_id:payment_link.order_id});
 return json({url:payment_link.url,amount});
}
async function bundleWebhook(env,payment,order) {
 const m=order.metadata||{};
 const userId=m.klyra_user_id||"",ref=m.klyra_order_ref||"";
 if(!UUID_RE.test(userId)||!ORDER_REF_RE.test(ref)||order.reference_id!==ref)return json({received:true});
 if(env.SQUARE_ENVIRONMENT!=="production")return json({received:true});
 const amount=Number(payment.amount_money?.amount||0),refunded=Number(payment.refunded_money?.amount||0);
 if(refunded>0&&refunded>=amount){
  await database(env,"rpc/revoke_bundle_payment","POST",{p_payment:payment.id});
  return json({received:true});
 }
 if(payment.status!=="COMPLETED")return json({received:true});
 if(payment.amount_money?.currency!==CURRENCY||Number(order.total_money?.amount)!==amount||order.total_money?.currency!==CURRENCY){
  console.error("Bundle payment amount mismatch",JSON.stringify({amount,currency:payment.amount_money?.currency}));
  return json({received:true});
 }
 const result=await database(env,"rpc/grant_bundle_payment","POST",{p_ref:ref,p_user:userId,p_payment:payment.id,p_order:payment.order_id,p_amount:amount,p_currency:CURRENCY});
 if(typeof result!=="string"||(!result.startsWith("granted")&&result!=="already_granted"))console.error("Bundle grant result",JSON.stringify({result,ref}));
 return json({received:true});
}
async function webhook(request,env) {
 const raw=await request.text();
 if(!env.SQUARE_WEBHOOK_SIGNATURE_KEY||!env.SQUARE_WEBHOOK_URL) fail(503,"Webhook not configured.");
 const signature=request.headers.get("x-square-hmacsha256-signature")||"";
 let bytes;try{bytes=Uint8Array.from(atob(signature),c=>c.charCodeAt(0));}catch{fail(403,"Invalid signature.");}
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.SQUARE_WEBHOOK_SIGNATURE_KEY),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 if(!await crypto.subtle.verify("HMAC",key,bytes,new TextEncoder().encode(env.SQUARE_WEBHOOK_URL+raw))) fail(403,"Invalid signature.");
 const event=JSON.parse(raw);
 if(!["payment.created","payment.updated","refund.created","refund.updated"].includes(event.type))return json({received:true});
 const object=event.data?.object;
 const paymentId=object?.payment?.id||object?.refund?.payment_id;
 if(!paymentId) return json({received:true});
 // Fetch authoritative current state, never grant access from redirect parameters.
 const {payment}=await square(env,`payments/${encodeURIComponent(paymentId)}`);
 if(!payment?.order_id||payment.location_id!==env.SQUARE_LOCATION_ID)return json({received:true});
 const {order}=await square(env,`orders/${encodeURIComponent(payment.order_id)}`);
 if(order?.metadata?.klyra_kind==="character")return characterWebhook(env,payment,order);
 if(order?.metadata?.klyra_kind==="bundle")return bundleWebhook(env,payment,order);
 if(!/^[0-9a-f-]{36}$/i.test(order?.reference_id||""))return json({received:true});
 const records=await database(env,`supporter_orders?id=eq.${order.reference_id}&environment=eq.${env.SQUARE_ENVIRONMENT}`);
 if(!records.length)return json({received:true});
 const saved=records[0];
 if(saved.square_order_id&&saved.square_order_id!==payment.order_id)fail(409,"Order mismatch.");
 await database(env,`supporter_orders?id=eq.${saved.id}`,"PATCH",{square_order_id:payment.order_id});
 await database(env,"rpc/record_supporter_payment","POST",{p_payment_id:payment.id,p_order_id:saved.id,p_status:payment.status,p_amount:payment.amount_money?.amount||0,p_refunded:payment.refunded_money?.amount||0,p_currency:payment.amount_money?.currency||"",p_updated:payment.updated_at,p_receipt:payment.receipt_url||null});
 return json({received:true});
}
async function embeddedPayment(request,env) {
 if(env.CHECKOUT_ENABLED!=="true"||!env.SQUARE_APPLICATION_ID)fail(503,"Checkout is not ready.");
 const u=await user(request,env);
 if((await access(env,u.id)).owned)return json({owned:true});
 const body=await request.json();
 const id=body.attemptId,source=body.sourceId;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||"")||typeof source!=="string"||source.length<5||source.length>2048)fail(400,"Invalid payment attempt.");
 let records=await database(env,`supporter_orders?id=eq.${id}`);
 if(!records.length){
  try { await database(env,"supporter_orders","POST",{id,user_id:u.id,environment:env.SQUARE_ENVIRONMENT}); }
  catch { /* A concurrent retry may have already inserted this attempt. */ }
  records=await database(env,`supporter_orders?id=eq.${id}`);
 }
 const saved=records[0];
 if(!saved)fail(503,"Unable to start payment. Please retry.");
 if(saved.user_id!==u.id||saved.environment!==env.SQUARE_ENVIRONMENT)fail(403,"Payment attempt does not belong to this account.");
 let orderId=saved.square_order_id;
 if(!orderId){
  const {order}=await square(env,"orders",{idempotency_key:id,order:{location_id:env.SQUARE_LOCATION_ID,reference_id:id,line_items:[{name:"KLYRA Supporter Edition",quantity:"1",base_price_money:{amount:PRICE,currency:CURRENCY}}]}});
  orderId=order.id;
  await database(env,`supporter_orders?id=eq.${id}`,"PATCH",{square_order_id:orderId});
 }
 const {payment}=await square(env,"payments",{idempotency_key:id,source_id:source,amount_money:{amount:PRICE,currency:CURRENCY},order_id:orderId,location_id:env.SQUARE_LOCATION_ID,autocomplete:true,reference_id:id});
 if(!payment||payment.order_id!==orderId||payment.location_id!==env.SQUARE_LOCATION_ID)throw new Error("Payment response mismatch");
 await database(env,"rpc/record_supporter_payment","POST",{p_payment_id:payment.id,p_order_id:id,p_status:payment.status,p_amount:payment.amount_money?.amount||0,p_refunded:payment.refunded_money?.amount||0,p_currency:payment.amount_money?.currency||"",p_updated:payment.updated_at,p_receipt:payment.receipt_url||null});
 return json({owned:(await access(env,u.id)).owned,status:payment.status});
}
async function handle(request,env) {
 const path=new URL(request.url).pathname;
 if(path==="/payment-config"&&request.method==="GET")return json({applicationId:env.SQUARE_APPLICATION_ID,locationId:env.SQUARE_LOCATION_ID,sandbox:env.SQUARE_ENVIRONMENT!=="production",enabled:env.CHECKOUT_ENABLED==="true",amount:"4.99",currency:CURRENCY});
 if(path==="/pay"&&request.method==="POST")return embeddedPayment(request,env);
 if(path==="/characters/config"&&request.method==="GET")return json({enabled:env.CHECKOUT_ENABLED==="true"&&env.CHARACTER_STORE_ENABLED==="true"&&env.SQUARE_ENVIRONMENT==="production",price:"1.99",amount:CHARACTER_PRICE,currency:CURRENCY,bundles:true});
 if(path==="/characters/checkout"&&request.method==="POST")return characterCheckout(request,env);
 if(path==="/bundles/checkout"&&request.method==="POST")return bundleCheckout(request,env);
 if(path==="/webhook"&&request.method==="POST")return webhook(request,env);
 if(path==="/status"&&request.method==="GET") {
  if(!request.headers.has("authorization"))return json({owned:false,sandbox:env.SQUARE_ENVIRONMENT!=="production",checkoutEnabled:env.CHECKOUT_ENABLED==="true"});
  const u=await user(request,env);return json({...await access(env,u.id),sandbox:env.SQUARE_ENVIRONMENT!=="production",checkoutEnabled:env.CHECKOUT_ENABLED==="true"});
 }
 if(path==="/checkout"&&request.method==="POST") {
  if(env.CHECKOUT_ENABLED!=="true")fail(503,"Checkout is not open yet.");
  if(!env.SQUARE_LOCATION_ID||!env.SQUARE_ACCESS_TOKEN||!env.SQUARE_WEBHOOK_SIGNATURE_KEY)fail(503,"Checkout is not ready yet.");
  const u=await user(request,env);
  if((await access(env,u.id)).owned)fail(409,"You already own Supporter Edition.");
  const id=crypto.randomUUID();
  await database(env,"supporter_orders","POST",{id,user_id:u.id,environment:env.SQUARE_ENVIRONMENT});
  const {payment_link}=await square(env,"online-checkout/payment-links",{idempotency_key:id,order:{location_id:env.SQUARE_LOCATION_ID,reference_id:id,line_items:[{name:"KLYRA Supporter Edition",quantity:"1",base_price_money:{amount:PRICE,currency:CURRENCY}}]},checkout_options:{redirect_url:`${request.headers.get("origin")=== "https://www.klyra.lol" && env.SITE_ORIGIN === "https://klyra.lol" ? "https://www.klyra.lol" : env.SITE_ORIGIN}/support/?checkout=returned`,allow_tipping:false},pre_populated_data:{buyer_email:u.email}});
  if(!payment_link?.order_id||!payment_link?.url)throw new Error("Checkout unavailable");
  await database(env,`supporter_orders?id=eq.${id}`,"PATCH",{square_order_id:payment_link.order_id});
  return json({url:payment_link.url});
 }
 if(path==="/download"&&request.method==="POST") {
  if(env.SQUARE_ENVIRONMENT!=="production")fail(403,"Sandbox purchases do not unlock real downloads.");
  const u=await user(request,env);if(!(await access(env,u.id)).owned)fail(403,"Supporter Edition is required.");
  const {platform}=await request.json();if(!["windows","mac"].includes(platform))fail(400,"Choose Windows or Mac.");
  const key=platform==="windows"?env.WINDOWS_KEY:env.MAC_KEY;
  if(!key||!env.DOWNLOADS)fail(503,"Downloads are being prepared.");
  const file=await env.DOWNLOADS.get(key);if(!file)fail(503,"Download unavailable.");
  return new Response(file.body,{headers:{"content-type":"application/octet-stream","content-length":String(file.size),"content-disposition":`attachment; filename="${key.split("/").pop().replace(/[^a-zA-Z0-9._-]/g,"_")}"`,"cache-control":"private, no-store"}});
 }
 return json({message:"Not found"},404);
}
export default {async fetch(request,env) {
 const origin=request.headers.get("origin");
 const allowed=origin===env.SITE_ORIGIN || (env.SITE_ORIGIN==="https://klyra.lol" && origin==="https://www.klyra.lol");
 let response;
 try {
  if(request.method==="OPTIONS")response=new Response(null,{status:204});
  else if(origin&&!allowed&&new URL(request.url).pathname!=="/webhook")response=json({message:"Origin not allowed"},403);
  else response=await handle(request,env);
 } catch(e) {console.error("Commerce request failed",e.status||500);response=json({message:e.status?e.message:"Unable to complete the request. Please try again."},e.status||500);}
 const headers=new Headers(response.headers);
 if(allowed){headers.set("access-control-allow-origin",origin);headers.set("access-control-allow-methods","GET, POST, OPTIONS");headers.set("access-control-allow-headers","authorization, content-type");headers.set("access-control-expose-headers","content-disposition");headers.set("vary","Origin");}
 return new Response(response.body,{status:response.status,headers});
}};
