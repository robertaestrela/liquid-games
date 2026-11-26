/* Liquid · Missões (Figma ✲ Missões, aprovado 26/11 · DS ❖ Missões)
   card de nível da Fidelidade no topo, login diário de 7 dias, missões com prazo e recompensa em pontos de fidelidade.
   Resgatar: o hexágono da patente sobe da recompensa até o card de nível, o número conta pra cima e a missão desce para Completas.
   Patentes (26/11): sem as gemas · insígnia inteira (hexágono do header + asas militares) no card de nível, só o hexágono nos tamanhos pequenos. */
'use strict';
const H_ = 36e5;
// patente do jogador (pontos da Fidelidade). Iniciante 1 → Iniciante 2 em 6.250 pontos, como na tela da Fidelidade
const MIS = {
  pts: 2494, goal: 6250, lvl: 'Iniciante 1', next: 'Iniciante 2', pat: 'iniciante', color: '#8fa3b8',
  login: {day: 2, claimed: false, streak: 1, vals: [30, 60, 90, 120, 150, 200, 500]},
  newAt: Date.now() + (4 * 3600 + 12 * 60 + 33) * 1e3,
  fresh: false, // missões novas chegaram (botão da Home com fogo)
  list: [
    {id: 'any5', d: 'Vale todos os jogos. Treino não conta.', st: 'ready', icon: 'swords', c: 'todos', t: 'Jogue 5 partidas em qualquer jogo', r: 240, p: [5, 5], end: Date.now() + 13 * H_ + 52 * 6e4},
    {id: 'w20', d: 'Cada etapa já libera os pontos.', st: 'steps', icon: 'trophy', c: 'todos', t: 'Jogue 20 partidas nesta semana', r: 1500, p: [8, 20], days: 6, steps: [[5, 300], [10, 300], [15, 400], [20, 500]], go: {}},
    {id: 'sin5', d: 'Mesa aberta ou sala privada.', st: 'prog', icon: 'sinuca', c: 'sinuca', t: 'Vença 5 partidas de Sinuca', r: 500, p: [2, 5], days: 2, go: {game: 'sinuca'}},
    {id: 'tru3', d: 'Mineiro ou Paulista, com entrada.', st: 'open', icon: 'truco', c: 'truco', t: 'Jogue 3 partidas de Truco', r: 120, end: Date.now() + 1 * H_ + 12 * 6e4 + 7e3, go: {game: 'truco'}},
    {id: 'dupla', d: 'Truco 2x2, com amigo ou dupla da mesa.', st: 'open', icon: 'friends', c: 'todos', t: 'Jogue uma partida em dupla', r: 200, end: Date.now() + 23 * H_ + 58 * 6e4, go: {game: 'truco', mode: '2x2'}},
    {id: 'bur2', d: 'Qualquer mesa de Buraco.', st: 'open', icon: 'buraco', c: 'buraco', t: 'Ganhe 2 partidas de Buraco', r: 180, end: Date.now() + 23 * H_ + 58 * 6e4, go: {game: 'buraco'}},
    {id: 'sala', d: 'Seu amigo entra por link ou senha.', st: 'open', icon: 'key', c: 'todos', t: 'Crie uma sala privada e jogue com um amigo', r: 150, days: 3, act: 'criarSala', label: 'Criar sala'},
    {id: 'conv', d: 'Vale quando ele joga a 1ª partida.', st: 'open', icon: 'friends', c: 'todos', t: 'Convide um amigo pelo Indique e ganhe', r: 300, days: 6, act: 'toast:Indique e ganhe · em breve', label: 'Convidar'}
  ],
  done: [{id: 'cach1', d: 'Qualquer mesa de Cacheta.', icon: 'cacheta', c: 'cacheta', t: 'Jogue 1 partida de Cacheta', r: 60}],
  busy: false
};
if (new URLSearchParams(location.search).get('mis') === 'novas') MIS.fresh = true;
const ptsFmt = n => (+n).toLocaleString('pt-BR');
const misP2 = n => String(n).padStart(2, '0');
const hms = ms => { const t = Math.max(0, Math.floor(ms / 1e3)); return `${misP2(Math.floor(t / 3600))}:${misP2(Math.floor(t % 3600 / 60))}:${misP2(t % 60)}`; };
// o que dá pra resgatar agora (selo do botão da Home e do menu do computador)
const misCount = () => MIS.list.filter(m => m.st === 'ready').length + (MIS.login.claimed ? 0 : 1);
const misLeft = () => MIS.goal - MIS.pts;
// patente (DS patent-badge): insígnia inteira (Default) e só o hexágono 44:48 (Small, 32 px ou menos)
const patBadge = () => I('patente-' + MIS.pat), patHex = () => `<img class="ic hex" src="${I('patente-hex-' + MIS.pat)}" alt="">`;

/* ---------- botão da Home (DS missions-button): círculo com anel contador, rótulo e selo · Novas missões = anel no degradê da estrela + chama ---------- */
function misButton() {
  const n = misCount(), nov = MIS.fresh, pct = nov ? 100 : Math.round(100 - (MIS.newAt - Date.now()) / (24 * H_) * 100);
  return `<button class="misb${nov ? ' nov' : ''}" data-a="missoes" aria-label="Missões${n ? ` · ${n} pra resgatar` : ''}" style="--p:${Math.max(8, Math.min(100, pct))}">
    ${nov ? `<img class="fire" src="${I('fire')}" alt="">` : ''}<span class="pulse"></span><span class="disc"></span><span class="arc"></span>${ic('missoes')}<span class="lb">Missões</span>${n ? tag(String(n), 'danger') : ''}</button>`;
}

/* ---------- card de nível (DS loyalty-level-card ↕ Size=Small) ---------- */
function levelCard() {
  const pct = Math.min(100, MIS.pts / MIS.goal * 100);
  return `<div class="lvc" id="lvc" style="--pc:${MIS.color}" role="button" tabindex="0" data-a="toast:Fidelidade · ${MIS.lvl}">
    <img class="bg" src="${patBadge()}" alt=""><img class="pat" id="lvPat" src="${patBadge()}" alt="${MIS.lvl}">
    <b class="nm">${MIS.lvl}</b>
    <span class="pts"><b id="lvPts">${ptsFmt(MIS.pts)}</b><span>/ ${ptsFmt(MIS.goal)} pontos</span><span class="gain" id="lvGain"></span></span>
    <span class="prog"><i id="lvBar" style="width:${pct}%"></i></span>
    <small id="lvLeg">Faltam ${ptsFmt(misLeft())} pontos para o ${MIS.next}</small></div>`;
}

/* ---------- login diário (DS daily-login) ---------- */
function loginCard() {
  const L = MIS.login;
  const tiles = L.vals.map((v, i) => {
    const d = i + 1, gift = d === 7, res = d < L.day || (d === L.day && L.claimed), hoje = d === L.day && !L.claimed;
    const art = res ? ic('check') : gift ? ic('gift') : patHex();
    return `<div class="day${gift ? ' gift' : ''}${hoje ? ' hoje' : ''}${res ? ' res' : ''}"${hoje ? ' id="lgToday"' : ''}><small>${hoje ? 'Hoje' : 'Dia ' + d}</small><span class="art">${art}</span><b>+${ptsFmt(v)}</b></div>`;
  }).join('');
  const next = L.claimed && L.day < 7 ? L.vals[L.day] : 0;
  return `<div class="lgc"><div class="top">${ic('calendar')}<span class="tx"><b>Login diário</b><small>Entre todo dia. O Dia 7 vale um presente.</small></span>
      <span class="streak">${ic('fire')}<b>${L.streak} ${L.streak === 1 ? 'dia' : 'dias'}</b></span></div>
    <div class="days">${tiles}</div>
    ${L.claimed ? `<div class="nx">${ic('timer')}<span>Dia ${L.day + 1} libera em</span><b data-mcd="${tomorrow()}">${hms(tomorrow() - Date.now())}</b>${next ? `<span class="v">+${ptsFmt(next)}</span>` : ''}</div>`
      : btn(`Resgatar Dia ${L.day} · +${ptsFmt(L.vals[L.day - 1])} pontos`, 'ok', 'm', 'data-a="misLogin" id="lgBtn"', 'wide')}
    <small class="rule">Se perder um dia, a sequência volta pro Dia 1.</small></div>`;
}
const tomorrow = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return +d; };

/* ---------- missão (DS mission-card) ---------- */
function timerChip(m) {
  if (m.st === 'ready') return `<span class="tm ok">${ic('check')}<b>Pronta pra resgatar</b></span>`;
  if (m.end && m.end - Date.now() < 3 * H_) return `<span class="tm hot">${ic('fire')}<b>Termina em <i data-mcd="${m.end}">${hms(m.end - Date.now())}</i></b></span>`;
  if (m.end) return `<span class="tm">${ic('timer')}<b data-mcd="${m.end}">${hms(m.end - Date.now())}</b></span>`;
  return `<span class="tm">${ic('timer')}<b>${m.days} dias</b></span>`;
}
function missionCard(m, done) {
  const bar = (v, max) => `<span class="prog"><i style="width:${Math.min(100, v / max * 100)}%"></i></span>`;
  const rew = `<span class="rw">${patHex()}<b>+${ptsFmt(m.r)}</b></span>`;
  const act = done ? `<span class="feita">${ic('check')}Feita</span>`
    : m.st === 'ready' ? btn('Resgatar', 'ok', 's', `data-a="misClaim:${m.id}"`)
    : btn(m.label || 'Jogar', 'pri', 's', `data-a="misGo:${m.id}"`);
  let steps = '';
  if (m.st === 'steps') {
    // marcos: 5/10/15/20 partidas ficam em 0/33/67/100% da barra
    const [v] = m.p, s = m.steps, seg = 100 / (s.length - 1), j = s.findIndex(x => x[0] >= v);
    const fill = j < 0 ? 100 : j === 0 ? 0 : (j - 1) * seg + (v - s[j - 1][0]) / (s[j][0] - s[j - 1][0]) * seg;
    steps = `<div class="steps"><div class="mk">${s.map(([q, r]) => `<span class="${v >= q ? 'got' : ''}">${v >= q ? ic('check') : patHex()}+${ptsFmt(r)}</span>`).join('')}</div>
      <span class="prog"><i style="width:${fill}%"></i></span><div class="lb">${s.map(([q], i) => `<small>${q}${i === s.length - 1 ? ' partidas' : ''}</small>`).join('')}</div></div>`;
  }
  return `<div class="mc${done ? ' done' : ''}${m.st === 'ready' && !done ? ' ready' : ''}" id="mc-${m.id}">
    <div class="ln"><span class="tile" style="--gc:${GAME_HEX[m.c]}3d">${ic(m.icon)}</span>
      <span class="info">${done ? '' : timerChip(m)}<b class="t">${m.t}</b>${!done && m.d ? `<small class="ds">${m.d}</small>` : ''}${!done && (m.st === 'prog' || m.st === 'ready') ? `<span class="pr">${bar(m.p[0], m.p[1])}<small>${m.p[0]}/${m.p[1]}</small></span>` : ''}</span>
      <span class="rt">${rew}${act}</span></div>${steps}</div>`;
}

SCREENS.missoes = {cls: 'mis', render: () => {
  const ready = MIS.list.filter(m => m.st === 'ready').length;
  const order = {ready: 0, steps: 1, prog: 2, open: 3};
  const list = [...MIS.list].sort((a, b) => order[a.st] - order[b.st]);
  return `<div class="pg-top">${header()}${ptop('Missões')}</div><div class="scroll"><div class="content">
    ${levelCard()}${loginCard()}
    <div class="mlist"><div class="mh"><span class="tx"><b>Missões</b><small>${ready ? `${ready} pronta${ready > 1 ? 's' : ''} pra resgatar · ` : ''}cada missão tem o seu prazo</small></span>
      <span class="novas">${ic('timer')}<span><small>Novas em</small><b data-mcd="${MIS.newAt}">${hms(MIS.newAt - Date.now())}</b></span></span></div>
      <div class="rows">${list.map(m => missionCard(m)).join('')}</div>
      ${MIS.done.length ? `<b class="sub">Completas</b><div class="rows">${MIS.done.map(m => missionCard(m, true)).join('')}</div>` : ''}</div>
  </div></div>`;
}, after: () => { MIS.fresh = false; }};

// relógios da tela (prazos, novas missões, próximo dia do login)
setInterval(() => {
  $$('[data-mcd]').forEach(el => { el.textContent = hms(+el.dataset.mcd - Date.now()); });
  if (!MIS.fresh && MIS.newAt <= Date.now()) { MIS.fresh = true; MIS.newAt = Date.now() + 24 * H_; paintMisButton(); }
}, 1000);
function paintMisButton() { const b = $('#view .misb'); if (b) b.outerHTML = misButton(); if (typeof paintDesk === 'function') paintDesk(); }

/* ---------- resgate: o hexágono da patente voa até o card de nível, o número conta e o selo +X aparece ---------- */
function flyPat(from, n = 1) {
  const to = $('#lvPat'); if (!from || !to) return Promise.resolve();
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const jobs = [];
  for (let k = 0; k < n; k++) {
    const g = document.createElement('img'); g.src = I('patente-hex-' + MIS.pat); g.className = 'fly-pat';
    const s = Math.max(24, a.height), w = Math.round(s * 44 / 48); g.style.cssText = `left:${a.left + a.width / 2 - w / 2}px;top:${a.top + a.height / 2 - s / 2}px;width:${w}px;height:${s}px`;
    document.body.appendChild(g);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = g.animate([
      {transform: 'translate(0,0) scale(1)', opacity: 1},
      {transform: `translate(${dx * .45 + 40}px,${dy * .55}px) scale(1.25)`, opacity: 1, offset: .5},
      {transform: `translate(${dx}px,${dy}px) scale(.7)`, opacity: .2}
    ], {duration: 650, delay: k * 90, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'});
    jobs.push(anim.finished.then(() => g.remove()));
  }
  return Promise.all(jobs);
}
function countUp(add) {
  const el = $('#lvPts'), card = $('#lvc'), gain = $('#lvGain'), bar = $('#lvBar'), leg = $('#lvLeg');
  const from = MIS.pts, to = from + add, t0 = performance.now();
  MIS.pts = to;
  if (!el) return Promise.resolve();
  card.classList.add('rec'); gain.textContent = `+${ptsFmt(add)}`;
  return new Promise(res => {
    const step = t => {
      const k = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - k, 3), v = Math.round(from + add * e);
      el.textContent = ptsFmt(v); bar.style.width = `${Math.min(100, v / MIS.goal * 100)}%`;
      if (k < 1) requestAnimationFrame(step);
      else { leg.textContent = `Faltam ${ptsFmt(misLeft())} pontos para o ${MIS.next}`; setTimeout(() => { card.classList.remove('rec'); res(); }, 900); }
    };
    requestAnimationFrame(step);
  });
}
// o card de nível precisa estar à vista antes da patente voar: rola pro topo e espera a rolagem acabar (as posições são medidas depois)
function showLevel() {
  const sc = $('#view .scroll'), lv = $('#lvc'); if (!sc || !lv) return Promise.resolve();
  const top = lv.getBoundingClientRect().top - sc.getBoundingClientRect().top;
  if (top >= 0) return Promise.resolve();
  sc.scrollTo({top: 0, behavior: 'smooth'});
  return new Promise(r => setTimeout(r, 420));
}
Object.assign(ACT, {
  missoes: () => go('missoes'),
  misClaim: async (id, el) => {
    if (MIS.busy) return; const m = MIS.list.find(x => x.id === id); if (!m || m.st !== 'ready') return;
    MIS.busy = true; el.classList.add('pressed'); el.disabled = true;
    const card = el.closest('.mc'), from = card && card.querySelector('.rw .ic');
    await showLevel();
    await flyPat(from, 1);
    await countUp(m.r);
    MIS.list = MIS.list.filter(x => x.id !== id); MIS.done.unshift(m);
    MIS.busy = false; toast(`+${ptsFmt(m.r)} pontos de fidelidade · ${m.t}`, 2400);
    rerender();
  },
  misLogin: async (_, el) => {
    const L = MIS.login; if (MIS.busy || L.claimed) return;
    MIS.busy = true; el.classList.add('pressed'); el.disabled = true;
    const v = L.vals[L.day - 1];
    await showLevel();
    await flyPat($('#lgToday .art .ic'), 1);
    await countUp(v);
    L.claimed = true; L.streak++; MIS.busy = false;
    toast(`+${ptsFmt(v)} pontos · Dia ${L.day} do login`, 2200);
    rerender();
  },
  misGo: id => {
    const m = MIS.list.find(x => x.id === id); if (!m) return;
    if (m.act) { const [k, ...r] = m.act.split(':'); if (ACT[k]) ACT[k](r.join(':')); return; }
    const g = m.go || {};
    if (g.game) { ST.game = g.game; ST.variant = defVariant(game()); }
    if (g.mode) ST.trucoMode = g.mode;
    go('lobby');
  }
});
