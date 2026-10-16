/* Shared backend via Supabase (secured with Row Level Security).
   Optional: when no keys are saved, the site keeps working on local storage.
   Keys are entered in the ⚙️ Backend panel and stored ONLY in this device's
   localStorage — never in the code. The public anon key is safe to use in a
   browser; RLS policies in supabase-schema.sql enforce what it can do. */
window.Backend = (()=>{
  const LS_KEY = "perrysgrillz_sb";

  // 👇 Hardcoded defaults — makes Supabase work on ANY domain
  const HARDCODED_URL = "https://ocvwdbynjoflhtjyzsed.supabase.co"; // ← paste your Project URL
  const HARDCODED_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdndkYnluam9mbGh0anl6c2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDkyMzUsImV4cCI6MjEwNzU4NTIzNX0.sc9IYlg2wWwC0g01Krwy4buQSHtdYQqrodNCtVHaATE"; // ← paste your anon public key

  function cfg(){
    try{
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null") || {};
      return {
        url: saved.url || HARDCODED_URL,
        key: saved.key || HARDCODED_KEY
      };
    }catch{
      return { url: HARDCODED_URL, key: HARDCODED_KEY };
    }
  }
  function isOnline(){
    const c = cfg();
    return !!(c && c.url && c.key && c.url.startsWith("https://"));
  }
  function base(){ return cfg().url.replace(/\/+$/,""); }
  function headers(extra){
    const c = cfg();
    return Object.assign({
      apikey: c.key,
      Authorization: "Bearer " + c.key,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }, extra || {});
  }
  async function req(table, query, opts){
    opts = opts || {};
    let r;
    try{
      r = await fetch(base() + "/rest/v1/" + table + (query || ""), {
        method: opts.method || "GET",
        headers: headers(opts.headers),
        body: opts.body
      });
    }catch(e){ throw new Error("Network error — check the URL and connection."); }
    if(!r.ok){
      const t = await r.text().catch(()=> "");
      if(r.status === 401 || r.status === 403) throw new Error("Rejected (401/403) — wrong key or RLS policy missing. Run supabase-schema.sql first.");
      if(r.status === 404) throw new Error("Table not found (404) — run supabase-schema.sql first.");
      throw new Error("Supabase " + r.status + ": " + String(t).slice(0,160));
    }
    const ct = r.headers.get("content-type") || "";
    return ct.includes("json") ? r.json() : null;
  }

  const mapOrder = (o)=> ({id:o.id, name:o.name, phone:o.phone, type:o.type, note:o.note||"",
    items:o.items||[], total:Number(o.total), status:o.status||"received", createdAt:o.created_at});
  const mapRes = (r)=> ({id:r.id, name:r.name, phone:r.phone, date:r.date, time:r.time,
    party:r.party, note:r.note||"", status:r.status||"confirmed", createdAt:r.created_at});
  const mapRev = (r)=> ({name:r.name, stars:Number(r.stars), text:r.text, createdAt:r.created_at});

  async function insertOrder(o){
  await req("/orders", "", {method:"POST", body:JSON.stringify({
    id:o.id, name:o.name, phone:o.phone, type:o.type, note:o.note||"",
    items:o.items, total:o.total, status:o.status||"received",
    user_id: o.userId || null,
    payment_method: o.paymentMethod || "cash",
    payment_status: o.paymentStatus || "pending"})});
}
  async function listOrders(){
    const rows = await req("/orders", "?select=*&order=created_at.desc&limit=100");
    return (rows||[]).map(mapOrder);
  }
  async function setOrderStatus(id, status){
    await req("/orders?id=eq." + encodeURIComponent(id), "", {method:"PATCH", body:JSON.stringify({status})});
  }
  async function insertReservation(r){
    await req("/reservations", "", {method:"POST", body:JSON.stringify({
      id:r.id, name:r.name, phone:r.phone, date:r.date, time:r.time,
      party:r.party, note:r.note||"", status:r.status||"confirmed"})});
  }
  async function listReservations(){
    const rows = await req("/reservations", "?select=*&order=date.asc&order=time.asc&limit=200");
    return (rows||[]).map(mapRes);
  }
  async function insertReview(r){
    await req("/reviews", "", {method:"POST", body:JSON.stringify({name:r.name, stars:r.stars, text:r.text})});
  }
  async function listReviews(){
    const rows = await req("/reviews", "?select=*&order=created_at.desc&limit=100");
    return (rows||[]).map(mapRev);
  }
  async function test(){
    await req("/orders", "?select=id&limit=1");
    return true;
  }
  function save(c){ localStorage.setItem(LS_KEY, JSON.stringify({url:c.url.trim(), key:c.key.trim()})); }
  function drop(){ localStorage.removeItem(LS_KEY); }
  function safeCfg(){ const c = cfg()||{url:"",key:""}; return {url:c.url||"", key: c.key ? "(saved)" : ""}; }

  return { isOnline, cfg: safeCfg, rawCfg: cfg, save, drop, test,
    insertOrder, listOrders, setOrderStatus, insertReservation, listReservations,
    insertReview, listReviews };
})();
