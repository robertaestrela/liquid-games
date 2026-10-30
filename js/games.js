/* Liquid · motores de jogo com bots (portados do protótipo testado): Truco Paulista/Mineiro 1x1 e 2x2,
   Cacheta e Pif-Paf 1x1, Buraco Aberto/Fechado e Tranca 2x2, Poker Texas Hold'em 1x1 e mesa de 6.
   O tabuleiro é um palco 375×649 (medidas do Figma) escalado para caber na tela. */
'use strict';
// adversários e parceiro da mesa (na batalha, vêm da sala de espera)
const OPP = {n: 'dutra77', c: 'comandante', g: 'ele'}, PAR = {n: 'amanda.s', c: 'engenheiro', g: 'ela'}, OPP2 = {n: 'rafa_10', c: 'piloto', g: 'ele'};
function syncNick() {
  const set = (o, p) => { if (p) { o.n = p[0]; o.c = p[1]; o.g = p[2]; } };
  set(OPP, ['dutra77', 'comandante', 'ele']); set(PAR, ['amanda.s', 'engenheiro', 'ela']); set(OPP2, ['rafa_10', 'piloto', 'ele']);
  const sp = ST.series && ST.series.people ? ST.series.people.slice(1) : null;
  if (sp && sp.length) { if (sp.length >= 3 && ST.game !== 'poker') { set(PAR, sp[0]); set(OPP, sp[1]); set(OPP2, sp[2]); } else set(OPP, sp[0]); }
  BU_NAMES.splice(0, 4, ST.nick, OPP.n, PAR.n, OPP2.n);
  PK_BASE.forEach((x, i) => { PK_PEOPLE[i] = sp && sp[i - 1] && i ? sp[i - 1].slice() : x.slice(); });
  PK_PEOPLE[0] = [ST.nick, null, null]; if (!sp) PK_PEOPLE[1] = [OPP.n, OPP.c, OPP.g];
}
// mesas: Truco usa o tampo quadrado (truco-*); os outros jogos usam a cápsula da cor do jogo ou a skin especial escolhida
const SPECIAL_MESAS = ['bar', 'reis', 'gamer'];
const capsuleMesa = def => SPECIAL_MESAS.includes(ST.mesaChoice) ? ST.mesaChoice : def;
// Truco: abre sempre na mesa do bar até a pessoa escolher outra mesa em Personalizar
const trucoMesa = paulista => ST.mesaPicked ? (paulista ? ST.mesaPaulista || 'azul' : ST.mesaChoice || 'vermelha') : 'bar';
function tableArt(gid, v) {
  if (gid === 'truco') return 'truco-' + trucoMesa(v === 'Paulista');
  return capsuleMesa(gid === 'cacheta' ? 'roxa' : 'verde');
}
function currentMesaImg() { if (G) return mesaImg(); if (PF) return `${A}mesa/${capsuleMesa('roxa')}.webp`; return `${A}mesa/${capsuleMesa('verde')}.webp`; }
// encerra qualquer partida em andamento (timers e estado)
function endAllGames() {
  [myT, pfT, buT, pkT, clockT].forEach(t => clearInterval(t)); [pfBotT, buBotT, pkBotT].forEach(t => clearTimeout(t));
  G = null; PF = null; BU = null; PK = null; MODE = 'truco';
  const c = $('#call'); if (c) c.remove();
  if (typeof closeSinuca === 'function') closeSinuca();
}
// HUD estático (sala de espera) no mesmo desenho do match-top
function hudStatic(b) {
  const g = gameById(b.game), two = b.fmt === '2x2';
  const mine = two ? `<span class="stack">${hex(ST.crew, ST.g, 32, 35, false)}${av('nenhum', 'ela', 's')}</span>` : hex(ST.crew, ST.g, 32, 35, false);
  return `<header class="hud"><div class="row"><div class="side">${mine}<span class="pts"><span class="label">${two ? 'Nós' : 'Você'}</span><b>0</b></span></div>
    <div class="timer"><span class="tt"><img src="${I('timer')}" alt=""><span>00:00</span></span><span class="label">tempo</span></div>
    <div class="side r"><span class="pts"><span class="label">${two ? 'Eles' : 'Adversário'}</span><b>0</b></span>${av('nenhum', 'ela', 's')}</div></div>
    <div class="info"><span class="g"><img src="${I(GAME_ICON[g.id])}" alt=""><b>${g.name}${g.id === 'truco' || g.id === 'buraco' ? ' ' + b.variant : ''}</b><span class="label">· ${b.fmt} · ${g.pts(b.variant)}</span></span><span class="prize"><img src="${I('banknote')}" alt="">${fmt(battlePrize(b))}</span></div></header>`;
}
const RED = s => s === 'C' || s === 'O';
function cardHTML(c, size, down) {
  if (!c || down) return `<div class="card back ${size} ${ST.deck === 'estrela' ? '' : 'dk-' + ST.deck}"><img class="logo" src="${A}ui/logo-mark.svg" alt=""></div>`;
  return `<div class="card ${size} ${RED(c.s) ? 'red' : 'black'}"><span class="rk">${c.r}</span><span class="sm"><svg><use href="#s-${c.s}"/></svg></span><span class="bg"><svg><use href="#s-${c.s}"/></svg></span></div>`;
}
function fitBoard() {
  const j = $('#jogo'), b = $('#board'); if (!j || !b || !j.clientHeight) return;
  const s = Math.min(j.clientWidth / 375, j.clientHeight / 649);
  const top = Math.max(0, (j.clientHeight - 649 * s) / 2);
  b.style.transform = `translateX(-50%) scale(${s})`;
  b.style.top = top + 'px';
  // a arte da mesa cobre toda a área do jogo; o palco interativo fica centralizado
  const offX = (j.clientWidth - 375 * s) / 2 / s, offY = top / s;
  b.querySelectorAll('.mesa').forEach(m => Object.assign(m.style, {inset: 'auto', left: -offX + 'px', top: -offY + 'px', width: 375 + 2 * offX + 'px', height: j.clientHeight / s + 'px'}));
}
if (window.ResizeObserver) new ResizeObserver(() => fitBoard()).observe($('#jogo'));

/* ---------- TRUCO MINEIRO ENGINE ---------- */
const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const SUITS = ['P', 'C', 'E', 'O'];
const MANILHA = {'4P': 14, '7C': 13, 'AE': 12, '7O': 11};
const LADDERS = {Mineiro: [2, 4, 8, 10, 12], Paulista: [1, 3, 6, 9, 12]};
const LAD = () => LADDERS[G && G.variant === 'Paulista' ? 'Paulista' : 'Mineiro'];
const WORD = ['', 'truco', 'seis', 'nove', 'doze'];
const WORD_TXT = ['', 'TRUCO', 'SEIS', 'NOVE', 'DOZE'];
const PSUIT = {O: 1, E: 2, C: 3, P: 4}; // Paulista: pica-fumo < espadilha < copas < zap
const power = c => c.down ? 0 : G && G.variant === 'Paulista' ? (c.r === G.manilha ? 10 + PSUIT[c.s] : RANKS.indexOf(c.r) + 1) : (MANILHA[c.r + c.s] || RANKS.indexOf(c.r) + 1);
// seats: 0 you (bottom), 1 right, 2 partner (top), 3 left. Play order 0→1→2→3 (counterclockwise).
const SEATS = {0: {x: 146, y: 396}, 1: {x: 301, y: 226}, 2: {x: 152, y: 36}, 3: {x: 2, y: 226}};
const SLOT = {0: {x: 167, y: 300, r: 0}, 1: {x: 231, y: 244, r: -84}, 2: {x: 167, y: 186, r: 4}, 3: {x: 103, y: 244, r: 86}};
let G = null;
function newDeck() { const d = []; for (const s of SUITS) for (const r of RANKS) d.push({r, s}); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
function startMatch(tableId) {
  MODE = 'truco'; PF = null; clearInterval(pfT); clearTimeout(pfBotT); BU = null; clearInterval(buT); clearTimeout(buBotT); PK = null; clearInterval(pkT); clearTimeout(pkBotT);
  const one = ST.trucoMode === '1x1';
  G = {
    tableId, variant: ST.variant === 'Paulista' ? 'Paulista' : 'Mineiro', one, players: one ? [
      {name: ST.nick, crew: ST.crew, g: ST.g, team: 0, bot: false}, null,
      {name: OPP.n, crew: OPP.c, g: OPP.g, team: 1, bot: true}, null
    ] : [
      {name: ST.nick, crew: ST.crew, g: ST.g, team: 0, bot: false},
      {name: OPP.n, crew: OPP.c, g: OPP.g, team: 1, bot: true},
      {name: PAR.n, crew: PAR.c, g: PAR.g, team: 0, bot: true},
      {name: OPP2.n, crew: OPP2.c, g: OPP2.g, team: 1, bot: true}
    ], score: [0, 0], dealer: one ? 2 : 3, hands: [[], [], [], []], start: Date.now(), raisedBy: {}
  };
  G.active = G.players.filter(Boolean).length;
  ST.mesaChoice = ST.mesaChoice || 'vermelha';
  show('game'); buildBoard(); renderHUD(); tick(); newHand();
}
let clockT;
function clk() { const M = G || PF || BU || PK; if (!M || !M.start) return '00:00'; const s = Math.floor((Date.now() - M.start) / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function tick() { clearInterval(clockT); clockT = setInterval(() => { const el = $('#clock'); if (el) el.textContent = clk(); }, 1000); }
async function newHand() {
  if (!G) return;
  const d = newDeck();
  G.hands = [[], [], [], []];
  const act = [0, 1, 2, 3].filter(p => G.players[p]);
  for (let k = 0; k < 3; k++) for (const p of act) G.hands[p].push(d.pop());
  if (G.variant === 'Paulista') { G.vira = d.pop(); G.manilha = RANKS[(RANKS.indexOf(G.vira.r) + 1) % RANKS.length]; }
  G.deckLeft = d.length;
  G.hands[0].sort((a, b) => power(a) - power(b));
  G.dealer = nextP(G.dealer); G.turn = nextP(G.dealer); G.round = 0; G.results = []; G.table = []; G.vi = 0; G.last = null; G.pending = null; G.over = false; G.raisedBy = {}; G.leaderOfRound = G.turn; G.flip = {};
  renderHUD(); renderSeats(); renderTable(); renderPote(); renderSeq(); renderHand(); updateActs();
  if (G.variant === 'Paulista') gtoast(`Vira ${G.vira.r}${suitTxt(G.vira.s)} · manilha ${G.manilha}`);
  await wait(500);
  nextTurn();
}
const nextP = p => { let q = (p + 1) % 4; while (G && !G.players[q]) q = (q + 1) % 4; return q; };
function nextTurn() {
  if (!G || G.over) return;
  markTurn(G.turn);
  updateActs();
  if (G.players[G.turn].bot) { const p = G.turn; setTimeout(() => G && !G.over && G.turn === p && !G.pending && botAct(p), rnd(800, 1400)); }
  else startMyTimer();
}
let myT, myLeft;
function startMyTimer() {
  clearInterval(myT); myLeft = 20; setRing(0, 1, 20);
  myT = setInterval(() => { if (!G || G.turn !== 0 || G.pending || G.over) { clearInterval(myT); return; } myLeft--; setRing(0, myLeft / 20, myLeft); if (myLeft <= 0) { clearInterval(myT); playCard(0, 0, false); } }, 1000);
}
function canRaise(team) { return G && !G.pending && !G.over && G.vi < 4 && G.last !== team; }
async function callRaise(p) {
  const team = G.players[p].team;
  G.pending = {team, p, idx: G.vi + 1}; G.last = team;
  clearInterval(myT);
  bubble(p, WORD_TXT[G.pending.idx] + '!');
  updateActs();
  const respTeam = 1 - team;
  await showCall(p, G.pending.idx, respTeam === 0);
  if (respTeam === 1) { await wait(rnd(900, 1500)); botRespond(1); }
  else if (G.players[0].team !== respTeam) { /* never */ }
}
async function respond(team, action) {
  if (!G || !G.pending) return;
  const pend = G.pending;
  const responder = team === 0 ? 0 : bestOf(1);
  if (action === 'run') {
    bubble(responder, 'Corri', 'no');
    G.pending = null;
    const pts = LAD()[G.vi];
    await showAnswer('run', team, pts, responder);
    if (!G) return;
    hideCall();
    endHand(pend.team, pts, G.one ? `${team === 0 ? 'Você correu' : `${OPP.n} correu`} · ${team === 0 ? `${OPP.n}` : 'Você'} +${pts}` : `${team === 0 ? 'Vocês correram' : 'Eles correram'} · ${team === 0 ? 'Eles' : 'Nós'} +${pts}`);
    return;
  }
  G.vi = pend.idx;
  if (action === 'raise' && G.vi < 4) {
    G.pending = null; hideCall();
    setTimeout(() => callRaise(responder), 350);
    return;
  }
  bubble(responder, 'Aceito!', 'ok');
  G.pending = null;
  await showAnswer('acc', team, LAD()[G.vi], responder);
  if (!G) return;
  hideCall();
  renderHUD(); updateActs();
  setTimeout(nextTurn, 300);
}
function bestOf(team) { let best = -1, who = [0, 1, 2, 3].find(p => G.players[p] && G.players[p].team === team); for (const p of [0, 1, 2, 3]) if (G.players[p] && G.players[p].team === team && G.players[p].bot) { const s = strength(p); if (s > best) { best = s; who = p; } } return who; }
function strength(p) { const pw = G.hands[p].map(power).sort((a, b) => b - a); const top2 = (pw[0] || 0) + (pw[1] || 0); const won = G.results.filter(r => r === G.players[p].team).length, lost = G.results.filter(r => r === 1 - G.players[p].team).length; return top2 + won * 4 - lost * 4; }
function botWantsRaise(p) {
  if (!canRaise(G.players[p].team)) return false;
  if (G.raisedBy[p]) return false;
  const s = strength(p), manis = G.hands[p].filter(c => power(c) >= 11).length;
  let prob = s >= 24 ? .45 : s >= 20 ? .22 : s >= 16 ? .08 : .03;
  if (manis >= 2) prob = Math.max(prob, .5);
  if (G.round === 0) prob *= .5;
  if (G.vi >= 1) prob *= .5;
  if (Math.random() < prob) { G.raisedBy[p] = true; return true; }
  return false;
}
function botRespond(team) {
  if (!G || !G.pending) return;
  const who = bestOf(team), s = strength(who), idx = G.pending.idx;
  const need = [0, 15, 18, 21, 23][idx];
  if (s >= need + 5 && idx < 4 && Math.random() < .45) respond(team, 'raise');
  else if (s >= need || (s >= need - 3 && Math.random() < .45)) respond(team, 'accept');
  else respond(team, 'run');
}
function botChooseCard(p) {
  const hand = G.hands[p].map((c, i) => ({c, i, pw: power(c)})).sort((a, b) => a.pw - b.pw);
  const team = G.players[p].team;
  if (!G.table.length) {
    if (G.round === 0) return hand[Math.floor((hand.length - 1) / 2)].i;
    if (G.results[0] === team || G.results[G.results.length - 1] === team) return hand[hand.length - 1].i;
    return hand[hand.length - 1].i;
  }
  let best = -1, bestTeam = null;
  for (const t of G.table) { const pw = power(t.c); if (pw > best) { best = pw; bestTeam = G.players[t.p].team; } else if (pw === best && G.players[t.p].team !== bestTeam) bestTeam = 'E'; }
  const last = G.table.length === G.active - 1;
  if (bestTeam === team && (best >= 9 || last)) return hand[0].i;
  const winners = hand.filter(h => h.pw > best);
  if (winners.length) return winners[0].i;
  const tie = hand.find(h => h.pw === best);
  if (tie && last) return tie.i;
  return hand[0].i;
}
function botAct(p) {
  if (botWantsRaise(p)) { callRaise(p); return; }
  playCard(p, botChooseCard(p), false);
}
async function playCard(p, i, down) {
  if (!G || G.over || G.pending || G.turn !== p) return;
  clearInterval(myT);
  const c = G.hands[p].splice(i, 1)[0];
  const card = {...c, down: !!down};
  G.table.push({p, c: card});
  G.turn = -1; // nobody plays while the card travels and the round resolves (blocks double taps)
  markTurn(-1); renderHandState();
  await animatePlay(p, card, i);
  renderHand(); renderSeats();
  if (G.table.length === G.active) { resolveRound(); return; }
  G.turn = nextP(p);
  nextTurn();
}
async function resolveRound() {
  let best = -1, winP = null, teams = new Set();
  for (const t of G.table) { const pw = power(t.c); if (pw > best) { best = pw; winP = t.p; teams = new Set([G.players[t.p].team]); } else if (pw === best) teams.add(G.players[t.p].team); }
  const res = teams.size > 1 ? 'E' : G.players[winP].team;
  G.results.push(res);
  document.querySelectorAll('.played').forEach(el => { if (+el.dataset.p === winP && res !== 'E') el.classList.add('win'); });
  renderHUD();
  const wc = G.table.find(t => t.p === winP).c;
  const ord = ['1ª', '2ª', '3ª'][G.round];
  gtoast(res === 'E' ? `Empatou a ${ord} rodada` : winP === 0 ? `Seu ${wc.r}${suitTxt(wc.s)} ganhou a ${ord} rodada!` : `${G.players[winP].name} ganhou a ${ord} rodada`);
  await wait(1300);
  const hw = handWinner();
  if (hw !== null) { endHand(hw, LAD()[G.vi]); return; }
  clearPlayed();
  G.round++; G.table = [];
  if (res !== 'E') G.turn = winP; else G.turn = G.leaderOfRound;
  G.leaderOfRound = G.turn;
  renderHand();
  nextTurn();
}
const suitTxt = s => ({P: '♣', C: '♥', E: '♠', O: '♦'})[s];
function handWinner() {
  const r = G.results, a = r.filter(x => x === 0).length, b = r.filter(x => x === 1).length;
  if (a >= 2) return 0; if (b >= 2) return 1;
  if (r.length >= 2) { if (r[0] === 'E' && r[1] !== 'E') return r[1]; if (r[0] !== 'E' && r[1] === 'E') return r[0]; }
  if (r.length === 3) { if (r[2] === 'E') return r[0] !== 'E' ? r[0] : (r[1] !== 'E' ? r[1] : 'X'); if (r[0] === 'E' && r[1] === 'E') return r[2]; return a > b ? 0 : 1; }
  return null;
}
async function endHand(team, pts, msg) {
  if (!G || G.over) return;
  G.over = true; clearInterval(myT); markTurn(-1); updateActs();
  if (team === 'X') gtoast('Mão empatada · ninguém pontua');
  else { G.score[team] = Math.min(12, G.score[team] + pts); gtoast(msg || `${team === 0 ? (G.one ? 'Você' : 'Nós') : (G.one ? `${OPP.n}` : 'Eles')} +${pts} ${pts === LAD()[0] ? (pts === 1 ? 'ponto' : 'pontos') : '· mão trucada'}`); }
  renderHUD();
  await wait(1700);
  clearPlayed();
  if (G.score[0] >= 12 || G.score[1] >= 12) { endMatch(); return; }
  newHand();
}
function endMatch() {
  const win = G.score[0] >= 12, prize = prizeOf(ST.stake);
  if (win) ST.saldo = +(ST.saldo + prize - ST.stake).toFixed(2); else ST.saldo = +(ST.saldo - ST.stake).toFixed(2);
  clearInterval(clockT); clearInterval(myT);
  const P = G.players, one = G.one, tm = one ? '1x1' : '2x2', tid = G.tableId, v = G.variant;
  const pl = k => [P[k].name, P[k].crew, P[k].g];
  showResult({win, sub: win ? (one ? 'Você fechou os 12 pontos' : `Você e ${PAR.n} fecharam os 12 pontos`) : (one ? `${OPP.n} fechou os 12 pontos` : `${OPP.n} e ${OPP2.n} fecharam os 12 pontos`),
    value: win ? `+ ${fmt2(prize)}` : `− ${fmt2(ST.stake)}`, caption: win ? 'Prêmio já está no seu saldo' : 'Valor da entrada',
    ctx: `Mesa ${tid} · Truco ${v} · ${tm}`, gameColor: v === 'Paulista' ? 'var(--game-paulista)' : 'var(--game-truco)',
    left: teamHTML(one ? [pl(0)] : [pl(0), pl(2)], one ? 'Você' : 'Nós', one ? `@${esc(ST.nick)}` : `Você e ${PAR.n}`), score: `${G.score[0]} × ${G.score[1]}`,
    right: teamHTML(one ? [pl(2)] : [pl(1), pl(3)], one ? OPP.n : 'Eles', one ? 'adversário' : `${OPP.n} e ${OPP2.n}`, true),
    hist: `Truco ${v}`, vs: OPP.n, delta: win ? prize - ST.stake : -ST.stake,
    againLabel: ST.training ? 'Treinar de novo' : `${win ? 'Jogar de novo' : 'Revanche'} · ${fmt(ST.stake)}`,
    again: () => { ST.game = 'truco'; ST.variant = v; ST.trucoMode = tm; startQueue(tid); }});
}

/* ---------- GAME RENDER ---------- */
const mesaKey = () => trucoMesa(!!(G && G.variant === 'Paulista'));
function mesaImg() { return `${A}mesa/truco-${mesaKey()}.webp`; }
// felt print: manilhas of the hand (fixed in Mineiro, from the vira in Paulista) + the order of the other cards
function renderSeq() {
  const el = $('#seq'); if (!el || !G) return;
  el.classList.toggle('dark', mesaKey() === 'bar');
  const man = G.variant === 'Paulista' ? ['P', 'C', 'E', 'O'].map(s => `<span><svg><use href="#s-${s}"/></svg>${G.manilha || ''}</span>`).join('') : '<span><svg><use href="#s-P"/></svg>4</span><span><svg><use href="#s-C"/></svg>7</span><span><svg><use href="#s-E"/></svg>A</span><span><svg><use href="#s-O"/></svg>7</span>';
  el.innerHTML = `<span class="man">${man}</span><span>3 2 A K J Q 7 6 5 4</span>`;
}
// pote: deck + (Paulista) the vira peeking out under it, like the DS deck-vira
function renderPote() {
  const el = $('#pote'); if (!el || !G) return;
  el.innerHTML = (G.variant === 'Paulista' && G.vira ? `<div style="position:absolute;left:-10px;top:30px;transform:rotate(90deg)">${cardHTML(G.vira, 'S')}</div>` : '') + [0, 1, 2].map(k => `<div style="position:absolute;left:${k * 4}px;top:${8 - k * 4}px">${cardHTML(null, 'S', true)}</div>`).join('') + `<span class="pill cnt">${G.deckLeft != null ? G.deckLeft : 28}</span>`;
}
function buildBoard() {
  const b = $('#board');
  b.innerHTML = `<div class="mesa" id="mesaBg"></div>
    <div class="seq" id="seq"></div>
    <div class="pote" id="pote" style="left:276px;top:122px"></div>
    ${G && G.one ? '' : '<span class="tagp" style="left:81px;top:63px">Parceira</span>'}
    <div id="seats"></div><div id="fans"></div><div id="playedLayer"></div><div id="handLayer"></div>
    <div class="hint" id="hint"><span class="pill" id="hintTxt">Toque para jogar</span></div>
    <div class="acts" id="acts"><button class="btn secondary" id="runBtn">Correr</button><button class="btn primary" id="trucoBtn">Truco!</button></div>
    <div class="gtoast" id="gtoast"><span class="pill" id="gtoastTxt"></span></div>`;
  $('#mesaBg').style.backgroundImage = `url(${mesaImg()})`; renderSeq(); renderPote();
  $('#runBtn').onclick = () => { if (!G || G.over || G.pending) return; G.over = false; endHand(1, LAD()[G.vi], G.one ? `Você correu · ${OPP.n} +${LAD()[G.vi]}` : `Vocês correram · Eles +${LAD()[G.vi]}`); };
  $('#trucoBtn').onclick = () => { if (G && G.turn === 0 && canRaise(0)) callRaise(0); };
  fitBoard();
}
function renderHUD() {
  if (!G) return;
  const P = G.players, rs = G.results || [];
  const L = G.one ? `${hex(P[0].crew, P[0].g, 32, 35, false)}<span class="pts"><span class="label">Você</span><b>${G.score[0]}</b></span>` : `<span class="stack">${hex(P[0].crew, P[0].g, 32, 35, false)}${hex(PAR.c, PAR.g, 32, 35, false)}</span><span class="pts"><span class="label">Nós</span><b>${G.score[0]}</b></span>`;
  const R = G.one ? `<span class="pts"><span class="label">${OPP.n}</span><b>${G.score[1]}</b></span>${hex(OPP.c, OPP.g, 32, 35, false)}` : `<span class="pts"><span class="label">Eles</span><b>${G.score[1]}</b></span><span class="stack">${hex(OPP.c, OPP.g, 32, 35, false)}${hex(OPP2.c, OPP2.g, 32, 35, false)}</span>`;
  $('#hud').innerHTML = `<div class="row">
    <div class="side">${L}</div>
    <div class="timer"><span class="tt"><img src="${A}icons/timer.webp" alt=""><span id="clock">${clk()}</span></span><span class="rounds">${[0, 1, 2].map(k => `<i class="${rs[k] === 0 ? 'a' : rs[k] === 1 ? 'b' : rs[k] === 'E' ? 'e' : ''}"></i>`).join('')}</span></div>
    <div class="side r">${R}</div></div>
    <div class="info"><span class="g"><img src="${A}icons/truco.webp" alt=""><b>Truco ${G.variant}</b><span class="label">· ${G.one ? '1x1' : '2x2'} · mão vale <span class="vale-tag">${LAD()[G.vi || 0]}</span></span></span><span class="prize"><img src="${A}icons/banknote.webp" alt="">${fmt(+(ST.stake * 1.8).toFixed(2))}</span></div>`;
}
const RING_C = 2 * Math.PI * 40;
function seatHTML(p) {
  const P = G.players[p], s = SEATS[p], big = p === 0;
  return `<div class="seat" id="seat${p}" style="left:${s.x - (big ? 6 : 6)}px;top:${s.y - 8}px">
    <div class="avbox"><svg class="ring" viewBox="0 0 84 84"><circle class="tr" cx="42" cy="42" r="40"/><circle class="pg" cx="42" cy="42" r="40" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/></svg>${hex(P.crew, P.g, 56, 60)}<span class="pill secs" id="secs${p}">15s</span></div>
    <span class="nick">${P.name}</span><span class="bubble" id="bub${p}"></span></div>`;
}
function renderSeats() {
  $('#seats').innerHTML = [0, 1, 2, 3].filter(p => G.players[p]).map(seatHTML).join('');
  // fans of backs
  const fan = (p) => { const n = G.hands[p].length, s = SEATS[p]; let out = ''; for (let k = 0; k < n; k++) { let x, y, r; if (p === 2) { x = s.x + 74 + k * 12; y = s.y + 8; r = 8 + k * 10; } else { x = s.x + 22 + (k - 1) * 12; y = s.y + 92; r = (k - 1) * 16; } out += `<div style="position:absolute;left:${x}px;top:${y}px;transform:rotate(${r}deg)">${cardHTML(null, 'XS', true)}</div>`; } return out; };
  $('#fans').innerHTML = [1, 2, 3].filter(p => G.players[p]).map(fan).join('');
  if (G.turn != null && !G.over) markTurn(G.turn);
}
function markTurn(p) {
  document.querySelectorAll('.seat').forEach(s => s.classList.remove('turn'));
  if (p >= 0) { const s = $('#seat' + p); if (s) s.classList.add('turn'); if (p !== 0) setRing(p, 1, ''); }
}
function setRing(p, frac, secs) { const s = $('#seat' + p); if (!s) return; s.querySelector('.pg').setAttribute('stroke-dashoffset', String(RING_C * (1 - frac))); const t = $('#secs' + p); if (t) t.textContent = secs === '' ? '…' : secs + 's'; }
function renderTable() { $('#playedLayer').innerHTML = ''; }
function clearPlayed() { document.querySelectorAll('.played').forEach(el => { el.style.opacity = '0'; }); setTimeout(() => { const l = $('#playedLayer'); if (l) l.innerHTML = ''; }, 320); }
const HAND_POS = n => n === 3 ? [[75, 504, 8], [156, 498, 0], [237, 504, -8]] : n === 2 ? [[116, 500, 4], [196, 500, -4]] : [[156, 498, 0]];
function renderHand() {
  if (!G) return;
  const h = G.hands[0], pos = HAND_POS(h.length);
  const my = G.turn === 0 && !G.pending && !G.over;
  $('#handLayer').innerHTML = h.map((c, i) => { const [x, y, r] = pos[i]; const down = !!G.flip[i]; return `<button class="handcard ${my ? '' : 'disabled'}" data-i="${i}" style="left:${x}px;top:${y - (down ? 14 : 0)}px;transform:rotate(${r}deg)" aria-label="${down ? 'carta virada' : c.r + ' de ' + ({P: 'paus', C: 'copas', E: 'espadas', O: 'ouros'})[c.s]}">${cardHTML(c, 'L', down)}</button>`; }).join('');
  bindHand();
}
function updateActs() {
  if (!G) return;
  const my = G.turn === 0 && !G.pending && !G.over;
  const tb = $('#trucoBtn'), rb = $('#runBtn');
  tb.disabled = !(my && canRaise(0)); tb.textContent = G.vi < 4 ? WORD_TXT[G.vi + 1].charAt(0) + WORD_TXT[G.vi + 1].slice(1).toLowerCase() + '!' : 'Doze!';
  rb.disabled = !my;
  $('#hintTxt').textContent = my ? (G.round === 0 ? 'Sua vez · toque na carta para jogar' : 'Toque para jogar · segure para virar') : (G.pending ? 'Aguardando resposta…' : `Vez de ${G.players[G.turn] ? G.players[G.turn].name : ''}`);
  if (G.over) $('#hintTxt').textContent = 'Fim da mão';
  renderHandState();
}
function renderHandState() { const my = G && G.turn === 0 && !G.pending && !G.over; document.querySelectorAll('.handcard').forEach(b => b.classList.toggle('disabled', !my)); }
function bindHand() {
  document.querySelectorAll('.handcard').forEach(b => {
    let t, long = false;
    const i = +b.dataset.i;
    b.onpointerdown = () => { long = false; t = setTimeout(() => { long = true; if (!G || G.turn !== 0 || G.pending) return; if (G.round === 0) { gtoast('Encoberta só a partir da 2ª rodada'); return; } G.flip[i] = !G.flip[i]; if (navigator.vibrate) navigator.vibrate(15); renderHand(); }, 450); };
    b.onpointerup = b.onpointerleave = () => clearTimeout(t);
    b.oncontextmenu = e => e.preventDefault();
    b.onclick = () => { if (long) return; if (!G || G.turn !== 0 || G.pending || G.over) { if (G && !G.over) gtoast(G.pending ? 'Responda o truco primeiro' : (G.players[G.turn] ? `Espere sua vez · vez de ${G.players[G.turn].name}` : 'Espere sua vez')); return; } playCard(0, i, !!G.flip[i]); G.flip = {}; };
  });
}
async function animatePlay(p, card, i) {
  const layer = $('#playedLayer'), sl = SLOT[p];
  let sx, sy, sr;
  if (p === 0) { const pos = HAND_POS(G.hands[0].length + 1)[i] || [156, 498, 0]; sx = pos[0] + 12; sy = pos[1] + 16; sr = pos[2]; }
  else { const s = SEATS[p]; sx = s.x + 16; sy = s.y + 16; sr = sl.r; }
  const el = document.createElement('div');
  el.className = 'played'; el.dataset.p = p;
  el.style.left = sx + 'px'; el.style.top = sy + 'px'; el.style.transform = `rotate(${sr}deg) scale(${p === 0 ? 1.3 : .8})`;
  el.innerHTML = cardHTML(card, 'S', card.down);
  layer.appendChild(el);
  if (p === 0) { const hc = document.querySelector(`.handcard[data-i="${i}"]`); if (hc) hc.style.opacity = '0'; }
  await wait(20);
  el.style.left = sl.x + 'px'; el.style.top = sl.y + 'px'; el.style.transform = `rotate(${sl.r + rnd(-4, 4)}deg)`;
  await wait(380);
}
function bubble(p, txt, kind) { const b = $('#bub' + p); if (!b) return; b.textContent = txt; b.className = 'bubble show' + (kind ? ' ' + kind : ''); setTimeout(() => b.classList.remove('show'), 1600); }
let gtT;
function gtoast(msg) { const g = $('#gtoast'); if (!g) return; $('#gtoastTxt').textContent = msg; g.classList.add('show'); clearTimeout(gtT); gtT = setTimeout(() => g.classList.remove('show'), 1700); }

/* ---------- CALL OVERLAY ---------- */
function showCall(p, idx, youRespond) {
  return new Promise(res => {
    const P = G.players[p];
    const video = P.crew === 'nenhum' ? `<img class="empty" src="${A}ui/avatar_empty.webp" alt="">` : `<video src="${A}video/call/${P.crew}_${P.g}.mp4" autoplay muted loop playsinline preload="auto" poster="${A}video/call/${P.crew}_${P.g}.webp"></video>`;
    const embers = Array.from({length: 14}, (_, k) => `<i class="ember" style="left:${5 + k * 6.6}%;--dx:${(k % 2 ? 1 : -1) * (10 + (k % 3) * 12)}px;animation-delay:${(.12 + k * .1).toFixed(2)}s"></i>`).join('');
    const nextLabel = idx < 4 ? 'Pedir ' + WORD_TXT[idx + 1] + '!' : '';
    const who = p === 0 ? 'Você pediu' : `${P.name} pediu`;
    $('#overlay').innerHTML = `<div class="call" id="call"><div class="veil2"></div><div class="fire fireA"></div><div class="fire fireB"></div><div class="glow"></div>${embers}
      <div class="who">${video}</div>
      <div class="content"><span class="pill">${who}</span><img class="word" src="${A}ui/word_${WORD[idx]}.webp" alt="${WORD_TXT[idx]}!"><span class="pill vale">vale ${LAD()[idx]}</span></div>
      ${youRespond ? `<div class="resp">${nextLabel ? `<button class="btn danger" id="cRaise" style="width:220px">${nextLabel}</button>` : ''}<div class="row"><button class="btn secondary" id="cRun">Correr</button><button class="btn primary" id="cOk">Aceitar</button></div></div>` : `<span class="pill wait">${p === 0 || G.players[p].team === 0 ? 'Esperando a resposta deles…' : ''}</span>`}</div>`;
    if (youRespond) {
      $('#cRun').onclick = () => respond(0, 'run');
      $('#cOk').onclick = () => respond(0, 'accept');
      const r = $('#cRaise'); if (r) r.onclick = () => respond(0, 'raise');
    }
    setTimeout(res, youRespond ? 700 : 1500);
  });
}
function hideCall() { const c = $('#call'); if (c) { c.style.transition = 'opacity .25s'; c.style.opacity = '0'; setTimeout(() => { if ($('#call') === c) $('#overlay').innerHTML = ''; }, 260); } }
// resposta ao truco: o mesmo overlay do pedido continua e muda de clima
// aceitou → o fogo cresce e solta mais brasa · correu → o fogo apaga, sobe fumaça e a palavra cai ("deu ruim")
function showAnswer(kind, team, pts, rp) {
  return new Promise(res => {
    const acc = kind === 'acc', one = G.one;
    const word = acc ? (one ? 'aceitou' : 'aceitaram') : (one ? 'correu' : 'correram');
    const who = team === 0 ? (one ? (acc ? 'Você aceitou' : 'Você correu') : (acc ? 'Vocês aceitaram' : 'Vocês correram')) : (one ? `${OPP.n} ${acc ? 'aceitou' : 'correu'}` : (acc ? 'Eles aceitaram' : 'Eles correram'));
    const tail = acc ? `a mão vale ${pts}` : (team === 0 ? (one ? `${OPP.n} leva +${pts}` : `Eles levam +${pts}`) : (one ? `Você leva +${pts}` : `Nós levamos +${pts}`));
    let c = $('#call');
    if (!c) {
      $('#overlay').innerHTML = `<div class="call" id="call"><div class="veil2"></div><div class="fire fireA"></div><div class="fire fireB"></div><div class="glow"></div><div class="content"></div></div>`;
      c = $('#call');
    }
    c.querySelectorAll('.resp,.wait').forEach(n => n.remove());
    // o círculo passa a mostrar quem respondeu
    const R = G.players[rp];
    if (R) { let w = c.querySelector('.who'); if (!w) { c.querySelector('.content').insertAdjacentHTML('beforebegin', '<div class="who"></div>'); w = c.querySelector('.who'); }
      w.innerHTML = R.crew === 'nenhum' ? `<img class="empty" src="${A}ui/avatar_empty.webp" alt="">` : `<video src="${A}video/call/${R.crew}_${R.g}.mp4" autoplay muted loop playsinline preload="auto" poster="${A}video/call/${R.crew}_${R.g}.webp"></video>`; }
    const embers = acc ? Array.from({length: 22}, (_, k) => `<i class="ember hot" style="left:${3 + k * 4.4}%;--dx:${(k % 2 ? 1 : -1) * (14 + (k % 4) * 14)}px;animation-delay:${(k * .05).toFixed(2)}s"></i>`).join('')
      : `<div class="smoke">${Array.from({length: 14}, (_, k) => `<i style="left:${4 + k * 7}%;bottom:${-80 + (k % 4) * 60}px;--dx:${(k % 2 ? 1 : -1) * (16 + (k % 3) * 22)}px;--s:${(1.3 + (k % 3) * .4).toFixed(2)};animation-delay:${(.1 + (k % 6) * .1).toFixed(2)}s"></i>`).join('')}</div>`;
    c.insertAdjacentHTML('beforeend', embers);
    const ct = c.querySelector('.content');
    // pontos para o nosso lado (eles correram) = pílula verde
    const good = !acc && team === 1;
    ct.innerHTML = `<span class="pill">${who}</span><img class="word ans" src="${A}ui/word_${word}.webp" alt="${word.toUpperCase()}"><span class="pill vale${good ? ' pos' : ''}">${tail}</span>`;
    c.classList.add(acc ? 'acc' : 'run');
    setTimeout(res, acc ? 1700 : 2300);
  });
}

/* ---------- PIF-PAF ENGINE (Cacheta · 1x1 contra bot) ---------- */
// 2 baralhos de 52 (104 cartas), 9 cartas cada. Na vez: compra (monte ou lixo) e descarta 1.
// Bate quem, depois de comprar, fecha 9 das 10 cartas em jogos (trinca = mesmo valor e naipes diferentes; sequência = mesmo naipe, A-2-3 ou Q-K-A, sem dar a volta). Vence quem bater 2 vezes.
const PR = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const rv = r => PR.indexOf(r) + 1;
const cardTxt = c => c.r + suitTxt(c.s);
let PF = null, MODE = 'truco', pfT, pfLeft, pfBotT;
const isPifSel = () => ST.game === 'cacheta' && (ST.variant === 'Pif-Paf' || ST.variant === 'Cacheta');
function isTrinca(cs) { return cs.length >= 3 && cs.length <= 4 && cs.every(c => c.r === cs[0].r) && new Set(cs.map(c => c.s)).size === cs.length; }
function isSeq(cs) {
  if (cs.length < 3 || !cs.every(c => c.s === cs[0].s)) return false;
  const run = vs => vs.every((v, i) => i === 0 || v === vs[i - 1] + 1);
  const lo = cs.map(c => rv(c.r)).sort((a, b) => a - b);
  return run(lo) || run(lo.map(v => v === 1 ? 14 : v).sort((a, b) => a - b));
}
// Cacheta: a vira fica separada a mão toda; o curinga é a carta seguinte à vira no mesmo naipe (2 cópias), no máximo 1 por jogo e só em sequência. Curinga descartado vira carta comum.
const isWild = c => !!(PF && PF.rules === 'cacheta' && PF.wild && c.r === PF.wild.r && c.s === PF.wild.s && !(PF.deadWild && PF.deadWild.has(c.id)));
function seqWithWild(cs) {
  if (cs.length < 3) return false;
  const w = cs.filter(isWild), nat = cs.filter(c => !isWild(c));
  if (w.length !== 1 || nat.length < 2 || !nat.every(c => c.s === nat[0].s)) return false;
  for (const aceHi of [false, true]) {
    if (aceHi && !nat.some(c => c.r === 'A')) continue;
    const pos = nat.map(c => c.r === 'A' ? (aceHi ? 14 : 1) : rv(c.r)).sort((a, b) => a - b);
    if (new Set(pos).size !== pos.length) continue;
    const gaps = pos[pos.length - 1] - pos[0] + 1 - pos.length;
    if (gaps === 1 || (gaps === 0 && (pos[pos.length - 1] < 14 || pos[0] > 1))) return true;
  }
  return false;
}
const meldKind = cs => isTrinca(cs) ? 'trinca' : isSeq(cs) ? 'seq' : seqWithWild(cs) ? 'seq' : null;
function sortMeld(cs) {
  if (!isTrinca(cs) && !isSeq(cs) && cs.some(isWild)) {
    const w = cs.find(isWild), nat = cs.filter(c => c !== w), hi0 = nat.some(c => c.r === 'K') && nat.some(c => c.r === 'A');
    const v0 = c => hi0 && c.r === 'A' ? 14 : rv(c.r), so = nat.slice().sort((a, b) => v0(a) - v0(b));
    for (let i = 1; i < so.length; i++) if (v0(so[i]) - v0(so[i - 1]) === 2) { so.splice(i, 0, w); return so; }
    return v0(so[so.length - 1]) < 14 ? [...so, w] : [w, ...so];
  }
  if (isTrinca(cs)) return cs.slice().sort((a, b) => SUITS.indexOf(a.s) - SUITS.indexOf(b.s));
  const hi = cs.some(c => c.r === 'K') && cs.some(c => c.r === 'A');
  const v = c => hi && c.r === 'A' ? 14 : rv(c.r);
  return cs.slice().sort((a, b) => v(a) - v(b));
}
// splits ALL the cards into jogos (3+ each), or null
function partition(cards) {
  if (!cards.length) return [];
  const [c0, ...rest] = cards, cand = rest.filter(c => c.r === c0.r || c.s === c0.s || isWild(c) || isWild(c0)), n = cand.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const m = [c0]; for (let k = 0; k < n; k++) if (mask >> k & 1) m.push(cand[k]);
    if (m.length < 3 || !meldKind(m)) continue;
    const sub = partition(rest.filter(c => !m.includes(c))); if (sub) return [m, ...sub];
  }
  return null;
}
// with 10 cards in hand: every card you can discard and still bater
function baterOptions(hand, forbidId) {
  const out = [];
  if (hand.length !== 10) return out;
  if (PF && PF.rules === 'cacheta') { const all = partition(hand); if (all) out.push({i: -1, melds: all, ten: true}); }
  hand.forEach((c, i) => { if (c.id === forbidId) return; const melds = partition(hand.filter((_, k) => k !== i)); if (melds) out.push({i, melds}); });
  return out;
}
const hv = c => rv(c.r) === 1 ? 14 : rv(c.r);
function nearPair(a, b) {
  if (a.r === b.r) return a.s !== b.s;
  if (a.s !== b.s) return false;
  const d = Math.abs(rv(a.r) - rv(b.r)), dh = Math.abs(hv(a) - hv(b));
  return (d >= 1 && d <= 2) || (dh >= 1 && dh <= 2);
}
const bySuitRank = (a, b) => SUITS.indexOf(a.s) - SUITS.indexOf(b.s) || rv(a.r) - rv(b.r);
// Ordenar: the disjoint jogos covering most cards, then the "falta 1" pairs, then the sobras
function grouping(cards) {
  const all = [], n = cards.length;
  for (let mask = 7; mask < 1 << n; mask++) {
    const m = cards.filter((_, k) => mask >> k & 1);
    if (m.length < 3) continue;
    const kind = meldKind(m); if (kind) all.push({mask, kind, cards: m});
  }
  let best = {cover: 0, set: []};
  const dfs = (start, used, set, cover) => {
    if (cover > best.cover) best = {cover, set: set.slice()};
    for (let i = start; i < all.length; i++) if (!(all[i].mask & used)) { set.push(all[i]); dfs(i + 1, used | all[i].mask, set, cover + all[i].cards.length); set.pop(); }
  };
  dfs(0, 0, [], 0);
  const used = best.set.reduce((m, x) => m | x.mask, 0);
  let left = cards.filter((_, k) => !(used >> k & 1));
  const pairs = [];
  for (let a = 0; a < left.length; a++) for (let b = a + 1; b < left.length; b++) if (nearPair(left[a], left[b])) pairs.push([left[a], left[b], left[a].r === left[b].r ? 1 : Math.min(Math.abs(rv(left[a].r) - rv(left[b].r)), Math.abs(hv(left[a]) - hv(left[b])))]);
  pairs.sort((x, y) => x[2] - y[2]);
  const near = [], taken = new Set();
  for (const [a, b] of pairs) if (!taken.has(a) && !taken.has(b)) { taken.add(a); taken.add(b); near.push(sortMeld([a, b])); }
  left = left.filter(c => !taken.has(c)).sort(bySuitRank);
  return {melds: best.set.map(x => ({kind: x.kind, cards: sortMeld(x.cards)})), near, sobras: left, cover: best.cover};
}
function evalHand(cards) {
  const g = grouping(cards);
  let conn = 0;
  for (let a = 0; a < g.sobras.length; a++) for (let b = a + 1; b < g.sobras.length; b++) { const x = g.sobras[a], y = g.sobras[b]; if (x.s === y.s && Math.abs(rv(x.r) - rv(y.r)) <= 3) conn++; }
  return g.cover * 10 + g.near.length * 4 + conn * .5;
}
// least useful card (bot discard and the timeout auto-play)
function worstCard(hand, forbidId) {
  let best = -Infinity, idx = 0;
  hand.forEach((c, i) => { if (c.id === forbidId) return; const e = evalHand(hand.filter((_, k) => k !== i)) + Math.random() * .4 + rv(c.r) * .01; if (e > best) { best = e; idx = i; } });
  return idx;
}
function botWantsLixo(hand, top) {
  if (!top) return false;
  const withTop = [...hand, top];
  if (baterOptions(withTop, top.id).length) return true;
  const now = evalHand(hand);
  const after = Math.max(...hand.map((_, i) => evalHand(withTop.filter((_, k) => k !== i))));
  return after >= now + 4;
}
function newPifDeck() {
  const d = []; let id = 0;
  for (let k = 0; k < 2; k++) for (const s of SUITS) for (const r of PR) d.push({r, s, id: id++});
  return shuffle(d);
}
function shuffle(d) { for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }

function startPif(tableId) {
  clearInterval(myT); MODE = 'pif'; G = null; BU = null; PK = null; clearInterval(pkT); clearTimeout(pkBotT); clearInterval(buT); clearTimeout(buBotT);
  PF = {tableId, players: [{name: ST.nick, crew: ST.crew, g: ST.g}, {name: OPP.n, crew: OPP.c, g: OPP.g}],
    score: [0, 0], results: [], hands: [[], []], monte: [], lixo: [], turn: 0, phase: 'wait', starter: 1, start: Date.now(),
    sel: null, newId: null, newTag: '', fromLixoId: null, sorted: false, groups: null, tags: null, melds: null, winner: null, note: '',
    rules: ST.variant === 'Cacheta' ? 'cacheta' : 'pif', lives: [5, 5], vira: null, wild: null, deadWild: new Set(), loss: 0};
  show('game'); buildPifBoard(); renderPifHUD(); tick(); pifNewHand();
}
async function pifNewHand() {
  if (!PF) return;
  const d = newPifDeck();
  PF.hands = [d.splice(0, 9).sort(bySuitRank), d.splice(0, 9)];
  PF.lixo = [d.pop()]; PF.monte = d; PF.deadWild = new Set();
  if (PF.rules === 'cacheta') { PF.vira = d.pop(); PF.wild = {r: PR[(PR.indexOf(PF.vira.r) + 1) % PR.length], s: PF.vira.s}; } else { PF.vira = null; PF.wild = null; }
  PF.starter = 1 - PF.starter; PF.turn = PF.starter;
  Object.assign(PF, {phase: 'wait', sel: null, newId: null, fromLixoId: null, sorted: false, groups: null, tags: null, melds: null, winner: null});
  PF.note = PF.turn === 0 ? 'Nova mão · você começa' : `Nova mão · ${OPP.n} começa`;
  if (PF.rules === 'cacheta') PF.note += ` · curinga ${cardTxt(PF.wild)}`;
  buildPifBoard(); renderPifHUD(); renderPifSeats(); renderPif();
  await wait(1100);
  pifTurn();
}
function pifTurn() {
  if (!PF || PF.phase === 'over') return;
  PF.phase = 'draw'; PF.sel = null; PF.fromLixoId = null; PF.note = '';
  markTurn(PF.turn); renderPif();
  if (PF.turn === 1) { clearTimeout(pfBotT); pfBotT = setTimeout(pifBotDraw, rnd(800, 1400)); }
  else startPifTimer();
}
function startPifTimer() {
  clearInterval(pfT); pfLeft = 30; setRing(0, 1, 30);
  pfT = setInterval(() => { if (!PF || PF.turn !== 0 || PF.phase === 'over') { clearInterval(pfT); return; } pfLeft--; setRing(0, pfLeft / 30, pfLeft); if (pfLeft <= 0) { clearInterval(pfT); pifAuto(); } }, 1000);
}
async function pifAuto() { // time is up: draw from the monte, then bater or drop the worst card
  if (!PF) return;
  if (PF.phase === 'draw') { pifDraw(0, 'monte'); await wait(500); }
  if (!PF || PF.turn !== 0 || PF.phase !== 'discard') return;
  gtoast('Tempo esgotado · jogamos por você');
  const bo = baterOptions(PF.hands[0], PF.fromLixoId);
  if (bo.length) pifBater(0, (bo.find(o => o.ten) || bo[0]).i); else pifDiscard(0, worstCard(PF.hands[0], PF.fromLixoId));
}
function pifRefill() { if (PF.lixo.length < 2) return; const top = PF.lixo.pop(); PF.monte = shuffle(PF.lixo); PF.lixo = [top]; gtoast('O monte acabou · o lixo foi embaralhado'); }
async function pifEmpty() {
  clearInterval(pfT); clearTimeout(pfBotT); PF.phase = 'over'; markTurn(-1);
  gtoast('Acabaram as cartas · mão empatada'); renderPif();
  await wait(2200); if (PF) pifNewHand();
}
function pifDraw(p, from) {
  if (!PF || PF.turn !== p || PF.phase !== 'draw') return false;
  if (from === 'lixo' && !PF.lixo.length) return false;
  if (from === 'monte' && !PF.monte.length) pifRefill();
  if (from === 'monte' && !PF.monte.length) { pifEmpty(); return false; }
  const c = from === 'lixo' ? PF.lixo.pop() : PF.monte.pop();
  PF.hands[p].push(c);
  if (from === 'lixo') PF.fromLixoId = c.id;
  if (p === 0) { PF.newId = c.id; PF.newTag = from === 'lixo' ? 'Do lixo' : 'Nova'; if (PF.groups) { PF.groups = [...PF.groups, 1]; PF.tags = [...PF.tags, null]; } }
  else { PF.note = from === 'lixo' ? `${OPP.n} pegou o ${cardTxt(c)} do lixo` : `${OPP.n} comprou do monte`; renderPifFan(); }
  PF.phase = 'discard';
  renderPif();
  return true;
}
function pifTapCard(id) {
  if (!PF || PF.phase === 'over') return;
  if (PF.turn !== 0 || PF.phase === 'wait') { gtoast(`Espere sua vez · vez de ${OPP.n}`); return; }
  if (PF.phase === 'draw') { gtoast('Compre do monte ou do lixo primeiro'); return; }
  if (PF.sel === id) { pifDiscard(0, PF.hands[0].findIndex(c => c.id === id)); return; }
  PF.sel = id; renderPif();
}
async function pifDiscard(p, i) {
  if (!PF || PF.turn !== p || PF.phase !== 'discard') return;
  const c = PF.hands[p][i]; if (!c) return;
  if (c.id === PF.fromLixoId) { if (p === 0) gtoast('A carta que veio do lixo não pode voltar pra ele'); return; }
  PF.hands[p].splice(i, 1); PF.lixo.push(c); if (isWild(c)) PF.deadWild.add(c.id);
  Object.assign(PF, {sel: null, newId: null, phase: 'wait'});
  if (p === 0) { clearInterval(pfT); if (PF.sorted) pifSort(); markTurn(-1); }
  else { PF.note = `${OPP.n} descartou o ${cardTxt(c)}`; renderPifFan(); markTurn(-1); }
  renderPif(true);
  await wait(p === 0 ? 450 : 900);
  if (!PF || PF.phase === 'over') return;
  PF.turn = 1 - p; pifTurn();
}
async function pifBater(p, i) {
  if (!PF || PF.turn !== p || PF.phase !== 'discard') return;
  const opts = baterOptions(PF.hands[p], PF.fromLixoId), bo = opts.find(o => o.i === i && i >= 0) || opts.find(o => o.ten) || opts[0];
  if (!bo) return;
  if (bo.i >= 0) PF.lixo.push(PF.hands[p][bo.i]);
  clearInterval(pfT); clearTimeout(pfBotT);
  Object.assign(PF, {phase: 'over', winner: p, sel: null, newId: null, melds: bo.melds.map(m => ({cards: sortMeld(m), kind: meldKind(m)}))});
  PF.hands[p] = [];
  PF.score[p]++; PF.results.push(p);
  if (PF.rules === 'cacheta') { PF.loss = bo.ten ? 2 : 1; PF.lives[1 - p] = Math.max(0, PF.lives[1 - p] - PF.loss); }
  markTurn(-1); renderPifHUD(); renderPifFan(); renderPif();
  bubble(p, bo.ten ? 'Bati com 10!' : 'Bati!', 'ok');
  const final = PF.rules === 'cacheta' ? PF.lives[1 - p] <= 0 : PF.score[p] >= 2;
  for (let s = 5; s > 0; s--) { if (!PF) return; pifCountdown(s, final); await wait(1000); }
  if (!PF) return;
  if (final) { pifEndMatch(); return; }
  pifNewHand();
}
function pifCountdown(s, final) {
  const nxt = `${final ? 'resultado' : 'próxima mão'} em ${s}s`;
  const cach = PF.rules === 'cacheta', vid = n => `${n} ${n === 1 ? 'vida' : 'vidas'}`;
  if (PF.winner === 0) { pifMsg(cach ? `Você bateu${PF.loss === 2 ? ' com 10' : ''}! ${OPP.n} perde ${vid(PF.loss)}` : `Você bateu! Pif-Paf com ${PF.melds.length} jogos`); $('#pfHint').hidden = false; $('#pfHintTx').textContent = `${cach ? `${OPP.n} fica com ${vid(PF.lives[1])}` : '+1 ponto'} · ${nxt}`; }
  else { pifMsg(cach ? `${OPP.n} bateu${PF.loss === 2 ? ' com 10' : ''}! Você perde ${vid(PF.loss)} · ${nxt}` : `${OPP.n} bateu! ${nxt.charAt(0).toUpperCase() + nxt.slice(1)}`); $('#pfHint').hidden = true; }
}
function pifEndMatch() {
  const cach = PF.rules === 'cacheta', win = cach ? PF.lives[1] <= 0 : PF.score[0] >= 2, prize = prizeOf(ST.stake);
  if (win) ST.saldo = +(ST.saldo + prize - ST.stake).toFixed(2); else ST.saldo = +(ST.saldo - ST.stake).toFixed(2);
  clearInterval(clockT); clearInterval(pfT); clearTimeout(pfBotT);
  const P = PF.players, tid = PF.tableId, v = cach ? 'Cacheta' : 'Pif-Paf';
  showResult({win, sub: cach ? (win ? `${OPP.n} ficou sem vidas` : 'Suas vidas acabaram') : (win ? 'Você bateu 2 vezes' : `${OPP.n} bateu 2 vezes`),
    value: win ? `+ ${fmt2(prize)}` : `− ${fmt2(ST.stake)}`, caption: win ? 'Prêmio já está no seu saldo' : 'Valor da entrada',
    ctx: `Mesa ${tid} · ${v} · 1x1`, gameColor: 'var(--game-cacheta)',
    left: teamHTML([[P[0].name, P[0].crew, P[0].g]], 'Você', cach ? 'vidas' : 'batidas'), score: cach ? `${PF.lives[0]} × ${PF.lives[1]}` : `${PF.score[0]} × ${PF.score[1]}`,
    right: teamHTML([[P[1].name, P[1].crew, P[1].g]], OPP.n, cach ? 'vidas' : 'batidas', true),
    hist: v, vs: OPP.n, delta: win ? prize - ST.stake : -ST.stake,
    againLabel: ST.training ? 'Treinar de novo' : `${win ? 'Jogar de novo' : 'Revanche'} · ${fmt(ST.stake)}`,
    again: () => { ST.game = 'cacheta'; ST.variant = v; startQueue(tid); }});
}
function pifBotDraw() {
  if (!PF || PF.turn !== 1 || PF.phase !== 'draw') return;
  const top = PF.lixo[PF.lixo.length - 1];
  if (!pifDraw(1, botWantsLixo(PF.hands[1], top) ? 'lixo' : 'monte')) return;
  pfBotT = setTimeout(pifBotDiscard, rnd(700, 1200));
}
function pifBotDiscard() {
  if (!PF || PF.turn !== 1 || PF.phase !== 'discard') return;
  const bo = baterOptions(PF.hands[1], PF.fromLixoId);
  if (bo.length) pifBater(1, (bo.find(o => o.ten) || bo[0]).i); else pifDiscard(1, worstCard(PF.hands[1], PF.fromLixoId));
}
function pifSort() {
  const g = grouping(PF.hands[0]), order = [], groups = [], tags = [];
  for (const m of g.melds) { order.push(...m.cards); groups.push(m.cards.length); tags.push([m.kind === 'seq' ? 'Sequência' : 'Trinca', 'ok']); }
  for (const m of g.near) { order.push(...m); groups.push(2); tags.push(['Falta 1', 'neutral']); }
  if (g.sobras.length) { order.push(...g.sobras); groups.push(g.sobras.length); tags.push(null); }
  Object.assign(PF, {groups, tags, sorted: true}); PF.hands[0] = order;
}

/* ---------- PIF-PAF RENDER ---------- */
function buildPifBoard() {
  const b = $('#board');
  b.innerHTML = `<div class="mesa" id="mesaBg" style="background-image:url(${A}mesa/${capsuleMesa('roxa')}.webp)"></div>
    <div id="pfFan"></div><div id="seats"></div>
    <div class="tmsg" id="pfMsg"><span class="su">${SUITS.map(s => `<svg style="fill:${RED(s) ? '#e5484d' : '#fff'}"><use href="#s-${s}"/></svg>`).join('')}</span><span class="tx" id="pfMsgTx"></span></div>
    <button class="pile" id="pfMonte" style="left:130px;top:264px;width:48px;height:72px" aria-label="Monte"></button>
    <button class="pile" id="pfLixo" style="left:206px;top:268px;width:40px;height:64px" aria-label="Lixo"></button>
    <div id="pfVira" style="position:absolute;left:0;top:0;width:375px;height:649px;pointer-events:none;z-index:4"></div>
    <div class="pdica" id="pfDica">toque no monte ou no lixo</div>
    <div id="pfMelds"></div><div id="pfTags"></div><div id="handLayer"></div>
    <div class="hint" id="pfHint" style="top:432px" hidden><span class="pill" id="pfHintTx"></span></div>
    <div class="pacts" id="pfActs" style="top:545px"><button class="btn secondary" id="pfL">Ordenar</button><button class="btn primary" id="pfR">Descartar</button></div>
    <div class="gtoast" id="gtoast"><span class="pill" id="gtoastTxt"></span></div>`;
  $('#pfMonte').onclick = () => {
    if (!PF || PF.phase === 'over') return;
    if (PF.turn !== 0 || PF.phase === 'wait') { gtoast(`Espere sua vez · vez de ${OPP.n}`); return; }
    if (PF.phase === 'discard') { gtoast('Você já comprou · agora descarte uma carta'); return; }
    pifDraw(0, 'monte');
  };
  $('#pfLixo').onclick = () => {
    if (!PF || PF.phase === 'over') return;
    if (PF.turn !== 0 || PF.phase === 'wait') { gtoast(`Espere sua vez · vez de ${OPP.n}`); return; }
    if (PF.phase === 'draw') { if (!pifDraw(0, 'lixo')) gtoast('O lixo está vazio'); return; }
    if (PF.sel == null) { gtoast('Toque numa carta para descartar'); return; }
    pifDiscard(0, PF.hands[0].findIndex(c => c.id === PF.sel));
  };
  $('#pfL').onclick = () => {
    if (!PF || PF.phase === 'over') return;
    if ($('#pfL').dataset.k === 'ordenar') { pifSort(); renderPif(); return; }
    if (PF.sel != null) pifDiscard(0, PF.hands[0].findIndex(c => c.id === PF.sel));
  };
  $('#pfR').onclick = () => {
    if (!PF || PF.turn !== 0 || PF.phase !== 'discard') return;
    if ($('#pfR').dataset.k === 'bater') { const i = PF.hands[0].findIndex(c => c.id === PF.sel); pifBater(0, i); return; }
    if (PF.sel != null) pifDiscard(0, PF.hands[0].findIndex(c => c.id === PF.sel));
  };
  fitBoard();
}
function renderPifHUD() {
  if (!PF) return;
  const P = PF.players, rs = PF.results;
  $('#hud').innerHTML = `<div class="row">
    <div class="side">${hex(P[0].crew, P[0].g, 32, 35, false)}<span class="pts"><span class="label">${PF.rules === 'cacheta' ? 'Você · vidas' : 'Você'}</span><b>${PF.rules === 'cacheta' ? PF.lives[0] : PF.score[0]}</b></span></div>
    <div class="timer"><span class="tt"><img src="${A}icons/timer.webp" alt=""><span id="clock">${clk()}</span></span>${PF.rules === 'cacheta' ? '' : `<span class="rounds">${[0, 1, 2].map(k => `<i class="${rs[k] === 0 ? 'a' : rs[k] === 1 ? 'b' : ''}"></i>`).join('')}</span>`}</div>
    <div class="side r"><span class="pts"><span class="label">${PF.rules === 'cacheta' ? `vidas · ${OPP.n}` : `${OPP.n}`}</span><b>${PF.rules === 'cacheta' ? PF.lives[1] : PF.score[1]}</b></span>${hex(P[1].crew, P[1].g, 32, 35, false)}</div></div>
    <div class="info"><span class="g"><img src="${A}icons/cacheta.webp" alt=""><b>Cacheta</b><span class="label">· 1x1 · ${PF.rules === 'cacheta' ? 'Cacheta · 5 vidas' : 'Pif-Paf · vence quem bater 2x'}</span></span><span class="prize"><img src="${A}icons/banknote.webp" alt="">${fmt(+(ST.stake * 1.8).toFixed(2))}</span></div>`;
}
function pifSeatHTML(p) {
  const P = PF.players[p];
  return `<div class="seat" id="seat${p}" style="left:151.5px;top:${p === 0 ? 529 : 2}px">
    <div class="avbox"><svg class="ring" viewBox="0 0 84 84"><circle class="tr" cx="42" cy="42" r="40"/><circle class="pg" cx="42" cy="42" r="40" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/></svg>${hex(P.crew, P.g, 56, 60)}<span class="pill secs" id="secs${p}">30s</span></div>
    <span class="nick">${P.name}</span>${p === 0 ? '<span class="stag" id="suaVez" hidden>Sua vez</span>' : ''}<span class="bubble" id="bub${p}"></span></div>`;
}
function renderPifSeats() { $('#seats').innerHTML = pifSeatHTML(1) + pifSeatHTML(0); renderPifFan(); if (PF.phase === 'draw' || PF.phase === 'discard') markTurn(PF.turn); }
function renderPifFan() {
  const n = PF.hands[1].length; let out = '';
  for (let k = 0; k < n; k++) { const t = n > 1 ? k / (n - 1) - .5 : 0; out += `<div style="position:absolute;left:${Math.round(171.5 + t * Math.min(96, n * 10))}px;top:${Math.round(118 + t * t * 20)}px;transform:rotate(${(t * 28).toFixed(1)}deg)">${cardHTML(null, 'XS', true)}</div>`; }
  $('#pfFan').innerHTML = out;
}
function pifMsg(t) { const e = $('#pfMsgTx'); if (e) e.textContent = t; }
// hand layout for many cards (Pif, Buraco): full width, flat arc, wide slices (~32 px for 10 cards, never < 26);
// more than 8 cards → 2 overlapping rows (back row raised 36 px, ~44 px per card so every card is easy to tap). Returns the card's top-left + rotation.
function handLayout(n, groups, sel) {
  if (groups && groups.reduce((s, g) => s + g, 0) !== n) groups = null;
  let split = n;
  if (n > 8) { const half = Math.ceil(n / 2); split = half; if (groups) { let acc = 0, bd = 1e9; for (const g of groups) { acc += g; const d = Math.abs(acc - half); if (acc < n && acc >= 3 && n - acc >= 3 && d < bd) { bd = d; split = acc; } } } }
  const rows = split < n ? [[0, split], [split, n]] : [[0, n]], out = new Array(n), W = 363, CW = 64, GAP = 6;
  rows.forEach(([a, b], ri) => {
    const m = b - a, gaps = new Set(), open = new Set();
    if (groups) { let acc = 0; for (const g of groups) { acc += g; if (acc > a && acc < b) gaps.add(acc); } }
    // a selected card sits on top: open room after it so its right neighbour stays visible
    if (sel) for (let i = a; i < b - 1; i++) if (sel[i] && !sel[i + 1]) open.add(i + 1);
    let ex = open.size ? Math.max(0, Math.min(32, (W - CW - gaps.size * GAP - 24 * (m - 1)) / open.size)) : 0;
    const d = m > 1 ? Math.min(44, (W - CW - gaps.size * GAP - open.size * ex) / (m - 1)) : 0;
    let x = (375 - (CW + (m - 1) * d + gaps.size * GAP + open.size * ex)) / 2;
    const baseY = rows.length > 1 ? (ri === 0 ? 392 : 428) : 424;
    for (let i = a; i < b; i++) {
      if (i > a && gaps.has(i)) x += GAP;
      if (open.has(i)) x += ex;
      const u = m > 1 ? (i - a) / (m - 1) - .5 : 0;
      out[i] = {x: Math.round(x), y: baseY + Math.round(u * u * 40), a: +(u * 14).toFixed(2), row: ri, rows: rows.length};
      x += d;
    }
  });
  return out;
}
// draw / update the hand buttons; the selected card always sits on top (z) so the confirm tap lands on it
function drawHand(h, pos, isSel, onTap, dim) {
  const layer = $('#handLayer'), keep = new Set();
  h.forEach((c, i) => {
    let el = layer.querySelector(`[data-id="${c.id}"]`);
    if (!el) { el = document.createElement('button'); el.className = 'pcard enter'; el.dataset.id = c.id; el.setAttribute('aria-label', `${c.r} de ${({P: 'paus', C: 'copas', E: 'espadas', O: 'ouros'})[c.s]}`); el.innerHTML = cardHTML(c, 'L'); el.onclick = () => onTap(c.id); layer.appendChild(el); setTimeout(() => el.classList.remove('enter'), 320); }
    const p = pos[i], sel = isSel(c.id);
    el.style.left = p.x + 'px'; el.style.top = (p.y - (sel ? 28 : 0)) + 'px';
    el.style.transform = `rotate(${p.a}deg)`; el.style.zIndex = sel ? 200 : 10 + p.row * 40 + i;
    el.classList.toggle('sel', sel); el.classList.toggle('dim', !!dim);
    keep.add(String(c.id));
  });
  layer.querySelectorAll('.pcard').forEach(el => { if (!keep.has(el.dataset.id)) el.remove(); });
}
// tags above groups of the hand (new card, Sequência, Curinga…), never overlapping each other
function handTagsHTML(pos, items) {
  const placed = [], out = [];
  for (const it of items) {
    if (!it.idx.length) continue;
    const x = it.idx.reduce((s, i) => s + pos[i].x + 32, 0) / it.idx.length, row = pos[it.idx[0]].row;
    const y = Math.min(...it.idx.map(i => pos[i].y)) - (pos[0].rows > 1 && row === 1 ? 10 : 22);
    const w = it.txt.length * 6 + 16, x1 = x - w / 2, x2 = x + w / 2;
    if (placed.some(q => Math.abs(q.y - y) < 14 && x1 < q.x2 + 4 && x2 > q.x1 - 4)) continue;
    placed.push({x1, x2, y}); out.push(`<span class="ptag ${it.cls}" style="left:${Math.round(x)}px;top:${y}px">${it.txt}</span>`);
  }
  return out.join('');
}
function renderPif(popLixo) {
  if (!PF) return;
  const my = PF.turn === 0, over = PF.phase === 'over', h = PF.hands[0];
  const bo = my && PF.phase === 'discard' ? baterOptions(h, PF.fromLixoId) : [];
  const selBo = bo.find(o => o.i >= 0 && h[o.i].id === PF.sel), sug = selBo || bo.find(o => o.ten) || bo[0];
  // message box
  let msg = PF.note;
  if (!over && my && PF.phase === 'draw') msg = 'Sua vez · compre do monte ou do lixo';
  else if (!over && my && PF.phase === 'discard') msg = sug ? sug.ten ? 'Você pode bater com as 10 cartas! Toque em Bater' : `Você pode bater! Descarte o ${cardTxt(h[sug.i])} e bata` : PF.sel != null ? 'Toque de novo, no lixo ou em Descartar' : 'Toque numa carta para escolher o descarte';
  else if (!over && !my && !msg) msg = `Vez de ${OPP.n}`;
  if (!over || !PF.melds) pifMsg(msg);
  // piles
  const mo = $('#pfMonte'), lx = $('#pfLixo'), top = PF.lixo[PF.lixo.length - 1];
  mo.hidden = lx.hidden = over && !!PF.melds;
  mo.innerHTML = PF.monte.length ? [0, 1, 2].map(k => `<div style="position:absolute;left:${k * 4}px;top:${8 - k * 4}px">${cardHTML(null, 'S', true)}</div>`).join('') + `<span class="pill cnt">${PF.monte.length}</span>` : '<span class="slot"></span>';
  lx.innerHTML = (top ? `<div class="${popLixo ? 'pop' : ''}" style="position:absolute;left:0;top:0">${cardHTML(top, 'S')}</div>` : '<span class="slot"></span>') + `<span class="pill cnt">${PF.lixo.length}</span>` + (my && PF.phase === 'discard' && PF.sel != null ? '<span class="target"></span>' : '');
  const canDraw = my && PF.phase === 'draw';
  mo.classList.toggle('can', canDraw); lx.classList.toggle('can', canDraw && !!top);
  const vb = $('#pfVira'); if (vb) vb.innerHTML = PF.rules === 'cacheta' && PF.vira && !(over && PF.melds) ? `<div style="position:absolute;left:72px;top:270px;transform:rotate(-10deg)">${cardHTML(PF.vira, 'S')}</div><span class="pill" style="position:absolute;left:50px;top:244px;white-space:nowrap;font-size:11px">curinga ${cardTxt(PF.wild)}</span>` : '';
  $('#pfDica').hidden = !canDraw;
  // buttons: Ordenar | Descartar, or Descartar | Bater when the batida is valid
  const L = $('#pfL'), R = $('#pfR');
  $('#pfActs').hidden = over;
  if (bo.length) { L.textContent = 'Descartar'; L.dataset.k = 'descartar'; L.disabled = PF.sel == null; R.textContent = 'Bater'; R.dataset.k = 'bater'; R.hidden = false; R.disabled = false; }
  else { L.textContent = 'Ordenar'; L.dataset.k = 'ordenar'; L.disabled = false; R.textContent = 'Descartar'; R.dataset.k = 'descartar'; R.hidden = !my; R.disabled = !(my && PF.phase === 'discard' && PF.sel != null); }
  const sv = $('#suaVez'); if (sv) sv.hidden = !(my && (PF.phase === 'draw' || PF.phase === 'discard'));
  if (!over) $('#pfHint').hidden = true;
  renderPifHand(); renderPifTags(); renderPifMelds();
}
function renderPifHand() {
  drawHand(PF.hands[0], handLayout(PF.hands[0].length, PF.groups, PF.hands[0].map(c => PF.sel === c.id)), id => PF.sel === id, pifTapCard, PF.phase === 'over');
}
function renderPifTags() {
  const box = $('#pfTags'), h = PF.hands[0];
  if (PF.phase === 'over' || !h.length) { box.innerHTML = ''; return; }
  const pos = handLayout(h.length, PF.groups, h.map(c => PF.sel === c.id)), items = [];
  const ni = h.findIndex(c => c.id === PF.newId);
  if (ni >= 0) items.push({idx: [ni], txt: PF.newTag, cls: 'info'});
  if (PF.rules === 'cacheta') h.forEach((c, i) => { if (isWild(c) && i !== ni) items.push({idx: [i], txt: 'Curinga', cls: 'gold'}); });
  if (PF.groups && PF.tags && PF.groups.reduce((s, g) => s + g, 0) === h.length) { let k = 0; PF.groups.forEach((g, gi) => { const t = PF.tags[gi]; if (t) items.push({idx: [...Array(g)].map((_, j) => k + j), txt: t[0], cls: t[1]}); k += g; }); }
  box.innerHTML = handTagsHTML(pos, items);
}
function renderPifMelds() {
  const el = $('#pfMelds');
  if (PF.phase !== 'over' || !PF.melds) { el.innerHTML = ''; return; }
  const ms = PF.melds, gap = 12; let off = 24;
  const width = () => ms.reduce((s, m) => s + 48 + off * (m.cards.length - 1), 0) + gap * (ms.length - 1);
  while (width() > 351 && off > 12) off -= 2;
  let x = Math.round((375 - width()) / 2), out = '';
  ms.forEach(m => {
    const w = 48 + off * (m.cards.length - 1);
    m.cards.forEach((c, ci) => { out += `<div class="meld" style="left:${x + ci * off}px;top:252px;animation-delay:${(ci * .04).toFixed(2)}s">${cardHTML(c, 'M')}</div>`; });
    out += `<span class="ptag ok" style="left:${Math.round(x + w / 2)}px;top:328px">${m.kind === 'seq' ? 'Sequência' : 'Trinca'}</span>`;
    x += w + gap;
  });
  el.innerHTML = out;
}

/* ---------- BURACO ENGINE (2x2 contra bots · STBL: sem trinca, bate limpa) ---------- */
// 104 cartas (2 baralhos), 2 = curinga. 11 cartas cada, 2 mortos de 11, 1 carta abre o lixo.
// Na vez: compra 1 do monte OU pega o lixo inteiro (Fechado: só se usar a carta do topo num jogo), baixa/encaixa sequências, descarta 1.
// Jogos só de sequência (mesmo naipe, 3+, A-2-3 ou Q-K-A, sem dar a volta), no máximo 1 curinga por jogo. Canastra = 7+ (limpa +200, suja +100).
// Quem zera a mão pega o morto da dupla (na hora; se zerou no descarte, a vez passa). Bate quem zera a mão com o morto já pego e uma canastra limpa.
let BU = null, buT, buLeft, buBotT, BU_SPEED = 1, buJid = 0;
const isBuSel = () => ST.game === 'buraco' || ST.game === 'tranca';
const BU_NAMES = ['betinh4', 'dutra77', 'amanda.s', 'rafa_10']; // PROTECT · atualizado em syncNick()
const buTeam = p => p % 2 === 0 ? 0 : 1; // 0 você + amanda.s (Nós) · 1 dutra77 + rafa_10 (Eles)
const buPts = c => c.r === 'A' ? 15 : c.r === '2' ? 10 : ['8', '9', '10', 'J', 'Q', 'K'].includes(c.r) ? 10 : 5;
const bwait = () => wait(rnd(800, 1400) * BU_SPEED);
// Tranca (mesmo motor): jogo = sequência do mesmo naipe OU trinca (3+ do mesmo valor), o 2 é curinga (1 por jogo), o 3 nunca entra em jogo.
// 3 vermelho vai direto pra mesa da dupla (+100 se a dupla tiver jogo, −100 se não) e repõe do monte; 3 preto no topo tranca o lixo.
const isTr = () => !!(BU && BU.rules === 'tranca');
const isRed3 = c => !!c && c.r === '3' && (c.s === 'C' || c.s === 'O');
const isBlack3 = c => !!c && c.r === '3' && (c.s === 'P' || c.s === 'E');
function trincaInfo(cards) {
  if (cards.length < 3) return null;
  const w = cards.filter(c => c.r === '2'), nat = cards.filter(c => c.r !== '2');
  if (nat.length < 2 || w.length > 1 || !nat.every(c => c.r === nat[0].r) || nat[0].r === '3') return null;
  return {wild: w[0] || null, order: [...nat.slice().sort(bySuitRank), ...w], kind: 'trinca'};
}
function jogoInfo(cards) { if (isTr() && cards.some(c => c.r === '3')) return null; return seqInfo(cards) || (isTr() ? trincaInfo(cards) : null); }
const tresBonus = t => isTr() ? BU.tres[t].length * (BU.jogos[t].length ? 100 : -100) : 0;
function buRed3(p, silent) {
  if (!isTr()) return 0;
  let n = 0;
  for (let i = BU.hands[p].findIndex(isRed3); i >= 0; i = BU.hands[p].findIndex(isRed3)) {
    BU.tres[buTeam(p)].push(BU.hands[p].splice(i, 1)[0]); n++;
    if (BU.monte.length) { const r = BU.monte.pop(); BU.hands[p].push(r); if (p === 0) BU.newIds.add(r.id); }
  }
  if (n && !silent) BU.note = p === 0 ? '3 vermelho! Vai pra mesa · +100 se a dupla tiver jogo' : `${BU_NAMES[p]} baixou um 3 vermelho`;
  return n;
}
// sequence check: returns {wild, order} or null
function seqInfo(cards) {
  if (cards.length < 3) return null;
  const twos = cards.filter(c => c.r === '2'), nat0 = cards.filter(c => c.r !== '2');
  if (!nat0.length) return null;
  const suit = nat0[0].s; if (!nat0.every(c => c.s === suit)) return null;
  const same2 = twos.filter(c => c.s === suit), tries = [];
  for (const n2 of [null, ...same2.slice(0, 1)]) {
    const wilds = twos.filter(c => c !== n2); if (wilds.length > 1) continue;
    const nat = n2 ? [...nat0, n2] : nat0;
    for (const aceHi of [false, true]) {
      if (aceHi && !nat.some(c => c.r === 'A')) continue;
      const pos = nat.map(c => c.r === 'A' ? (aceHi ? 14 : 1) : rv(c.r));
      if (new Set(pos).size !== pos.length) continue;
      const lo = Math.min(...pos), hi = Math.max(...pos), gaps = hi - lo + 1 - nat.length;
      if (gaps > wilds.length) continue;
      let wp = null;
      if (wilds.length) { if (gaps === 1) { for (let v = lo; v <= hi; v++) if (!pos.includes(v)) wp = v; } else wp = hi < 14 ? hi + 1 : lo > 1 ? lo - 1 : null; if (wp === null) continue; }
      const order = nat.map((c, i) => ({c, v: pos[i]})).concat(wilds.length ? [{c: wilds[0], v: wp}] : []).sort((a, b) => a.v - b.v).map(x => x.c);
      tries.push({wild: wilds[0] || null, order});
    }
  }
  if (!tries.length) return null;
  tries.sort((a, b) => (a.wild ? 1 : 0) - (b.wild ? 1 : 0));
  return tries[0];
}
const isCanastra = j => j.cards.length >= 7;
const limpa = j => isCanastra(j) && !j.wild;
// natural runs (>=3) in a hand; a 2 only counts in its natural spot
function findRuns(hand) {
  const runs = [], used = new Set();
  for (const s of SUITS) for (;;) {
    const slot = {};
    for (const c of hand) { if (c.s !== s || used.has(c.id)) continue; const v = rv(c.r); if (!slot[v]) slot[v] = c; else if (c.r === 'A' && !slot[14]) slot[14] = c; }
    if (slot[1] && !slot[14]) slot[14] = slot[1];
    let best = [];
    for (let v = 1; v <= 14; v++) { if (!slot[v]) continue; const run = []; let k = v; while (k <= 14 && slot[k] && !run.includes(slot[k])) { run.push(slot[k]); k++; } if (run.length > best.length) best = run; }
    if (best.length < 3) break;
    best.forEach(c => used.add(c.id)); runs.push(best);
  }
  return runs;
}
function newBuDeck() { const d = []; let id = 0; for (let k = 0; k < 2; k++) for (const s of SUITS) for (const r of PR) d.push({r, s, id: id++}); return shuffle(d); }
function startBuraco(tableId) {
  clearInterval(myT); clearInterval(pfT); clearTimeout(pfBotT); MODE = 'buraco'; G = null; PF = null; PK = null; clearInterval(pkT); clearTimeout(pkBotT);
  const d = newBuDeck();
  BU = {tableId, rules: ST.game === 'tranca' ? 'tranca' : 'buraco', tres: [[], []], variant: ST.game === 'tranca' ? 'Clássica' : ST.variant === 'Fechado' ? 'Fechado' : 'Aberto', start: Date.now(),
    players: [{name: ST.nick, crew: ST.crew, g: ST.g}, {name: OPP.n, crew: OPP.c, g: OPP.g}, {name: PAR.n, crew: PAR.c, g: PAR.g}, {name: OPP2.n, crew: OPP2.c, g: OPP2.g}],
    hands: [0, 1, 2, 3].map(() => d.splice(0, 11)), mortos: [d.splice(0, 11), d.splice(0, 11)], mortoTaken: [false, false], jogos: [[], []],
    lixo: [], monte: null, turn: 0, phase: 'wait', sel: new Set(), newIds: new Set(), newTag: '', lixoTopId: null, mustUseId: null,
    sorted: false, order: null, groups: null, tags: null, note: '', newJogoId: null, end: null};
  BU.hands[0].sort(bySuitRank); BU.lixo = [d.pop()]; BU.monte = d;
  if (BU.rules === 'tranca') { while (isRed3(BU.lixo[0])) { BU.monte.unshift(BU.lixo.pop()); BU.lixo.push(BU.monte.pop()); } for (let p = 0; p < 4; p++) buRed3(p, true); BU.newIds = new Set(); BU.hands[0].sort(bySuitRank); }
  show('game'); buildBuBoard(); renderBuHUD(); tick(); renderBuSeats(); renderBu();
  BU.note = 'Nova mão · você começa'; renderBu();
  setTimeout(() => { if (BU) buTurn(); }, 900);
}
function buTurn() {
  if (!BU || BU.phase === 'over') return;
  Object.assign(BU, {phase: 'draw', sel: new Set(), lixoTopId: null, mustUseId: null, note: ''});
  markTurn(BU.turn); renderBuSeats(); renderBu();
  if (BU.turn === 0) startBuTimer();
  else { clearTimeout(buBotT); const p = BU.turn; buBotT = setTimeout(() => buBotTurn(p), rnd(800, 1400) * BU_SPEED); }
}
function startBuTimer() {
  clearInterval(buT); buLeft = 30; setRing(0, 1, 30);
  buT = setInterval(() => { if (!BU || BU.turn !== 0 || BU.phase === 'over' || BU.phase === 'wait') { clearInterval(buT); return; } buLeft--; setRing(0, buLeft / 30, buLeft); if (buLeft <= 0) { clearInterval(buT); buAuto(); } }, 1000);
}
async function buAuto() { // time is up: draw from the monte (or use the Fechado card), then drop the least useful card
  if (!BU || BU.turn !== 0) return;
  gtoast('Tempo esgotado · jogamos por você');
  if (BU.phase === 'draw' && !buDraw(0, 'monte')) return;
  for (let k = 0; k < 6 && BU && BU.mustUseId != null; k++) { const a = botNextPlay(0); if (!a || !buApply(0, a.kind, a.ids, a.jogoId).ok) break; }
  if (!BU || BU.turn !== 0 || BU.phase !== 'play') return;
  BU.sel = new Set(); buDiscard(0, BU.hands[0][botDiscardIdx(0)].id);
}
// can this card be used right now (Fechado lixo rule): fits a team jogo or makes a new sequence with hand cards
function buCanUse(p, card) {
  const t = buTeam(p), hand = BU.hands[p];
  if (BU.jogos[t].some(j => jogoInfo([...j.cards, card]))) return true;
  const pool = hand.filter(c => c.s === card.s || c.r === '2');
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) if (jogoInfo([card, pool[a], pool[b]])) return true;
  return false;
}
function buDraw(p, from) {
  if (!BU || BU.turn !== p || BU.phase !== 'draw') return false;
  if (from === 'monte') {
    if (!BU.monte.length) { buEndMao(null, 'Acabou o monte · fim da mão'); return false; }
    const c = BU.monte.pop(); BU.hands[p].push(c);
    if (p === 0) { BU.newIds = new Set([c.id]); BU.newTag = 'Nova'; }
    else BU.note = `${BU_NAMES[p]} comprou do monte`;
    buRed3(p);
  } else {
    if (!BU.lixo.length) return false;
    const top = BU.lixo[BU.lixo.length - 1];
    if (isTr() && isBlack3(top)) { if (p === 0) gtoast('Lixo trancado pelo 3 preto · compre do monte'); return false; }
    if (BU.variant === 'Fechado' && !buCanUse(p, top)) { if (p === 0) gtoast(`Fechado: só pega o lixo se usar o ${cardTxt(top)} num jogo`); return false; }
    const cs = BU.lixo.splice(0); BU.hands[p].push(...cs); BU.lixoTopId = top.id;
    if (BU.variant === 'Fechado') BU.mustUseId = top.id;
    if (p === 0) { BU.newIds = new Set(cs.map(c => c.id)); BU.newTag = `Do lixo · ${cs.length}`; if (BU.mustUseId != null) BU.sel = new Set([top.id]); }
    else BU.note = `${BU_NAMES[p]} pegou o lixo · ${cs.length} carta${cs.length > 1 ? 's' : ''}`;
  }
  BU.phase = 'play';
  if (p === 0 && BU.sorted) buSort();
  renderBuSeats(); renderBu();
  return true;
}
// dry-run of a baixar/encaixar: returns {ok, msg, jogos}
function buCheck(p, kind, ids, jogoId) {
  const t = buTeam(p), hand = BU.hands[p], cards = ids.map(id => hand.find(c => c.id === id)).filter(Boolean);
  if (!cards.length || cards.length !== ids.length) return {ok: false, msg: 'Selecione as cartas'};
  let jogos;
  if (kind === 'baixar') { const info = jogoInfo(cards); if (!info) return {ok: false, msg: isTr() ? 'Isso não forma jogo · sequência do mesmo naipe ou trinca' : 'Isso não forma uma sequência do mesmo naipe'}; jogos = [...BU.jogos[t], {id: ++buJid, cards: info.order, wild: !!info.wild, fresh: p === 0}]; }
  else { const j = BU.jogos[t].find(x => x.id === jogoId); if (!j) return {ok: false, msg: 'Escolha um jogo da sua dupla'}; const info = jogoInfo([...j.cards, ...cards]); if (!info) return {ok: false, msg: 'Essas cartas não encaixam nesse jogo'}; jogos = BU.jogos[t].map(x => x === j ? Object.assign({}, x, {cards: info.order, wild: !!info.wild}) : x); }
  const left = hand.length - cards.length;
  if (left < 2 && (BU.mortoTaken[t] || !BU.mortos.length) && !jogos.some(limpa)) return {ok: false, msg: 'Sem canastra limpa não dá pra bater · guarde 2 cartas'};
  return {ok: true, jogos, cards};
}
function buApply(p, kind, ids, jogoId) {
  if (!BU || BU.turn !== p || BU.phase !== 'play') return {ok: false};
  const r = buCheck(p, kind, ids, jogoId); if (!r.ok) return r;
  const t = buTeam(p), before = BU.jogos[t].filter(limpa).length, beforeAny = BU.jogos[t].filter(isCanastra).length;
  BU.hands[p] = BU.hands[p].filter(c => !ids.includes(c.id)); BU.jogos[t] = r.jogos;
  if (BU.mustUseId != null && ids.includes(BU.mustUseId)) BU.mustUseId = null;
  BU.sel = new Set(); ids.forEach(id => BU.newIds.delete(id));
  if (kind === 'baixar') BU.newJogoId = p === 0 ? r.jogos[r.jogos.length - 1].id : BU.newJogoId;
  const nowL = BU.jogos[t].filter(limpa).length, nowAny = BU.jogos[t].filter(isCanastra).length;
  const who = p === 0 ? 'Você' : BU_NAMES[p];
  if (nowL > before) BU.note = t === 0 ? 'Canastra limpa! +200' : `${who} fez canastra limpa · +200 pra eles`;
  else if (nowAny > beforeAny) BU.note = t === 0 ? 'Canastra suja! +100' : `${who} fez canastra suja · +100 pra eles`;
  else if (p !== 0) BU.note = kind === 'baixar' ? `${who} baixou um jogo` : `${who} encaixou num jogo`;
  else BU.note = '';
  if (p === 0 && BU.sorted) buSort();
  if (!BU.hands[p].length) {
    if (!BU.mortoTaken[t] && BU.mortos.length) buTakeMorto(p);
    else { buEndMao(t, `${t === 0 ? 'Batemos' : 'Eles bateram'}! Fim da mão`); return {ok: true, bateu: true}; }
  }
  renderBuHUD(); renderBuSeats(); renderBu();
  return {ok: true};
}
function buTakeMorto(p) {
  const t = buTeam(p);
  BU.hands[p] = BU.mortos.pop(); BU.mortoTaken[t] = true; buRed3(p, true);
  if (p === 0) { BU.hands[0].sort(bySuitRank); BU.newIds = new Set(BU.hands[0].map(c => c.id)); BU.newTag = 'Morto'; BU.sorted = false; BU.groups = null; BU.note = 'Você pegou o morto! Continue jogando'; }
  else BU.note = `${BU_NAMES[p]} pegou o morto`;
}
async function buDiscard(p, id) {
  if (!BU || BU.turn !== p || BU.phase !== 'play') return false;
  const hand = BU.hands[p], i = hand.findIndex(c => c.id === id), c = hand[i]; if (!c) return false;
  const t = buTeam(p), bad = msg => { if (p === 0) gtoast(msg); return false; };
  if (BU.mustUseId != null) { const m = hand.find(x => x.id === BU.mustUseId); return bad(`Use o ${m ? cardTxt(m) : 'topo do lixo'} num jogo antes de descartar`); }
  if (id === BU.lixoTopId) return bad('A carta do topo do lixo não pode voltar pra ele agora');
  const last = hand.length === 1;
  if (last && (BU.mortoTaken[t] || !BU.mortos.length) && !BU.jogos[t].some(limpa)) return bad('Pra bater precisa de uma canastra limpa');
  hand.splice(i, 1); BU.lixo.push(c);
  clearInterval(buT); BU.sel = new Set(); BU.newIds = new Set(); BU.newJogoId = p === 0 ? null : BU.newJogoId;
  if (last) {
    if (!BU.mortoTaken[t] && BU.mortos.length) buTakeMorto(p);
    else { buEndMao(t, `${t === 0 ? 'Batemos' : 'Eles bateram'}! Fim da mão`); return true; }
  } else if (p !== 0) BU.note = `${BU_NAMES[p]} descartou o ${cardTxt(c)}`;
  if (p === 0 && BU.sorted) buSort();
  BU.phase = 'wait'; markTurn(-1); renderBuSeats(); renderBu(true);
  await wait(p === 0 ? 450 : 700 * BU_SPEED);
  if (!BU || BU.phase === 'over') return true;
  BU.turn = (p + 1) % 4; buTurn();
  return true;
}
function buScore(t, bateu) {
  const table = BU.jogos[t].reduce((s, j) => s + j.cards.reduce((a, c) => a + buPts(c), 0), 0);
  const can = BU.jogos[t].filter(isCanastra), limpas = can.filter(j => !j.wild).length, sujas = can.length - limpas;
  const hand = [0, 1, 2, 3].filter(p => buTeam(p) === t).reduce((s, p) => s + BU.hands[p].reduce((a, c) => a + buPts(c), 0), 0);
  const batida = bateu === t ? 100 : 0, morto = BU.mortoTaken[t] ? 0 : -100, tres = tresBonus(t);
  return {table, limpas, sujas, batida, morto, hand, tres, total: table + limpas * 200 + sujas * 100 + batida + morto - hand + tres};
}
const buLive = t => BU.jogos[t].reduce((s, j) => s + j.cards.reduce((a, c) => a + buPts(c), 0) + (isCanastra(j) ? (j.wild ? 100 : 200) : 0), 0) + Math.max(0, tresBonus(t));
async function buEndMao(bateu, title) {
  if (!BU || BU.phase === 'over') return;
  clearInterval(buT); clearTimeout(buBotT);
  const S = [buScore(0, bateu), buScore(1, bateu)];
  Object.assign(BU, {phase: 'over', end: {bateu, title, S}, sel: new Set(), note: title});
  markTurn(-1); renderBuHUD(); renderBuSeats(); renderBu();
  if (bateu !== null) bubble(BU.turn, 'Bati!', 'ok');
  await wait(4200);
  if (BU && BU.phase === 'over') buEndMatch();
}
const buLines = s => [s.batida ? `+${s.batida} batida` : '', s.tres ? `${s.tres > 0 ? '+' : '−'}${Math.abs(s.tres)} 3 vermelho` : '', s.limpas ? `+${s.limpas * 200} canastra${s.limpas > 1 ? 's' : ''} limpa${s.limpas > 1 ? 's' : ''}` : '', s.sujas ? `+${s.sujas * 100} canastra${s.sujas > 1 ? 's' : ''} suja${s.sujas > 1 ? 's' : ''}` : '', `+${s.table} cartas na mesa`, s.morto ? '−100 morto não pego' : '', s.hand ? `−${s.hand} cartas na mão` : ''].filter(Boolean);
function buEndMatch() {
  const [a, b] = BU.end.S, win = a.total > b.total, tie = a.total === b.total, prize = prizeOf(ST.stake);
  if (win) ST.saldo = +(ST.saldo + prize - ST.stake).toFixed(2); else if (!tie) ST.saldo = +(ST.saldo - ST.stake).toFixed(2);
  clearInterval(clockT); clearInterval(buT); clearTimeout(buBotT);
  const P = BU.players, tid = BU.tableId, tr = isTr(), name = tr ? 'Tranca' : `Buraco ${BU.variant}`, gid = tr ? 'tranca' : 'buraco', v = BU.variant;
  const pl = k => [P[k].name, P[k].crew, P[k].g];
  showResult({win, tie, sub: win ? `Você e ${PAR.n} fizeram mais pontos` : tie ? 'Mesma pontuação · entrada devolvida' : `${OPP.n} e ${OPP2.n} fizeram mais pontos`,
    value: win ? `+ ${fmt2(prize)}` : tie ? fmt2(0) : `− ${fmt2(ST.stake)}`, caption: win ? 'Prêmio já está no seu saldo' : tie ? 'Ninguém levou' : 'Valor da entrada',
    ctx: `Mesa ${tid} · ${name} · 2x2`, gameColor: tr ? 'var(--game-tranca)' : 'var(--game-buraco)',
    left: teamHTML([pl(0), pl(2)], 'Nós', `Você e ${PAR.n}`), score: `${a.total} × ${b.total}`, right: teamHTML([pl(1), pl(3)], 'Eles', `${OPP.n} e ${OPP2.n}`, true),
    extra: `<p class="rlines">Nós: ${buLines(a).join(' · ')}<br>Eles: ${buLines(b).join(' · ')}</p>`,
    hist: name, vs: OPP.n, delta: win ? prize - ST.stake : tie ? 0 : -ST.stake,
    againLabel: ST.training ? 'Treinar de novo' : `${win ? 'Jogar de novo' : 'Revanche'} · ${fmt(ST.stake)}`,
    again: () => { ST.game = gid; ST.variant = v; startQueue(tid); }});
}
/* ---------- BURACO BOTS ---------- */
function botWantsLixoBu(p, top) {
  if (!top || (isTr() && isBlack3(top))) return false;
  const t = buTeam(p);
  if (BU.jogos[t].some(j => jogoInfo([...j.cards, top]))) return true;
  const hand = BU.hands[p], with_ = [...hand, top];
  return findRuns(with_).some(r => r.includes(top)) || (BU.lixo.length >= 3 && buCanUse(p, top));
}
function botNextPlay(p) {
  const t = buTeam(p), hand = BU.hands[p], jogos = BU.jogos[t];
  const ok = (kind, ids, jogoId) => buCheck(p, kind, ids, jogoId).ok ? {kind, ids, jogoId} : null;
  // 1) Fechado: the lixo card must be used first
  if (BU.mustUseId != null) {
    const m = hand.find(c => c.id === BU.mustUseId);
    if (m) {
      for (const j of jogos) { const a = ok('encaixar', [m.id], j.id); if (a) return a; }
      const run = findRuns(hand).find(r => r.includes(m)); if (run) { const a = ok('baixar', run.map(c => c.id)); if (a) return a; }
      const pool = hand.filter(c => c !== m && (c.s === m.s || c.r === '2'));
      for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) if (jogoInfo([m, pool[a], pool[b]])) { const x = ok('baixar', [m.id, pool[a].id, pool[b].id]); if (x) return x; }
    }
  }
  // 2) encaixar naturals into the team jogos (canastras limpas first)
  const order = jogos.slice().sort((a, b) => (a.wild ? 1 : 0) - (b.wild ? 1 : 0) || b.cards.length - a.cards.length);
  for (const c of hand) { if (c.r === '2') continue; for (const j of order) { if (!jogoInfo([...j.cards, c]) || (jogoInfo([...j.cards, c]).wild && !j.wild)) continue; const a = ok('encaixar', [c.id], j.id); if (a) return a; } }
  // 3) baixar natural sequences
  for (const run of findRuns(hand)) { const a = ok('baixar', run.map(c => c.id)); if (a) return a; }
  if (isTr()) { const by = {}; for (const c of hand) if (c.r !== '2' && c.r !== '3') (by[c.r] = by[c.r] || []).push(c); for (const g of Object.values(by)) if (g.length >= 3) { const a = ok('baixar', g.map(c => c.id)); if (a) return a; } }
  // 4) curinga: complete a canastra (team already has a limpa) or help go out when the hand is short
  const wild = hand.find(c => c.r === '2');
  if (wild) {
    const hasLimpa = jogos.some(limpa);
    for (const j of order) if (!j.wild && ((j.cards.length === 6 && hasLimpa) || hand.length <= 3)) { const a = ok('encaixar', [wild.id], j.id); if (a) return a; }
    if (hand.length <= 7) { const nat = hand.filter(c => c !== wild && c.r !== '2'); for (let a = 0; a < nat.length; a++) for (let b = a + 1; b < nat.length; b++) if (jogoInfo([nat[a], nat[b], wild])) { const x = ok('baixar', [nat[a].id, nat[b].id, wild.id]); if (x) return x; } }
  }
  return null;
}
function botDiscardIdx(p) {
  const t = buTeam(p), hand = BU.hands[p], opp = BU.jogos[1 - t], mine = BU.jogos[t];
  let best = -Infinity, idx = 0;
  hand.forEach((c, i) => {
    if (c.id === BU.lixoTopId || c.id === BU.mustUseId) return;
    let s = Math.random() * 2 + buPts(c) * .2;
    if (c.r === '2') s -= 60;
    if (isTr() && isBlack3(c)) s += 45;
    if (opp.some(j => jogoInfo([...j.cards, c]))) s -= 40;
    if (mine.some(j => jogoInfo([...j.cards, c]))) s -= 30;
    s -= hand.filter(o => o !== c && o.s === c.s && Math.abs(rv(o.r) - rv(c.r)) <= 2).length * 6;
    if (s > best) { best = s; idx = i; }
  });
  return idx;
}
async function buBotTurn(p) {
  if (!BU || BU.turn !== p || BU.phase !== 'draw') return;
  const top = BU.lixo[BU.lixo.length - 1];
  if (!(top && botWantsLixoBu(p, top) && buDraw(p, 'lixo')) && !buDraw(p, 'monte')) return;
  for (let k = 0; k < 30; k++) {
    await bwait();
    if (!BU || BU.turn !== p || BU.phase !== 'play') return;
    const a = botNextPlay(p); if (!a) break;
    const r = buApply(p, a.kind, a.ids, a.jogoId); if (!r.ok || r.bateu) return;
  }
  if (!BU || BU.turn !== p || BU.phase !== 'play') return;
  if (BU.mustUseId != null) BU.mustUseId = null; // safety: never stall a bot
  await bwait();
  if (!BU || BU.turn !== p || BU.phase !== 'play') return;
  const hand = BU.hands[p];
  if (await buDiscard(p, hand[botDiscardIdx(p)].id)) return;
  for (const c of hand.slice()) if (c.id !== BU.lixoTopId && await buDiscard(p, c.id)) return;
  if (BU && BU.turn === p && BU.phase === 'play') { BU.phase = 'wait'; BU.mustUseId = null; BU.turn = (p + 1) % 4; buTurn(); } // safety: never stall
}
// Ordenar: sequences together (tag Sequência), then the rest by suit, curingas at the end (tag Curinga)
function buSort() {
  const hand = BU.hands[0], runs = findRuns(hand), inRun = new Set(runs.flat().map(c => c.id));
  const rest = hand.filter(c => !inRun.has(c.id)), wilds = rest.filter(c => c.r === '2'), others = rest.filter(c => c.r !== '2').sort(bySuitRank);
  const order = [], groups = [], tags = [];
  for (const r of runs) { order.push(...r); groups.push(r.length); tags.push(['Sequência', 'ok']); }
  let rest2 = others;
  if (isTr()) { const by = {}; for (const c of others) if (c.r !== '3') (by[c.r] = by[c.r] || []).push(c); for (const g of Object.values(by)) if (g.length >= 3) { order.push(...g); groups.push(g.length); tags.push(['Trinca', 'ok']); rest2 = rest2.filter(x => !g.includes(x)); } }
  for (const s of SUITS) { const g = rest2.filter(c => c.s === s); if (g.length) { order.push(...g); groups.push(g.length); tags.push(null); } }
  if (wilds.length) { order.push(...wilds); groups.push(wilds.length); tags.push(['Curinga', 'gold']); }
  Object.assign(BU, {groups, tags, sorted: true}); BU.hands[0] = order;
}
/* ---------- BURACO RENDER ---------- */
const BU_SEAT = {0: {x: 151.5, y: 529}, 1: {x: 301, y: 244}, 2: {x: 152, y: 4}, 3: {x: 2, y: 244}};
function buildBuBoard() {
  const b = $('#board');
  b.innerHTML = `<div class="mesa" id="mesaBg" style="background-image:url(${A}mesa/${capsuleMesa('verde')}.webp)"></div>
    <div id="buFans"></div><div id="seats"></div>
    <span class="tagp" style="left:89px;top:27px">Parceira</span>
    <div class="tmsg" id="buMsg" style="left:64px;top:94px;width:248px"><span class="su">${SUITS.map(s => `<svg style="fill:${RED(s) ? '#e5484d' : '#fff'}"><use href="#s-${s}"/></svg>`).join('')}</span><span class="tx" id="buMsgTx"></span></div>
    <div id="buRows"></div>
    <button class="pile" id="buMonte" style="left:112px;top:222px;width:56px;height:84px" aria-label="Monte"></button>
    <button class="pile" id="buLixo" style="left:178px;top:226px;width:48px;height:76px" aria-label="Lixo"></button>
    <div id="buMortos"></div><div id="buEnd"></div>
    <div id="buTags"></div><div id="handLayer"></div>
    <div class="pacts" id="buActs" style="top:545px"><button class="btn secondary" id="buL">Ordenar</button><button class="btn primary" id="buR">Descartar</button></div>
    <div class="gtoast" id="gtoast" style="top:388px"><span class="pill" id="gtoastTxt"></span></div>`;
  const myTurn = () => { if (!BU || BU.phase === 'over') return false; if (BU.turn !== 0 || BU.phase === 'wait') { gtoast(`Espere sua vez · vez de ${BU_NAMES[BU.turn]}`); return false; } return true; };
  $('#buMonte').onclick = () => { if (!myTurn()) return; if (BU.phase === 'play') { gtoast('Você já comprou · baixe, encaixe ou descarte'); return; } buDraw(0, 'monte'); };
  $('#buLixo').onclick = () => {
    if (!myTurn()) return;
    if (BU.phase === 'draw') { if (!BU.lixo.length) gtoast('O lixo está vazio'); else buDraw(0, 'lixo'); return; }
    if (BU.sel.size !== 1) { gtoast(BU.sel.size ? 'Selecione só 1 carta pra descartar' : 'Toque numa carta para descartar'); return; }
    buDiscard(0, [...BU.sel][0]);
  };
  $('#buL').onclick = () => { if (!BU || BU.phase === 'over') return; buSort(); renderBu(); };
  $('#buR').onclick = () => {
    if (!BU || BU.turn !== 0 || BU.phase !== 'play') return;
    const k = $('#buR').dataset.k, ids = [...BU.sel];
    if (k === 'baixar' || k === 'encaixar') { const r = buApply(0, k, ids, +$('#buR').dataset.j || undefined); if (!r.ok && r.msg) gtoast(r.msg); return; }
    if ((k === 'descartar' || k === 'bater') && ids.length === 1) buDiscard(0, ids[0]);
  };
  $('#buRows').onclick = e => {
    const el = e.target.closest('.bjogo.mine'); if (!el || !BU || BU.turn !== 0 || BU.phase !== 'play') return;
    if (!BU.sel.size) { gtoast('Selecione cartas da mão pra encaixar'); return; }
    const r = buApply(0, 'encaixar', [...BU.sel], +el.dataset.jid); if (!r.ok && r.msg) gtoast(r.msg);
  };
  fitBoard();
}
function renderBuHUD() {
  if (!BU) return;
  const P = BU.players, sc = BU.end ? [BU.end.S[0].total, BU.end.S[1].total] : [buLive(0), buLive(1)];
  $('#hud').innerHTML = `<div class="row">
    <div class="side"><span class="stack">${hex(P[0].crew, P[0].g, 32, 35, false)}${hex(PAR.c, PAR.g, 32, 35, false)}</span><span class="pts"><span class="label">Nós${isTr() && BU.tres[0].length ? ' · 3♥' + BU.tres[0].length : ''}</span><b>${sc[0]}</b></span></div>
    <div class="timer"><span class="tt"><img src="${A}icons/timer.webp" alt=""><span id="clock">${clk()}</span></span></div>
    <div class="side r"><span class="pts"><span class="label">${isTr() && BU.tres[1].length ? '3♥' + BU.tres[1].length + ' · ' : ''}Eles</span><b>${sc[1]}</b></span><span class="stack">${hex(OPP.c, OPP.g, 32, 35, false)}${hex(OPP2.c, OPP2.g, 32, 35, false)}</span></div></div>
    <div class="info"><span class="g"><img src="${A}icons/${isTr() ? 'tranca' : 'buraco'}.webp" alt=""><b>${isTr() ? 'Tranca' : 'Buraco'}</b><span class="label">· 2x2 · ${BU.variant}${isTr() ? ' · 3 preto tranca' : ''}</span></span><span class="prize"><img src="${A}icons/banknote.webp" alt="">${fmt(+(ST.stake * 1.8).toFixed(2))}</span></div>`;
}
function renderBuSeats() {
  if (!BU) return;
  $('#seats').innerHTML = [2, 3, 1, 0].map(p => {
    const P = BU.players[p], s = BU_SEAT[p];
    return `<div class="seat ${p ? 'm' : ''}" id="seat${p}" style="left:${s.x}px;top:${s.y}px">
      <div class="avbox"><svg class="ring" viewBox="0 0 84 84"><circle class="tr" cx="42" cy="42" r="40"/><circle class="pg" cx="42" cy="42" r="40" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/></svg>${hex(P.crew, P.g, 56, 60)}<span class="pill secs" id="secs${p}">30s</span></div>
      <span class="nick">${P.name}</span>${p === 0 ? '<span class="stag" id="suaVez" hidden>Sua vez</span>' : ''}<span class="bubble" id="bub${p}"></span></div>`;
  }).join('');
  const fan = (x, y, r0, n) => [0, 1, 2].map(k => `<div style="position:absolute;left:${x + 7 * k}px;top:${y + k}px;transform:rotate(${r0 - 5 * k}deg)">${cardHTML(null, 'XS', true)}</div>`).join('') + `<span class="pill cnt" style="position:absolute;left:${x + 22}px;top:${y + 40}px;padding:1px 6px">${n}</span>`;
  $('#buFans').innerHTML = fan(223, 20, -8, BU.hands[2].length) + fan(21, 198, -16, BU.hands[3].length) + fan(312, 198, -16, BU.hands[1].length);
  if (BU.phase === 'draw' || BU.phase === 'play') markTurn(BU.turn);
}
function buMsg(t) { const e = $('#buMsgTx'); if (e) e.textContent = t; }
// right button: Baixar jogo / Encaixar / Descartar / Bater
function buAction() {
  const h = BU.hands[0], ids = [...BU.sel];
  if (BU.turn !== 0 || BU.phase !== 'play' || !ids.length) return {k: 'descartar', label: 'Descartar', on: false};
  if (ids.length >= 3 && buCheck(0, 'baixar', ids).ok) return {k: 'baixar', label: 'Baixar jogo', on: true};
  const js = BU.jogos[0].slice().sort((a, b) => (a.id === BU.newJogoId ? -1 : 0) || b.cards.length - a.cards.length);
  for (const j of js) if (buCheck(0, 'encaixar', ids, j.id).ok) return {k: 'encaixar', label: 'Encaixar', on: true, j: j.id};
  if (ids.length === 1 && BU.mustUseId == null && ids[0] !== BU.lixoTopId) {
    if (h.length === 1 && (BU.mortoTaken[0] || !BU.mortos.length)) return {k: 'bater', label: 'Bater', on: BU.jogos[0].some(limpa)};
    return {k: 'descartar', label: 'Descartar', on: true};
  }
  return {k: 'descartar', label: ids.length >= 3 ? 'Baixar jogo' : 'Descartar', on: false};
}
function renderBu(popLixo) {
  if (!BU) return;
  const my = BU.turn === 0, over = BU.phase === 'over', act = buAction();
  // message
  let msg = BU.note;
  if (!over && my && BU.phase === 'draw') msg = isTr() && isBlack3(BU.lixo[BU.lixo.length - 1]) ? 'Sua vez · lixo trancado pelo 3 preto, compre do monte' : BU.variant === 'Fechado' ? 'Sua vez · compre ou use o topo do lixo' : 'Sua vez · compre ou pegue o lixo';
  else if (!over && my && BU.phase === 'play') {
    const m = BU.mustUseId != null && BU.hands[0].find(c => c.id === BU.mustUseId);
    msg = m ? `Fechado: use o ${cardTxt(m)} num jogo` : act.k === 'baixar' && act.on ? `Baixar ${[...BU.sel].map(id => cardTxt(BU.hands[0].find(c => c.id === id))).join(' ')} como jogo?` : act.k === 'encaixar' && act.on ? 'Toque no jogo ou em Encaixar' : BU.sel.size === 1 ? 'Toque de novo, no lixo ou em Descartar' : (BU.note || 'Baixe jogos, encaixe ou descarte');
  } else if (!over && !my && !msg) msg = `Vez de ${BU_NAMES[BU.turn]}`;
  buMsg(msg);
  // piles + mortos
  const mo = $('#buMonte'), lx = $('#buLixo'), top = BU.lixo[BU.lixo.length - 1];
  mo.hidden = lx.hidden = over;
  mo.innerHTML = BU.monte.length ? [0, 1, 2].map(k => `<div style="position:absolute;left:${4 + k * 4}px;top:${12 - k * 4}px">${cardHTML(null, 'M', true)}</div>`).join('') + `<span class="pill cnt">${BU.monte.length}</span>` : '<span class="slot"></span>';
  lx.innerHTML = (top ? `<div class="${popLixo ? 'pop' : ''}" style="position:absolute;left:0;top:4px">${cardHTML(top, 'M')}</div>` : '<span class="slot"></span>') + `<span class="pill cnt">${BU.lixo.length}</span>` + (isTr() && isBlack3(top) ? `<img class="lk" src="${A}icons/lock.webp" alt="Lixo trancado">` : '') + (my && BU.phase === 'play' && BU.sel.size === 1 && act.k !== 'encaixar' ? '<span class="target"></span>' : '');
  const canDraw = my && BU.phase === 'draw';
  mo.classList.toggle('can', canDraw); lx.classList.toggle('can', canDraw && !!top && !(isTr() && isBlack3(top)));
  const nm = BU.mortos.length;
  $('#buMortos').innerHTML = over ? '' : [...Array(nm)].map((_, k) => `<div style="position:absolute;left:${238 + 44}px;top:${236 + 16 * k}px;transform:rotate(90deg);transform-origin:top left;z-index:5">${cardHTML(null, 'XS', true)}</div>`).join('') + (nm ? `<span class="label" style="position:absolute;left:239px;top:${nm === 2 ? 290 : 274}px;z-index:5;color:rgba(255,255,255,.8)">${nm} morto${nm > 1 ? 's' : ''}</span>` : '');
  // end-of-hand pills (B12)
  if (over && BU.end) { const s = BU.end.S, l = buLines(s[0]).slice(0, 3).concat(`Nós ${s[0].total} × ${s[1].total} Eles`); $('#buEnd').innerHTML = l.map((t, k) => `<div class="hint" style="top:${218 + k * 28}px"><span class="pill">${t}</span></div>`).join(''); }
  else $('#buEnd').innerHTML = '';
  // buttons
  const L = $('#buL'), R = $('#buR');
  $('#buActs').hidden = over;
  R.textContent = act.label; R.dataset.k = act.k; R.dataset.j = act.j || ''; R.disabled = !act.on; R.hidden = !my;
  L.disabled = false;
  const sv = $('#suaVez'); if (sv) sv.hidden = !(my && (BU.phase === 'draw' || BU.phase === 'play'));
  renderBuRows(act); renderBuHand(); renderBuTags();
}
// table jogos: Eles at y162, Nós at y324 (XS cards, 11 px; canastra 6 px), shrink/collapse/scale to fit, never over the side seats
function renderBuRows(act) {
  const out = [];
  for (const [t, y, x0, x1] of [[1, 162, 80, 300], [0, 324, 72, 306]]) {
    const js = BU.jogos[t]; if (!js.length) continue;
    const wOf = (j, lvl) => { const n = j.cards.length, can = n >= 7; if (lvl >= 2 && can) return 32; return 32 + (n - 1) * (can ? (lvl ? 4 : 6) : (lvl ? 7 : 11)); };
    let lvl = 0, total;
    for (; lvl < 3; lvl++) { total = js.reduce((s, j) => s + wOf(j, lvl), 0) + 8 * (js.length - 1); if (total <= x1 - x0) break; }
    if (lvl === 3) { lvl = 2; total = js.reduce((s, j) => s + wOf(j, 2), 0) + 8 * (js.length - 1); }
    const k = Math.min(1, (x1 - x0) / total), left = Math.round(188 - total * k / 2);
    let x = 0, inner = '';
    for (const j of js) {
      const w = wOf(j, lvl), can = isCanastra(j), collapse = lvl >= 2 && can, off = can ? (lvl ? 4 : 6) : (lvl ? 7 : 11);
      const cs = collapse ? [j.cards[j.cards.length - 1]] : j.cards;
      const target = act && act.k === 'encaixar' && act.on && act.j === j.id && t === 0;
      inner += `<div class="bjogo ${t === 0 ? 'mine' : ''} ${target ? 'target' : ''}" data-jid="${j.id}" style="left:${x}px;width:${w}px">${cs.map((c, ci) => `<div class="card-at" style="left:${ci * off}px">${cardHTML(c, 'XS')}</div>`).join('')}${collapse ? `<span class="pill bbadge">${j.cards.length}</span>` : ''}${can ? `<span class="ptag gold" style="left:${w / 2}px;top:${t === 1 ? 46 : 48}px">${j.wild ? 'Canastra suja' : 'Canastra limpa'}</span>` : j.id === BU.newJogoId && t === 0 ? `<span class="ptag info" style="left:${w / 2}px;top:48px">Novo</span>` : ''}</div>`;
      x += w + 8;
    }
    out.push(`<div class="brow" style="top:${y}px"><span class="ptag neutral" style="left:${Math.max(24, left - 26)}px;top:13px">${t === 0 ? 'Nós' : 'Eles'}</span><div class="in" style="left:${left}px;width:${total}px;transform:scale(${k.toFixed(3)})">${inner}</div></div>`);
  }
  $('#buRows').innerHTML = out.join('');
}
function buTapCard(id) {
  if (!BU || BU.phase === 'over') return;
  if (BU.turn !== 0 || BU.phase === 'wait') { gtoast(`Espere sua vez · vez de ${BU_NAMES[BU.turn]}`); return; }
  if (BU.phase === 'draw') { gtoast('Compre do monte ou pegue o lixo primeiro'); return; }
  if (BU.sel.has(id)) { if (BU.sel.size === 1 && buAction().k !== 'encaixar') { buDiscard(0, id); return; } BU.sel.delete(id); }
  else BU.sel.add(id);
  renderBu();
}
function renderBuHand() {
  drawHand(BU.hands[0], handLayout(BU.hands[0].length, BU.sorted ? BU.groups : null, BU.hands[0].map(c => BU.sel.has(c.id))), id => BU.sel.has(id), buTapCard, BU.phase === 'over');
}
function renderBuTags() {
  const box = $('#buTags'), h = BU.hands[0];
  if (BU.phase === 'over' || !h.length) { box.innerHTML = ''; return; }
  const pos = handLayout(h.length, BU.sorted ? BU.groups : null, h.map(c => BU.sel.has(c.id))), items = [];
  const ni = h.map((c, i) => BU.newIds.has(c.id) ? i : -1).filter(i => i >= 0);
  if (ni.length) items.push({idx: ni.length > 6 ? ni.slice(Math.floor(ni.length / 2) - 1, Math.floor(ni.length / 2) + 1) : ni, txt: BU.newTag, cls: 'info'});
  if (BU.sorted && BU.groups && BU.tags && BU.groups.reduce((s, g) => s + g, 0) === h.length) { let k = 0; BU.groups.forEach((g, gi) => { const t = BU.tags[gi]; if (t) items.push({idx: [...Array(g)].map((_, j) => k + j), txt: t[0], cls: t[1]}); k += g; }); }
  box.innerHTML = handTagsHTML(pos, items);
}

/* ---------- MATCH NAV · Voltar · Chat · Mesa · Voz · Ajustes ---------- */
const activeGame = () => PK ? {id: 'poker', label: `Poker · ${PK.six ? 'mesa de 6' : '1x1'}`, t: PK.tableId, players: PK.players.map(p => [p.name, p.crew, p.g])}
  : PF ? {id: 'cacheta', label: `${PF.rules === 'cacheta' ? 'Cacheta' : 'Pif-Paf'} · 1x1`, t: PF.tableId, players: PF.players.map(p => [p.name, p.crew, p.g])}
  : BU ? {id: isTr() ? 'tranca' : 'buraco', label: `${isTr() ? 'Tranca' : 'Buraco ' + BU.variant} · 2x2`, t: BU.tableId, players: BU.players.map(p => [p.name, p.crew, p.g])}
  : G ? {id: 'truco', label: `Truco ${G.variant} · ${G.one ? '1x1' : '2x2'}`, t: G.tableId, players: G.players.filter(Boolean).map(p => [p.name, p.crew, p.g])} : null;
const GAME_CHAT = [];
function gameChatSheet() {
  const a = activeGame(); if (!a) return;
  if (!GAME_CHAT.length) a.players.slice(1).forEach((p, k) => GAME_CHAT.push({who: p[0], c: p[1], g: p[2], t: ['boa sorte!', 'segura essa 😤', 'vixe, tá blefando', 'bora!'][k % 4]}));
  openSheet(`${sheetHead('chat', 'Chat da mesa', `Mesa ${a.t} · ${a.players.length} jogadores · só quem está na mesa`)}
    <div class="room-chat" id="gChat">${GAME_CHAT.map(m => msgHTML(m)).join('')}</div>
    <div class="composer" style="padding:0"><div class="chint"><span>Você está conversando como ${esc(ST.nick)}</span><span>0/200</span></div>
      <div class="row"><label class="in"><input id="gIn" maxlength="200" placeholder="Diga algo…" autocomplete="off"></label><button class="send" data-a="gameSay" aria-label="Enviar">${svg('i-send')}</button></div></div>`, {cls: 'g16'});
  const c = $('#gChat'); c.scrollTop = c.scrollHeight; $('#gIn').onkeydown = e => { if (e.key === 'Enter') ACT.gameSay(); };
}
ACT.gameSay = () => { const i = $('#gIn'); if (!i || !i.value.trim()) return; GAME_CHAT.push({me: true, who: ST.nick, t: i.value.trim()}); gameChatSheet(); setTimeout(() => { const a = activeGame(); if (!a || !$('#gChat')) return; const p = pickOne(a.players.slice(1)); GAME_CHAT.push({who: p[0], c: p[1], g: p[2], t: pickOne(BOT_REPLIES)}); gameChatSheet(); }, rnd(900, 1700)); };
function tableSheet() {
  const a = activeGame(); if (!a) return;
  openSheet(`${sheetHead(GAME_ICON[a.id], `Mesa ${a.t}`, `${a.label} · ${ST.series ? 'batalha · ' + ST.series.b.name : 'jogando agora'}`, true, 'ok')}
    <div class="room-info"><div class="cell"><small>Entrada</small><b>${ST.training ? 'Treino' : fmt(ST.stake)}</b></div><div class="cell"><small>Prêmio</small><b>${ST.training ? '—' : fmt(prizeOf(ST.stake, PK && PK.six ? 3.6 : 1.8))}</b></div><div class="cell"><small>Jogadores</small><b>${a.players.length}</b></div></div>
    <div class="room-h"><span>Jogadores</span><span>${a.players.length}/${a.players.length}</span></div>
    <div class="room-list">${a.players.map((p, k) => `<button class="pr" style="width:100%;text-align:left" data-a="${k ? 'playerCard:' + esc(p[0]) : 'noop'}">${hex(p[1], p[2], 's', 0, false)}<b>${k ? esc(p[0]) : 'Você'}</b><small class="ok">Na mesa</small></button>`).join('')}</div>
    <button class="leave-btn" data-a="leaveAsk">Sair da mesa</button>`, {cls: 'g16'});
}
$('#mnav').addEventListener('click', e => {
  const b = e.target.closest('[data-g]'); if (!b) return;
  const k = b.dataset.g;
  if (k === 'voltar') leaveSheet();
  else if (k === 'chat') { if (!(DK.on && DK.chat && dkFocusChat())) gameChatSheet(); }
  else if (k === 'mesa') tableSheet();
  else if (k === 'voz') { ST.mic = !ST.mic; $('#micIco').src = I(ST.mic ? 'microphone' : 'microphone-off'); b.querySelector('span').textContent = ST.mic ? 'Voz ligada' : 'Voz'; gtoast(ST.mic ? `${(activeGame() || {players: [[OPP.n]]}).players.slice(-1)[0][0]} falando · ${(activeGame() || {players: []}).players.length} na voz` : 'Voz desligada'); }
  else if (k === 'ajustes') personalizar();
});
ACT.leaveAsk = () => { closeSheet(); setTimeout(leaveSheet, 200); };
function leaveSheet() {
  const a = activeGame(); if (!a) return;
  const duo = (G && !G.one) || BU;
  openSheet(`${sheetHead(GAME_ICON[a.id], 'Sair da partida?', ST.training ? 'É só treino · nada é perdido.' : ST.series ? `Se sair agora, você sai da batalha e perde a entrada de ${fmt(ST.series.b.buyin)}.` : duo ? 'Se sair agora, sua dupla perde a partida e você perde a entrada.' : 'Se sair agora, você perde a partida e a entrada.', false)}
    <div class="row" style="display:flex;gap:12px">${btn('Sair', 'sec', 'm m44', 'data-a="leaveGo"', 'fill')}${btn('Continuar jogando', 'pri', 'm m44', 'data-a="closeSheet"', 'fill')}</div>`, {cls: 'g16'});
}
ACT.leaveGo = () => {
  closeSheet();
  if (ST.training) ST.saldo = ST.trainSaldo; else if (!ST.series) ST.saldo = +(ST.saldo - ST.stake).toFixed(2);
  const ser = ST.series; ST.series = null; GAME_CHAT.length = 0;
  endAllGames(); $('#overlay').innerHTML = '';
  if (ser) { go('batalhas', {}, {noHist: true, reset: true}); toast(`Você saiu da ${ser.b.name}`); } else leaveGame();
};
const DECKS = [['estrela', 'Liquid']]; // só o verso Estrela (o Tradicional vermelho saiu em 28/10, como no Figma)
function deckBack(k, size = 'S') { const cur = ST.deck; ST.deck = k; const h = cardHTML(null, size, true); ST.deck = cur; return h; }
function refreshBacks() { document.querySelectorAll('.card.back').forEach(el => { [...el.classList].filter(c => c.startsWith('dk-')).forEach(c => el.classList.remove(c)); if (ST.deck !== 'estrela') el.classList.add('dk-' + ST.deck); }); }
/* ---------- customize-sheet · Personalizar (avatar · mesa · baralho) · muda na hora ---------- */
const MESAS = [['azul', 'Azul', null], ['vermelha', 'Vermelha', null], ['bar', 'Bar', null], ['reis', 'Reis do baralho', 'reis']];
function personalizar() {
  const tile = (on, locked, inner, label, data) => `<div role="button" tabindex="0" class="ctile ${on ? 'on' : ''} ${locked ? 'locked' : ''}" ${data}><span class="mini">${inner}${locked ? tag('Loja') : ''}</span><span class="lb">${label}</span></div>`;
  const avs = [['nenhum', 'ela', null]];
  PACK_ORDER.forEach(pk => { const p = PACKS[pk]; const list = pk === 'estelar' ? p.roles.map(r => [r, hasSkin() && packOf(ST.crew) === 'estelar' ? ST.g : 'ela']) : [[p.roles[0], 'ele'], [p.roles[0], 'ela']]; list.forEach(([c, g]) => avs.push([c, g, ST.owned[pk] ? null : pk])); });
  avs.sort((a, b) => (a[2] ? 1 : 0) - (b[2] ? 1 : 0));
  const curMesa = ST.mesaPicked ? (G && G.variant === 'Paulista' ? ST.mesaPaulista : ST.mesaChoice) : 'bar';
  const inner = `${sheetHead('gear', 'Personalizar', 'Toque para escolher · muda na hora')}
    <div class="cgrp"><b>Avatar</b><div class="hscroll copts">${avs.map(([c, g, lock]) => tile(!lock && ST.crew === c && (c === 'nenhum' || ST.g === g), lock, c === 'nenhum' ? hex('nenhum', 'ela', 'm', 0, false) : hex(c, g, 'm', 0, false), crewName(c, g), lock ? `data-lock="${lock}"` : `data-av="${c}|${g}"`)).join('')}</div></div>
    <div class="cgrp"><b>Mesa</b><div class="hscroll copts">${MESAS.map(([k, l, need]) => { const lock = need && !ST.owned[need]; return tile(!lock && curMesa === k, lock, `<img class="tb" src="${A}mesa/truco-${k}.webp" alt="">`, l, lock ? `data-lock="${need}"` : `data-mesa="${k}"`); }).join('')}</div></div>
    <div class="cgrp"><b>Baralho</b><div class="hscroll copts">${DECKS.map(([k, l]) => tile(ST.deck === k, false, `<span style="position:relative;width:40px;height:56px">${deckBack(k)}</span>`, l, `data-deck="${k}"`)).join('')}</div></div>`;
  const open = $('#veil .bsheet.custom');
  if (open) { const sc = [...open.querySelectorAll('.copts')].map(x => x.scrollLeft); open.innerHTML = '<span class="handle"></span>' + inner; open.querySelectorAll('.copts').forEach((x, k) => { x.scrollLeft = sc[k] || 0; }); return; }
  openSheet(inner, {cls: 'g16 custom'});
  $('#veil').addEventListener('click', e => {
    const b = e.target.closest('.ctile'); if (!b) return;
    if (b.dataset.lock) { const pk = PACKS[b.dataset.lock]; toast(`Vem com o pacote ${pk.name} na Loja`); return; }
    if (b.dataset.deck) { ST.deck = b.dataset.deck; refreshBacks(); toast(`Baralho ${DECKS.find(d => d[0] === ST.deck)[1]} ativado`); }
    if (b.dataset.av) {
      [ST.crew, ST.g] = b.dataset.av.split('|');
      if (G) { G.players[0].crew = ST.crew; G.players[0].g = ST.g; renderSeats(); renderHUD(); }
      if (PF) { PF.players[0].crew = ST.crew; PF.players[0].g = ST.g; renderPifHUD(); renderPifSeats(); renderPif(); }
      if (BU) { BU.players[0].crew = ST.crew; BU.players[0].g = ST.g; renderBuHUD(); renderBuSeats(); renderBu(); }
      if (PK) { PK.players[0].crew = ST.crew; PK.players[0].g = ST.g; renderPkHUD(); renderPk && renderPk(); }
      toast(`Avatar: ${ST.crew === 'nenhum' ? 'sem skin' : crewName(ST.crew, ST.g)}`);
    }
    if (b.dataset.mesa) {
      ST.mesaPicked = true;
      if (G && G.variant === 'Paulista') ST.mesaPaulista = b.dataset.mesa; else { ST.mesaChoice = b.dataset.mesa; if (!G) ST.mesaPaulista = b.dataset.mesa; }
      const m = $('#mesaBg'); if (m) m.style.backgroundImage = `url(${currentMesaImg()})`;
      const sq = $('#seq'); if (sq) sq.classList.toggle('dark', mesaKey() === 'bar');
      toast(`Mesa ${b.querySelector('.lb').textContent} aplicada`);
    }
    personalizar();
    if (!$('#view').hidden && CUR) rerender();
  });
}

/* ---------- POKER ENGINE (Texas Hold'em Sit & Go contra bots) ---------- */
// 1x1 ou mesa de 6 · 1.500 fichas cada · blinds sobem a cada 5 mãos · fica quem tiver fichas.
// 1x1: o vencedor leva 1,8x a entrada · mesa de 6: 1º leva 3,6x e 2º leva 1,8x.
let PK = null, pkT, pkLeft, pkBotT;
const isPkSel = () => ST.game === 'poker';
const PK_BASE = [['betinh4', null, null], ['dutra77', 'comandante', 'ele'], ['alfonso_d', 'navegador', 'ele'], ['af.dutra', 'piloto', 'ela'], ['rafa_10', 'explorador', 'ele'], ['lu.reis', 'engenheiro', 'ela']]; // PROTECT
const PK_PEOPLE = PK_BASE.map(x => x.slice());
const PK_BL = [[10, 20], [20, 40], [30, 60], [50, 100], [75, 150], [100, 200], [150, 300], [250, 500]];
const PK_LV = 5;
// seats (board coords, Figma K01–K11): 0 = você embaixo; mesa de 6 em sentido horário: esquerda, topo-esq., topo, topo-dir., direita
const PK_SEAT2 = [{x: 146, y: 384}, {x: 152, y: 12}];
const PK_SEAT6 = [{x: 146, y: 384}, {x: 8, y: 250}, {x: 36, y: 100}, {x: 158, y: 14}, {x: 279, y: 100}, {x: 307, y: 250}];
const PK_BET2 = [[188, 326], [188, 136]];
const PK_BET6 = [[188, 340], [80, 318], [120, 196], [188, 124], [256, 196], [296, 318]];
const PK_DEAL2 = [[238, 410], [232, 76]];
const PK_DEAL6 = [[238, 410], [56, 300], [92, 96], [214, 10], [262, 96], [300, 228]];
const pkv = c => c.r === 'A' ? 14 : c.r === 'K' ? 13 : c.r === 'Q' ? 12 : c.r === 'J' ? 11 : +c.r;
const fmtc = v => Math.round(v).toLocaleString('pt-BR');
const pkRankName = (v, pl) => ({14: pl ? 'Ases' : 'Ás', 13: pl ? 'Reis' : 'Rei', 12: pl ? 'Damas' : 'Dama', 11: pl ? 'Valetes' : 'Valete'})[v] || String(v);
// 5-card score: [categoria, desempates…] (8 straight flush · 7 quadra · 6 full · 5 flush · 4 sequência · 3 trinca · 2 dois pares · 1 par · 0 carta alta)
function pkEval5(cs) {
  const vs = cs.map(pkv).sort((a, b) => b - a), cnt = {};
  vs.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
  const gr = Object.entries(cnt).map(([v, n]) => [+v, n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cs.every(c => c.s === cs[0].s), uq = [...new Set(vs)];
  let st = 0;
  if (uq.length === 5) { if (uq[0] - uq[4] === 4) st = uq[0]; else if (uq[0] === 14 && uq[1] === 5) st = 5; }
  if (st && flush) return [8, st];
  if (gr[0][1] === 4) return [7, gr[0][0], gr[1][0]];
  if (gr[0][1] === 3 && gr[1][1] === 2) return [6, gr[0][0], gr[1][0]];
  if (flush) return [5, ...vs];
  if (st) return [4, st];
  if (gr[0][1] === 3) return [3, gr[0][0], ...gr.slice(1).map(g => g[0])];
  if (gr[0][1] === 2 && gr[1][1] === 2) return [2, gr[0][0], gr[1][0], gr[2][0]];
  if (gr[0][1] === 2) return [1, gr[0][0], ...gr.slice(1).map(g => g[0])];
  return [0, ...vs];
}
const pkCmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function pkHandName(s) {
  switch (s[0]) {
    case 8: return s[1] === 14 ? 'Royal flush' : 'Straight flush';
    case 7: return `Quadra de ${pkRankName(s[1], true)}`;
    case 6: return 'Full house';
    case 5: return 'Flush';
    case 4: return s[1] === 14 ? 'Sequência do Ás' : 'Sequência';
    case 3: return `Trinca de ${pkRankName(s[1], true)}`;
    case 2: return 'Dois pares';
    case 1: return `Par de ${pkRankName(s[1], true)}`;
    default: return `Carta alta · ${pkRankName(s[1])}`;
  }
}
// best 5 of up to 7 cards
function pkBest(cards) {
  const n = cards.length; if (n < 5) return null;
  let best = null, five = null;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
    const f = [cards[a], cards[b], cards[c], cards[d], cards[e]], s = pkEval5(f);
    if (!best || pkCmp(s, best) > 0) { best = s; five = f; }
  }
  return {score: best, five, name: pkHandName(best)};
}
function pkHoleTxt(h) {
  const [a, b] = h.slice().sort((x, y) => pkv(y) - pkv(x));
  if (a.r === b.r) return `Par de ${pkRankName(pkv(a), true)} na mão`;
  return `${pkRankName(pkv(a))} e ${pkRankName(pkv(b))}${a.s === b.s ? ' do mesmo naipe' : ''}`;
}
// bot hand strength 0..1 (pré-flop por cartas altas/par/naipe; depois pela mão feita + projetos de flush/sequência)
function pkStrength(p) {
  const h = p.hole, B = PK.board;
  if (!B.length) {
    const [a, b] = h.map(pkv).sort((x, y) => y - x), gap = a - b;
    let s = a === b ? 0.5 + a / 30 : (a + b) / 40 + (a >= 13 ? 0.08 : 0);
    if (h[0].s === h[1].s) s += 0.06;
    if (gap === 1) s += 0.04; else if (gap > 4) s -= 0.06;
    return Math.max(0.05, Math.min(0.98, s));
  }
  const best = pkBest([...h, ...B]), cat = best.score[0];
  let s = [0.12, 0.38, 0.62, 0.74, 0.82, 0.86, 0.93, 0.97, 0.99][cat];
  if (cat === 1) { const top = Math.max(...B.map(pkv)); if (best.score[1] >= top) s += 0.12; else if (!h.some(c => pkv(c) === best.score[1])) s -= 0.18; }
  if (cat <= 1 && B.length < 5) {
    const all = [...h, ...B];
    if (SUITS.some(su => all.filter(c => c.s === su).length === 4)) s += 0.14;
    const vs = [...new Set(all.map(pkv))].sort((x, y) => x - y);
    for (let i = 0; i + 3 < vs.length; i++) if (vs[i + 3] - vs[i] === 3) { s += 0.1; break; }
  }
  return Math.max(0.03, Math.min(0.99, s));
}
function newPkDeck() { const d = []; let id = 0; for (const s of SUITS) for (const r of PR) d.push({r, s, id: id++}); return shuffle(d); }
const pkAlive = () => PK.players.filter(p => !p.out);
const pkNext = (i, f) => { const n = PK.players.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (f(PK.players[j], j)) return j; } return -1; };
const pkBL = () => PK_BL[Math.min(PK_BL.length - 1, Math.floor(PK.handNo / PK_LV))];
const pkPot = () => PK.pot + PK.players.reduce((s, p) => s + p.bet, 0);
const pkRound = v => Math.max(10, Math.round(v / 10) * 10);
const pkNeeds = p => !p.out && !p.folded && !p.allin && (!p.acted || p.bet < PK.curBet);
const pkName = i => i === 0 ? 'Você' : PK.players[i].name;
function pkPay(i, amt) { const p = PK.players[i], a = Math.max(0, Math.min(amt, p.stack)); p.stack -= a; p.bet += a; p.total += a; if (!p.stack) p.allin = true; return a; }

function startPoker(tableId) {
  clearInterval(myT); clearInterval(pfT); clearTimeout(pfBotT); clearInterval(buT); clearTimeout(buBotT); clearInterval(pkT); clearTimeout(pkBotT);
  MODE = 'poker'; G = null; PF = null; BU = null;
  const six = ST.variant === 'Mesa de 6';
  const ppl = (six ? PK_PEOPLE : PK_PEOPLE.slice(0, 2)).map((x, i) => ({name: x[0], crew: i === 0 ? ST.crew : x[1], g: i === 0 ? ST.g : x[2], stack: 1500, bet: 0, total: 0, folded: false, allin: false, out: false, hole: [], acted: false, last: '', best: null, place: 0}));
  PK = {tableId, six, players: ppl, dealer: six ? 5 : 1, handNo: 0, pot: 0, board: [], deck: [], street: 'pre', toAct: -1, curBet: 0, minRaise: 20, lastAgg: -1, phase: 'wait', start: Date.now(), msg: '', raise: null, show: null, sb: -1, bb: -1};
  show('game'); buildPkBoard(); renderPkHUD(); tick(); pkNewHand();
}
async function pkNewHand() {
  if (!PK) return;
  const P = PK.players, lvBefore = Math.floor((PK.handNo - 1) / PK_LV);
  PK.deck = newPkDeck(); Object.assign(PK, {board: [], pot: 0, show: null, raise: null, street: 'pre', msg: ''});
  for (const p of P) Object.assign(p, {bet: 0, total: 0, folded: p.out, allin: false, hole: [], acted: false, last: '', best: null});
  PK.dealer = pkNext(PK.dealer, p => !p.out);
  const heads = pkAlive().length === 2, [sbv, bbv] = pkBL();
  PK.sb = heads ? PK.dealer : pkNext(PK.dealer, p => !p.out); PK.bb = pkNext(PK.sb, p => !p.out);
  pkPay(PK.sb, sbv); pkPay(PK.bb, bbv);
  Object.assign(PK, {curBet: bbv, minRaise: bbv, lastAgg: PK.bb});
  for (let k = 0; k < 2; k++) for (const p of P) if (!p.out) p.hole.push(PK.deck.pop());
  PK.toAct = heads && pkNeeds(P[PK.sb]) ? PK.sb : pkNext(PK.bb, q => pkNeeds(q));
  const lv = Math.floor(PK.handNo / PK_LV);
  PK.handNo++;
  PK.phase = 'wait'; markTurn(-1);
  if (PK.handNo > 1 && lv !== lvBefore) gtoast(`Blinds subiram · ${sbv}/${bbv}`);
  renderPk(); renderPkHUD();
  await wait(900);
  if (!PK) return;
  PK.phase = 'act';
  if (PK.toAct < 0) { pkEndRound(); return; }
  pkTurn();
}
function pkTurn() {
  if (!PK || PK.phase !== 'act') return;
  const i = PK.toAct;
  if (i < 0) { pkEndRound(); return; }
  markTurn(i); renderPk();
  if (i === 0) startPkTimer();
  else { clearTimeout(pkBotT); pkBotT = setTimeout(() => pkBotAct(i), rnd(800, 1400)); }
}
function startPkTimer() {
  clearInterval(pkT); pkLeft = 20; setRing(0, 1, 20);
  pkT = setInterval(() => {
    if (!PK || PK.toAct !== 0 || PK.phase !== 'act') { clearInterval(pkT); return; }
    pkLeft--; setRing(0, pkLeft / 20, pkLeft);
    if (pkLeft <= 0) { clearInterval(pkT); gtoast('Tempo esgotado · jogamos por você'); pkAct(0, PK.curBet > PK.players[0].bet ? 'fold' : 'check'); }
  }, 1000);
}
function pkAct(i, kind, to) {
  if (!PK || PK.phase !== 'act' || PK.toAct !== i) return;
  const P = PK.players, p = P[i], toCall = PK.curBet - p.bet;
  if (kind === 'raise' && (to == null || to <= PK.curBet)) kind = toCall > 0 ? 'call' : 'check';
  if (kind === 'check' && toCall > 0) kind = 'call';
  clearInterval(pkT); clearTimeout(pkBotT);
  let say = '';
  if (kind === 'fold') { p.folded = true; p.last = 'Desistiu'; say = 'Desistiu'; }
  else if (kind === 'check') { p.last = 'Mesa'; say = 'Mesa'; }
  else if (kind === 'call') { pkPay(i, toCall); p.last = p.allin ? 'All-in' : 'Pagou'; say = p.allin ? 'All-in!' : `Pagou ${fmtc(toCall)}`; }
  else {
    to = Math.min(to, p.bet + p.stack);
    const inc = to - PK.curBet, was = PK.curBet;
    pkPay(i, to - p.bet);
    if (inc >= PK.minRaise) PK.minRaise = inc;
    PK.curBet = to; PK.lastAgg = i;
    P.forEach((q, k) => { if (k !== i) q.acted = false; });
    p.last = p.allin ? 'All-in' : was ? 'Aumentou' : 'Apostou';
    say = p.allin ? 'All-in!' : `${was ? 'Aumentou p/' : 'Apostou'} ${fmtc(to)}`;
  }
  p.acted = true; PK.raise = null;
  if (i !== 0) bubble(i, say, kind === 'fold' ? 'no' : '');
  else if (p.allin) bubble(0, 'All-in!', '');
  const live = P.filter(q => !q.out && !q.folded);
  PK.phase = 'wait'; markTurn(-1); renderPk();
  if (live.length === 1) { setTimeout(() => pkWinUncontested(live[0]), 500); return; }
  const nx = pkNext(i, q => pkNeeds(q));
  setTimeout(() => { if (!PK) return; if (nx < 0) pkEndRound(); else { PK.toAct = nx; PK.phase = 'act'; pkTurn(); } }, 420);
}
async function pkEndRound() {
  if (!PK) return;
  const P = PK.players;
  PK.pot = pkPot(); P.forEach(p => { p.bet = 0; p.acted = false; if (!p.folded && !p.out && !p.allin) p.last = ''; });
  PK.curBet = 0; PK.minRaise = pkBL()[1]; PK.phase = 'wait';
  renderPk(); await wait(450);
  if (!PK) return;
  if (PK.street === 'river') { pkShowdown(); return; }
  PK.street = PK.street === 'pre' ? 'flop' : PK.street === 'flop' ? 'turn' : 'river';
  for (let k = 0; k < (PK.street === 'flop' ? 3 : 1); k++) PK.board.push(PK.deck.pop());
  renderPk(true);
  await wait(700);
  if (!PK) return;
  const canAct = P.filter(p => !p.out && !p.folded && !p.allin);
  if (canAct.length <= 1) { pkEndRound(); return; } // all-in: abre o resto da mesa
  PK.toAct = pkNext(PK.dealer, q => pkNeeds(q)); PK.phase = 'act'; pkTurn();
}
async function pkWinUncontested(w) {
  if (!PK) return;
  PK.pot = pkPot(); PK.players.forEach(p => { p.bet = 0; });
  PK.phase = 'show'; markTurn(-1);
  const amt = PK.pot; w.stack += amt; PK.pot = 0;
  PK.show = {winners: [w], five: []};
  PK.msg = `${w === PK.players[0] ? 'Você leva' : w.name + ' leva'} o pote de ${fmtc(amt)}`;
  renderPk(); renderPkHUD();
  await wait(2200); pkAfterHand();
}
async function pkShowdown() {
  if (!PK) return;
  const P = PK.players; PK.phase = 'show'; markTurn(-1);
  const cont = P.filter(p => !p.out && !p.folded);
  cont.forEach(p => { p.best = pkBest([...p.hole, ...PK.board]); });
  // side pots by contribution: each layer goes to the best hand among who put chips in it
  let rem = P.map(p => p.total); const pots = [];
  while (rem.some(v => v > 0)) {
    const m = Math.min(...rem.filter(v => v > 0)); let amt = 0; const elig = [];
    rem = rem.map((v, k) => { if (v <= 0) return v; amt += Math.min(v, m); if (!P[k].folded && !P[k].out) elig.push(P[k]); return v - Math.min(v, m); });
    if (elig.length) pots.push({amt, elig}); else if (pots.length) pots[pots.length - 1].amt += amt;
  }
  let main = null;
  for (const pt of pots) {
    let best = null, ws = [];
    for (const p of pt.elig) { const c = best ? pkCmp(p.best.score, best) : 1; if (c > 0) { best = p.best.score; ws = [p]; } else if (c === 0) ws.push(p); }
    const share = Math.floor(pt.amt / ws.length / 10) * 10;
    ws.forEach(w => { w.stack += share; }); ws[0].stack += pt.amt - share * ws.length;
    if (!main) main = ws;
  }
  const W = main[0], losers = cont.filter(p => !main.includes(p)).sort((a, b) => pkCmp(b.best.score, a.best.score));
  PK.show = {winners: main, five: W.best.five};
  const wn = W === P[0] ? 'Você' : W.name, hn = W.best.name.toLowerCase();
  PK.msg = main.length > 1 ? `Empate com ${hn} · pote dividido` : losers.length && losers[0].best.name === W.best.name ? `${wn} ganha com ${hn} · no desempate` : `${wn} ganha com ${hn}`;
  PK.pot = 0;
  renderPk(); renderPkHUD();
  main.forEach(w => bubble(P.indexOf(w), 'Ganhou!', 'ok'));
  await wait(3600); pkAfterHand();
}
function pkAfterHand() {
  if (!PK) return;
  const P = PK.players, before = P.filter(p => !p.out).length;
  const busted = P.filter(p => !p.out && p.stack <= 0);
  busted.sort((a, b) => b.total - a.total).forEach((p, k) => { p.out = true; p.place = before - busted.length + 1 + k; }); // quem tinha mais fichas fica na frente
  const alive = P.filter(p => !p.out);
  if (P[0].out) { pkEnd(P[0].place); return; }
  if (alive.length === 1) { P[0].place = 1; pkEnd(1); return; }
  if (busted.length) gtoast(`${busted.map(p => p.name).join(', ')} ${busted.length > 1 ? 'saíram' : 'saiu'} da mesa`);
  pkNewHand();
}
function pkEnd(place) {
  clearInterval(clockT); clearInterval(pkT); clearTimeout(pkBotT);
  const six = PK.six, mult = six ? (place === 1 ? 3.6 : place === 2 ? 1.8 : 0) : (place === 1 ? 1.8 : 0), prize = prizeOf(ST.stake, mult), tid = PK.tableId;
  ST.saldo = +(ST.saldo + prize - ST.stake).toFixed(2);
  const P = PK.players, title = place === 1 ? 'Vitória' : six && place === 2 ? '2º lugar' : 'Derrota';
  const sub = place === 1 ? 'Você levou todas as fichas da mesa' : six && place === 2 ? 'Faltou pouco pra levar a mesa' : `Você saiu em ${place}º lugar`;
  // quem ainda está na mesa entra na frente, pela quantidade de fichas
  const alive = P.filter(p => !p.place).sort((a, b) => b.stack - a.stack);
  const order = [...alive, ...P.filter(p => p.place).sort((a, b) => a.place - b.place)];
  const rank = six ? `<div class="pkranks">${order.map((p, k) => { const pl = p.place || k + 1, live = !p.place; return `<div class="pkrank ${p === P[0] ? 'me' : ''}"><b>${pl}º</b>${hex(p.crew, p.g, 's', 0, false)}<span>${p === P[0] ? 'Você' : esc(p.name)}${live ? ' · jogando' : ''}</span><i>${live ? fmtc(p.stack) + ' fichas' : pl === 1 ? fmt(prizeOf(ST.stake, 3.6)) : pl === 2 ? fmt(prizeOf(ST.stake)) : '—'}</i></div>`; }).join('')}</div>` : '';
  showResult({win: place === 1 || (six && place === 2 && !ST.series), title, sub,
    value: prize ? `+ ${fmt2(prize)}` : `− ${fmt2(ST.stake)}`, caption: prize ? 'Prêmio já está no seu saldo' : 'Valor da entrada',
    ctx: `Mesa ${tid} · Poker · ${six ? 'mesa de 6' : '1x1'} · Sit & Go`, gameColor: 'var(--game-poker)',
    left: six ? '' : teamHTML([[P[0].name, P[0].crew, P[0].g]], 'Você', `${fmtc(P[0].stack)} fichas`), score: six ? '' : (place === 1 ? '1 × 0' : '0 × 1'),
    right: six ? '' : teamHTML([[P[1].name, P[1].crew, P[1].g]], P[1].name, `${fmtc(P[1].stack)} fichas`, true),
    extra: rank, hist: `Poker ${six ? 'mesa de 6' : '1x1'}`, vs: P[1].name, delta: prize - ST.stake,
    againLabel: ST.training ? 'Treinar de novo' : `${place === 1 ? 'Jogar de novo' : 'Revanche'} · ${fmt(ST.stake)}`,
    again: () => { ST.game = 'poker'; ST.variant = six ? 'Mesa de 6' : '1x1'; startQueue(tid); }});
}
// bots: força da mão + odds do pote, com um pouco de blefe
function pkBotAct(i) {
  if (!PK || PK.phase !== 'act' || PK.toAct !== i) return;
  const p = PK.players[i], toCall = PK.curBet - p.bet, pot = pkPot(), bb = pkBL()[1], maxTo = p.bet + p.stack;
  const s = pkStrength(p) + (Math.random() - 0.5) * 0.12, r = Math.random();
  const betTo = mult => Math.min(maxTo, pkRound(Math.max(PK.curBet + PK.minRaise, PK.curBet + pot * mult)));
  if (p.stack <= bb * 8 && s > 0.55) return pkAct(i, toCall >= p.stack ? 'call' : 'raise', maxTo);
  if (toCall <= 0) {
    if (s > 0.72 && r < 0.75) return pkAct(i, 'raise', betTo(0.6));
    if (s > 0.5 && r < 0.3) return pkAct(i, 'raise', betTo(0.5));
    if (r < 0.07) return pkAct(i, 'raise', betTo(0.5));
    return pkAct(i, 'check');
  }
  const odds = toCall / (pot + toCall);
  if (s > 0.86 && r < 0.55) return pkAct(i, 'raise', Math.min(maxTo, pkRound(Math.max(PK.curBet * 2.5, PK.curBet + PK.minRaise))));
  if (s > odds + 0.1 || s > 0.62) return pkAct(i, 'call');
  if (r < 0.05) return pkAct(i, 'call');
  return pkAct(i, 'fold');
}

/* ---------- POKER RENDER ---------- */
const pkCoin = () => `<img src="${A}icons/coins.webp" alt="">`;
function pkSeatHTML(i) {
  const P = PK.players[i], s = (PK.six ? PK_SEAT6 : PK_SEAT2)[i], small = PK.six && i > 0;
  return `<div class="seat ${small ? 'm' : ''} ${s.y < 60 ? 'top' : ''}" id="seat${i}" style="left:${s.x}px;top:${s.y}px">
    <div class="avbox"><svg class="ring" viewBox="0 0 84 84"><circle class="tr" cx="42" cy="42" r="40"/><circle class="pg" cx="42" cy="42" r="40" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/></svg>${hex(P.crew, P.g, 56, 60)}<span class="pill secs" id="secs${i}">20s</span></div>
    <span class="nick">${i === 0 ? 'Você' : P.name}</span>${i === 0 ? '<span class="stag" id="suaVez" hidden>Sua vez</span>' : `<span class="pill pkst" id="pkst${i}"></span>`}<span class="bubble" id="bub${i}"></span></div>`;
}
function buildPkBoard() {
  const b = $('#board');
  b.innerHTML = `<div class="mesa" id="mesaBg" style="background-image:url(${A}mesa/${capsuleMesa('verde')}.webp)"></div>
    <div id="pkOpp"></div><div id="seats">${PK.players.map((_, i) => pkSeatHTML(i)).join('')}</div>
    <div class="pkpot" id="pkPot"></div><div id="pkBoard"></div><div id="pkBets"></div><div class="pkdealer" id="pkDealer">D</div>
    <div class="tmsg" id="pkMsg" style="top:312px" hidden><span class="su">${SUITS.map(s => `<svg style="fill:${RED(s) ? '#e5484d' : '#fff'}"><use href="#s-${s}"/></svg>`).join('')}</span><span class="tx" id="pkMsgTx"></span></div>
    <div id="pkHole"></div><div class="hint" id="pkHint" hidden><span class="pill" id="pkHintTx"></span></div>
    <div class="pkacts" id="pkActs"></div><div class="pkraise" id="pkRaise" hidden></div>
    <div class="gtoast" id="gtoast"><span class="pill" id="gtoastTxt"></span></div>`;
  $('#pkActs').onclick = e => { const bt = e.target.closest('button'); if (!bt || bt.disabled || !PK) return; if (bt.dataset.k === 'raise') pkOpenRaise(); else pkAct(0, bt.dataset.k); };
  $('#pkRaise').onclick = e => {
    const R = PK && PK.raise; if (!R) return;
    const pb = e.target.closest('[data-p]'), rb = e.target.closest('[data-r]');
    if (pb) { R.sel = +pb.dataset.p; R.val = R.pre[R.sel]; renderPkRaise(); }
    else if (rb && rb.dataset.r === 'cancel') { PK.raise = null; renderPk(); }
    else if (rb && rb.dataset.r === 'ok') pkAct(0, 'raise', R.val);
  };
  fitBoard();
}
function renderPkHUD() {
  if (!PK) return;
  const P = PK.players, [sb, bb] = pkBL();
  const right = PK.six ? `<span class="pts"><span class="label">na mesa</span><b>${pkAlive().length}/6</b></span>` : `<span class="pts"><span class="label">${OPP.n}</span><b>${fmtc(P[1].stack)}</b></span>${hex(P[1].crew, P[1].g, 32, 35, false)}`;
  $('#hud').innerHTML = `<div class="row">
    <div class="side">${hex(P[0].crew, P[0].g, 32, 35, false)}<span class="pts"><span class="label">Você</span><b>${fmtc(P[0].stack)}</b></span></div>
    <div class="timer"><span class="tt"><img src="${A}icons/timer.webp" alt=""><span id="clock">${clk()}</span></span></div>
    <div class="side r">${right}</div></div>
    <div class="info"><span class="g"><img src="${A}icons/poker.webp" alt=""><b>Poker</b><span class="label">· ${PK.six ? 'mesa de 6' : '1x1'} · Sit & Go · blinds ${sb}/${bb}</span></span><span class="prize"><img src="${A}icons/banknote.webp" alt="">${fmt(+(ST.stake * (PK.six ? 3.6 : 1.8)).toFixed(2))}</span></div>`;
}
function pkButtons() {
  const me = PK.players[0], my = PK.phase === 'act' && PK.toAct === 0, toCall = PK.curBet - me.bet;
  if (me.out || me.folded || me.allin || PK.phase === 'show') return null;
  if (!my) return [['Desistir', 'fold', 0, 0], ['Mesa', 'check', 0, 0], ['Apostar', 'raise', 1, 0]];
  if (toCall <= 0) return [['Mesa', 'check', 0, 1], ['Apostar', 'raise', 1, 1]];
  if (toCall >= me.stack) return [['Desistir', 'fold', 0, 1], [`Pagar all-in · ${fmtc(me.stack)}`, 'call', 1, 1]];
  return [['Desistir', 'fold', 0, 1], [`Pagar ${fmtc(toCall)}`, 'call', 0, 1], ['Aumentar', 'raise', 1, me.stack > toCall ? 1 : 0]];
}
function pkOpenRaise() {
  const me = PK.players[0], bb = pkBL()[1], toCall = PK.curBet - me.bet, maxTo = me.bet + me.stack, pot = pkPot();
  const min = Math.min(maxTo, PK.curBet ? PK.curBet + PK.minRaise : bb);
  const pre = (PK.curBet ? [PK.curBet * 2, PK.curBet * 3, PK.curBet + pot + toCall, maxTo] : [bb * 2, bb * 3, pot, maxTo]).map((v, k) => k === 3 ? maxTo : Math.max(min, Math.min(maxTo, pkRound(v))));
  PK.raise = {min, max: maxTo, pre, sel: 1, val: pre[1]};
  renderPk();
}
function pkRaiseLabel(R) { return R.val >= R.max ? `All-in · ${fmtc(R.max)}` : `${PK.curBet ? 'Aumentar para' : 'Apostar'} ${fmtc(R.val)}`; }
function renderPkRaise() {
  const R = PK.raise, el = $('#pkRaise');
  if (!R) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<div class="hd"><b>${PK.curBet ? 'Aumentar' : 'Apostar'}</b><span class="v" id="pkRv">${fmtc(R.val)}</span></div>
    <div class="pktabs">${['2x', '3x', 'Pote', 'All-in'].map((t, k) => `<button class="${R.sel === k ? 'on' : ''}" data-p="${k}">${t}</button>`).join('')}</div>
    <input type="range" id="pkRange" min="${R.min}" max="${R.max}" step="10" value="${R.val}" aria-label="Valor da aposta">
    <div class="mm"><span>Mín. ${fmtc(R.min)}</span><span>Máx. ${fmtc(R.max)}</span></div>
    <div class="row"><button class="btn secondary" data-r="cancel">Cancelar</button><button class="btn primary" data-r="ok" id="pkRok">${pkRaiseLabel(R)}</button></div>`;
  $('#pkRange').oninput = e => { R.val = Math.min(R.max, Math.max(R.min, +e.target.value)); R.sel = -1; $('#pkRv').textContent = fmtc(R.val); $('#pkRok').textContent = pkRaiseLabel(R); el.querySelectorAll('[data-p]').forEach(b => b.classList.remove('on')); };
}
function renderPk(pop) {
  if (!PK) return;
  const P = PK.players, six = PK.six, me = P[0], S = PK.show, five = S && S.five ? S.five : [];
  const seats = six ? PK_SEAT6 : PK_SEAT2, bets = six ? PK_BET6 : PK_BET2;
  // seats: stack / Desistiu / All-in
  P.forEach((p, i) => {
    const s = $('#seat' + i); if (!s) return;
    s.classList.toggle('fold', p.folded || p.out);
    const st = $('#pkst' + i);
    if (st) { st.hidden = !six || (S && !p.folded && !p.out && S.five.length); st.textContent = p.out ? 'Eliminado' : p.folded ? 'Desistiu' : p.allin ? 'All-in' : fmtc(p.stack); st.classList.toggle('allin', p.allin && !p.folded && !p.out); }
  });
  const sv = $('#suaVez'); if (sv) sv.hidden = !(PK.phase === 'act' && PK.toAct === 0);
  const dp = (six ? PK_DEAL6 : PK_DEAL2)[PK.dealer]; Object.assign($('#pkDealer').style, {left: dp[0] + 'px', top: dp[1] + 'px'});
  const pot = pkPot();
  $('#pkPot').innerHTML = pot ? `<span class="l">Pote</span><span class="chip big">${pkCoin()}${fmtc(pot)}</span>` : '';
  $('#pkBets').innerHTML = P.map((p, i) => p.bet ? `<span class="pkbet chip" style="left:${bets[i][0]}px;top:${bets[i][1]}px">${pkCoin()}${fmtc(p.bet)}</span>` : '').join('');
  const nNew = PK.street === 'flop' ? 3 : 1;
  $('#pkBoard').innerHTML = [0, 1, 2, 3, 4].map(k => { const c = PK.board[k], x = 56 + k * 54; return c ? `<div class="pkc ${pop && k >= PK.board.length - nNew ? 'pop' : ''} ${five.includes(c) ? 'win' : ''}" style="left:${x}px;top:222px">${cardHTML(c, 'M')}</div>` : `<span class="pkslot" style="left:${x}px;top:222px"></span>`; }).join('');
  // opponents' cards: backs while in the hand, face up at the showdown
  let opp = '';
  P.forEach((p, i) => {
    if (!i || p.out || p.folded) return;
    const s = seats[i], showUp = S && S.five.length;
    if (!six) {
      opp += showUp ? p.hole.map((c, k) => `<div class="pkc ${five.includes(c) ? 'win' : ''}" style="left:${k ? 268 : 228}px;top:${k ? 26 : 22}px;transform:rotate(${k ? -6 : 8}deg)">${cardHTML(c, 'M')}</div>`).join('')
        : [0, 1].map(k => `<div class="pkc" style="left:${222 + k * 14}px;top:${24 + k * 2}px;transform:rotate(${k ? -6 : 8}deg)">${cardHTML(null, 'XS', true)}</div>`).join('');
    } else if (showUp) opp += p.hole.map((c, k) => `<div class="pkc ${five.includes(c) ? 'win' : ''}" style="left:${s.x - 4 + k * 26}px;top:${s.y + 58}px">${cardHTML(c, 'S')}</div>`).join('');
    else if (i >= 2 && i <= 4) opp += [0, 1].map(k => `<div class="pkc" style="left:${s.x + 46 + k * 10}px;top:${s.y + 10 + k * 2}px;transform:rotate(${k ? -6 : 8}deg)">${cardHTML(null, 'XS', true)}</div>`).join('');
  });
  $('#pkOpp').innerHTML = opp;
  $('#pkHole').innerHTML = me.out ? '' : me.hole.map((c, k) => `<div class="pkc hole ${five.includes(c) ? 'win' : ''} ${me.folded ? 'dim' : ''}" style="left:${k ? 184 : 128}px;top:508px;transform:rotate(${k ? -6 : 6}deg)">${cardHTML(c, 'L')}</div>`).join('');
  // hint: what you have
  const hb = $('#pkHint'), mine = me.hole.length ? (PK.board.length ? pkBest([...me.hole, ...PK.board]) : null) : null;
  hb.hidden = me.out || !me.hole.length;
  $('#pkHintTx').textContent = me.folded ? 'Você desistiu desta mão' : mine ? `Você tem ${mine.name.charAt(0).toLowerCase() + mine.name.slice(1)}` : me.hole.length ? pkHoleTxt(me.hole) : '';
  $('#pkMsg').hidden = !PK.msg; $('#pkMsgTx').textContent = PK.msg;
  // actions / raise panel
  const btns = pkButtons(), A_ = $('#pkActs');
  A_.hidden = !btns || !!PK.raise;
  A_.innerHTML = btns ? btns.map(([l, k, pr, on]) => `<button class="btn ${pr ? 'primary' : 'secondary'}" data-k="${k}" ${on ? '' : 'disabled'}>${l}</button>`).join('') : '';
  renderPkRaise();
  renderPkHUD();
}

window.__eg = {get G(){ return G; }, get PF(){ return PF; }, get BU(){ return BU; }, get PK(){ return PK; }, pk: {pkBest, pkEval5, pkAct, startPoker, pkStrength}, pf: {meldKind, baterOptions, sortMeld, partition, cardTxt, isWild, pifDraw, pifDiscard, pifBater, worstCard}, tr: {jogoInfo, trincaInfo, buRed3, isRed3, isBlack3, tresBonus}, bu: {seqInfo, findRuns, buCheck, buApply, buDiscard, buDraw, botNextPlay, botDiscardIdx, buScore, buCanUse, startBuraco, buSort, speed: v => { BU_SPEED = v; }}, showCall, callRaise, respond, pif: {partition, baterOptions, grouping, meldKind, isSeq, isTrinca, evalHand, worstCard, botWantsLixo, pifDraw, pifDiscard, pifBater, pifSort, startPif}};
