/* Liquid · Batalhas: lobby (abertas + criar), criar batalha (5 passos), senha, sala de espera e série de partidas */
'use strict';
// prêmio da batalha = entradas × jogadores − 10% da casa · cada vencedor recebe 1,8× a entrada (1º do Poker de 6 recebe 3,6×)
const battlePrize = b => +(b.buyin * seatsOf(b.fmt) * .9).toFixed(2);
const winnerPay = b => b.fmt === 'Mesa de 6' ? prizeOf(b.buyin, 3.6) : prizeOf(b.buyin);
const fmtTxt = b => `${b.variant} · ${b.fmt === 'Mesa de 6' ? 'mesa de 6' : b.fmt} · ${b.rounds} ${b.rounds === 1 ? 'rodada' : 'rodadas'}`;
const BATTLES = [
  {id: 'B101', name: 'Batalha do Alfonso', owner: 'alfonso.dutra', game: 'truco', variant: 'Mineiro', fmt: '2x2', rounds: 3, buyin: 5, state: 'Aguardando', locked: true, pass: '4824', players: [['alfonso.dutra', 'navegador', 'ele'], ['af_07', 'piloto', 'ela']]},
  {id: 'B102', name: 'Pif da firma', owner: 'dutra77', game: 'cacheta', variant: 'Pif-Paf', fmt: '1x1', rounds: 5, buyin: 10, state: 'Aguardando', players: [['dutra77', 'comandante', 'ele']]},
  {id: 'B103', name: 'Sexta do truco', owner: 'luana.m', game: 'truco', variant: 'Paulista', fmt: '2x2', rounds: 5, buyin: 25, state: 'Em jogo', players: [['luana.m', 'explorador', 'ela'], ['marcao', 'navegador', 'ele'], ['rafa_10', 'piloto', 'ele'], ['lu.reis', 'engenheiro', 'ela']]},
  {id: 'B104', name: 'Buraco dos amigos', owner: 'amanda.s', game: 'buraco', variant: 'Aberto', fmt: '2x2', rounds: 1, buyin: 2, state: 'Em jogo', locked: true, pass: '1357', players: [['amanda.s', 'engenheiro', 'ela'], ['caio.s', 'explorador', 'ele'], ['dutra77', 'comandante', 'ele'], ['af_07', 'piloto', 'ela']]},
  {id: 'B105', name: 'Desafio relâmpago', owner: 'rafa_10', game: 'buraco', variant: 'Aberto', fmt: '2x2', rounds: 3, buyin: 1, state: 'Aguardando', players: [['rafa_10', 'piloto', 'ele'], ['luana.m', 'explorador', 'ela'], ['marcao', 'navegador', 'ele']]},
  {id: 'B107', name: 'Bola 8 de sexta', owner: 'joao.sinuca', game: 'sinuca', variant: 'Bola 8', fmt: '1x1', rounds: 3, buyin: 5, state: 'Aguardando', players: [['marcao', 'navegador', 'ele']]},
  {id: 'B106', name: 'All-in da madrugada', owner: 'caio.s', game: 'poker', variant: '1x1', fmt: '1x1', rounds: 3, buyin: 5, state: 'Aguardando', players: [['caio.s', 'explorador', 'ele']]}
];
const GT = {truco: 'var(--game-truco-tint)', cacheta: 'var(--game-cacheta-tint)', buraco: 'var(--game-buraco-tint)', tranca: '#2cc1603d', poker: '#0fa9683d', sinuca: '#2fa35a3d'};
function battleCard(b) {
  const live = b.state === 'Em jogo', max = seatsOf(b.fmt);
  return `<div role="button" tabindex="0" class="bcard ${live ? 'live' : ''}" data-bat="${b.id}">
    <span class="gm" style="--gt:${GT[b.game]}">${ic(GAME_ICON[b.game])}</span>
    <span class="info"><span class="t"><b>${esc(b.name)}</b>${b.locked ? ic('lock') : ''}</span>
      <span class="meta"><span class="pl"><i></i><span class="avs">${b.players.slice(0, 3).map(p => `<span style="--cc:${crewColor(p[1], p[2])}"><img src="${photo(p[1], p[2])}" alt=""></span>`).join('')}</span><em>${b.players.length}/${max}</em></span><small>${fmtTxt(b)}</small></span></span>
    <span class="vals"><b>Prêmio ${fmt(battlePrize(b))}</b><span>Entrada<em>${fmt(b.buyin)}</em></span></span></div>`;
}
const BL = {filter: 'todos', q: ''};
SCREENS.batalhas = {cls: 'bat', render: () => {
  const q = BL.q.trim().toLowerCase();
  const list = BATTLES.filter(b => (BL.filter === 'todos' || b.game === BL.filter) && (!q || b.name.toLowerCase().includes(q) || b.owner.toLowerCase().includes(q)));
  return `${header()}<div class="scroll"><div class="content">
    <div class="ttl"><h1>Batalhas</h1><p>Entre numa batalha aberta ou crie a sua. Todas valem dinheiro.</p></div>
    <label class="search">${svg('i-search')}<input id="bSearch" placeholder="Buscar sala ou criador" value="${esc(BL.q)}" autocomplete="off"></label>
    <div class="hscroll">${gameBlock('todos', BL.filter === 'todos', 'data-bf="todos"')}${['truco', 'cacheta', 'buraco', 'poker', 'sinuca'].map(id => gameBlock(id, BL.filter === id, `data-bf="${id}"`)).join('')}</div>
    ${btn(`${ic('plus')}Criar batalha`, 'pri', 'l', 'data-a="cbStart"', 'wide')}
    ${stitle('Batalhas abertas', '', btn('Ver tudo', 'sec', 's', 'data-a="bAll"'))}
    <div class="blist" id="bList">${list.length ? list.map(battleCard).join('') : `<div class="empty-st">Nenhuma batalha${q ? ` com “${esc(BL.q)}”` : ''}. Que tal criar a sua?</div>`}</div>
  </div></div>${navbar('batalhas')}`;
}, after: () => {
  const i = $('#bSearch');
  i.addEventListener('input', () => { BL.q = i.value; const pos = i.selectionStart; rerender(); const n = $('#bSearch'); n.focus(); n.setSelectionRange(pos, pos); });
}, click: e => {
  const f = e.target.closest('[data-bf]'); if (f) { BL.filter = f.dataset.bf; rerender(); return; }
  const c = e.target.closest('[data-bat]'); if (c) openBattle(c.dataset.bat);
}};
ACT.bAll = () => { BL.filter = 'todos'; BL.q = ''; rerender(); };
function openBattle(id) {
  const b = BATTLES.find(x => x.id === id); if (!b) return;
  if (b.state === 'Em jogo') { toast(`${b.name} já começou · ${b.players.length}/${seatsOf(b.fmt)} jogando`); return; }
  if (b.owner !== ST.nick && ST.saldo < b.buyin) { toast('Saldo insuficiente · compre fichas no + do saldo'); return; }
  if (b.locked && b.owner !== ST.nick) passwordSheet(b); else joinBattle(b);
}

/* ---------- senha (BT07 · room-password-sheet) ---------- */
let PW = '';
function passwordSheet(b, err) {
  PW = '';
  openSheet(`${sheetHead('lock', 'Batalha fechada', `${esc(b.name)} · ${b.variant} · ${b.fmt} · ${fmt(b.buyin)}`)}
    <p class="qinfo" style="text-align:left;font-size:14px">Digite a senha de 4 números que quem criou a batalha te mandou.</p>
    <label class="otp" id="pwBox" for="pwIn">${[0, 1, 2, 3].map(k => `<span class="bx ${k === 0 ? 'act' : ''}" data-k="${k}"></span>`).join('')}</label><input class="otp-in" id="pwIn" inputmode="numeric" maxlength="4" autocomplete="off">
    <p class="qinfo" id="pwErr" style="color:var(--text-error);${err ? '' : 'display:none'}">Senha incorreta. Confira com quem criou a batalha.</p>
    <p class="qinfo" style="font-size:10px;color:var(--text-subtle)">No protótipo, a senha da ${esc(b.name)} é ${b.pass}.</p>
    ${btn(`Entrar na batalha · ${fmt(b.buyin)}`, 'pri', 'l', `data-a="pwGo:${b.id}" id="pwGo" disabled`, 'wide')}`, {cls: 'g16'});
  const inp = $('#pwIn');
  const paint = () => { $$('#pwBox .bx').forEach((x, k) => { x.textContent = PW[k] || ''; x.classList.toggle('act', k === PW.length); }); $('#pwGo').disabled = PW.length < 4; };
  inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); PW = inp.value; $('#pwErr').style.display = 'none'; paint(); });
  $('#pwBox').addEventListener('click', () => inp.focus());
  setTimeout(() => inp.focus(), 300);
}
ACT.pwGo = id => { const b = BATTLES.find(x => x.id === id); if (PW === b.pass) { closeSheet(); joinBattle(b); } else { passwordSheet(b, true); } };

/* ---------- criar batalha (BT02–BT06) ---------- */
const CB = {step: 1, game: 'truco', variant: 'Mineiro', fmt: '2x2', rounds: 3, buyin: 5, access: 'aberta', pass: ''};
const BUYINS = [1, 5, 10, 25, 50, 100];
const BUYIN_MIN = 1, BUYIN_MAX = 1000;
const money2 = v => (+v).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
// "12,50", "12.5", "1.000,00" → número
function parseMoney(t) { t = String(t).replace(/[^\d,.]/g, ''); if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, ''); return t ? Math.round(parseFloat(t) * 100) / 100 : 0; }
function buyinError(v) { if (!v || v < BUYIN_MIN) return `Mínimo ${fmt(BUYIN_MIN)}`; if (v > BUYIN_MAX) return `Máximo ${fmt(BUYIN_MAX)}`; if (v > ST.saldo) return `Saldo insuficiente · você tem ${fmt2(ST.saldo)}`; return ''; }
// atualiza o passo 4 sem redesenhar a tela (o campo continua com o foco)
function paintBuyin() {
  const v = CB.buyin, n = seatsOf(CB.fmt), pot = +(v * n * .9).toFixed(2), err = buyinError(v);
  const box = $('#cbBox'); if (!box) return;
  $('#cbFit').dataset.v = $('#cbVal').value || '0,00'; // o campo cresce com o número: o R$ e o lápis ficam colados no valor
  box.classList.toggle('err', !!err);
  $('#cbAfter').textContent = err || `Saldo depois de criar: ${fmt2(+(ST.saldo - v).toFixed(2))}`;
  $('#cbPrize').textContent = err ? '' : `Prêmio ${fmt2(pot)}`; $('#cbPrize').hidden = !!err;
  $$('#cbGrid [data-cbb]').forEach(el => el.classList.toggle('on', +el.dataset.cbb === v));
  const each = CB.fmt === 'Mesa de 6' ? `o 1º leva ${fmt2(prizeOf(v, 3.6))} e o 2º leva ${fmt2(prizeOf(v))}` : n === 4 ? `cada jogador da dupla vencedora leva ${fmt2(prizeOf(v))}` : `o vencedor leva ${fmt2(prizeOf(v))}`;
  $('#cbHelp').textContent = err ? `Digite um valor de ${fmt(BUYIN_MIN)} a ${fmt(BUYIN_MAX)}, até o seu saldo, ou escolha uma mesa.` : `Com ${n} jogadores a ${fmt2(v)}, o prêmio é ${fmt2(pot)}: ${each} · taxa da mesa 10%.`;
  const b = $('#view .cta .btn'); if (b) b.disabled = !!err;
}
const STEP_NAMES = ['Jogo', 'Modo e formato', 'Rodadas', 'Buy-in', 'Quem pode entrar'];
function cbFormatFix() { const g = gameById(CB.game); if (!g.variants.includes(CB.variant) || (g.soonV || []).includes(CB.variant)) CB.variant = g.def; CB.fmt = CB.game === 'truco' ? (CB.fmt === '1x1' ? '1x1' : '2x2') : formatOf(CB.game, CB.variant); }
SCREENS.cbattle = {cls: 'cflow', render: () => {
  const s = CB.step, g = gameById(CB.game); let body = '', cta = 'Continuar';
  if (s === 1) body = `<h2>Qual jogo vai ser?</h2><div class="ggrid">${['truco', 'cacheta', 'buraco', 'poker', 'sinuca'].map(id => gameBlock(id, CB.game === id, `data-cbg="${id}"`)).join('')}</div>
    <p class="help">Todas as batalhas valem dinheiro: cada jogador entra com o buy-in e quem vencer leva o prêmio.</p>`;
  if (s === 2) {
    const vs = g.variants.map(v => (g.soonV || []).includes(v) ? [v, v, 'em breve'] : v);
    body = `<h2>Modo e formato</h2><span class="lbl">${g.id === 'poker' ? 'Mesa' : `Modo do ${g.name}`}</span>${tabs(vs, CB.variant, tabStyle(g, CB.variant), 'cbv')}
      ${g.id === 'truco' ? `<span class="lbl">Formato</span>${tabs(['1x1', '2x2'], CB.fmt, '', 'cbf')}` : ''}
      <p class="help">${CB.fmt === '2x2' ? '2x2: você joga em dupla. Um parceiro entra na sua batalha e vocês dividem o prêmio.' : CB.fmt === 'Mesa de 6' ? 'Mesa de 6: Sit & Go com 6 jogadores. 1º e 2º lugar levam prêmio.' : '1x1: você contra 1 jogador. Quem vencer mais rodadas leva o prêmio.'}</p>`;
  }
  if (s === 3) body = `<h2>Quantas rodadas?</h2>${tabs(['1', '3', '5', '10'], String(CB.rounds), '', 'cbr')}<p class="help">Vence quem ganhar mais rodadas. Em caso de empate, uma rodada extra decide.</p>`;
  if (s === 4) {
    // valor livre primeiro (a pessoa digita) e, embaixo, os valores das mesas como atalho
    body = `<h2>Quanto vale a entrada?</h2><span class="lbl">Buy-in por jogador · de ${fmt(BUYIN_MIN)} a ${fmt(BUYIN_MAX)}</span>
      <div class="bival" id="cbBox"><label class="amt-in"><span class="cur">R$</span><span class="fit" id="cbFit" data-v="${money2(CB.buyin)}"><input id="cbVal" size="1" placeholder="0,00" inputmode="decimal" autocomplete="off" value="${money2(CB.buyin)}" aria-label="Valor da entrada"></span><button class="edit" data-a="cbEdit" aria-label="Editar valor">${svg('i-pen')}</button></label>
        <small id="cbAfter"></small><span class="prize" id="cbPrize"></span></div>
      <span class="lbl">Ou escolha um valor de mesa</span>
      <div class="stake-grid" id="cbGrid">${BUYINS.map(v => stakePill({v, q: 0}, 'M', CB.buyin === v, `data-cbb="${v}"`, {money: true, prize: +(v * seatsOf(CB.fmt) * .9).toFixed(2)})).join('')}</div>
      <p class="help" id="cbHelp"></p>`;
  }
  if (s === 5) {
    if (!CB.pass) CB.pass = String(Math.floor(1000 + Math.random() * 9000));
    const b = {...CB};
    body = `<h2>Quem pode entrar?</h2>${tabs([['aberta', 'Aberta'], ['fechada', 'Fechada']], CB.access, '', 'cba')}
      <p class="help">${CB.access === 'fechada' ? 'Fechada: só entra quem tiver a senha. Você compartilha no chat ou com seus amigos.' : 'Aberta: qualquer jogador pode entrar até a mesa encher.'}</p>
      ${CB.access === 'fechada' ? `<span class="lbl">Senha de 4 números</span><div class="otp" style="justify-content:flex-start">${CB.pass.split('').map(d => `<span class="bx">${d}</span>`).join('')}</div>` : ''}
      <div class="resumo"><small>RESUMO</small><span>${g.name} ${CB.variant === '1x1' || CB.variant === 'Mesa de 6' ? '' : CB.variant + ' '}· ${CB.fmt} · ${CB.rounds} ${CB.rounds === 1 ? 'rodada' : 'rodadas'}</span><span>Buy-in ${fmt(CB.buyin)} · prêmio ${fmt(battlePrize(b))}</span><span>${CB.access === 'fechada' ? 'Fechada com senha' : 'Aberta para todos'}</span></div>`;
    cta = `Criar batalha · ${fmt(CB.buyin)}`;
  }
  return `${header()}${ptop('Criar batalha', `Passo ${s} de 5 · ${STEP_NAMES[s - 1]}`, 'cbBack')}<div class="scroll"><div class="content">${body}</div></div>
    <div class="cta">${btn(cta, 'pri', 'l', `data-a="cbNext"`)}</div>`;
}, after: () => {
  if (CB.step !== 4) return;
  const i = $('#cbVal');
  i.addEventListener('input', () => { CB.buyin = parseMoney(i.value); paintBuyin(); });
  i.addEventListener('blur', () => { if (CB.buyin) i.value = money2(CB.buyin); paintBuyin(); });
  i.addEventListener('keydown', e => { if (e.key === 'Enter') i.blur(); });
  paintBuyin();
}, click: e => {
  const t = e.target.closest('[data-cbg],[data-cbv],[data-cbf],[data-cbr],[data-cbb],[data-cba]'); if (!t) return;
  const d = t.dataset;
  if (d.cbg) { if (gameById(d.cbg).soon) { toast('Sinuca chega em breve'); return; } CB.game = d.cbg; cbFormatFix(); }
  if (d.cbv) { if ((game().soonV || []).includes(d.cbv) || (gameById(CB.game).soonV || []).includes(d.cbv)) { toast(`${d.cbv} chega em breve`); return; } CB.variant = d.cbv; cbFormatFix(); }
  if (d.cbf) CB.fmt = d.cbf;
  if (d.cbr) CB.rounds = +d.cbr;
  if (d.cbb) { CB.buyin = +d.cbb; const i = $('#cbVal'); if (i) i.value = money2(CB.buyin); paintBuyin(); return; }
  if (d.cba) CB.access = d.cba;
  rerender();
}};
Object.assign(ACT, {
  cbStart: () => { Object.assign(CB, {step: 1, pass: '', access: 'aberta'}); cbFormatFix(); go('cbattle'); },
  cbBack: () => { if (CB.step > 1) { CB.step--; rerender(); } else back(); },
  cbEdit: () => { const i = $('#cbVal'); if (i) { i.focus(); i.select(); } },
  cbNext: () => {
    if (CB.step === 4) { const e = buyinError(CB.buyin); if (e) { toast(e); return; } }
    if (CB.step < 5) { CB.step++; go('cbattle', {}, {noHist: true}); return; }
    if (ST.saldo < CB.buyin) { toast('Saldo insuficiente · compre fichas no + do saldo'); return; }
    const b = {id: 'B' + (200 + BATTLES.length), name: `Batalha do ${ST.nick}`, owner: ST.nick, game: CB.game, variant: CB.variant, fmt: CB.fmt, rounds: CB.rounds, buyin: CB.buyin, state: 'Aguardando', locked: CB.access === 'fechada', pass: CB.pass, players: []};
    BATTLES.unshift(b);
    HIST = HIST.filter(h => h[0] !== 'cbattle');
    joinBattle(b);
  }
});

/* ---------- sala de espera (BT08) · bots entram e ficam prontos ---------- */
let ROOM = null, roomT = [];
function joinBattle(b) {
  ST.saldo = +(ST.saldo - b.buyin).toFixed(2);
  const max = seatsOf(b.fmt);
  const others = b.players.filter(p => p[0] !== ST.nick).map(p => ({p, ready: true}));
  ROOM = {b, max, seats: [{p: [ST.nick, ST.crew, ST.g], ready: false, me: true}, ...others], chat: [], chatOpen: false};
  go('sala', {}, {noHist: false});
  refreshChrome();
  fillRoom();
}
function fillRoom() {
  roomT.forEach(clearTimeout); roomT = [];
  const pool = PEOPLE.filter(p => !ROOM.seats.some(s => s.p[0] === p[0]));
  let t = 900;
  while (ROOM.seats.length + roomT.length < ROOM.max && pool.length) {
    const p = pool.shift(); t += rnd(700, 1400);
    roomT.push(setTimeout(() => { if (!ROOM) return; ROOM.seats.push({p, ready: false}); roomChatBot(p, pickOne(['cheguei!', 'bora!', 'boa sorte pra todos', 'quem é minha dupla?', 'vamo que vamo'])); paintRoom(); setTimeout(() => { if (!ROOM) return; const s = ROOM.seats.find(x => x.p === p); if (s) { s.ready = true; paintRoom(); maybeStart(); } }, rnd(800, 1600)); }, t));
  }
}
function roomChatBot(p, t) { if (ROOM) ROOM.chat.push({who: p[0], c: p[1], g: p[2], t}); }
const roomFull = () => ROOM.seats.length >= ROOM.max;
function roomSheetHTML() {
  const b = ROOM.b, g = gameById(b.game), n = ROOM.seats.length, me = ROOM.seats[0];
  const rows = ROOM.seats.map(s => `<div class="pr">${av(s.p[1], s.p[2], 's')}<b>${s.me ? 'Você' : esc(s.p[0])}</b><small class="${s.ready ? 'ok' : ''}">${s.ready ? 'Pronto' : 'Não pronto'}</small></div>`).join('')
    + Array.from({length: ROOM.max - n}, () => `<div class="pr free">${av('nenhum', 'ela', 's')}<b>Vaga livre</b></div>`).join('');
  return `<span class="handle"></span>
    <div class="sh-h">${ic(GAME_ICON[g.id])}<div class="tx"><b>${esc(b.name)}</b><small class="ok">${roomFull() ? (ROOM.seats.every(s => s.ready) ? 'Todos prontos · começando' : 'Mesa cheia · aguardando prontos') : `Aguardando jogadores · ${n}/${ROOM.max}`}</small></div><button class="xbtn" data-a="roomLeave" aria-label="Sair">${svg('i-x')}</button></div>
    <div class="room-info"><div class="cell"><small>Modo</small><b>${b.variant}</b></div><div class="cell"><small>Buy-in</small><b>${fmt(b.buyin)}</b></div><div class="cell"><small>Prêmio</small><b>${fmt(battlePrize(b))}</b></div><div class="cell"><small>Rodadas</small><b>${b.rounds}</b></div></div>
    <div class="room-h"><span>Jogadores</span><span>${n}/${ROOM.max}</span></div>
    <div class="room-list">${rows}</div>
    ${me.ready ? btn(roomFull() ? 'Começando…' : 'Aguardando jogadores…', 'pri', 'l', 'disabled', 'wide') : btn('Estou pronto', 'pri', 'l', 'data-a="roomReady"', 'wide')}
    ${btn(`Chat da sala · ${ROOM.chat.length}`, 'sec', 'm m44', 'data-a="roomChat"', 'wide')}
    <button class="leave-btn" data-a="roomLeave">Sair da batalha</button>`;
}
function roomChatHTML() {
  return `<span class="handle"></span>${sheetHead('chat', 'Chat da sala', `${esc(ROOM.b.name)} · ${ROOM.seats.length} jogadores · só quem está na sala`)}
    ${btn(ROOM.b.locked ? `Convidar no chat do ${gameById(ROOM.b.game).name} · senha ${ROOM.b.pass}` : `Convidar no chat do ${gameById(ROOM.b.game).name}`, 'sec', 's', 'data-a="roomInvite"', 'wide')}
    <div class="room-chat" id="rChat">${ROOM.chat.length ? ROOM.chat.map(m => msgHTML(m)).join('') : '<div class="sys">Ninguém falou ainda. Dê um oi!</div>'}</div>
    <div class="composer" style="padding:0"><div class="chint"><span>Você está conversando como ${esc(ST.nick)}</span><span>0/200</span></div>
      <div class="row"><label class="in"><input id="rIn" maxlength="200" placeholder="Diga algo…" autocomplete="off"></label><button class="send" data-a="roomSay" aria-label="Enviar">${svg('i-send')}</button></div></div>`.replace('data-a="closeSheet"', 'data-a="roomSheet"');
}
SCREENS.sala = {cls: 'sala game-scr', render: () => {
  const b = ROOM.b, g = gameById(b.game);
  return `${hudStatic(b)}<div class="jogo"><div class="mesa-bg" style="background-image:url(${A}mesa/${tableArt(b.game, b.variant)}.webp)"></div></div>
    <nav class="mnav"><button data-a="roomLeave"><span class="back">${svg('i-chev-l-light')}</span><span>Voltar</span></button><button data-a="roomChat">${ic('chat')}<span>Chat</span></button><button data-a="roomSheet">${ic('friends')}<span>Mesa</span></button><button data-a="roomVoice">${ic(ST.mic ? 'microphone' : 'microphone-off')}<span>Voz</span></button></nav>
    <div class="veil" id="roomVeil" style="position:absolute"><div class="bsheet" id="roomSheet">${ROOM.chatOpen ? roomChatHTML() : roomSheetHTML()}</div></div>`;
}};
function paintRoom() { const s = $('#roomSheet'); if (!s || CUR !== 'sala') return; s.innerHTML = ROOM.chatOpen ? roomChatHTML() : roomSheetHTML(); if (ROOM.chatOpen) { const c = $('#rChat'); c.scrollTop = c.scrollHeight; const i = $('#rIn'); i.onkeydown = e => { if (e.key === 'Enter') ACT.roomSay(); }; } }
function maybeStart() {
  if (!ROOM || !roomFull() || !ROOM.seats.every(s => s.ready) || ROOM.starting) return;
  ROOM.starting = true; paintRoom();
  setTimeout(() => { if (ROOM) startSeries(ROOM.b); }, 1200);
}
Object.assign(ACT, {
  roomReady: () => { ROOM.seats[0].ready = true; paintRoom(); maybeStart(); },
  roomInvite: () => { const b = ROOM.b; const f = feedOf(b.game); f.push({me: true, who: ST.nick, t: `entra na minha batalha “${b.name}”${b.locked ? ` · senha ${b.pass}` : ''} 👇`, table: {id: b.id, game: b.game, v: b.buyin, seats: `${ROOM.seats.length}/${ROOM.max}`}}); toast('Convite enviado no chat do ' + gameById(b.game).name); },
  roomLeave: () => {
    if (!ROOM) { back(); return; }
    const own = ROOM.b.owner === ST.nick;
    ST.saldo = +(ST.saldo + ROOM.b.buyin).toFixed(2); // saiu antes de começar: entrada devolvida
    if (own) BATTLES.splice(BATTLES.indexOf(ROOM.b), 1);
    roomT.forEach(clearTimeout); ROOM = null; go('batalhas', {}, {noHist: true, reset: true}); toast('Você saiu da sala · entrada devolvida');
  },
  roomChat: () => { ROOM.chatOpen = !ROOM.chatOpen; paintRoom(); },
  roomSheet: () => { ROOM.chatOpen = false; paintRoom(); },
  roomVoice: () => { ST.mic = !ST.mic; toast(ST.mic ? 'Voz ligada · ' + ROOM.seats.length + ' na voz' : 'Voz desligada'); rerender(); },
  roomSay: () => { const i = $('#rIn'); if (!i || !i.value.trim()) return; ROOM.chat.push({me: true, who: ST.nick, t: i.value.trim()}); paintRoom(); setTimeout(() => { if (!ROOM || ROOM.seats.length < 2) return; const s = pickOne(ROOM.seats.filter(x => !x.me)); roomChatBot(s.p, pickOne(BOT_REPLIES)); paintRoom(); }, rnd(900, 1800)); }
});

/* ---------- série de partidas: N rodadas contra os bots da sala, quem vencer mais leva o prêmio ---------- */
function startSeries(b) {
  roomT.forEach(clearTimeout);
  const people = ROOM ? ROOM.seats.map(s => s.p) : null;
  ROOM = null;
  ST.series = {b, round: 0, of: b.rounds, wins: [0, 0], people, extra: false};
  nextRound();
}
function nextRound() {
  const S = ST.series, b = S.b;
  S.round++; S.saldoBefore = ST.saldo;
  ST.game = b.game; ST.variant = b.variant; ST.stake = b.buyin; if (b.game === 'truco') ST.trucoMode = b.fmt;
  syncNick();
  toast(`${b.name} · rodada ${S.round} de ${S.of}`);
  launchGame(b.id);
}
function battleRoundEnd(r) {
  const S = ST.series, b = S.b;
  ST.saldo = S.saldoBefore; // o dinheiro da batalha é a entrada (já paga) e o prêmio no fim
  if (r.win) S.wins[0]++; else if (!r.tie) S.wins[1]++;
  const need = Math.floor(S.of / 2) + 1, done = S.round >= S.of || S.wins[0] >= need || S.wins[1] >= need;
  if (done && S.wins[0] === S.wins[1]) { S.of++; S.extra = true; }
  const fin = done && S.wins[0] !== S.wins[1];
  const vs = b.fmt === '2x2' ? 'Eles' : b.fmt === 'Mesa de 6' ? 'Mesa' : (S.people && S.people[1] ? S.people[1][0] : 'dutra77');
  const ctx = `${esc(b.name)} · ${gameById(b.game).name} · ${b.fmt}`;
  const scoreRow = r.left ? `<div class="score">${teamHTML([[ST.nick, ST.crew, ST.g]], 'Você', 'batalha')}<b class="sc">${S.wins[0]} × ${S.wins[1]}</b>${teamHTML([['x', 'comandante', 'ele']], vs, 'rodadas', true)}</div>` : '';
  if (fin) {
    const won = S.wins[0] > S.wins[1], pay = winnerPay(b);
    if (won) ST.saldo = +(ST.saldo + pay).toFixed(2);
    ST.series = null;
    showResult({win: won, seriesFinal: true, title: won ? 'Vitória' : 'Derrota', sub: won ? `Você venceu a batalha em ${S.round} ${S.round === 1 ? 'rodada' : 'rodadas'}` : 'Não foi dessa vez', value: won ? `+ ${fmt2(pay)}` : `− ${fmt2(b.buyin)}`, caption: won ? 'Prêmio já está no seu saldo' : 'Valor da entrada', ctx,
      left: teamHTML([[ST.nick, ST.crew, ST.g]], 'Você', 'rodadas'), score: `${S.wins[0]} × ${S.wins[1]}`, right: teamHTML([['x', 'comandante', 'ele']], vs, 'rodadas', true), gameColor: gameById(b.game).color,
      hist: `Batalha · ${gameById(b.game).name}`, delta: won ? pay - b.buyin : -b.buyin,
      backLabel: 'Voltar às batalhas', onBack: () => go('batalhas', {}, {noHist: true, reset: true}), againLabel: 'Nova batalha', again: () => { go('batalhas', {}, {noHist: true, reset: true}); ACT.cbStart(); }});
    return;
  }
  // rodada intermediária
  $('#overlay').innerHTML = `<div class="res2 ${r.win ? 'win' : 'loss'}" style="--gc:${gameById(b.game).color}"><i class="rglow"></i><span class="ctx">${ctx}</span>
    <div class="rblock"><img class="ic big" src="${I(r.win ? 'trophy' : r.tie ? 'medal' : 'defeat')}" alt="">
      <div class="rt"><h1>${r.win ? 'Rodada sua' : r.tie ? 'Empatou' : 'Rodada deles'}</h1><span>Rodada ${S.round} de ${S.of}${S.extra ? ' · rodada extra decide' : ''}</span></div>
      <div class="rv"><b class="muted">${S.wins[0]} × ${S.wins[1]}</b><small>Vence quem ganhar mais rodadas · prêmio ${fmt(battlePrize(b))}</small></div>${scoreRow}</div>
    <div class="ractions">${btn('Sair da batalha', 'sec', 'm', 'data-a="seriesQuit"')}${btn(`Próxima rodada · ${S.round + 1} de ${S.of}`, 'pri', 'm', 'data-a="seriesNext"')}</div></div>`;
}
Object.assign(ACT, {
  seriesNext: () => { $('#overlay').innerHTML = ''; endAllGames(); nextRound(); },
  seriesQuit: () => { $('#overlay').innerHTML = ''; const b = ST.series.b; ST.series = null; endAllGames(); go('batalhas', {}, {noHist: true, reset: true}); toast(`Você saiu da ${b.name} · entrada de ${fmt(b.buyin)} perdida`); }
});
