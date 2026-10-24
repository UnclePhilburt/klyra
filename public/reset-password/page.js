"use strict";
const base="https://xmmjygblrinaqtqtcrin.supabase.co/auth/v1",key="sb_publishable_C9o78FMbvgnJYNwyTvrSdg_O3_dYgGd",$=id=>document.getElementById(id);
let token="",busy=false;
const hash=new URLSearchParams(location.hash.slice(1));
if(hash.get("type")==="recovery")token=hash.get("access_token")||"";
const linkError=hash.has("error")||new URLSearchParams(location.search).has("error");
history.replaceState(null,"",location.pathname);
async function api(path,method,body,auth){
 const response=await fetch(base+path,{method,headers:{apikey:key,"Content-Type":"application/json",...(auth?{Authorization:"Bearer "+auth}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.msg||data.message||data.error_description||"Request failed. Try again.");return data;
}
function lock(value){busy=value;document.querySelectorAll("button").forEach(b=>b.disabled=value);}
$("request").onsubmit=async event=>{event.preventDefault();if(busy)return;lock(true);
 try{await api("/recover?redirect_to="+encodeURIComponent("https://klyra.lol/reset-password/"),"POST",{email:$("email").value.trim()});$("status").textContent="If this email has an account, a reset link will arrive shortly. Check your spam folder too.";}
 catch(error){$("status").textContent="Could not send the reset link. Please wait a moment and try again.";}finally{lock(false);}
};
$("change").onsubmit=async event=>{event.preventDefault();if(busy)return;
 if($("password").value!==$("confirm").value){$("status").textContent="Passwords do not match.";return;}
 if(!token){$("status").textContent="Request a fresh recovery link.";return;}
 lock(true);try{await api("/user","PUT",{password:$("password").value},token);token="";$("password").value=$("confirm").value="";$("change").hidden=true;$("status").textContent="Password changed. Return to the launcher or scan a fresh game QR code to sign in.";}
 catch(error){$("status").textContent=error.message;}finally{lock(false);}
};
(async()=>{if(!token){if(linkError)$("status").textContent="This recovery link is invalid or expired. Request a new one.";return;}
 lock(true);try{await api("/user","GET",null,token);$("request").hidden=true;$("change").hidden=false;}
 catch{token="";$("status").textContent="This recovery link has expired. Request a new one.";}finally{lock(false);}
})();
