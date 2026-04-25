import { useState, useEffect } from "react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  if (!showInstall) return null;

  return (
    <div style={{padding:"14px 20px",background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:14,
      display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:700,color:"white"}}>📱 Install MedTrack App</div>
        <div style={{fontSize:12,color:"#bfdbfe",marginTop:2}}>Add to your desktop for quick access — works offline too!</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={installApp}
          style={{padding:"9px 20px",background:"white",color:"#2563eb",border:"none",
            borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          📥 Install App
        </button>
        <button onClick={()=>setShowInstall(false)}
          style={{padding:"9px 14px",background:"rgba(255,255,255,0.15)",color:"white",border:"none",
            borderRadius:10,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
          ✕
        </button>
      </div>
    </div>
  );
}

