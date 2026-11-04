/* Liquid · Torneios (opt-in, entrou em 04/11 no lugar das Batalhas): lista com filtro por jogo, card no estilo da mesa
   (Aberto · Inscrito · Ao vivo · Encerrado), sheet do torneio (Regras · Prêmios · Ranking), inscrição grátis ou paga,
   saldo insuficiente, cancelar, aviso de início e partidas que somam pontos no ranking do torneio (vitória vale 3) */
'use strict';
const T_MIN = 6e4, T_H = 36e5, T_DAY = 864e5;
const TCLOCK = {skew: 0}; // o QA adianta o relógio
const tNow = () => Date.now() + TCLOCK.skew;
const tAt = (h, m, s) => Date.now() + ((h * 60 + m) * 60 + s) * 1e3;
const T_SPLIT = [.4, .25, .15, .1, .1]; // prêmio por posição, do 1º ao 5º
const T_BOTS = [['luana.m', 'explorador', 'ela'], ['dutra77', 'comandante', 'ele'], ['af_07', 'piloto', 'ela'], ['caio.s', 'explorador', 'ele'], ['marcao', 'navegador', 'ele'], ['amanda.s', 'engenheiro', 'ela'],
  ['rafa_10', 'piloto', 'ele'], ['lu.reis', 'engenheiro', 'ela'], ['capitao.lu', 'comandante', 'ela'], ['mari_truco', 'navegador', 'ela'], ['joao.poker', 'piloto', 'ele'], ['dutra.bet', 'explorador', 'ele']];
// o Truco Relâmpago começa 1 min e meio depois de abrir o app: dá para ver o aviso de início, o Ao vivo e o ranking andando
const TOURNEYS = [
  {id: 'T1', name: 'Truco Relâmpago', game: 'truco', variant: 'Mineiro', fmt: '1x1', entry: 0, prize: 50, players: 96, start: tAt(0, 1, 30), dur: 20 * T_MIN},
  {id: 'T2', name: 'Copa de Domingo', game: 'truco', variant: 'Paulista', fmt: '1x1', entry: 0, prize: 100, players: 387, start: tAt(3, 13, 46), dur: 3 * T_H},
  {id: 'T3', name: 'Mineiro de Sexta', game: 'truco', variant: 'Mineiro', fmt: '2x2', entry: 15, prize: 1200, players: 42, start: tAt(6, 43, 46), dur: 3 * T_H},
  {id: 'T4', name: 'Cacheta Relâmpago', game: 'cacheta', variant: 'Pif-Paf', fmt: '1x1', entry: 5, prize: 500, players: 128, start: tAt(8, 13, 46), dur: 2 * T_H},
  {id: 'T5', name: 'Buraco da Noite', game: 'buraco', variant: 'Aberto', fmt: '2x2', entry: 10, prize: 1000, players: 64, start: tAt(9, 43, 46), dur: 3 * T_H},
  {id: 'T6', name: 'Desafio Bola 8', game: 'sinuca', variant: 'Bola 8', fmt: '1x1', entry: 0, prize: 300, players: 211, start: tAt(11, 13, 46), dur: 2 * T_H},
  {id: 'T7', name: 'Poker dos Campeões', game: 'poker', variant: 'Mesa de 6', fmt: 'Mesa de 6', entry: 1500, prize: 10000, players: 18, start: tAt(26, 13, 46), dur: 4 * T_H}
].map(t => Object.assign(t, {joined: false, joinedAt: 0, pts: 0, w: 0, l: 0, warned: false, began: false, paid: false, board: T_BOTS.map(p => ({p, pts: 0, w: 0}))}));
const tById = id => TOURNEYS.find(t => t.id === id);

/* ---------- estado, tempo e textos ---------- */
function tState(t) { const n = tNow(); return n < t.start ? (t.joined ? 'Inscrito' : 'Aberto') : n < t.start + t.dur ? 'Ao vivo' : 'Encerrado'; }
const tLeft = t => { const n = tNow(); return n < t.start ? t.start - n : Math.max(0, t.start + t.dur - n); };
const p2 = n => String(n).padStart(2, '0');
function tParts(t) { const s = Math.ceil(tLeft(t) / 1e3); return [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60]; }
function tClock(t) { const [d, h, m, s] = tParts(t); return `${d ? d + 'd ' : ''}${p2(h)}:${p2(m)}:${p2(s)}`; }
const tHour = ms => { const d = new Date(ms), m = d.getMinutes(); return `${d.getHours()}h${m ? p2(m) : ''}`; };
function tDay(ms) {
  const a = new Date(ms), b = new Date(tNow()), dd = Math.round((new Date(a.toDateString()) - new Date(b.toDateString())) / T_DAY);
  return dd === 0 ? 'hoje' : dd === 1 ? 'amanhã' : a.toLocaleDateString('pt-BR', {weekday: 'long'});
}
const tWhen = t => `${tDay(t.start)}, ${tHour(t.start)}`;
const tWindow = t => `das ${tHour(t.start)} às ${tHour(t.start + t.dur)}`;
function tLine(t) {
  if (t.game === 'truco') return `Truco ${t.variant} · ${t.fmt}`;
  if (t.game === 'buraco') return `Buraco ${t.variant} · ${t.fmt}`;
  if (t.game === 'sinuca') return `Sinuca ${t.variant} · ${t.fmt}`;
  if (t.game === 'poker') return t.fmt === 'Mesa de 6' ? 'Poker · mesa de 6' : 'Poker · 1x1';
  return `${t.variant} · ${t.fmt}`;
}
const tEntry = t => t.entry ? fmt(t.entry) : 'Grátis';
const tPrizeAt = (t, pos) => pos >= 1 && pos <= T_SPLIT.length ? +(t.prize * T_SPLIT[pos - 1]).toFixed(2) : 0;
// ranking: bots + você (se inscrito), por pontos · no empate, fica na frente quem fez os pontos primeiro (os bots)
function tRank(t) {
  const rows = t.board.map(b => ({nick: b.p[0], crew: b.p[1], g: b.p[2], pts: b.pts, w: b.w}));
  if (t.joined) rows.push({me: true, nick: ST.nick, crew: ST.crew, g: ST.g, pts: t.pts, w: t.w, l: t.l});
  rows.sort((a, b) => b.pts - a.pts || (a.me ? 1 : b.me ? -1 : 0));
  rows.forEach((r, i) => { r.pos = i + 1; });
  return rows;
}
const tMe = t => tRank(t).find(r => r.me);
const T_TINT = {truco: 'var(--game-truco-tint)', cacheta: 'var(--game-cacheta-tint)', buraco: 'var(--game-buraco-tint)', poker: 'var(--game-poker-tint)', sinuca: 'var(--game-sinuca-tint)'};
const tTint = t => t.game === 'truco' && t.variant === 'Paulista' ? 'var(--game-paulista-tint)' : T_TINT[t.game];

/* ---------- tournament-card-estrela-games · estilo da mesa (borda + pano, aba do prêmio no meio) ---------- */
function tCard(t) {
  const s = tState(t), live = s === 'Ao vivo', end = s === 'Encerrado';
  const st = s === 'Inscrito' ? tag('Inscrito', 'success') : live ? tag('<i></i>Ao vivo', 'live') : end ? tag('Encerrado', 'neutral') : '';
  const cta = end ? btn('Resultado', 'sec', 's', `data-a="tInfo:${t.id}:ranking"`)
    : s === 'Inscrito' ? btn('Cancelar', 'sec', 's', `data-a="tCancelAsk:${t.id}"`)
    : live && t.joined ? btn('Jogar', 'pri', 's', `data-a="tPlay:${t.id}"`) : btn('Inscrever', 'pri', 's', `data-a="tJoin:${t.id}"`);
  return `<div role="button" tabindex="0" class="tcard ${end ? 'end' : ''}" data-tor="${t.id}">
    <span class="felt"><span class="jg">${ic(GAME_ICON[t.game])}<small>${ic('friends')}${t.players}</small></span>
      <span class="info"><b>${esc(t.name)}</b><small>${tLine(t)}</small><span class="tm">${ic('timer')}<span>${live ? 'Termina em' : end ? 'Terminou' : 'Começa em'}</span><b class="${live ? 'live' : ''}" data-tt="${t.id}">${end ? tHour(t.start + t.dur) : tClock(t)}</b></span></span>
      <span class="ac">${cta}<small>Entrada <b>${tEntry(t)}</b></small></span></span>
    <span class="tb pz">Prêmio <b>${fmt(t.prize)}</b></span><span class="tb inf">Infos</span>${st ? `<span class="st">${st}</span>` : ''}</div>`;
}

/* ---------- tela Torneios (T01 · T07 · T09 · T11 · T12) ---------- */
const TL = {filter: 'todos'};
SCREENS.torneios = {cls: 'tor', render: () => {
  const list = TOURNEYS.filter(t => TL.filter === 'todos' || t.game === TL.filter);
  const mine = list.filter(t => t.joined), open = list.filter(t => !t.joined && tState(t) !== 'Encerrado');
  const g = TL.filter === 'todos' ? null : gameById(TL.filter);
  return `${header()}<div class="scroll"><div class="content">
    <div class="ttl"><h1>Torneios</h1><p>Inscreva-se e dispute o prêmio.</p></div>
    <div class="hscroll">${gameBlock('todos', !g, 'data-tf="todos"')}${['truco', 'cacheta', 'buraco', 'poker', 'sinuca'].map(id => gameBlock(id, TL.filter === id, `data-tf="${id}"`)).join('')}</div>
    ${mine.length ? `${stitle('Seus torneios')}<div class="tlist">${mine.map(tCard).join('')}</div>` : ''}
    ${open.length ? `${stitle('Disponíveis')}<div class="tlist">${open.map(tCard).join('')}</div>` : ''}
    ${mine.length || open.length ? '' : `<div class="nempty tempty"><span class="ec">${ic('gamepad')}</span><b>Nenhum torneio ${g ? doG(g) + ' ' + g.name : ''} agora</b><span>Novos torneios aparecem toda semana. Enquanto isso, veja os dos outros jogos.</span></div>`}
  </div></div>${navbar('torneios')}`;
}, click: e => {
  const f = e.target.closest('[data-tf]'); if (f) { TL.filter = f.dataset.tf; rerender(); return; }
  const c = e.target.closest('[data-tor]'); if (c) ACT.tInfo(c.dataset.tor);
}};

/* ---------- sheet do torneio (T02 Regras · T03 Prêmios · T04/T11 Ranking) ---------- */
let TSH = null; // {id, tab}
function tCountdown(t, label) {
  const p = tParts(t).map(p2);
  return `<div class="tcd"><small>${label}</small><div class="cells" data-tcd="${t.id}">${['dias', 'horas', 'min', 'seg'].map((u, i) => `<span><b>${p[i]}</b><small>${u}</small></span>`).join('')}</div></div>`;
}
function tRulesHTML(t) {
  const r = [`Valem as partidas de ${tLine(t)} jogadas ${tWindow(t)}.`, `Vitória vale 3 pontos.${t.game === 'buraco' ? ' Empate vale 1.' : ''} Derrota ou desistência vale 0.`,
    'Empate em pontos: fica na frente quem fez os pontos primeiro.', 'O prêmio cai no seu saldo assim que o torneio termina.'];
  return `<div class="trules">${r.map(x => `<div>${ic('check')}<span>${x}</span></div>`).join('')}</div>`;
}
function tPrizesHTML(t) {
  const rows = [['crown', '1º lugar', fmt(tPrizeAt(t, 1))], ['medal', '2º lugar', fmt(tPrizeAt(t, 2))], ['medal', '3º lugar', fmt(tPrizeAt(t, 3))], ['star', '4º e 5º lugar', `${fmt(tPrizeAt(t, 4))} cada`]];
  return `<div class="tprz">${rows.map(([i, l, v]) => `<div><span class="itile">${ic(i)}</span><b>${l}</b><em>${v}</em></div>`).join('')}</div>`;
}
function tRankHTML(t) {
  if (tNow() < t.start) return `<div class="nempty tempty"><span class="ec">${ic('podium')}</span><b>O ranking abre às ${tHour(t.start)}</b><span>Quando o torneio começar, cada vitória soma pontos aqui. ${t.joined ? 'Você já está na lista.' : 'Inscreva-se para aparecer na lista.'}</span></div>`;
  const all = tRank(t), me = all.find(r => r.me), top = all.slice(0, 4);
  const row = r => `<div class="rrow ${r.me ? 'me' : r.pos <= 3 ? 'top' : ''}"><em>${r.pos}</em>${av(r.crew, r.g, 's')}<span class="tx"><b>@${esc(r.nick)}${r.me ? ' (você)' : ''}</b><small>${r.w} ${r.w === 1 ? 'vitória' : 'vitórias'}${r.me && r.l ? ` · ${r.l} ${r.l === 1 ? 'derrota' : 'derrotas'}` : ''}</small></span><span class="pts"><b>${r.pts} pts</b>${tPrizeAt(t, r.pos) && r.pts ? `<small class="pz">${fmt(tPrizeAt(t, r.pos))}</small>` : ''}</span></div>`;
  return `<div class="trank">${top.map(row).join('')}${me && me.pos > 4 ? row(me) : ''}</div>${t.joined ? '' : '<p class="qinfo">Inscreva-se para aparecer no ranking.</p>'}`;
}
function tSheetHTML() {
  const t = tById(TSH.id), s = tState(t), live = s === 'Ao vivo', end = s === 'Encerrado', g = gameById(t.game), me = tMe(t);
  const stats = live && t.joined ? stat('trophy', fmt(t.prize), 'prêmio') + stat('medal', `${me.pos}º`, 'sua posição') : stat('trophy', fmt(t.prize), 'prêmio') + stat('friends', t.players, 'inscritos');
  const body = TSH.tab === 'premios' ? tPrizesHTML(t) : TSH.tab === 'ranking' ? tRankHTML(t) : tRulesHTML(t);
  let cta, note;
  if (end) { cta = btn('Fechar', 'sec', 'l', 'data-a="closeSheet"', 'wide'); note = me ? `Você terminou em ${me.pos}º com ${me.pts} pontos.` : 'Este torneio já terminou.'; }
  else if (live && t.joined) { cta = btn('Jogar agora', 'pri', 'l', `data-a="tPlay:${t.id}"`, 'wide'); note = 'Você joga contra outros inscritos. Cada vitória vale 3 pontos.'; }
  else if (t.joined) { cta = btn('Cancelar inscrição', 'sec', 'l', `data-a="tCancelAsk:${t.id}"`, 'wide'); note = `Você está inscrito. Começa ${tWhen(t)}.`; }
  else { cta = btn(t.entry ? `Inscrever · ${fmt(t.entry)}` : 'Inscrever grátis', 'pri', 'l', `data-a="tJoin:${t.id}"`, 'wide'); note = live ? 'O torneio já começou: inscreva-se e jogue até o fim.' : t.entry ? 'Se cancelar antes do início, a entrada volta para o seu saldo.' : 'Dá pra cancelar a inscrição até o torneio começar.'; }
  return `<div class="thead"><span class="gm" style="--gt:${tTint(t)}">${ic(GAME_ICON[t.game])}</span><span class="tx"><b>${esc(t.name)}</b><small>${tLine(t)} · ${tDay(t.start)}, ${tWindow(t).replace('das ', '')}</small></span></div>
    ${end ? '' : tCountdown(t, live ? 'Termina em' : 'Começa em')}
    <div class="tstats">${stats}</div>
    ${tabs([['tTab:regras', 'Regras'], ['tTab:premios', 'Prêmios'], ['tTab:ranking', 'Ranking']], 'tTab:' + TSH.tab, tabStyle(g, t.variant), 'a')}
    ${body}
    <div class="tcta">${cta}<p class="qinfo">${note}</p></div>`;
}
function openTSheet(id, tab) { TSH = {id, tab}; openSheet(tSheetHTML(), {cls: 'g16 tsh', onClose: () => { TSH = null; }}); }
function paintTSheet() { const s = $('#sheet .bsheet.tsh'); if (s && TSH) s.innerHTML = '<span class="handle"></span>' + tSheetHTML(); }

/* ---------- sheets de confirmação (T05 confirmar · T06 saldo insuficiente · T08 cancelar · T10 aviso) ---------- */
function tAsk(o) {
  TSH = null;
  openSheet(`<div class="task">${ic(o.icon, 'hero')}${o.tag ? tag(o.tag, 'gold') : ''}<div class="tx"><h2>${o.title}</h2><p>${o.text}</p></div>
    ${o.rows ? `<div class="tsum">${o.rows.map(r => r === '-' ? '<i></i>' : `<div><span>${r[0]}</span><b class="${r[2] || ''}">${r[1]}</b></div>`).join('')}</div>` : ''}
    ${o.extra || ''}
    <div class="row">${o.actions.map(([type, label, act]) => btn(label, type, 'm', `data-a="${act}"`, 'fill')).join('')}</div>
    ${o.note ? `<p class="qinfo">${o.note}</p>` : ''}</div>`, {cls: 'g16'});
}
function tToast(icon, title, text) {
  $$('#app .gtoast-card.tt').forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'gtoast-card fx tt';
  d.innerHTML = `${ic(icon)}<div><b>${title}</b><small>${text}</small></div>`;
  $('#app').appendChild(d); setTimeout(() => d.remove(), 3600);
}
function tDoJoin(t) {
  t.joined = true; t.joinedAt = tNow(); t.players++;
  if (t.entry) ST.saldo = +(ST.saldo - t.entry).toFixed(2);
  closeSheet(); refreshChrome(); if (CUR === 'torneios') rerender();
  tToast('check', 'Inscrição feita!', `Você está no ${t.name}. ${tNow() < t.start ? `Começa ${tWhen(t)}.` : 'Já pode jogar.'}`);
}
function tWarn(t) {
  t.warned = true;
  NOTIFS.unshift({id: Date.now(), icon: 'trophy', t: `${t.name} começa em 5 min`, d: 'Você está inscrito. Toque para entrar na mesa do torneio.', at: 'agora', unread: true, fav: false});
  repaintNotifs();
  tAsk({icon: 'trophy', tag: `Prêmio ${fmt(t.prize)}`, title: 'Seu torneio vai começar', text: `${t.name} · ${tLine(t)}. Cada vitória até as ${tHour(t.start + t.dur)} soma pontos no ranking.`,
    extra: tCountdown(t, 'Começa em'), actions: [['sec', 'Depois', 'closeSheet'], ['pri', 'Entrar no torneio', `tEnter:${t.id}`]]});
}
// sai do modo torneio e volta a aposta/jogo que a pessoa tinha escolhido no lobby
function tExit() { if (ST.tPrev) Object.assign(ST, ST.tPrev); ST.tPrev = null; ST.tourney = null; }
// resultado de uma partida do torneio (chamado pelo showResult): soma pontos e troca os botões
function tResult(r) {
  const t = ST.tourney, pts = r.win ? 3 : r.tie ? 1 : 0;
  t.pts += pts; if (r.win) t.w++; else if (!r.tie) t.l++;
  const me = tMe(t), goBack = () => { tExit(); HIST = []; go('torneios', {}, {noHist: true, reset: true}); setTimeout(() => ACT.tInfo(t.id + ':ranking'), 250); };
  Object.assign(r, {value: pts ? `+${pts} ${pts === 1 ? 'ponto' : 'pontos'}` : '0 pontos', caption: `${t.name} · você está em ${me.pos}º com ${t.pts} ${t.pts === 1 ? 'ponto' : 'pontos'}`,
    hist: `Torneio · ${gameById(t.game).name}`, delta: 0, backLabel: 'Ver ranking', onBack: goBack,
    againLabel: 'Próxima partida', again: () => { if (tState(t) === 'Ao vivo') ACT.tPlay(t.id); else goBack(); }});
}
Object.assign(ACT, {
  tInfo: a => {
    const [id, tab] = a.split(':'), t = tById(id); if (!t) return;
    const s = tState(t);
    if (s === 'Ao vivo' && t.joined) t.began = true; // já viu que começou: sem o aviso de início depois
    openTSheet(id, tab || (t.joined && (s === 'Ao vivo' || s === 'Encerrado') ? 'ranking' : 'regras'));
  },
  tTab: tab => { if (!TSH) return; TSH.tab = tab; paintTSheet(); },
  tJoin: id => {
    const t = tById(id); if (!t || t.joined) return;
    if (tState(t) === 'Encerrado') { toast('Inscrições encerradas'); return; }
    if (!t.entry) { tDoJoin(t); return; }
    if (ST.saldo < t.entry) {
      tAsk({icon: 'wallet', title: 'Saldo insuficiente', text: `A entrada do ${t.name} é ${fmt2(t.entry)} e você tem ${fmt2(ST.saldo)} no saldo.`,
        rows: [['Entrada', fmt2(t.entry)], ['Seu saldo', fmt2(ST.saldo)], '-', ['Faltam', fmt2(t.entry - ST.saldo), 'err']],
        actions: [['sec', 'Agora não', 'closeSheet'], ['pri', 'Comprar fichas', 'wallet']], note: 'Depois da compra, volte aqui para confirmar a inscrição.'});
      return;
    }
    tAsk({icon: 'trophy', tag: `Prêmio ${fmt(t.prize)}`, title: 'Confirmar inscrição?', text: `${t.name} · ${tLine(t)} · ${tWhen(t)}`,
      rows: [['Entrada', fmt2(t.entry)], ['Seu saldo', fmt2(ST.saldo)], '-', ['Saldo depois', fmt2(ST.saldo - t.entry)]],
      actions: [['sec', 'Agora não', 'closeSheet'], ['pri', `Confirmar · ${fmt(t.entry)}`, `tConfirm:${t.id}`]], note: 'Se cancelar antes do início, a entrada volta para o seu saldo.'});
  },
  tConfirm: id => { const t = tById(id); if (!t || t.joined) return; if (ST.saldo < t.entry) { ACT.tJoin(id); return; } tDoJoin(t); },
  tCancelAsk: id => {
    const t = tById(id); if (!t || !t.joined) return;
    if (tNow() >= t.start) { toast('O torneio já começou · não dá mais para cancelar'); return; }
    tAsk({icon: 'coins', title: 'Cancelar inscrição?', text: `${t.name} · ${tWhen(t)}. ${t.entry ? `A entrada de ${fmt2(t.entry)} volta para o seu saldo.` : 'Dá pra se inscrever de novo até o início.'}`,
      actions: [['sec', 'Manter inscrição', 'closeSheet'], ['pri', 'Cancelar inscrição', `tCancel:${t.id}`]]});
  },
  tCancel: id => {
    const t = tById(id); if (!t || !t.joined || tNow() >= t.start) { closeSheet(); return; }
    t.joined = false; t.players--; t.warned = false;
    if (t.entry) ST.saldo = +(ST.saldo + t.entry).toFixed(2);
    closeSheet(); refreshChrome(); if (CUR === 'torneios') rerender();
    tToast('coins', 'Inscrição cancelada', t.entry ? `${fmt2(t.entry)} voltou para o seu saldo.` : `Você saiu do ${t.name}.`);
  },
  tEnter: id => { closeSheet(); if (CUR !== 'torneios') { HIST = []; go('torneios', {}, {noHist: true}); } setTimeout(() => ACT.tInfo(id), 220); },
  // partida do torneio: mesma fila e motores do lobby, sem aposta (a entrada já foi paga na inscrição)
  tPlay: id => {
    const t = tById(id); if (!t) return;
    if (!t.joined || tState(t) !== 'Ao vivo') { ACT.tInfo(id); return; }
    closeSheet();
    if (!ST.tourney) ST.tPrev = {game: ST.game, variant: ST.variant, trucoMode: ST.trucoMode, stake: ST.stake};
    ST.tourney = t;
    Object.assign(ST, {game: t.game, variant: t.variant, stake: 0}); if (t.game === 'truco') ST.trucoMode = t.fmt;
    startQueue(gameById(t.game).pfx + (100 + Math.floor(Math.random() * 60)), {info: `${t.name} · cada vitória vale 3 pontos no ranking do torneio.`});
  }
});

/* ---------- relógio: contagem, aviso de 5 min, início, pontos dos bots e fim com prêmio ---------- */
const tFree = () => $('#scr-game').hidden && !$('#sinucaWrap') && !$('#veil') && !$('#overlay').innerHTML && ST.onboarded && !/^ob/.test(CUR || '');
setInterval(() => {
  const n = tNow(); let changed = false, scored = false;
  TOURNEYS.forEach(t => {
    const s = tState(t);
    if (t._st && t._st !== s) changed = true;
    t._st = s;
    if (s === 'Ao vivo' && Math.random() < .04) { const b = pickOne(t.board); b.pts += 3; b.w++; scored = true; }
    if (t.joined && !t.warned && s === 'Inscrito' && t.start - n <= 5 * T_MIN && n - t.joinedAt > 5000 && tFree()) tWarn(t);
    if (t.joined && s === 'Ao vivo' && !t.began && tFree()) { t.began = true; tToast('trophy', `${t.name} começou!`, 'Cada vitória vale 3 pontos. Toque em Jogar.'); }
    if (t.joined && s === 'Encerrado' && !t.paid) {
      t.paid = true;
      const me = tMe(t), v = me.pts ? tPrizeAt(t, me.pos) : 0;
      if (v) { ST.saldo = +(ST.saldo + v).toFixed(2); refreshChrome(); }
      NOTIFS.unshift({id: Date.now() + 1, icon: 'trophy', t: `${t.name} terminou`, d: v ? `Você ficou em ${me.pos}º e ganhou ${fmt2(v)}. Já está no seu saldo.` : `Você ficou em ${me.pos}º com ${me.pts} pontos.`, at: 'agora', unread: true, fav: false});
      repaintNotifs();
    }
  });
  if (changed && CUR === 'torneios' && !$('#view').hidden) rerender();
  else $$('[data-tt]').forEach(el => { const t = tById(el.dataset.tt); if (t && tState(t) !== 'Encerrado') el.textContent = tClock(t); });
  $$('[data-tcd]').forEach(el => { const t = tById(el.dataset.tcd); if (t) tParts(t).forEach((v, i) => { const b = el.children[i] && el.children[i].firstChild; if (b) b.textContent = p2(v); }); });
  if (TSH && (changed || (scored && TSH.tab === 'ranking'))) paintTSheet();
}, 1000);
