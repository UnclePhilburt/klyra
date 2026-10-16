"use client";
import { useEffect, useState } from "react";
import EmbeddedCheckout from "./EmbeddedCheckout";
import { windowsLauncher, macLauncher } from "../site-data";
import { restoreSession } from "../session";
const API=process.env.NEXT_PUBLIC_COMMERCE_URL;
export default function SupporterAccess() {
 const [checkout,setCheckout]=useState(false);
 const [returned,setReturned]=useState(false);
 const [state,setState]=useState(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function refresh() {
  if(!API){setState({checkoutEnabled:false});return;}
  const session=await restoreSession();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
   const r=await fetch(`${API}/status`,{headers:session?{Authorization:`Bearer ${session.access_token}`}:{},signal:controller.signal});
   const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.message||"Could not load account access.");
   setState({...data,signedIn:!!session});setMessage("");
  }catch(error){
   if(error?.name==="AbortError")throw new Error("Account access took too long to respond.");
   throw error;
  }finally{clearTimeout(timer);}
 }
 useEffect(()=>{setReturned(new URLSearchParams(window.location.search).get("checkout")==="returned");let live=true;const check=()=>{if(live)refresh().catch(e=>setMessage(e.message));};check();
  // Re-check on returning from checkout; only the server can confirm ownership.
  const timer=setInterval(check,10000);window.addEventListener("focus",check);
  return()=>{live=false;clearInterval(timer);window.removeEventListener("focus",check);};},[]);
 return <div className="supporterAccess" aria-busy={busy}>
  {state?.sandbox&&<div className="supporterTest"><span>TEST MODE</span> Sandbox purchase. No real charge or game license.</div>}
  {!state?(message?<div className="supporterPending" role="alert"><h3>Account access is unavailable.</h3><p>{message}</p><button className="button ghost" type="button" onClick={()=>{setMessage("");refresh().catch(e=>setMessage(e.message));}}>Try again</button></div>:<p role="status">Checking your account...</p>):state.owned?<section className="supporterWelcome" aria-label="Supporter Edition confirmation">
   <div className="supporterSeal" aria-hidden="true">&#9733;</div>
   <div className="supporterBadge">{state.sandbox?"SANDBOX SUPPORTER":"VERIFIED SUPPORTER"}</div>
   <h2>{state.sandbox?"Test purchase confirmed.":"You're a supporter."}</h2>
   <p className="supporterThanks">{state.sandbox?"Your checkout worked. This test purchase is now linked to your Klyra account.":"Thank you for backing KLYRA. Your support helps an independent developer keep building the battlefield."}</p>
   <div className="supporterLicense"><span>SUPPORTER EDITION</span><strong>{state.sandbox?"Test ownership recorded":"Yours. Ready to play."}</strong><small>Windows + Mac &middot; One account</small></div>
   {!state.sandbox&&<div className="actions"><button className="button" disabled={busy} onClick={()=>window.location.assign(windowsLauncher)}>Windows launcher</button><button className="button ghost" disabled={busy} onClick={()=>window.location.assign(macLauncher)}>Mac launcher</button></div>}
   <a className="supporterAccount" href="/account/">View your account &rarr;</a>
  </section>:returned&&state.signedIn?<div className="supporterPending" role="status"><span className="supporterBadge">PAYMENT CONFIRMATION</span><h3>We're checking your purchase.</h3><p>Waiting for Square to confirm payment. This page updates automatically. If you left checkout before paying, you can try again.</p><button className="button ghost" onClick={()=>setReturned(false)}>Return to checkout options</button></div>:state.checkoutEnabled?<div className="supporterOffer">
   <span className="supporterBadge">BACK THE FRONT</span><h3>One purchase. Both platforms.</h3>
   <p>Support development and get Windows and Mac access on your account.</p>
   {state.signedIn?(checkout?<EmbeddedCheckout onComplete={()=>{setCheckout(false);setReturned(true);refresh();}}/>:<button className="button huge" onClick={()=>setCheckout(true)}>Get Supporter Edition - $4.99</button>):<a className="button" href="/account/">Sign in to buy</a>}
   <p className="quiet supporterTerms">One-time purchase &middot; No subscription</p>
  </div>:<p>Supporter Edition checkout is being prepared.</p>}
  {message&&state&&<p role="status" className="formMessage">{message}</p>}
  {!!state?.purchases?.length&&<details className="supporterReceipts"><summary>Your purchases &amp; receipts</summary>{state.purchases.map(p=><div className="supporterReceipt" key={p.payment_id}><div><strong>Supporter Edition</strong><small>{p.refunded>0?"Refunded":p.status==="COMPLETED"?"Confirmed":p.status} {state.sandbox?"(Sandbox)":""}</small></div><span>${(p.amount/100).toFixed(2)} {p.currency}</span>{p.receipt_url?.startsWith("https://")&&<a href={p.receipt_url} target="_blank" rel="noopener noreferrer">View receipt</a>}</div>)}</details>}
 </div>;
}
