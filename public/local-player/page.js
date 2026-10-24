"use strict";
const SUPABASE_URL = "https://xmmjygblrinaqtqtcrin.supabase.co";
const PUBLIC_KEY = "sb_publishable_C9o78FMbvgnJYNwyTvrSdg_O3_dYgGd";
const $ = id => document.getElementById(id);
let creating = false, busy = false, accessToken="", pairing=null;
const API="https://api.klyra.lol/v1/local-pair/";
const fragment=location.hash.slice(1).split(".");
const requestId=fragment[0]||"", code=fragment[1]||"";
async function pair(action,extra={}){
 const response=await fetch(API+action,{method:"POST",headers:{"Content-Type":"application/json",...(accessToken?{Authorization:"Bearer "+accessToken}:{})},body:JSON.stringify({id:requestId,code,...extra})});
 const data=await response.json();if(!response.ok)throw new Error(data.message||"Pairing request failed.");return data;
}
async function loadPair(){
 try{pairing=await pair("info");$("binding").textContent="Room: "+pairing.room+" · Player "+pairing.slot;$("approve").disabled=!accessToken;}
 catch(error){pairing=null;$("approve").disabled=true;$("status").textContent=requestId?error.message:"Open this page by scanning the QR code in your game.";}
}
$("approve").onclick=async()=>{
 $("approve").disabled=true;
 try{await pair("approve");accessToken="";$("status").textContent="Approved. Return to the game.";$("approve").textContent="Approved";}
 catch(error){$("status").textContent=error.message;$("approve").disabled=false;}
};
loadPair();
// Pairing codes are not credentials. Never accept account tokens from a QR URL.
// No browser storage: this phone page does not retain a login session.
function mode(value) {
  if (busy) return;
  creating=value; $("nameField").hidden=!value; $("username").required=value;
  $("password").autocomplete=value?"new-password":"current-password";
  $("submit").textContent=value?"Create account":"Sign in";
  for (const [id,on] of [["signupTab",value],["loginTab",!value]]) {
    $(id).classList.toggle("active",on); $(id).setAttribute("aria-pressed",String(on));
  }
  $("status").textContent="";
}
$("loginTab").onclick=()=>mode(false); $("signupTab").onclick=()=>mode(true);
$("signout").onclick=()=>{ accessToken="";$("approve").disabled=true; $("identity").textContent=""; $("approval").hidden=true; $("auth").hidden=false; $("password").value=""; $("status").textContent=""; };
$("form").onsubmit=async event=>{
  event.preventDefault(); if(busy)return; busy=true;
  $("submit").disabled=true; $("status").textContent=creating?"Creating account…":"Signing in…";
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    const body={email:$("email").value.trim(),password:$("password").value};
    if(creating)body.data={username:$("username").value.trim()};
    const response=await fetch(SUPABASE_URL+(creating?"/auth/v1/signup":"/auth/v1/token?grant_type=password"),{
      method:"POST",headers:{apikey:PUBLIC_KEY,"Content-Type":"application/json"},body:JSON.stringify(body),signal:controller.signal
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.msg||result.error_description||result.message||"Unable to sign in. Please try again.");
    $("password").value="";
    if(creating&&!result.access_token){$("status").textContent="Check your email to confirm your account, then return here to sign in.";return;}
    $("identity").textContent=result.user?.email||body.email;
    $("auth").hidden=true;$("approval").hidden=false;
    accessToken=result.access_token;
    $("status").textContent="Confirm you want to join this computer, then approve player two’s sign-in.";
    await loadPair();
    // Do not store or forward result.access_token or result.refresh_token.
  }catch(error){$("status").textContent=error.name==="AbortError"?"Request timed out. Please try again.":error.message;}
  finally{clearTimeout(timeout);busy=false;$("submit").disabled=false;}
};
