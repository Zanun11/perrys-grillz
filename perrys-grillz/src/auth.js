/* Customer authentication via Supabase Auth (email + password) */
window.Auth = (() => {
  let user = null, profile = null;
  const listeners = [];

  function cfg(){ return window.Backend && window.Backend.rawCfg ? window.Backend.rawCfg() : null; }
  function base(){ const c = cfg(); return c ? c.url.replace(/\/+$/, "") : null; }
  function headers(extra){
    const c = cfg();
    return Object.assign({
      apikey: c.key,
      "Content-Type": "application/json"
    }, extra || {});
  }

  function saveSession(s){ if(s) localStorage.setItem("perrysgrillz_session", JSON.stringify(s)); else localStorage.removeItem("perrysgrillz_session"); }
  function loadSession(){ try{ return JSON.parse(localStorage.getItem("perrysgrillz_session") || "null"); }catch{ return null; } }
  function accessToken(){ const s = loadSession(); return s && s.access_token; }

  const getUser = () => user;
  const getProfile = () => profile;
  const isSignedIn = () => !!user;

  async function signUp(email, password, fullName){
    if(!base()) throw new Error("Connect Supabase first (⚙️ Backend)");
    const r = await fetch(`${base()}/auth/v1/signup`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ email, password, data: { full_name: fullName } })
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.msg || data.error_description || "Signup failed");
    if(data.access_token){
      saveSession(data); user = data.user; await loadProfile(); notify();
    }
    return data;
  }

  async function signIn(email, password){
    if(!base()) throw new Error("Connect Supabase first (⚙️ Backend)");
    const r = await fetch(`${base()}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error_description || data.msg || "Sign in failed");
    saveSession(data); user = data.user; await loadProfile(); notify();
    return user;
  }

  async function signOut(){
    const t = accessToken();
    if(t){
      try{ await fetch(`${base()}/auth/v1/logout`, { method: "POST", headers: headers({ Authorization: "Bearer " + t }) }); }catch{}
    }
    saveSession(null); user = null; profile = null; notify();
  }

  async function loadProfile(){
    if(!user) return null;
    const t = accessToken();
    const r = await fetch(`${base()}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
      headers: headers({ Authorization: "Bearer " + t })
    });
    const arr = await r.json();
    profile = Array.isArray(arr) ? arr[0] : null;
    return profile;
  }

  async function updateProfile(updates){
    if(!user) throw new Error("Not signed in");
    const t = accessToken();
    const r = await fetch(`${base()}/rest/v1/profiles?id=eq.${user.id}`, {
      method: "PATCH",
      headers: headers({ Authorization: "Bearer " + t, Prefer: "return=representation" }),
      body: JSON.stringify(updates)
    });
    const arr = await r.json();
    profile = Array.isArray(arr) ? arr[0] : profile;
    notify();
    return profile;
  }

  async function restore(){
    const t = accessToken();
    if(!t) return;
    try{
      const r = await fetch(`${base()}/auth/v1/user`, { headers: headers({ Authorization: "Bearer " + t }) });
      if(r.ok){ user = await r.json(); await loadProfile(); }
      else saveSession(null);
    }catch{ saveSession(null); }
    notify();
  }

  function onChange(fn){ listeners.push(fn); fn({ user, profile }); }
  function notify(){ listeners.forEach(fn => fn({ user, profile })); }

  return { signUp, signIn, signOut, restore, getUser, getProfile, isSignedIn,
           updateProfile, loadProfile, onChange, accessToken };
})();