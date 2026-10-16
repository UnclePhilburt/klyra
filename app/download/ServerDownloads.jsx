"use client";
import { useEffect, useState } from "react";
import { callsignOf, restoreSession } from "../session";

const MAC_SERVER="https://cdn.klyra.lol/servers/Klyra-Mac-Server-20261013-r9.zip";
const WINDOWS_SERVER="https://cdn.klyra.lol/servers/Klyra-Windows-Server-latest.zip";

export default function ServerDownloads(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{let live=true;restoreSession().then(value=>{if(live)setSession(value);}).catch(()=>{}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
 const email=String(session?.user?.email||"").toLowerCase();
 const callsign=String(callsignOf(session)||"").toLowerCase();
 async function download(url,filename,key){
  if(!session)return;
  setBusy(key);setMessage("");
  try{
   const platform=key==="mac"?"mac":"windows";
   const response=await fetch("https://api.klyra.lol/v1/server-download-ticket",{
    method:"POST",
    headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},
    body:JSON.stringify({platform})
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.message||"Could not prepare the download. Please sign in again and retry.");
   if(!data.url)throw new Error("The download service did not return a file link. Please retry.");
   window.location.assign(data.url);
  }catch(error){setMessage(error.message||"Download unavailable.");}finally{setBusy("");}
 }
 if(loading)return <div className="serverAccess"><p className="quiet">Verifying your account...</p></div>;
 if(!session)return <div className="serverAccess"><p>Sign in to access private dedicated server builds.</p><a className="button" href="/account/">Sign in</a></div>;
 return <div className="serverAccess">
  <div className="serverDownloadGrid">
   <article><p className="tag">Mac</p><h3>Mac server</h3><p>Dedicated server package for Mac.</p><button className="button ghost" disabled={!!busy} onClick={()=>download(MAC_SERVER,"Klyra-Mac-Server-20261013-r9.zip","mac")}>{busy==="mac"?"Preparing...":"Download Mac server"}</button></article>
   <article><p className="tag">Windows</p><h3>Windows server</h3><p>Dedicated server package for Windows.</p><button className="button ghost" disabled={!!busy} onClick={()=>download(WINDOWS_SERVER,"Klyra-Windows-Server-20261013-r1.zip","windows")}>{busy==="windows"?"Preparing...":"Download Windows server · 204 MB"}</button></article>
  </div>
  <p className="quiet">Signed in as <strong className="kxCallsign">{callsignOf(session)||email}</strong>. Server downloads are tied to this account.</p>
  {message&&<p className="formMessage error" role="status">{message}</p>}
 </div>;
}
