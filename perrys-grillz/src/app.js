/* Main app */
let activeCat = "all", query = "";

function money(n){ return "Rs "+Math.round(n); }
function toast(msg){ const t=document.getElementById("toastEl"); t.textContent=msg; t.style.display="block"; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display="none",2200); }

function renderCats(){
  const c = document.getElementById("pillsEl");
  c.innerHTML = window.CATS.map(k=>`<button class="pill ${k.id===activeCat?"active":""}" data-cat="${k.id}">${k.label}</button>`).join("");
  c.querySelectorAll("button").forEach(b=>b.onclick=()=>{activeCat=b.dataset.cat; renderCats(); renderMenu();});
}

function renderMenu(){
  const grid = document.getElementById("menuGridEl");
  let list = window.MENU.filter(d=> (activeCat==="all"||d.cat===activeCat) && (!query || (d.name+" "+d.desc).toLowerCase().includes(query)));
  document.getElementById("menuCountEl").textContent = list.length + " dishes";
  grid.innerHTML = list.map(d=>`
    <article class="card">
      <div class="card-img">
        <img src="${d.img}" alt="${d.name}" loading="lazy"/>
        ${d.badge?`<span class="card-badge ${d.badge==="Popular"?"pop":""}">${d.badge}</span>`:""}
        <span class="card-price">${money(d.price)}</span>
      </div>
      <div class="card-body">
        <h3>${d.name}</h3>
        <p>${d.desc}</p>
        <div class="card-tags">
          <span class="tag">${(window.CATS.find(c=>c.id===d.cat)||{}).label||d.cat}</span>
          ${d.veg?`<span class="tag">🌱 Veg</span>`:""}${d.spicy?`<span class="tag">🌶️${"🌶️".repeat(d.spicy-1)} Spicy</span>`:""}
        </div>
        <div class="card-foot">
          <button class="btn btn-primary btn-small add-btn" data-add="${d.id}">Add to cart</button>
          <button class="icon-btn" data-ask="${d.id}" title="Ask Perry about this">💬</button>
        </div>
      </div>
    </article>`).join("") || `<p class="muted">No dishes found. Try another search.</p>`;
  grid.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{ window.Store.addToCart(b.dataset.add,1); toast("Added to cart 🛒"); openDrawer(false); window.Store.renderCartCount(); renderCart(); });
  grid.querySelectorAll("[data-ask]").forEach(b=>b.onclick=()=>{
    const d = window.MENU.find(x=>x.id===b.dataset.ask);
    openChat(true); pushUser(`Tell me about ${d.name}`); botAnswer(`Tell me about ${d.name}`);
  });
}

/* Cart drawer */
function openDrawer(open=true){
  document.getElementById("drawerEl").classList.toggle("open", open);
  if(open) renderCart();
}
function renderCart(){
  const body = document.getElementById("cartBodyEl");
  const items = window.Store.cartDetailed();
  if(!items.length){ body.innerHTML = `<p class="muted">Your cart is empty.<br/>The lobster is waiting... 🦞</p>`; }
  else body.innerHTML = items.map(i=>`
    <div class="cart-item">
      <img src="${i.dish.img}" alt=""/>
      <div><b style="font-size:13px">${i.dish.name}</b><br/><span class="muted">${money(i.dish.price)} each</span>
        <div class="qty"><button data-dec="${i.id}">−</button><b>${i.qty}</b><button data-inc="${i.id}">+</button></div>
      </div>
      <b>${money(i.total)}</b>
    </div>`).join("");
  body.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{window.Store.setQty(b.dataset.inc, window.Store.cart.find(c=>c.id===b.dataset.inc).qty+1); renderCart();});
  body.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{window.Store.setQty(b.dataset.dec, window.Store.cart.find(c=>c.id===b.dataset.dec).qty-1); renderCart();});
  document.getElementById("cartTotalEl").textContent = money(window.Store.cartTotal());
}

async function checkout(){
  const items = window.Store.cartDetailed();
  if(!items.length) return toast("Cart is empty");
  const name = document.getElementById("ordNameInput").value.trim();
  const phone = document.getElementById("ordPhoneInput").value.trim();
  const type = document.getElementById("ordTypeInput").value;
  const note = document.getElementById("ordNoteInput").value.trim();
  const paymentMethod = document.getElementById("ordPayInput").value;
  if(!name || !phone) return toast("Add your name + phone to order");
  try{
    const o = await window.Store.placeOrder({name, phone, type, note, paymentMethod});
    renderCart();
    document.getElementById("ordNameInput").value=""; document.getElementById("ordPhoneInput").value="";
    openDrawer(false);
    const payMsg = paymentMethod === "cash" ? "💵 Pay with cash when you receive your order."
                 : paymentMethod === "card" ? "💳 Card payment — please pay at the counter (online card processing coming soon)."
                 : "🏦 Bank transfer — details will be shown in your profile.";
    showModal(`<h3>Order confirmed! 🎉</h3>
      <p>Thanks <b>${o.name}</b> — order <b>${o.id}</b> (${o.type})<br/>
      Total <b>${money(o.total)}</b><br/>
      <b>${payMsg}</b><br/>
      <span class="muted">Show this code at the counter or track it in My Orders.</span></p>
      <button class="btn btn-primary" onclick="closeModal()">Done</button>
      <button class="btn btn-ghost" onclick="closeModal();openOrders()">Track order</button>`);
  }catch(e){ toast(e.message); }
}

/* Reservations */
async function submitReservation(e){
  e.preventDefault();
  const r = {
    name: document.getElementById("resNameInput").value.trim(),
    phone: document.getElementById("resPhoneInput").value.trim(),
    date: document.getElementById("resDateInput").value,
    time: document.getElementById("resTimeInput").value,
    party: document.getElementById("resPartyInput").value,
    note: document.getElementById("resNoteInput").value.trim()
  };
  if(!r.name||!r.phone||!r.date||!r.time) return toast("Fill name, phone, date & time");
  try{
    const saved = await window.Store.saveReservation(r);
    toast("Table reserved! ✅ "+saved.id);
    e.target.reset();
    loadReservations();
  }catch(err){ toast("Couldn't save: " + String(err.message||err).slice(0,120)); }
}
async function loadReservations(){
  try{
    const list = await window.Store.myReservations();
    const el = document.getElementById("resListEl");
    el.innerHTML = list.length ? list.slice(-4).reverse().map(r=>`<div class="review"><b>${r.date} ${r.time} — ${r.party} guests</b><p>${r.name} · ${r.id} · ${r.status}</p></div>`).join("") : `<p class="muted">No reservations yet.</p>`;
  }catch(e){
    document.getElementById("resListEl").innerHTML = `<p class="muted">Couldn't reach the shared backend — check ⚙️ Backend.</p>`;
  }
}

/* Reviews */
async function loadReviews(){
  try{
    const revs = await window.Store.getReviews();
    const el = document.getElementById("reviewsEl");
    el.innerHTML = revs.slice(0,6).map(r=>`<div class="review"><b>${"★".repeat(r.stars)} ${r.name}</b><p>${r.text}</p></div>`).join("");
  }catch(e){
    document.getElementById("reviewsEl").innerHTML = `<p class="muted">Couldn't reach the shared backend — check ⚙️ Backend.</p>`;
  }
}
async function submitReview(e){
  e.preventDefault();
  const r = { name: document.getElementById("revNameInput").value.trim()||"Guest", stars: parseInt(document.getElementById("revStarsInput").value), text: document.getElementById("revTextInput").value.trim() };
  if(!r.text) return toast("Write a few words first");
  try{
    await window.Store.addReview(r);
    e.target.reset(); loadReviews(); toast("Thanks for the review! ⭐");
  }catch(err){ toast("Couldn't save: " + String(err.message||err).slice(0,120)); }
}

/* Modal helpers */
function showModal(html){ document.getElementById("modalBoxEl").innerHTML = html; document.getElementById("modalEl").classList.add("open"); }
function closeModal(){ document.getElementById("modalEl").classList.remove("open"); clearInterval(ordersTimer); }
/* Orders board: shared across devices when Supabase is connected */
let ordersTimer = null;
const NEXT_STATUS = {received:"preparing", preparing:"ready", ready:"done", done:"done"};
async function openOrders(){
  clearInterval(ordersTimer);
  const shared = window.Backend && window.Backend.isOnline();
  async function paint(){
    let body = `<p class="muted">Loading…</p>`;
    try{
      const orders = await window.Store.myOrders();
      body = orders.length ? orders.slice(0,20).map(o=>`
        <div class="review"><b>${o.id} — ${money(o.total)} · ${o.status}</b>
        <p>${o.items.map(i=>i.qty+"× "+i.name).join(", ")}<br/>
        <span class="muted">${new Date(o.createdAt).toLocaleString()} · ${o.type} · ${o.name} · ${o.phone}</span></p>
        ${shared && o.status!=="done" ? `<button class="btn btn-primary btn-small" onclick="advanceOrder('${o.id}','${o.status}')">Mark ${NEXT_STATUS[o.status]||"done"} ➜</button>`:""}
        </div>`).join("")
        : `<p class="muted">${shared?"No orders yet — new orders from any device appear here.":"No orders on this device yet."}</p>`;
    }catch(e){ body = `<p class="muted">Couldn't load orders: ${String(e.message||e).slice(0,140)}</p>`; }
    const el = document.getElementById("ordersListEl");
    if(el) el.innerHTML = body;
  }
  showModal(`<h3>${shared?"📋 Live Orders Board (shared)":"My Orders"}</h3>
    <p class="muted">${shared?"Auto-refreshes every 10s · visible on all connected devices.":"Connect Supabase in ⚙️ Backend to share orders across devices."}</p>
    <div id="ordersListEl"></div><br/>
    <button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
  await paint();
  if(shared) ordersTimer = setInterval(()=>{ if(document.getElementById("ordersListEl")) paint(); else clearInterval(ordersTimer); }, 10000);
}
async function advanceOrder(id, status){
  await window.Store.setOrderStatus(id, NEXT_STATUS[status]||"done");
  toast("Order updated ✅");
  if(document.getElementById("ordersListEl")) openOrdersRefresh();
}
async function openOrdersRefresh(){
  try{
    const orders = await window.Store.myOrders();
    const el = document.getElementById("ordersListEl");
    if(el) el.innerHTML = orders.slice(0,20).map(o=>`
      <div class="review"><b>${o.id} — ${money(o.total)} · ${o.status}</b>
      <p>${o.items.map(i=>i.qty+"× "+i.name).join(", ")}<br/>
      <span class="muted">${new Date(o.createdAt).toLocaleString()} · ${o.type} · ${o.name} · ${o.phone}</span></p>
      ${o.status!=="done" ? `<button class="btn btn-primary btn-small" onclick="advanceOrder('${o.id}','${o.status}')">Mark ${NEXT_STATUS[o.status]||"done"} ➜</button>`:""}
      </div>`).join("");
  }catch(e){ toast("Refresh failed"); }
}
window.openOrders = openOrders; window.closeModal = closeModal; window.advanceOrder = advanceOrder;

/* Shared backend setup */
function updateBackendPill(){
  const el = document.getElementById("backendPill");
  if(el){
    const shared = window.Backend && window.Backend.isOnline();
    el.textContent = shared ? "🟢 Shared" : "🟡 Local";
    el.title = shared ? "Supabase connected — orders sync across devices" : "Local mode — connect Supabase to share";
  }
}
function openBackend(){
  const c = (window.Backend.rawCfg && window.Backend.rawCfg()) || {url:"", key:""};
  showModal(`<h3>⚙️ Shared Backend (Supabase)</h3>
    <p class="muted">Status: <b>${window.Backend.isOnline()?"🟢 Shared — orders, bookings & reviews sync across all devices":"🟡 Local — this device only"}</b></p>
    <p class="muted">Setup (once): 1) free project at <b>supabase.com</b> → 2) paste & run <b>src/supabase-schema.sql</b> in its SQL editor (this locks the database with RLS security) → 3) paste Project URL + <b>anon</b> key below on each device.</p>
    <div class="form">
      <div><label>Supabase URL</label><input id="sbUrlInput" placeholder="https://xyz.supabase.co" value="${(c.url||"").replace(/"/g,"&quot;")}"/></div>
      <div><label>anon public key ${c.key?"(saved ✅ — paste again to replace)":""}</label><input id="sbKeyInput" placeholder="eyJ..." /></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-small" onclick="saveBackend()">Connect</button><button class="btn btn-ghost btn-small" onclick="testBackend()">Test</button><button class="btn btn-ghost btn-small" onclick="dropBackend()">Disconnect</button></div>
      <p class="muted" id="sbMsgEl"></p>
    </div><br/><button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}
async function saveBackend(){
  const url = document.getElementById("sbUrlInput").value.trim();
  const key = document.getElementById("sbKeyInput").value.trim();
  const msg = document.getElementById("sbMsgEl");
  const old = (window.Backend.rawCfg && window.Backend.rawCfg()) || {};
  if(!url || (!key && !old.key)){ msg.textContent = "Paste both the URL and the anon key."; return; }
  window.Backend.save({url, key: key || old.key});
  msg.textContent = "Saved — testing…";
  try{ await window.Backend.test(); msg.textContent = "✅ Connected! Orders are now shared."; }
  catch(e){ msg.textContent = "⚠️ Saved but test failed: " + e.message; }
  updateBackendPill(); loadReservations(); loadReviews();
}
async function testBackend(){
  const msg = document.getElementById("sbMsgEl");
  try{ await window.Backend.test(); msg.textContent = "✅ Connection works!"; }
  catch(e){ msg.textContent = "❌ " + e.message; }
}
function dropBackend(){
  window.Backend.drop();
  document.getElementById("sbMsgEl").textContent = "Disconnected — back to local mode.";
  updateBackendPill(); loadReservations(); loadReviews();
}
window.openBackend = openBackend; window.saveBackend = saveBackend; window.testBackend = testBackend; window.dropBackend = dropBackend;

/* Chat UI */
function openChat(open=true){ document.getElementById("chatWinEl").classList.toggle("open",open); if(open){document.getElementById("chatFabPing").style.display="none"; setTimeout(()=>document.getElementById("chatTextInput").focus(),100);} }
function pushUser(t){ const b=document.getElementById("chatBodyEl"); b.insertAdjacentHTML("beforeend",`<div class="msg user">${t.replace(/</g,"&lt;")}</div>`); b.scrollTop=b.scrollHeight; }
function pushBot(html, chips=[]){
  const b=document.getElementById("chatBodyEl");
  b.insertAdjacentHTML("beforeend",`<div class="msg bot">${html}${chips.length?`<div class="m-actions">${chips.map(c=>`<button class="chip" data-q="${c.replace(/"/g,"&quot;")}">${c}</button>`).join("")}</div>`:""}</div>`);
  b.scrollTop=b.scrollHeight;
  b.querySelectorAll("[data-q]").forEach(x=>x.onclick=()=>{pushUser(x.dataset.q); botAnswer(x.dataset.q);});
  b.querySelectorAll("[data-add]").forEach(x=>x.onclick=()=>{window.Store.addToCart(x.dataset.add,1); toast("Added to cart 🛒"); renderCart(); pushBot(`Added! Anything else?`,["View cart","Popular dishes"]);});
  b.querySelectorAll("[data-cat]").forEach(x=>x.onclick=()=>{activeCat=x.dataset.cat; renderCats(); renderMenu(); document.getElementById("menuSec").scrollIntoView({behavior:"smooth"});});
}
async function botAnswer(q){
  const b=document.getElementById("chatBodyEl");
  const ty = document.createElement("div"); ty.className="msg bot"; ty.innerHTML=`<span class="typing"><i></i><i></i><i></i></span>`;
  b.appendChild(ty); b.scrollTop=b.scrollHeight;
  window.Koko.history.push({role:"user",text:q});
  let res=null;
  try{ res = await window.Koko.reply(q); }catch(e){ res={text:"Oops, hiccup! Try again."}; }
  ty.remove();
  if(res){ window.Koko.history.push({role:"bot",text:res.text}); pushBot(res.text+(res.html||""), res.chips||[]); }
}
function sendChat(){
  const inp = document.getElementById("chatTextInput");
  const v = inp.value.trim(); if(!v) return;
  inp.value=""; pushUser(v); botAnswer(v);
}

/* Hero slideshow — every 2s */
let heroIdx = 0, heroTimer = null;
function heroShow(n){
  const slides = [...document.querySelectorAll(".hero-slide")];
  if(!slides.length) return;
  heroIdx = (n + slides.length) % slides.length;
  slides.forEach((s,i)=>s.classList.toggle("active", i===heroIdx));
  document.querySelectorAll(".hero-dot").forEach((d,i)=>d.classList.toggle("active", i===heroIdx));
}
function heroStart(){
  const slides = [...document.querySelectorAll(".hero-slide")];
  const dots = document.getElementById("heroDotsEl");
  if(dots && !dots.dataset.built){
    dots.dataset.built = "1";
    slides.forEach((_,i)=>{
      const b=document.createElement("button");
      b.className="hero-dot"+(i===0?" active":"");
      b.setAttribute("aria-label","Show slide "+(i+1));
      b.onclick=()=>{heroShow(i); heroRestart();};
      dots.appendChild(b);
    });
  }
  heroRestart();
}
function heroRestart(){
  clearInterval(heroTimer);
  heroTimer = setInterval(()=>{ if(!document.hidden) heroShow(heroIdx+1); }, 2000);
}

/* boot */
function boot(){
  renderCats(); renderMenu();
  heroStart();
  updateBackendPill();
  window.Store.renderCartCount();
  document.getElementById("searchInput").addEventListener("input", e=>{query=e.target.value.toLowerCase(); renderMenu();});
  document.getElementById("resFormEl").addEventListener("submit", submitReservation);
  document.getElementById("revFormEl").addEventListener("submit", submitReview);
  document.getElementById("checkoutBtn").onclick = checkout;
  document.getElementById("chatSendBtn").onclick = sendChat;
  document.getElementById("chatTextInput").addEventListener("keydown", e=>{if(e.key==="Enter")sendChat();});
  document.querySelectorAll(".chat-quick .chip").forEach(c=>c.onclick=()=>{pushUser(c.dataset.q); botAnswer(c.dataset.q);});
  // set min date today
  const d=document.getElementById("resDateInput"); if(d) d.min=new Date().toISOString().slice(0,10);
  loadReservations(); loadReviews();
  // render initial bot message
  if(!document.getElementById("chatBodyEl").dataset.booted){
    document.getElementById("chatBodyEl").dataset.booted="1";
    pushBot(window.Koko.history[0].text, ["Popular dishes","Vegetarian","Book a table","Opening hours"]);
  }
    renderAuthButton();
  window.Auth.onChange(()=> renderAuthButton());
  window.Auth.restore();
}
/* ===== AUTH & PROFILE ===== */
function openAuth(){
  const box = document.getElementById("authModalBoxEl");
  const signedIn = window.Auth.isSignedIn();
  if(signedIn){
    const u = window.Auth.getUser();
    const p = window.Auth.getProfile() || {};
    box.innerHTML = `
      <h3>👤 My Profile</h3>
      <p class="muted">${u.email}</p>
      <div class="form">
        <div><label>Full name</label><input id="profNameInput" value="${(p.full_name||'').replace(/"/g,'&quot;')}"/></div>
        <div><label>Phone</label><input id="profPhoneInput" value="${(p.phone||'').replace(/"/g,'&quot;')}"/></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-small" onclick="saveProfile()">Save</button>
          <button class="btn btn-ghost btn-small" onclick="viewMyHistory()">My Orders</button>
          <button class="btn btn-ghost btn-small" onclick="doSignOut()">Sign out</button>
        </div>
      </div>
    `;
    document.getElementById("authModalEl").classList.add("open");
  } else {
    box.innerHTML = `
      <h3>👤 Sign in / Create account</h3>
      <p class="muted">Save your info, track orders, and speed up checkout.</p>
      <div class="form">
        <div><label>Email</label><input id="authEmailInput" type="email" placeholder="you@example.com"/></div>
        <div><label>Password</label><input id="authPassInput" type="password" placeholder="min 6 characters"/></div>
        <div id="authNameRow"><label>Full name (for new accounts)</label><input id="authNameInput" placeholder="Your name"/></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-small" onclick="doSignIn()">Sign in</button>
          <button class="btn btn-ghost btn-small" onclick="doSignUp()">Create account</button>
        </div>
        <p class="muted" id="authMsgEl"></p>
      </div>
      <br/><button class="btn btn-ghost" onclick="document.getElementById('authModalEl').classList.remove('open')">Close</button>
    `;
    document.getElementById("authModalEl").classList.add("open");
  }
}
window.openAuth = openAuth;

async function doSignIn(){
  const email = document.getElementById("authEmailInput").value.trim();
  const password = document.getElementById("authPassInput").value;
  const msg = document.getElementById("authMsgEl");
  if(!email || !password) return msg.textContent = "Enter email and password";
  msg.textContent = "Signing in…";
  try{
    await window.Auth.signIn(email, password);
    msg.textContent = "✅ Signed in!";
    setTimeout(()=>{ document.getElementById("authModalEl").classList.remove("open"); renderAuthButton(); }, 500);
  }catch(e){ msg.textContent = "❌ " + e.message; }
}
window.doSignIn = doSignIn;

async function doSignUp(){
  const email = document.getElementById("authEmailInput").value.trim();
  const password = document.getElementById("authPassInput").value;
  const name = document.getElementById("authNameInput").value.trim();
  const msg = document.getElementById("authMsgEl");
  if(!email || !password) return msg.textContent = "Enter email and password";
  if(password.length < 6) return msg.textContent = "Password must be at least 6 characters";
  msg.textContent = "Creating account…";
  try{
    const r = await window.Auth.signUp(email, password, name);
    if(r && r.pendingConfirmation){
      msg.textContent = "📩 Check your email to confirm your account!";
    } else {
      msg.textContent = "✅ Account created!";
      setTimeout(()=>{ document.getElementById("authModalEl").classList.remove("open"); renderAuthButton(); }, 500);
    }
  }catch(e){ msg.textContent = "❌ " + e.message; }
}
window.doSignUp = doSignUp;

async function doSignOut(){
  await window.Auth.signOut();
  document.getElementById("authModalEl").classList.remove("open");
  renderAuthButton();
  toast("Signed out 👋");
}
window.doSignOut = doSignOut;

async function saveProfile(){
  const full_name = document.getElementById("profNameInput").value.trim();
  const phone = document.getElementById("profPhoneInput").value.trim();
  try{
    await window.Auth.updateProfile({ full_name, phone });
    toast("Profile saved ✅");
  }catch(e){ toast(e.message); }
}
window.saveProfile = saveProfile;

// 👇 Put your developer email here. Only this email sees backend controls.
const ADMIN_EMAIL = "olayunus11@gmail.com"; // ← CHANGE THIS TO YOUR REAL EMAIL

function renderAuthButton(){
  const btn = document.getElementById("authBtn");
  if(!btn) return;
  const u = window.Auth.getUser();
  if(u){
    const p = window.Auth.getProfile() || {};
    const name = p.full_name || u.email.split("@")[0];
    btn.textContent = "👤 " + name;
  } else {
    btn.textContent = "👤 Sign in";
  }

  // Show backend controls ONLY for the admin
  const isAdmin = u && u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const pill = document.getElementById("backendPill");
  const backendBtn = document.getElementById("backendBtnEl");
  if(pill) pill.style.display = isAdmin ? "" : "none";
  if(backendBtn) backendBtn.style.display = isAdmin ? "" : "none";

  // Prefill checkout inputs if signed in
  if(u){
    const p = window.Auth.getProfile() || {};
    const nameInput = document.getElementById("ordNameInput");
    const phoneInput = document.getElementById("ordPhoneInput");
    if(nameInput && !nameInput.value) nameInput.value = p.full_name || "";
    if(phoneInput && !phoneInput.value) phoneInput.value = p.phone || "";
  }
}

async function viewMyHistory(){
  const u = window.Auth.getUser();
  if(!u) return toast("Sign in first");
  document.getElementById("authModalEl").classList.remove("open");
  try{
    const orders = await window.Store.myOrders();
    const mine = orders.filter(o => o.userId === u.id || o.user_id === u.id);
    showModal(`<h3>🧾 My Order History</h3>
      ${mine.length ? mine.slice(0,20).map(o=>`
        <div class="review"><b>${o.id} — ${money(o.total)} · ${o.status}</b>
        <p>${o.items.map(i=>i.qty+"× "+i.name).join(", ")}<br/>
        <span class="muted">${new Date(o.createdAt).toLocaleString()} · ${o.type} · paid via ${o.paymentMethod||o.payment_method||'cash'}</span></p>
        </div>`).join("") : `<p class="muted">No orders yet.</p>`}
      <br/><button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
  }catch(e){ toast("Couldn't load history"); }
}
window.viewMyHistory = viewMyHistory;
if(document.readyState !== "loading") boot();
else window.addEventListener("DOMContentLoaded", boot);
function renderMenuBadges(){}
