/* Liquid · Loja: pacotes de skins → desbloqueado → escolher personagem → Home com skin; baralhos; recompensa;
   diamantes (moeda da Loja, só cosmético: é o único pagamento dentro do app · Figma Loja › 6 · Diamantes D01–D07) */
'use strict';
const LOJA = {cat: 'skins'};
const PRICE = 70; // pacote de skins em diamantes (proposta guardada · Figma Loja › 6; a Loja de hoje é em R$, como na produção)
const diaN = n => n.toLocaleString('pt-BR');
const diaPrice = (n, cls = '') => `${ic('diamond', 'dia ' + cls)}${diaN(n)}`;
// saldo de diamantes no topo da Loja (_Diamantes/saldo): o + abre a página Diamantes
const diaPill = () => `<button class="cpill dpill" data-a="diamantes" aria-label="Diamantes · comprar">${ic('diamond')}<span class="t"><small>Diamantes</small><b>${diaN(ST.diamonds)}</b></span><span class="plus">${svg('i-plus')}</span></button>`;
const packActive = id => hasSkin() && packOf(ST.crew) === id;

/* ---------- Loja como na produção (Figma Loja › 7 · LJ01–LJ03): pacotes a R$ 9,90, só as famílias da página Skins ---------- */
const PACK_PRICE = 9.9;
const FREE_PACK = 'nobru'; // pacote grátis (já é seu e vem ativo)
const LOJA_HERO = 'portaria'; // card do topo
const LOJA_GRID = ['nobru', 'magia', 'assalto', 'live', 'feira', 'navalha', 'varzea', 'oficina', 'posto', 'fliper', 'grau', 'palpite', 'laje'];
const inLoja = id => id === LOJA_HERO || LOJA_GRID.includes(id);
const packPrice = id => id === FREE_PACK ? 0 : PACK_PRICE;
/* promoção (Figma Loja › 8 · tags do DS ☰ Type=Super promoção / Promoção): o destaque vira o card especial (−x%, contador, preço riscado)
   e o grid mostra a tag + o selo com o preço riscado · sup = Super promoção (−x% no degradê da estrela) · sem sup = tag "Promoção" */
const PROMO = {}; // Loja por classe (Figma Loja › 9): a promoção (portaria e magia −15%) fica guardada · para voltar: {portaria: {pct: 15, sup: true}}
const PROMO_END = Date.now() + 24 * 36e5 - 48e3; // protótipo: a promoção termina 24 h depois de abrir o app
const promoOf = id => (PROMO[id] && !ST.owned[id] && packPrice(id)) ? PROMO[id] : null;
const priceNow = id => { const pr = promoOf(id), v = packPrice(id); return pr ? Math.round(Math.round(v * 100) * (100 - pr.pct) / 100) / 100 : v; };
const promoTag = id => PROMO[id].sup ? `<span class="tag promo sup">${ic('fire')}−${PROMO[id].pct}%</span>` : '<span class="tag promo">Promoção</span>';
const cdText = () => { const t = Math.max(0, Math.floor((PROMO_END - Date.now()) / 1000)), p = n => String(n).padStart(2, '0'); return `Termina em ${p(Math.floor(t / 3600))}:${p(Math.floor(t % 3600 / 60))}:${p(t % 60)}`; };
const timerPill = (cls = '') => `<span class="tpill ${cls}">${ic('timer')}<b data-cd>${cdText()}</b></span>`;
const oldPrice = v => `<s class="old">${fmt2(v)}</s>`;
setInterval(() => $$('[data-cd]').forEach(el => { el.textContent = cdText(); }), 1000);

function packCardL(id, mode = 'loja') {
  const p = PACKS[id], act = packActive(id), own = ST.owned[id], pr = promoOf(id);
  const tg = act ? tag('Ativo', 'success') : own ? tag('Seu', 'success') : pr ? promoTag(id) + timerPill() : mode === 'page' ? tag('Pacote de skins', 'danger') : tag('Em destaque', 'danger');
  const cta = btn(act ? 'Trocar personagem' : own ? 'Escolher personagem' : `Comprar · ${fmt2(priceNow(id))}`, 'pri', 's', `data-a="packAct:${id}"`);
  return `<div class="spk L${pr ? ' promo' : ''}" role="button" tabindex="0" data-pack="${id}" style="background-image:url(${A}art/${p.artL}.webp);background-position:${p.posL}">
    <span class="top">${tg}</span>
    <span class="info"><span class="tx"><b>${p.name}</b><small>${p.caption}</small></span>${pr ? `<span class="pcol">${oldPrice(packPrice(id))}${cta}</span>` : cta}</span></div>`;
}
function packCardS(id) {
  const p = PACKS[id], act = packActive(id), own = ST.owned[id], pr = promoOf(id), v = packPrice(id);
  // Magia do bar e Reis do baralho mostram o Rei e a Rainha lado a lado (como no Figma)
  const bg = p.duo ? `background-image:url(${A}art/${p.artS}.webp),url(${A}art/${p.artL}.webp);background-size:50% auto,50% auto;background-position:left 12%,right 12%;background-repeat:no-repeat` : `background-image:url(${A}art/${p.artS}.webp);background-position:${p.posS}`;
  const tg = act ? tag('Ativo', 'success') : own ? tag('Seu', 'success') : pr ? promoTag(id) : tag('Novo', 'danger');
  const price = own ? (v ? '' : '<span class="price">Grátis</span>') : pr ? `<span class="price promo">${oldPrice(v)}<b>${fmt2(priceNow(id))}</b></span>` : `<span class="price">${v ? fmt2(v) : 'Grátis'}</span>`;
  return `<div role="button" tabindex="0" class="spk S" data-pack="${id}"><span class="art" style="${bg}">${tg}${price}</span>
    <span class="tx"><b>${p.name}</b><small>${p.skins} skin${p.skins > 1 ? 's' : ''}</small></span></div>`;
}
const soonCard = (n, k) => `<div class="spk S blocked t${k}" aria-label="${n} · em breve"><span class="art">${tag('Em breve')}${ic('lock', 'lock')}</span><span class="tx"><b>Em breve</b><small>Novos personagens</small></span></div>`;
/* ---------- Loja por classe (Figma Loja › 9 · CL01–CL08 / DCL01–DCL08) ----------
   cada família vem em 3 classes (Comum · Rara · Mística; 4 com a Lendária) · a compra vale para a família toda (Ele + Ela)
   já tem uma classe? subir paga só a diferença · o pacote grátis já vem com a Comum */
const LENDARIA = ['assalto']; // famílias com a 4ª classe
const nCls = id => LENDARIA.includes(id) ? 4 : 3;
const famName = id => PACKS[id].family || PACKS[id].name;
const famOn = id => id !== 'estelar' && (inLoja(id) || id === FREE_PACK);
const ownLvl = id => ST.cls[id] != null ? ST.cls[id] : (id === FREE_PACK || ST.owned[id]) ? 0 : -1;
const clsPrice = (id, l) => { const o = ownLvl(id); return o >= 0 ? +(CLS[l].p - CLS[o].p).toFixed(2) : CLS[l].p; };
const clsTag = (l, t) => `<span class="tag cls ${CLS[l].k}">${t || CLS[l].n}</span>`;
const maisEscolhida = () => `<span class="tag destaque">${ic('fire')}Mais escolhida</span>`;
// o que vem em cada classe (tiles · action-tile ◇ Glass) · min = 1ª classe que libera · v = valor por classe
const BEN = [
  {i: 'user', n: 'Skins', v: () => 'Ele e Ela', min: 0}, {i: 'truco', n: 'Chamada', v: () => 'no Truco', min: 0}, {i: 'cacheta', n: 'Baralho', v: () => 'da família', min: 0},
  {i: 'fire', n: 'Efeitos', v: () => 'mesa e baralho', min: 1}, {i: 'board', n: 'Mesas', v: () => 'Truco e Poker', min: 1}, {i: 'sinuca', n: 'Taco', v: () => 'da sinuca', min: 1},
  {i: 'star', n: 'XP 2x', full: 'XP em dobro', v: k => k >= 2 ? '7 dias' : '2 dias', min: 1, val: true}, {i: 'timebank', n: 'Timebank', v: k => k >= 2 ? '10 dias' : '2 dias', min: 1, val: true},
  {i: 'microphone', n: 'Voz', v: () => 'do personagem', min: 2}, {i: 'chat', n: 'Emojis', v: () => 'da família', min: 2}, {i: 'bolt', n: 'Sinuca', v: () => 'efeitos na mesa', min: 3}
];
const benOf = id => BEN.filter(b => b.min < nCls(id));
const ovSub = (id, l) => {
  const n = nCls(id); if (l >= n - 1) return n === 4 ? 'Tudo aceso + efeitos na mesa de sinuca' : 'Tudo aceso · a classe mais completa';
  const up = CLS.slice(l + 1, n).map(c => c.n); return `Acende o que é seu · o resto vem ${up.length > 2 ? 'nas classes acima' : 'na ' + up.join(' e na ')}`;
};
// destaques da Loja em carrossel (3, rola para o lado, estilo Netflix) · lvl abre a família direto naquela classe
const LOJA_CAR = [
  {id: 'portaria', tag: 'Em destaque'},
  {id: 'magia', lvl: 2, tag: 'Mística chegou', cap: 'Rei e Rainha do bar com o poder do giz'},
  {id: 'live', tag: 'Novo'}
];
function carCard(c) {
  const p = PACKS[c.id], r = p.roles[0], lv = c.lvl, tier = lv != null && TIER_ART[r] > lv;
  const bg = tier ? `background-image:url(${stagePoster(r, 'ele', lv)});background-position:center 18%` : `background-image:url(${A}art/${p.artL}.webp);background-position:${p.posL}`;
  const tg = packActive(c.id) ? tag('Ativo', 'success') : lv != null ? clsTag(lv, c.tag) : tag(c.tag, 'danger');
  const cta = btn(lv != null ? `Ver ${CLS[lv].n}` : 'Ver classes', 'pri', 's', `data-a="famOpen:${c.id}${lv != null ? ':' + lv : ''}"`);
  return `<div class="spk L carc" role="button" tabindex="0" data-fam="${c.id}${lv != null ? ':' + lv : ''}" style="${bg}">
    <span class="top">${tg}</span><span class="info"><span class="tx"><b>${famName(c.id)}</b><small>${c.cap || `${nCls(c.id)} classes · a partir de ${fmt2(CLS[0].p)}`}</small></span>${cta}</span></div>`;
}
function famCardS(id) {
  const p = PACKS[id], act = packActive(id), o = ownLvl(id), n = nCls(id), free = id === FREE_PACK && ST.cls[id] == null;
  const bg = p.duo ? `background-image:url(${A}art/${p.artS}.webp),url(${A}art/${p.artL}.webp);background-size:50% auto,50% auto;background-position:left 12%,right 12%;background-repeat:no-repeat` : `background-image:url(${A}art/${p.artS}.webp);background-position:${p.posS}`;
  const tg = act ? tag('Ativo', 'success') : o >= 0 ? tag('Seu', 'success') : tag('Novo', 'danger');
  const price = free ? '<span class="price">Grátis</span>' : o >= 0 ? `<span class="price cls ${CLS[o].k}">${CLS[o].n}</span>` : `<span class="price">${fmt2(CLS[0].p)}</span>`;
  return `<div role="button" tabindex="0" class="spk S" data-fam="${id}"><span class="art" style="${bg}">${tg}${price}</span>
    <span class="tx"><b>${famName(id)}</b><small>${free ? `Comum grátis · ${n} classes` : n === 4 ? '4 classes · com a Lendária' : `${n} classes`}</small></span></div>`;
}
const LOJA_CATS = [['skins', 'user', 'Skins'], ['baralhos', 'truco', 'Baralhos'], ['molduras', 'crown', 'Molduras'], ['efeitos', 'fire', 'Efeitos'], ['ofertas', 'gift', 'Ofertas']];
SCREENS.loja = {cls: 'loja', render: () => {
  const cats = `<div class="hscroll chips">${LOJA_CATS.map(([k, i, l]) => `<button class="chip ${LOJA.cat === k ? 'on' : ''}" data-cat="${k}">${ic(i)}${l}</button>`).join('')}</div>`;
  let body;
  if (LOJA.cat === 'baralhos') {
    body = `<div class="packs">${stitle('Baralhos', 'Ative o verso que quiser · vale em todos os jogos')}
      <div class="decks">${DECKS.map(([k, l]) => `<div role="button" tabindex="0" class="deckc ${ST.deck === k ? 'on' : ''}" data-deck="${k}"><span class="dk">${deckBack(k, 'L')}</span><b>${l}</b>${ST.deck === k ? tag('Ativo', 'success') : tag('Seu', 'neutral')}</div>`).join('')}</div></div>`;
  } else {
    // destaques em carrossel · famílias da página Skins (nome da família no card) · Em breve
    body = `<div class="carw"><div class="hscroll car" id="lojaCar">${LOJA_CAR.filter(c => PACKS[c.id]).map(carCard).join('')}</div><div class="dots">${LOJA_CAR.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div></div>
      <div class="packs">${stitle('Pacotes de skins', 'Cada família em 3 classes: Comum, Rara e Mística')}
        <div class="pgrid">${LOJA_GRID.map(famCardS).join('')}${[0, 1, 2].map(k => soonCard('Novos personagens', k)).join('')}</div>
        <p class="note">Cada classe vale para a família toda (Ele e Ela). Já tem uma classe? Para subir, você paga só a diferença.</p></div>`;
  }
  return `<div class="pg-top">${header()}${ptop('Loja', null, 'home')}</div><div class="scroll"><div class="content">${cats}${body}</div></div>`;
}, after: () => {
  const c = $('#lojaCar'); if (!c || !c.firstElementChild) return;
  const sync = () => { const i = Math.round(c.scrollLeft / (c.firstElementChild.offsetWidth + 8)); $$('.carw .dots i').forEach((d, k) => d.classList.toggle('on', k === i)); };
  c.addEventListener('scroll', sync, {passive: true}); sync();
}, click: e => {
  const c = e.target.closest('[data-cat]'); if (c) { if (c.dataset.cat === 'skins' || c.dataset.cat === 'baralhos') { LOJA.cat = c.dataset.cat; rerender(); } else toast(`${c.textContent.trim()} · em breve na Loja`); return; }
  const d = e.target.closest('[data-deck]'); if (d) { ST.deck = d.dataset.deck; rerender(); toast(`Baralho ${DECKS.find(x => x[0] === ST.deck)[1]} ativado`); return; }
  const f = e.target.closest('[data-fam]'); if (f) { ACT.famOpen(f.dataset.fam); return; }
  const p = e.target.closest('[data-pack]'); if (p) openPack(p.dataset.pack);
}};
// pacote → personagem (LJ03): o mesmo palco do picker, com Agora não | Comprar · R$ 9,90 (ou o preço da promoção)
function openPack(id) { ST.pack = id; openPicker(id); }
ACT.packAct = id => { ST.pack = id; if (CUR === 'picker' && !ST.owned[id]) buyPack(id); else openPicker(id); };
// família da Loja → tela da família na classe pedida (ou na Rara, a mais escolhida; ou na que você já tem)
ACT.famOpen = arg => { const [id, l] = String(arg).split(':'); ST.pack = id; openPicker(id, null, l != null ? +l : undefined); };

/* ---------- página do pacote (M02 · M09 · M15 · M21) ---------- */
function includedHTML(id) {
  const p = PACKS[id];
  if (id === 'estelar') return `<div class="crew-rows">${['ele', 'ela'].map(g => `<div class="crew-row">${p.roles.map(r => `<div>${av(r, g, 'm')}<small>${crewName(r, g)}</small></div>`).join('')}</div>`).join('')}</div>`;
  const r = p.roles[0];
  if (p.solo) return `<div class="crew-row duo">${p.roles.map(x => `<div>${av(x, 'ele', 'l')}<small>${crewName(x, 'ele')}</small></div>`).join('')}</div>`;
  return `<div class="crew-row duo">${['ele', 'ela'].map(g => `<div>${av(r, g, 'l')}<small>${crewName(r, g)}</small></div>`).join('')}</div>`;
}
SCREENS.pacote = {cls: 'pack', render: ({id}) => {
  const p = PACKS[id], won = ST.rewardsWon;
  return `<div class="pg-top">${header()}${ptop(p.name, null, 'back', diaPill())}</div><div class="scroll"><div class="content">
    ${packCardL(id, 'page')}
    <div class="pk-box">${stitle('Personagens incluídos', p.incl)}${includedHTML(id)}</div>
    <div class="pk-box unl">${stitle('Como desbloquear', 'Escolha um dos caminhos')}
      <div role="button" tabindex="0" class="uopt" data-a="buyPack:${id}">${ic('diamond')}<span class="tx"><b>Comprar agora</b><small>Libera na hora, com seus diamantes</small></span><span class="pr">${diaPrice(PRICE)}</span></div>
      <div role="button" tabindex="0" class="uopt" data-a="earnPack:${id}">${ic('trophy')}<span class="tx"><b>Ganhar jogando</b><small>Vença 20 partidas em qualquer jogo</small></span><span class="pg"><b>${won}/20</b><span class="tr"><i style="width:${won / 20 * 100}%"></i></span></span></div>
      <p class="unote">Sem diamantes suficientes, o Comprar abre a página Diamantes.</p>
    </div></div></div>`;
}};
// pacote de skins sai do saldo (R$) · sem saldo, abre o Comprar fichas do header
function buyPack(id) {
  const v = priceNow(id);
  if (ST.saldo < v) { toast(`Saldo insuficiente para ${PACKS[id].name} · compre fichas`); ACT.buyChips(); return; }
  ST.saldo = +(ST.saldo - v).toFixed(2); ST.owned[id] = true; ST.pack = id;
  rerender(); unlockedSheet(id, v);
}
Object.assign(ACT, {
  buyPack: id => buyPack(id),
  earnPack: () => toast(`Faltam ${20 - ST.rewardsWon} vitórias · ao completar 20 você ganha uma skin`)
});

/* ---------- sheet "Pacote desbloqueado!" (M03 · M10 · M16 · M22) ---------- */
// imagens das sheets sempre a partir do centro (left = 50% + deslocamento do centro), em qualquer largura de coluna · sem brilho de fundo
function heroAvatars(id) {
  const p = PACKS[id];
  if (id === 'estelar') return `<span class="av m" style="left:calc(50% - 136px);top:92px"><img src="${photo('engenheiro', 'ela')}" alt=""></span><span class="av m" style="left:calc(50% + 136px);top:92px"><img src="${photo('explorador', 'ele')}" alt=""></span>
    <span class="av l" style="left:calc(50% - 84px);top:64px"><img src="${photo('comandante', 'ele')}" alt=""></span><span class="av l" style="left:calc(50% + 84px);top:64px"><img src="${photo('piloto', 'ela')}" alt=""></span>
    <span class="av xl" style="left:50%;top:36px"><img src="${photo('navegador', 'ela')}" alt=""></span>`;
  const r = p.roles[0];
  if (p.solo) { const pos = p.roles.length === 1 ? [['xl', 0, 36]] : p.roles.length === 2 ? [['xl', -56, 44], ['xl', 56, 44]] : [['l', -84, 64], ['xl', 0, 36], ['l', 84, 64]], ord = p.roles.length === 3 ? [1, 0, 2] : p.roles.map((_, i) => i);
    return ord.map(i => `<span class="av ${pos[i][0]}" style="left:calc(50% + ${pos[i][1]}px);top:${pos[i][2]}px"><img src="${photo(p.roles[i], 'ele')}" alt=""></span>`).join(''); }
  return `<span class="av xl" style="left:calc(50% - 56px);top:44px"><img src="${photo(r, 'ele')}" alt=""></span><span class="av xl" style="left:calc(50% + 56px);top:44px"><img src="${photo(r, 'ela')}" alt=""></span>`;
}
function unlockedSheet(id, paid) {
  const p = PACKS[id];
  openSheet(`<div class="hero">${heroAvatars(id)}</div>${paid ? tag(`−${fmt2(paid)} · saldo ${fmt2(ST.saldo)}`) : ''}<h2>Pacote desbloqueado!</h2>
    <p>${id === 'estelar' ? 'Os 10 personagens do Estelar agora são seus. Escolha com qual você quer jogar.' : `${p.incl} agora são seus. Escolha com qual você quer jogar.`}</p>
    <div class="row">${btn('Agora não', 'sec', 'm m44', 'data-a="unlockLater"')}${btn('Escolher personagem', 'pri', 'm m44', `data-a="unlockChoose:${id}"`)}</div>`, {cls: 'unlock'});
}
Object.assign(ACT, {
  unlockLater: () => { closeSheet(); go('loja', {}, {noHist: true}); },
  unlockChoose: id => { closeSheet(); if (CUR === 'picker' && PICK.pack === id) rerender(); else openPicker(id); }
});

/* ---------- escolher personagem (character-picker · Ele | Ela, Ela rosa; vídeo top-center) ----------
   famílias da Loja = tela da família por classe (Figma Loja › 9 · CL02–CL08): palco · Escolha a classe · O que vem na X · Comparar | Comprar */
const PICK = {pack: 'laje', c: 'laje', g: 'ela', back: 'loja', l: 1};
const tierOf = (c, l) => TIER_ART[c] > l ? l : null;
function openPicker(id, back, lvl) {
  PICK.pack = id; PICK.back = back || CUR;
  if (packActive(id)) { PICK.c = ST.crew; PICK.g = ST.g; }
  else if (ST.reward && ST.reward.pack === id && ST.reward.taken) { PICK.c = ST.reward.c; PICK.g = ST.reward.g; }
  else [PICK.c, PICK.g] = PACKS[id].def;
  // classe aberta: a pedida (destaque) · sem classe = Rara (a mais escolhida) · com classe = a que você usa
  const o = famOn(id) ? ownLvl(id) : -1, w = (ST.wear || {})[id];
  PICK.l = lvl != null ? Math.min(lvl, nCls(id) - 1) : o < 0 ? 1 : w != null ? w : o;
  warmPack(id);
  go('picker');
}
// aquece o cache dos personagens do pacote: ao trocar, o palco já tem o primeiro quadro e o vídeo prontos (sem piscar)
function warmPack(id) {
  const p = PACKS[id];
  const list = id === 'estelar' ? p.roles.flatMap(r => [[r, 'ele'], [r, 'ela']]) : p.solo ? p.roles.map(r => [r, 'ele']) : [[p.roles[0], 'ele'], [p.roles[0], 'ela']];
  list.forEach(([c, g]) => { const t = famOn(id) ? tierOf(c, PICK.l) : undefined; new Image().src = stagePoster(c, g, t); fetch(stageVid(c, g, t)).catch(() => {}); });
}
// classes + o que vem + Comparar | Comprar (ou Subir para X, ou Embarcar quando a classe já é sua)
function famBody(crew) {
  const id = PICK.pack, p = PACKS[id], n = nCls(id), l = PICK.l, o = ownLvl(id);
  const duo = crew.slice(0, 2);
  const pair = k => `<span class="pr2${duo.length < 2 ? ' one' : ''}">${duo.map(([c, g]) => `<span><img src="${photo(c, g, tierOf(c, k))}" alt=""></span>`).join('')}</span>`;
  const opt = k => {
    const own = k <= o, pr = own ? '<small class="ok">✓ Sua</small>' : `<small>${o >= 0 ? '+ ' + fmt2(clsPrice(id, k)) : fmt2(CLS[k].p)}</small>`;
    return `<div role="button" tabindex="0" class="copt ${CLS[k].k}${k === l ? ' on' : ''}${own ? ' own' : ''}" data-cl="${k}" aria-label="Classe ${CLS[k].n}">${k === 1 ? maisEscolhida() : ''}${pair(k)}<span class="tx"><b>${CLS[k].n}</b>${pr}</span></div>`;
  };
  const lab = o >= 0 && o < n - 1 ? `Você já tem a ${CLS[o].n} · paga só a diferença` : `Escolha a classe · vale para ${p.incl}`;
  const tiles = benOf(id).map(b => { const on = b.min <= l; return `<div class="ctile${on ? '' : ' off'}">${ic(b.i)}<b>${b.n}</b><small>${on ? b.v(l) : 'na ' + CLS[b.min].n}</small></div>`; }).join('');
  const cta = l <= o ? btn('Embarcar', 'pri', 'l', 'data-a="embark"') : o >= 0 ? btn(`Subir para ${CLS[l].n}`, 'pri', 'l', `data-a="buyCls:${id}:${l}"`) : btn(`Comprar · ${fmt2(CLS[l].p)}`, 'pri', 'l', `data-a="buyCls:${id}:${l}"`);
  return `<p class="clab">${lab}</p>
      <div class="clsr n${n}">${Array.from({length: n}, (_, k) => opt(k)).join('')}</div>
      <div class="ovem"><b>O que vem na ${CLS[l].n}</b><small>${ovSub(id, l)}</small></div>
      <div class="tiles">${tiles}</div>
      <div class="acts">${btn('Comparar', 'sec', 'l', 'data-a="famCompare"', 'cmpb')}${cta}</div>`;
}
SCREENS.picker = {cls: 'picker-scr', render: () => {
  const p = PACKS[PICK.pack], estelar = PICK.pack === 'estelar', cc = crewColor(PICK.c, PICK.g);
  const crew = estelar ? p.roles.map(r => [r, PICK.g]) : p.solo ? p.roles.map(r => [r, 'ele']) : [[p.roles[0], 'ele'], [p.roles[0], 'ela']];
  const own = ST.owned[PICK.pack], pr = promoOf(PICK.pack), fam = famOn(PICK.pack), t = fam ? tierOf(PICK.c, PICK.l) : undefined;
  return `<div class="pg-top">${header()}${ptop(fam ? famName(PICK.pack) : own ? p.page : p.name, null, 'pickBack')}</div>
    <div class="scr picker${fam ? ' fam' : ''}" style="position:relative;inset:auto;flex:1;min-height:0">
      ${p.solo ? '' : tabs([['ele', 'Ele'], ['ela', 'Ela']], PICK.g, PICK.g === 'ela' ? 'rosa' : '', 'pg')}
      <div class="stg" style="--cc:${cc}"><video src="${stageVid(PICK.c, PICK.g, t)}" autoplay muted loop playsinline preload="auto" poster="${stagePoster(PICK.c, PICK.g, t)}"></video>
        <button class="arrow p" data-a="pickStep:-1" aria-label="Anterior">${svg('i-chev-l-light')}</button><button class="arrow n" data-a="pickStep:1" aria-label="Próximo">${svg('i-chev-r-light')}</button>
        <div class="ident">${fam ? clsTag(PICK.l) : ''}<b>${crewName(PICK.c, PICK.g)}</b><small><i></i>${ROLE_SUB[PICK.c]}</small></div></div>
      ${fam ? famBody(crew) : `<div class="crew">${crew.map(([c, g]) => `<button class="${c === PICK.c && g === PICK.g ? 'on' : ''}" style="--cc:${crewColor(c, g)}" data-pc="${c}|${g}" aria-label="${crewName(c, g)}"><img src="${photo(c, g)}" alt=""></button>`).join('')}</div>
      ${pr ? `<div class="pbar"><span class="of">${promoTag(PICK.pack)}${timerPill('flat')}</span>${oldPrice(packPrice(PICK.pack))}</div>` : ''}
      <div class="acts">${btn('Agora não', 'sec', 'l', 'data-a="pickBack"')}${own ? btn('Embarcar', 'pri', 'l', 'data-a="embark"') : btn(`Comprar · ${fmt2(priceNow(PICK.pack))}`, 'pri', 'l', `data-a="buyPack:${PICK.pack}"`)}</div>`}
    </div>`;
}, click: e => {
  const k = e.target.closest('[data-cl]'); if (k) { PICK.l = +k.dataset.cl; rerender(); return; }
  const t = e.target.closest('[data-pg],[data-pc]'); if (!t) return;
  if (t.dataset.pg) PICK.g = t.dataset.pg; else [PICK.c, PICK.g] = t.dataset.pc.split('|');
  rerender();
}};
// compra da classe: a família toda (Ele + Ela) · já tem uma classe? paga só a diferença
function buyCls(id, l) {
  const v = clsPrice(id, l);
  if (ST.saldo < v) { toast(`Saldo insuficiente para ${famName(id)} ${CLS[l].n} · compre fichas`); ACT.buyChips(); return; }
  ST.saldo = +(ST.saldo - v).toFixed(2); ST.owned[id] = true; ST.cls[id] = l; ST.wear[id] = l; ST.pack = id; PICK.l = l;
  rerender(); clsUnlocked(id, l, v);
}
// sheet "X Rara é sua!" (CL06): o casal da família na classe comprada
function clsUnlocked(id, l, paid) {
  const p = PACKS[id], r = p.roles[0], tk = tierOf(r, l);
  const hero = TIER_ART[r] && !p.solo ? `<span class="av xl" style="left:calc(50% - 56px);top:44px"><img src="${photo(r, 'ele', tk)}" alt=""></span><span class="av xl" style="left:calc(50% + 56px);top:44px"><img src="${photo(r, 'ela', tk)}" alt=""></span>` : heroAvatars(id);
  const txt = [`${p.incl} na Comum, a chamada do Truco e o baralho da família já estão com você.`,
    `${p.incl} Raros, mesas, taco, efeitos e a chamada do Truco já estão com você. XP em dobro e Timebank valem por 2 dias.`,
    `${p.incl} Místicos, com voz e emojis da família, já estão com você. XP em dobro por 7 dias e Timebank por 10 dias.`,
    `${p.incl} Lendários e os efeitos na mesa de sinuca já estão com você. XP em dobro por 7 dias e Timebank por 10 dias.`][l];
  openSheet(`<div class="hero">${hero}</div><div class="tgs">${clsTag(l)}${tag(`−${fmt2(paid)} · saldo ${fmt2(ST.saldo)}`)}</div><h2>${famName(id)} ${CLS[l].n} é sua!</h2>
    <p>${txt}</p>
    <div class="row">${btn('Agora não', 'sec', 'm m44', 'data-a="unlockLater"')}${btn('Escolher personagem', 'pri', 'm m44', `data-a="unlockChoose:${id}"`)}</div>`, {cls: 'unlock'});
}
// Comparar classes (CL05): o que vem em cada classe e o preço (ou a diferença, se você já tem uma)
function compareSheet(id) {
  const n = nCls(id), ks = Array.from({length: n}, (_, k) => k), o = ownLvl(id);
  const head = `<tr><th></th>${ks.map(k => `<th>${clsTag(k)}</th>`).join('')}</tr>`;
  const rows = benOf(id).map(b => `<tr><td><span class="bl">${ic(b.i)}${b.full || b.n}</span></td>${ks.map(k => `<td>${k < b.min ? '<i class="no">–</i>' : b.val ? `<b>${b.v(k)}</b>` : '<i class="ok">✓</i>'}</td>`).join('')}</tr>`).join('');
  const price = `<tr class="pr"><td>Preço</td>${ks.map(k => `<td>${k <= o ? '<i class="ok">✓ Sua</i>' : `<b>${o >= 0 ? '+ ' + fmt2(clsPrice(id, k)) : fmt2(CLS[k].p)}</b>`}</td>`).join('')}</tr>`;
  openSheet(`<h2>Compare as classes</h2><p>Tudo vale para a família toda: ${PACKS[id].incl}.</p>
    <div class="cmpw"><table class="cmp n${n}">${head}${rows}${price}</table></div>
    <div class="row">${btn('Fechar', 'sec', 'm m44', 'data-a="closeSheet"')}${btn(`Escolher ${CLS[PICK.l].n}`, 'pri', 'm m44', `data-a="famPick:${PICK.l}"`)}</div>`, {cls: 'unlock cmpsh'});
}
Object.assign(ACT, {
  pickStep: d => { const p = PACKS[PICK.pack]; if (p.solo) { PICK.g = 'ele'; if (p.roles.length > 1) { const i = p.roles.indexOf(PICK.c); PICK.c = p.roles[(i + +d + p.roles.length) % p.roles.length]; rerender(); } return; } if (p.roles.length === 1) PICK.g = PICK.g === 'ele' ? 'ela' : 'ele'; else { const i = p.roles.indexOf(PICK.c); PICK.c = p.roles[(i + +d + p.roles.length) % p.roles.length]; } rerender(); },
  pickBack: () => back(),
  famCompare: () => compareSheet(PICK.pack),
  famPick: l => { closeSheet(); PICK.l = +l; rerender(); },
  buyCls: arg => { const [id, l] = String(arg).split(':'); buyCls(id, +l); },
  embark: () => {
    ST.crew = PICK.c; ST.g = PICK.g; ST.owned[PICK.pack] = true;
    if (famOn(PICK.pack) && PICK.l <= ownLvl(PICK.pack)) ST.wear[PICK.pack] = PICK.l;
    const m = PACKS[PICK.pack].mesa; if (m) { ST.mesaChoice = m; }
    if (ST.reward && ST.reward.pack === PICK.pack) ST.reward = null;
    HIST = []; go('jogos', {}, {noHist: true});
    toast(`Skin ${crewName(ST.crew, ST.g)} ativada · a aba Jogos é sua Home`);
  }
});

/* ---------- "Você ganhou uma skin!" (G01) · recompensa de 20 vitórias ---------- */
function showRewardSheet() {
  const r = ST.reward; if (!r) return;
  const p = PACKS[r.pack];
  closeSheet();
  setTimeout(() => openSheet(`<div class="hero"><span class="av xl" style="left:50%;top:36px"><img src="${photo(r.c, r.g)}" alt=""></span></div>
    ${tag('Recompensa', 'gold')}<h2>Você ganhou uma skin!</h2>
    <p>${crewName(r.c, r.g)} · pacote ${p.name}. Ative agora ou guarde para depois.</p>
    <div class="row">${btn('Ver depois', 'sec', 'm m44', 'data-a="rewardLater"')}${btn('Ativar agora', 'pri', 'm m44', 'data-a="rewardNow"')}</div>`, {cls: 'unlock'}), 200);
}
Object.assign(ACT, {
  rewardNow: () => { const r = ST.reward; closeSheet(); ST.owned[r.pack] = true; r.taken = true; $('#overlay').innerHTML = ''; endAllGames(); openPicker(r.pack, 'jogos'); },
  rewardLater: () => { const r = ST.reward; closeSheet(); ST.owned[r.pack] = true; r.taken = true; r.later = true; toast('Recompensa guardada · toque no seu perfil para ativar'); }
});

/* ---------- Diamantes (D02): moeda da Loja · faixas da Cacheta · pagamento pela loja do celular ---------- */
const DIA_PACKS = [{n: 50, b: 8, p: 6.9, art: 'diamante'}, {n: 195, b: 15, p: 29.9, art: 'punhado'}, {n: 960, b: 40, p: 129.9, art: 'bolsa'}, {n: 4500, b: 100, p: 599.9, art: 'bau'}];
const diaArt = a => `${A}art/diamantes-${a}.webp`;
SCREENS.diamantes = {cls: 'diamantes', render: () => `<div class="pg-top">${header()}${ptop('Diamantes')}</div><div class="scroll"><div class="content">
    <div class="dsaldo">${ic('diamond')}<span class="tx"><small>Seus diamantes</small><b>${diaN(ST.diamonds)}</b></span></div>
    <div class="packs">${stitle('Pacotes de diamantes', 'Pagamento pela App Store ou Google Play')}
      <div class="dgrid">${DIA_PACKS.map((k, i) => `<div role="button" tabindex="0" class="dpack" data-dp="${i}">${tag(`+${k.b} bônus`, 'gold')}<img class="art" src="${diaArt(k.art)}" alt=""><b>${diaN(k.n)}</b><small>diamantes</small>${btn(fmt2(k.p), 'pri', 'm')}</div>`).join('')}</div>
      <p class="note">Diamantes servem para skins, baralhos, molduras, efeitos e troca de nome e de foto. Não valem dinheiro, não entram em partidas e não podem ser sacados.</p>
    </div></div></div>`,
  click: e => { const d = e.target.closest('[data-dp]'); if (d) diaConfirm(+d.dataset.dp); }};
// D03 · confirmação da loja do celular: no app de verdade quem desenha é a App Store / Google Play (aqui é só a referência)
function diaConfirm(i) {
  const k = DIA_PACKS[i];
  openSheet(`${tag('Tela do sistema · referência')}
    <div class="nprod"><span class="nic"><img src="${A}ui/logo_icon.webp" alt=""></span><span class="tx"><b>${diaN(k.n)} diamantes + ${k.b} de bônus</b><small>Liquid · compra no app</small></span></div>
    <div class="ndet"><div><small>Conta</small><span>alfonso.dutra@email.com</span></div><div><small>Total</small><b>${fmt2(k.p)}</b></div></div>
    <div class="row">${btn('Cancelar', 'sec', 'm m44', 'data-a="closeSheet"')}${btn(`Comprar · ${fmt2(k.p)}`, 'pri', 'm m44', `data-a="diaPay:${i}"`)}</div>
    <p class="nnote">Quem desenha esta confirmação é o sistema (Face ID, senha ou digital). O app só recebe o resultado.</p>`, {cls: 'unlock native'});
}
// D04 · "Você recebeu": diamantes + bônus caem na hora
function diaGot(k) {
  openSheet(`<div class="hero"><img class="dart" src="${diaArt(k.art)}" alt=""></div>${tag('Compra confirmada', 'success')}
    <h2>+${diaN(k.n + k.b)} diamantes</h2><p>${diaN(k.n)} diamantes + ${k.b} de bônus já estão na sua conta. Use na Loja em skins, baralhos, molduras e efeitos.</p>
    <div class="row">${btn('Fechar', 'sec', 'm m44', 'data-a="closeSheet"')}${btn('Ir para a Loja', 'pri', 'm m44', 'data-a="diaLoja"')}</div>`, {cls: 'unlock'});
}
Object.assign(ACT, {
  diamantes: () => go('diamantes'),
  diaPay: i => { const k = DIA_PACKS[+i]; closeSheet(); ST.diamonds += k.n + k.b; setTimeout(() => { if (CUR === 'diamantes') rerender(); diaGot(k); }, 220); },
  diaLoja: () => { closeSheet(); LOJA.cat = 'skins'; go('loja', {}, {noHist: true}); }
});
