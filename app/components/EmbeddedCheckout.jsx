"use client";
import { useEffect, useRef, useState } from "react";
import { restoreSession } from "../session";
const API=process.env.NEXT_PUBLIC_COMMERCE_URL;
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
 .split(" ").map(code => ({ code, name: countryNames.of(code) }))
 .sort((a, b) => a.name.localeCompare(b.name, "en"));
let sdkPromise;
function loadSquare(sandbox) {
 if(window.Square)return Promise.resolve();
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src=sandbox?"https://sandbox.web.squarecdn.com/v1/square.js":"https://web.squarecdn.com/v1/square.js";
  script.onload=resolve;script.onerror=()=>{sdkPromise=null;script.remove();reject(new Error("Could not load the card form. Refresh to try again."));};
  document.head.appendChild(script);
 });
 return sdkPromise;
}
export default function EmbeddedCheckout({onComplete}) {
 const mount=useRef(null),card=useRef(null),attempt=useRef(null),locked=useRef(false);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[retry,setRetry]=useState(false);
 const [first,setFirst]=useState(""),[last,setLast]=useState(""),[country,setCountry]=useState("US");
 useEffect(()=>{
  let cancelled=false,instance;
  (async()=>{
   const r=await fetch(`${API}/payment-config`);const config=await r.json();
   if(!r.ok||!config.enabled||!config.applicationId)throw new Error("Checkout is temporarily unavailable.");
   await loadSquare(config.sandbox);if(cancelled)return;
   instance=await window.Square.payments(config.applicationId,config.locationId).card({style:{
    '.input-container':{borderColor:'#57594e',borderRadius:'6px'},
    '.input-container.is-focus':{borderColor:'#d7b57a'},
    '.input-container.is-error':{borderColor:'#ec9674'},
    input:{backgroundColor:'#0b100d',color:'#f4efe6',fontFamily:'Arial, sans-serif'},
    'input::placeholder':{color:'#b3aea2'},
    'input.is-focus':{backgroundColor:'#0b100d',color:'#f4efe6'},
    'input.is-error':{backgroundColor:'#0b100d',color:'#ec9674'},
    '.message-text':{color:'#b3aea2'},
    '.message-icon':{color:'#b3aea2'},
    '.message-text.is-error':{color:'#ec9674'},
    '.message-icon.is-error':{color:'#ec9674'}
   }});
   if(cancelled){await instance.destroy();return;}
   await instance.attach(mount.current);card.current=instance;setReady(true);
  })().catch(e=>{if(!cancelled)setMessage(e.message);});
  return()=>{cancelled=true;card.current=null;if(instance)instance.destroy().catch(()=>{});};
 },[]);
 async function pay(event){
  event.preventDefault();if(locked.current||!card.current)return;locked.current=true;setBusy(true);setMessage("");
  try{
   const session=await restoreSession();if(!session)throw new Error("Please sign in again before paying.");
   if(attempt.current&&attempt.current.user!==session.user.id)throw new Error("Your account changed. Refresh checkout before continuing.");
   if(!attempt.current){
    const result=await card.current.tokenize({amount:"4.99",currencyCode:"USD",intent:"CHARGE",customerInitiated:true,sellerKeyedIn:false,billingContact:{givenName:first,familyName:last,countryCode:country.toUpperCase(),email:session.user.email}});
    if(result.status!=="OK")throw new Error("Please check your card details and complete any bank verification.");
    attempt.current={attemptId:crypto.randomUUID(),sourceId:result.token,user:session.user.id};
   }
   const {attemptId,sourceId}=attempt.current;
   const r=await fetch(`${API}/pay`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({attemptId,sourceId})});
   const data=await r.json();
   if(!r.ok){if(r.status===402){attempt.current=null;setRetry(false);}else setRetry(true);throw new Error(data.message||"Payment status is uncertain. Retry this same attempt.");}
   if(data.owned){attempt.current=null;setRetry(false);onComplete();}
   else{setRetry(true);setMessage("Your payment is processing. Check again shortly; do not start another purchase.");}
  }catch(e){if(attempt.current)setRetry(true);setMessage(e.message||"Connection interrupted. Retry to check the same payment.");}
  finally{locked.current=false;setBusy(false);}
 }
 return <form className="embeddedCheckout" onSubmit={pay}>
  <div className="checkoutHeading"><span className="supporterBadge">SECURE CHECKOUT</span><h3>Supporter Edition</h3><p>Windows + Mac <strong>$4.99 USD</strong></p></div>
  <fieldset disabled={busy||retry}><legend>Billing name</legend><div className="checkoutNames"><label>First name<input required autoComplete="given-name" value={first} onChange={e=>setFirst(e.target.value)}/></label><label>Last name<input required autoComplete="family-name" value={last} onChange={e=>setLast(e.target.value)}/></label></div><label>Country<select required autoComplete="country" value={country} onChange={e=>setCountry(e.target.value)}>{countries.map(({code,name})=><option key={code} value={code}>{name}</option>)}</select></label></fieldset>
  <div ref={mount} className="squareCard" />
  {!ready&&!message&&<p role="status">Loading secure card fields...</p>}
  <button className="button huge" type="submit" disabled={!ready||busy}>{busy?"Confirming payment...":retry?"Retry same payment":"Pay $4.99 USD"}</button>
  <p className="quiet">One-time purchase. Card details are handled securely by Square.</p>
  {message&&<p role="alert" className="formMessage">{message}</p>}
 </form>;
}
