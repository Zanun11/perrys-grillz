/* Store: cart (localStorage) + backend (Supabase shared when configured, else kv-plugin, else localStorage) */
window.Store = (()=>{
  const cartKey = "perrysgrillz_cart_v1";
  let cart = [];
  try{ cart = JSON.parse(localStorage.getItem(cartKey)||"[]"); }catch{ cart=[]; }

  function saveCart(){ localStorage.setItem(cartKey, JSON.stringify(cart)); renderCartCount(); }
  function addToCart(id, qty=1){
    const dish = window.MENU.find(m=>m.id===id); if(!dish) return;
    const line = cart.find(c=>c.id===id);
    if(line) line.qty += qty; else cart.push({id, qty});
    saveCart();
  }
  function setQty(id, qty){
    if(qty<=0) cart = cart.filter(c=>c.id!==id);
    else { const l=cart.find(c=>c.id===id); if(l) l.qty=qty; }
    saveCart();
  }
  function clearCart(){ cart=[]; saveCart(); }
  function cartDetailed(){
    return cart.map(c=>{
      const d = window.MENU.find(m=>m.id===c.id);
      return {...c, dish:d, total: d? d.price*c.qty : 0};
    }).filter(c=>c.dish);
  }
  function cartTotal(){ return cartDetailed().reduce((s,c)=>s+c.total,0); }
  function renderCartCount(){
    const el = document.getElementById("cartCountEl");
    if(el){ const n = cart.reduce((s,c)=>s+c.qty,0); el.textContent=n; el.style.display=n?"grid":"none"; }
  }

  const online = ()=> !!(window.Backend && window.Backend.isOnline());
  function backend(){ return online() ? "shared" : "local"; }

  const kv = ()=> (window.root && window.root.kv) ? window.root.kv : null;
  async function kvFolder(name){
    const k = kv(); if(!k) return null;
    return k[name];
  }
  const lsGet = (k, fb)=> { try{ return JSON.parse(localStorage.getItem(k)||"null") ?? fb; }catch{ return fb; } };
  const lsSet = (k, v)=> localStorage.setItem(k, JSON.stringify(v));
  
  async function placeOrder({name, phone, type, note, paymentMethod}){
  const items = cartDetailed();
  if(!items.length) throw new Error("Cart is empty");
  const user = window.Auth && window.Auth.getUser ? window.Auth.getUser() : null;
  const order = {
    id: "ORD-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*90+10),
    name, phone, type, note: note||"",
    paymentMethod: paymentMethod || "cash",
    paymentStatus: "pending",
    userId: user ? user.id : null,
    items: items.map(i=>({id:i.id, name:i.dish.name, price:i.dish.price, qty:i.qty})),
    total: Math.round(cartTotal()*100)/100,
    status: "received",
    createdAt: new Date().toISOString()
  };
  if(online()) await window.Backend.insertOrder(order);
  else {
    const folder = await kvFolder("orders");
    if(folder) await folder.set(order.id, order);
    else { const arr=lsGet("perrysgrillz_orders",[]); arr.unshift(order); lsSet("perrysgrillz_orders",arr); }
  }
  clearCart();
  return order;
}

  async function myOrders(){
    if(online()) return window.Backend.listOrders();
    const folder = await kvFolder("orders");
    if(folder){ const e = await folder.entries(); return e.map(x=>x[1]).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)); }
    return lsGet("perrysgrillz_orders",[]);
  }

  async function setOrderStatus(id, status){
    if(online()){ await window.Backend.setOrderStatus(id, status); return; }
    const folder = await kvFolder("orders");
    if(folder){ await folder.update(id, o=>{ o.status=status; return o; }); return; }
    const arr = lsGet("perrysgrillz_orders",[]);
    const o = arr.find(x=>x.id===id); if(o){ o.status=status; lsSet("perrysgrillz_orders",arr); }
  }

  async function saveReservation(r){
    r.id = "TBL-" + Date.now().toString(36).toUpperCase();
    r.createdAt = new Date().toISOString();
    r.status="confirmed";
    if(online()) await window.Backend.insertReservation(r);
    else {
      const folder = await kvFolder("reservations");
      if(folder) await folder.set(r.id, r);
      else { const arr=lsGet("perrysgrillz_res",[]); arr.unshift(r); lsSet("perrysgrillz_res",arr); }
    }
    return r;
  }
  async function myReservations(){
    if(online()) return window.Backend.listReservations();
    const folder = await kvFolder("reservations");
    if(folder){ const e=await folder.entries(); return e.map(x=>x[1]).sort((a,b)=>String(a.date).localeCompare(String(b.date))); }
    return lsGet("perrysgrillz_res",[]);
  }

  const seedReviews = [
    {name:"Marie L.", stars:5, text:"Best grilled octopus on the island! View is insane at sunset.", createdAt:"2026-09-12"},
    {name:"James K.", stars:5, text:"Lobster garlic butter + fresh coconut = perfect dinner. Perry bot helped us order.", createdAt:"2026-09-20"},
    {name:"Aisha D.", stars:4, text:"Fish curry is a must. Banana flambé with rum is dangerous (in a good way).", createdAt:"2026-10-02"},
  ];
  async function getReviews(){
    if(online()) return window.Backend.listReviews();
    const folder = await kvFolder("reviews");
    if(folder){
      const e = await folder.entries();
      if(!e.length){ for(const r of seedReviews) await folder.set("seed-"+r.name, r); return seedReviews; }
      return e.map(x=>x[1]).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
    }
    const local = lsGet("perrysgrillz_rev", null);
    if(!local){ lsSet("perrysgrillz_rev", seedReviews); return seedReviews; }
    return local;
  }
  async function addReview(r){
    r.createdAt = new Date().toISOString();
    if(online()){ await window.Backend.insertReview(r); return r; }
    const folder = await kvFolder("reviews");
    if(folder) await folder.set("r"+Date.now(), r);
    else { const arr=lsGet("perrysgrillz_rev",[]); arr.unshift(r); lsSet("perrysgrillz_rev",arr); }
    return r;
  }

  return { addToCart, setQty, clearCart, cartDetailed, cartTotal, renderCartCount,
    placeOrder, myOrders, setOrderStatus, saveReservation, myReservations,
    getReviews, addReview, backend, get cart(){return cart;} };
})();
