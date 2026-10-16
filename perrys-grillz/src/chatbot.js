/* Perry — PERRY'S GRILLZ chatbot. Rule-based + menu-aware + AI fallback via generateText */
window.Koko = window.PerryBot = (()=>{
  let history = [{role:"bot", text:"Hey! I'm Perry 🥥 from PERRY'S GRILLZ. Ask me about the menu, prices, veg options, hours — or type 'add grilled octopus' to order!"}];

  function findDishes(q){
    q = q.toLowerCase();
    // match by name words
    return window.MENU.filter(d=>{
      const n = d.name.toLowerCase();
      const words = q.split(/[^a-z]+/).filter(w=>w.length>2);
      if(n.includes(q.trim()) && q.trim().length>3) return true;
      let score = 0;
      for(const w of words){ if(n.includes(w)) score++; }
      return score>=1 && (score>=2 || words.some(w=>n.includes(w) && w.length>4));
    }).slice(0,3);
  }
  function money(n){ return "Rs "+Math.round(n); }

  function dishCard(d){
    return `<div style="margin-top:8px;border:1px solid #e6ddd0;border-radius:12px;overflow:hidden">
      <img class="dish" src="${d.img}" alt="${d.name}" loading="lazy"/>
      <div style="padding:8px 10px"><b>${d.name}</b><br/><span style="color:#0d5c46;font-weight:800">${money(d.price)}</span> · ${d.cat}
      <div class="m-actions"><button class="chip" data-add="${d.id}">Add to cart</button><button class="chip" data-cat="${d.cat}">More like this</button></div></div></div>`;
  }

  async function aiFallback(q){
    try{
      if(!(window.root && window.root.generateText)) return null;
      const menuList = window.MENU.map(d=>`${d.name} (${money(d.price)}, ${d.cat}${d.veg?", veg":""}${d.badge?", "+d.badge:""})`).join("\n");
      const prompt = `You are Perry, friendly grill-master bot for PERRY'S GRILLZ, Island Kitchen & Grill in Seychelles. Hours: Daily 11:00-22:00. Phone +248 252 7260. Location Les Canelles Rd, Mahe, Seychelles. All prices in Seychelles Rupees (Rs).\nMENU:\n${menuList}\n\nUser: ${q}\nAnswer in 1-3 short sentences, warm island grill vibe. Always quote prices in Rs. If they ask to order, tell them to tap Add to cart. If reservation, ask date/time/party.`;
      const r = await window.root.generateText({instruction:prompt, stopSequences:["\nUser:"]});
      return String(r).trim().slice(0,600);
    }catch(e){ return null; }
  }

  async function reply(raw){
    const q = raw.trim(); const l = q.toLowerCase();
    if(!q) return null;

    // add to cart: "add X"
    let m = l.match(/^(add|order|i want|get)\s+(.+)/);
    if(m){
      const hits = findDishes(m[2]);
      if(hits.length){
        window.Store.addToCart(hits[0].id, 1);
        renderMenuBadges?.();
        return {text:`Added <b>${hits[0].name}</b> (${money(hits[0].price)}) to your cart! 🛒 Want anything else?`, html:dishCard(hits[0]), chips:["View cart","Checkout","Popular dishes"]};
      }
    }
    if(/cart|checkout|pay|bill/.test(l)){
      const items = window.Store.cartDetailed();
      if(!items.length) return {text:"Your cart is empty — want me to suggest something popular? Try our Grill Lobster or Fish Curry.", chips:["Popular dishes","Full menu","Book a table"]};
      const lines = items.map(i=>`• ${i.qty}× ${i.dish.name} — ${money(i.total)}`).join("<br/>");
      return {text:`Your cart:<br/>${lines}<br/><b>Total ${money(window.Store.cartTotal())}</b><br/>Tap the cart (top right) to checkout!`, chips:["Popular dishes","Book a table"]};
    }
    if(/book|reserv|table|seat/.test(l)){
      const dateM = l.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})/);
      return {text:"I can hold you a terrace table! 🌅 Use the <b>Reserve</b> section below (date, time, party size) — or tell me like: <i>'table for 2 tomorrow 7pm'</i>. We confirm instantly.", chips:["Opening hours","Location","Full menu"]};
    }
    if(/hour|open|close|when/.test(l)) return {text:`We're open <b>Daily 11:00 — 22:00</b> (kitchen closes 21:30). Sunset tables go fast — book ahead! 🌴`, chips:["Book a table","Location"]};
    if(/where|location|address|direction|find/.test(l)) return {text:`You'll find us at <b>Les Canelles Rd, Mahé, Seychelles</b> — mountain-view terrace. 📍 Call <b>+248 252 7260</b>.`, chips:["Opening hours","Book a table"]};
    if(/phone|call|contact/.test(l)) return {text:`Call us at <b>${window.RESTAURANT.phone}</b> — we answer 11:00-22:00.`, chips:["Book a table"]};
    if(/veg|vegetarian|vegan/.test(l)){
      const v = window.MENU.filter(d=>d.veg);
      return {text:`Veggie picks 🌱: ${v.map(d=>`${d.name} (${money(d.price)})`).join(", ")}. My fave: Vegetable Curry!`, html:v.slice(0,2).map(dishCard).join(""), chips:["Curries","Desserts"]};
    }
    if(/popular|best|recommend|famous|chef|special/.test(l)){
      const p = window.MENU.filter(d=>d.badge==="Popular"||d.badge.includes("Popular")).concat(window.MENU.filter(d=>d.badge&&d.badge!=="Popular")).slice(0,3);
      return {text:`Island favourites right now: <b>Grill Lobster Garlic Butter, Fish Curry, Grilled Octopus</b>. Can't go wrong! 🔥`, html:p.map(dishCard).join(""), chips:["Add grilled octopus","Vegetarian","Desserts"]};
    }
    if(/dessert|sweet|cake|ice cream|flan|coconut/.test(l)){
      const ds = window.MENU.filter(d=>d.cat==="dessert");
      return {text:`Sweet endings 🍰: ${ds.map(d=>d.name).join(", ")}. Coconut Flan + Banana Flambé with rum are legendary.`, html:ds.slice(0,2).map(dishCard).join(""), chips:["Add banana flambe","Full menu"]};
    }
    if(/curry/.test(l)){
      const cs = window.MENU.filter(d=>d.cat==="curry");
      return {text:`Curries 🍛: <b>Fish Curry ${money(220)}</b> (most loved!) and <b>Vegetable Curry ${money(145)}</b>.`, html:cs.map(dishCard).join(""), chips:["Add fish curry","Vegetarian"]};
    }
    if(/salad/.test(l)){
      const s = window.MENU.filter(d=>d.cat==="salad");
      return {text:`Fresh & light 🥗: ${s.map(d=>d.name).join(", ")}.`, html:s.slice(0,2).map(dishCard).join(""), chips:["Full menu","Popular dishes"]};
    }
    if(/lobster|octopus|grill|seafood|fish|shrimp|snapper/.test(l)){
      const hits = findDishes(l);
      if(hits.length) return {text:`Found it! ${hits.map(d=>`<b>${d.name}</b> ${money(d.price)}`).join(" · ")}`, html:hits.map(dishCard).join(""), chips:["Add to cart","Popular dishes"]};
      const g = window.MENU.filter(d=>d.cat==="grill").slice(0,2);
      return {text:`From the grill 🔥: Catch of the Day, Mixed Seafood Grill, Lobster Garlic Butter...`, html:g.map(dishCard).join(""), chips:["Popular dishes","Full menu"]};
    }
    if(/price|how much|cost/.test(l)){
      const hits = findDishes(l);
      if(hits.length) return {text:hits.map(d=>`<b>${d.name}</b> is ${money(d.price)}`).join("<br/>"), html:hits.map(dishCard).join("")};
      return {text:`Starters Rs 180–315, grills Rs 220–485, curries Rs 145–365, desserts Rs 90–95, Fresh Coconut Rs 75. Full menu is just above!`, chips:["Full menu","Popular dishes"]};
    }
    if(/hi\b|hello|hey|yo\b|bonjour/.test(l)) return {text:"Hello hello! 🌺 Hungry? Ask me for <b>popular dishes</b>, <b>veg options</b>, <b>hours</b> — or just say 'add fish curry'!", chips:["Popular dishes","Vegetarian","Book a table"]};
    if(/thank|merci/.test(l)) return {text:"With pleasure! 🌊 Anything else — dessert maybe? Banana flambé is calling...", chips:["Desserts","View cart"]};
    if(/menu/.test(l)) return {text:`We have <b>20 island dishes</b>: Seafood Grill, Salads, Curries, Desserts & Fresh Coconut. Scroll the menu or try:`, chips:["Popular dishes","Vegetarian","Curries","Desserts"]};

    const hits = findDishes(l);
    if(hits.length) return {text:`Here's what I found:`, html:hits.map(dishCard).join(""), chips:["Add to cart","Popular dishes"]};

    // AI fallback
    const ai = await aiFallback(q);
    if(ai) return {text:ai, chips:["Popular dishes","Book a table","Full menu"]};
    return {text:"Hmm, I'm just a coconut-brain 🤖 — try 'popular', 'veg', 'hours', or 'add lobster'! A human at +248 252 7260 can help too.", chips:["Popular dishes","Vegetarian","Opening hours"]};
  }

  return { reply, history };
})();
