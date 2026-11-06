/* Liquid · Criar sala (06/11) · sala privada pelo link, senha opcional de 4 números e entrada livre como na Batalha
   Lobby e Home: [Treino] [Jogar] [Criar sala] → sheet único (modo, formato, entrada Grátis ou qualquer valor até o saldo, senha)
   → Sala criada (link, código e senha para copiar, WhatsApp, Mais opções, Convidar amigos do app) → Sala de espera, que começa
   sozinha quando a mesa lota e todo mundo fica pronto. Quem recebe o link (?sala=…) vê o convite (sem login) ou a senha da sala.
   A sala não aparece em Mesas abertas: só entra quem tem o link. */
'use strict';
const SALA_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SALA_QUICK = [5, 10, 25, 50];
// amigos do app (Convidar amigos): quem você convidar entra primeiro na sala
const FRIENDS = [['dutra77', 'comandante', 'ele', 'Online · no lobby', true], ['amanda.s', 'engenheiro', 'ela', 'Online · no lobby', true], ['af_07', 'piloto', 'ela', 'Online · jogando Cacheta', true],
  ['luana.m', 'explorador', 'ela', 'Online · no lobby', true], ['rafa_10', 'piloto', 'ele', 'Online · jogando Truco', true], ['alfonso.dutra', 'navegador', 'ele', 'Visto há 2 h', false], ['caio.s', 'explorador', 'ele', 'Visto ontem', false]];
const RM = {open: false, role: 'dono', game: 'truco', variant: 'Paulista', fmt: '2x2', paid: false, val: 25, pass: false, pw: '', code: '', host: '',
  players: [], invited: {}, timers: [], cd: 0, count: 0, view: '', q: '', pwTry: '', pwErr: false};
let INV = null; // convite aberto pelo link (?sala=…)

const newCode = () => Array.from({length: 4}, () => SALA_CH[Math.floor(Math.random() * SALA_CH.length)]).join('');
const newPw = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
const money2 = v => (+v).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
// "12,50", "12.5", "1.000,00" → número
function parseMoney(t) { t = String(t).replace(/[^\d,.]/g, ''); if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, ''); return t ? Math.round(parseFloat(t) * 100) / 100 : 0; }
const rmFmt = () => RM.game === 'truco' ? RM.fmt : formatOf(RM.game, RM.variant);
const rmSeats = () => seatsOf(rmFmt());
const rmModes = g => g.variants.filter(v => !(g.soonV || []).includes(v));
const rmLabel = () => { const g = gameById(RM.game); return g.id === 'poker' ? `Poker · ${rmFmt()}` : `${g.name} ${RM.variant} · ${rmFmt()}`; };
const rmPrize = () => fmt(prizeOf(RM.val, rmFmt() === 'Mesa de 6' ? 3.6 : 1.8));
const hostOf = n => PEOPLE.find(p => p[0] === n) || FRIENDS.find(p => p[0] === n) || [n, 'comandante', 'ele'];
const cell = (l, v) => `<div class="cell"><small>${l}</small><b>${v}</b></div>`;
const rmX = () => `<button class="xbtn" data-rm="x" aria-label="Fechar">${svg('i-x')}</button>`;
const rmHead = (icon, title, sub, subCls = '') => `<div class="sh-h">${ic(icon)}<div class="tx"><b>${title}</b>${sub ? `<small class="${subCls}">${sub}</small>` : ''}</div>${rmX()}</div>`;

/* ---------- sheet da sala: um só, redesenhado por dentro (sem repetir a animação de subir) ---------- */
function rmSheet(html) {
  let bs = $('#veil .bsheet.sala');
  if (!bs) { openSheet('', {cls: 'g16 sala', dismiss: false}); bs = $('#veil .bsheet'); bs.addEventListener('click', rmClick); bs.addEventListener('input', rmInput); bs.addEventListener('focusout', rmBlur); }
  bs.innerHTML = '<span class="handle"></span>' + html;
  return bs;
}
function rmEnd() { RM.open = false; rmClear(); closeSheet(); }

/* ---------- 1 · criar sala ---------- */
function rmErr() { if (!RM.paid) return ''; if (!RM.val || RM.val <= 0) return 'Digite o valor da entrada.'; if (RM.val > ST.saldo) return `Seu saldo é ${fmt2(ST.saldo)}. Diminua o valor ou compre fichas no + do saldo.`; return ''; }
function rmHelp() {
  const e = rmErr(); if (e) return e;
  if (!RM.paid) return 'Grátis: só diversão entre amigos, ninguém paga nada. Em "Com entrada" você digita o valor que quiser.';
  const f = rmFmt(), each = f === 'Mesa de 6' ? `O 1º leva ${fmt2(prizeOf(RM.val, 3.6))} e o 2º leva ${fmt2(prizeOf(RM.val))}` : f === '2x2' ? `Cada vencedor leva ${fmt2(prizeOf(RM.val))}` : `Quem vencer leva ${fmt2(prizeOf(RM.val))}`;
  return `Você escolhe qualquer valor, até o seu saldo. ${each} · taxa da mesa 10%.`;
}
function paintCriar() {
  RM.view = 'criar';
  const g = gameById(RM.game), modes = rmModes(g), err = rmErr();
  rmSheet(`${rmHead('key', 'Criar sala', `${g.name} · só entra quem receber o link`)}
    ${modes.length > 1 ? `<div class="fld"><span class="lbl">Modo</span>${tabs(modes, RM.variant, tabStyle(g, RM.variant), 'rmv')}</div>` : ''}
    ${g.id === 'truco' ? `<div class="fld"><span class="lbl">Formato</span>${tabs(['1x1', '2x2'], RM.fmt, '', 'rmf')}</div>` : ''}
    <div class="fld"><span class="lbl">Entrada</span>${tabs([['gratis', 'Grátis'], ['valor', 'Com entrada']], RM.paid ? 'valor' : 'gratis', '', 'rmp')}
      ${RM.paid ? `<label class="amt ${err ? 'err' : ''}" id="rmBox" for="rmVal"><span class="cur">R$</span><input id="rmVal" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${RM.val ? money2(RM.val) : ''}" aria-label="Valor da entrada"><span class="edit">${svg('i-pen')}</span></label>
      <div class="quick" id="rmQuick">${SALA_QUICK.map(v => btn(fmt(v), v === RM.val ? 'pri' : 'sec', 's', `data-rmq="${v}"`)).join('')}</div>` : ''}
      <small class="help ${err ? 'err' : ''}" id="rmHelp">${rmHelp()}</small></div>
    <div class="gcard"><button class="li" data-rm="pass"><span class="itile">${ic('lock')}</span><span class="tx"><b>Sala com senha</b><small>Pede uma senha além do link</small></span><span class="tgl-sw ${RM.pass ? 'on' : ''}"></span></button></div>
    ${RM.pass ? `<div class="otp">${[...RM.pw].map(d => `<span class="bx">${d}</span>`).join('')}</div><div class="pwrow"><small>Senha gerada pra você</small><button class="lnk" data-rm="newpw">Gerar outra</button></div>` : ''}
    ${btn('Criar sala', 'pri', 'l', `data-rm="create" id="rmGo" ${err ? 'disabled' : ''}`, 'wide')}`);
}
// o valor muda sem redesenhar o sheet (o campo continua com o foco)
function paintValor() {
  const err = rmErr(), box = $('#rmBox'); if (!box) return;
  box.classList.toggle('err', !!err);
  const h = $('#rmHelp'); h.textContent = rmHelp(); h.classList.toggle('err', !!err);
  $$('#rmQuick [data-rmq]').forEach(b => { b.className = `btn ${+b.dataset.rmq === RM.val ? 'pri' : 'sec'} s`; });
  $('#rmGo').disabled = !!err;
}
function rmCreate() {
  if (rmErr()) return;
  Object.assign(RM, {code: newCode(), role: 'dono', host: ST.nick, open: true, players: [[ST.nick, ST.crew, ST.g, 'Não pronto', 'dono']]});
  paintCriada(); rmJoinLoop();
}

/* ---------- 2 · sala criada · compartilhar ---------- */
function rmLink(full) {
  const base = location.origin + location.pathname.replace(/index\.html$/, '');
  if (!full) return `${location.host}${location.pathname.replace(/index\.html$/, '')}?sala=${RM.code}`;
  const p = new URLSearchParams({sala: RM.code, de: RM.host, j: RM.game, v: RM.variant, f: rmFmt(), e: RM.paid ? RM.val : 0}); if (RM.pass) p.set('k', btoa(RM.pw));
  return `${base}?${p}`;
}
// a mensagem sai do app (WhatsApp, share): nas marcas em inglês passa pelo dicionário (window.i18n)
const rmTr = t => (window.i18n ? window.i18n(t) : t);
const rmMsg = () => rmTr(`${RM.host} te chamou pra uma sala de ${gameById(RM.game).name} no Liquid! Entra pelo link: ${rmLink(true)}${RM.pass ? ` · Senha: ${RM.pw}` : ''}`);
async function copyTxt(t) {
  try { await navigator.clipboard.writeText(t); return; } catch (e) { /* sem permissão: copia pelo jeito antigo */ }
  const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) { /* nada a fazer */ }
  ta.remove();
}
function paintCriada(copied) {
  RM.view = 'criada';
  const cp = (k, label, val) => `<div class="cpf ${copied === k ? 'ok' : ''}" role="button" tabindex="0" data-rm="copy:${k}"><span class="tx"><small>${label}</small><b>${esc(val)}</b></span>${copied === k ? tag('Copiado', 'success') : `<span class="cpb">${svg('i-copy')}</span>`}</div>`;
  rmSheet(`<div class="sc-x">${rmX()}</div>
    <div class="sc-hero">${ic('key', 'big')}<h2>Sala criada!</h2><p>Mande o link pra quem você quer na mesa. A partida começa sozinha quando a mesa lotar e todo mundo estiver pronto.</p>
      <div class="tags">${tag(rmLabel(), 'info')}${tag(RM.paid ? `Entrada ${fmt(RM.val)}` : 'Grátis', 'gold')}${RM.pass ? tag('Com senha', 'neutral') : ''}</div></div>
    ${cp('link', 'Link da sala', rmLink(false))}
    <div class="cprow">${cp('code', 'Código da sala', RM.code)}${RM.pass ? cp('pw', 'Senha', RM.pw) : ''}</div>
    <div class="shr">${btn(`${svg('i-wa')}WhatsApp`, 'sec', 'm', 'data-rm="wa"')}${btn(`${svg('i-share')}Mais opções`, 'sec', 'm', 'data-rm="share"')}</div>
    <div class="gcard"><button class="li" data-rm="friends"><span class="itile">${ic('friends')}</span><span class="tx"><b>Convidar amigos do app</b><small>Eles recebem o convite na hora</small></span>${svg('i-chev-r', 'chev')}</button></div>
    ${btn('Ir para a sala', 'pri', 'l', 'data-rm="room"', 'wide')}`);
}

/* ---------- 3 · convidar amigos do app ---------- */
function paintAmigos() {
  RM.view = 'amigos';
  const q = RM.q.trim().toLowerCase(), list = FRIENDS.filter(f => !q || f[0].includes(q));
  const row = f => `<div class="fr">${hex(f[1], f[2], 's', 0, f[4])}<span class="tx"><b>${f[0]}</b><small>${f[3]}</small></span>${RM.invited[f[0]] ? btn('Convidado', 'sec', 's', 'disabled') : btn('Convidar', 'sec', 's', `data-rm="invite:${f[0]}"`)}</div>`;
  const on = list.filter(f => f[4]), off = list.filter(f => !f[4]);
  rmSheet(`${rmHead('friends', 'Convidar amigos', `Sala ${RM.code} · ${rmLabel()}`)}
    <label class="search">${svg('i-search')}<input id="rmQ" placeholder="Buscar amigo pelo apelido" value="${esc(RM.q)}" autocomplete="off" autocapitalize="none"></label>
    ${on.length ? `<div class="fld"><span class="lbl">Online agora · ${on.length}</span><div class="flist">${on.map(row).join('')}</div></div>` : ''}
    ${off.length ? `<div class="fld"><span class="lbl">Offline</span><div class="flist">${off.map(row).join('')}</div></div>` : ''}
    ${list.length ? '' : `<p class="note">Nenhum amigo com "${esc(RM.q)}".</p>`}
    <p class="note">Quem você convidar recebe uma notificação com o link da sala.</p>
    ${btn('Concluir', 'pri', 'l', 'data-rm="criada"', 'wide')}`);
}

/* ---------- 4 · sala de espera · começa sozinha quando lota e todos ficam prontos ---------- */
function paintRoom() {
  RM.view = 'espera';
  const g = gameById(RM.game), n = rmSeats(), P = RM.players, ready = P[0][3] === 'Pronto';
  const rows = [];
  for (let i = 0; i < n; i++) {
    const p = P[i];
    if (!p) { rows.push(`<div class="pr free">${hex('nenhum', 'ele', 's')}<b>Vaga livre</b></div>`); continue; }
    const name = i === 0 ? (RM.role === 'dono' ? 'Você · dono' : 'Você') : p[0] + (p[4] === 'dono' ? ' · dono' : '');
    rows.push(`<div class="pr">${hex(p[1], p[2], 's', 0, false)}<b>${esc(name)}</b><small class="${p[3] === 'Pronto' ? 'ok' : ''}">${p[3]}</small></div>`);
  }
  const st = RM.count > 0 ? `Todos prontos · a partida começa em ${RM.count}s` : `Aguardando jogadores · ${P.length}/${n}`;
  rmSheet(`${rmHead(GAME_ICON[g.id], `Sala ${RM.code} · ${g.name} ${rmFmt()}`, st, RM.count > 0 ? 'go' : 'ok')}
    <div class="room-info">${cell('Modo', g.id === 'poker' ? rmFmt() : RM.variant)}${cell('Entrada', RM.paid ? fmt(RM.val) : 'Grátis')}${cell('Prêmio', RM.paid ? rmPrize() : '—')}${cell('Pontos', g.pts(RM.variant))}</div>
    <div class="room-h"><span>Jogadores</span><span>${P.length}/${n}</span></div>
    <div class="room-list">${rows.join('')}</div>
    ${ready ? btn('Você está pronto', 'pri', 'l', 'disabled', 'wide') : btn('Estou pronto', 'pri', 'l', 'data-rm="ready"', 'wide')}
    ${RM.count > 0 ? '' : btn('Compartilhar sala', 'sec', 'l', 'data-rm="criada"', 'wide')}
    <button class="leave-btn" data-rm="close">${RM.role === 'dono' ? 'Fechar sala' : 'Sair da sala'}</button>`);
}
const rmLater = (ms, f) => RM.timers.push(setTimeout(() => { if (RM.open) f(); }, ms));
function rmClear() { RM.timers.forEach(clearTimeout); RM.timers = []; clearInterval(RM.cd); RM.count = 0; }
function rmRepaint() { if (RM.view === 'espera' && $('#veil .bsheet.sala')) paintRoom(); }
// a turma da mesa: os mesmos jogadores que os motores usam (fila), com os amigos convidados na frente
function salaBase() {
  const sv = [ST.game, ST.variant, ST.trucoMode];
  ST.game = RM.game; ST.variant = RM.variant; ST.trucoMode = RM.fmt;
  const q = queuePeople().slice(1);
  [ST.game, ST.variant, ST.trucoMode] = sv;
  return q;
}
function rmBots() {
  const have = new Set(RM.players.map(p => p[0])), out = [];
  const add = p => { if (!have.has(p[0]) && p[0] !== ST.nick) { out.push([p[0], p[1], p[2]]); have.add(p[0]); } };
  FRIENDS.filter(f => RM.invited[f[0]]).forEach(add);
  salaBase().forEach(add);
  return out.slice(0, rmSeats() - RM.players.length);
}
function rmJoinLoop() {
  rmClear();
  let t = RM.role === 'dono' ? 4200 : 1600;
  rmBots().forEach(b => {
    t += rnd(1400, 2600);
    const ready = t + 900 + rnd(1200, 2600);
    rmLater(t, () => { RM.players.push([b[0], b[1], b[2], 'Entrando…']); rmRepaint(); });
    rmLater(t + 900, () => { const p = RM.players.find(x => x[0] === b[0]); if (p) { p[3] = 'Não pronto'; rmRepaint(); } });
    rmLater(ready, () => { const p = RM.players.find(x => x[0] === b[0]); if (p) { p[3] = 'Pronto'; rmRepaint(); rmCheck(); } });
  });
}
function rmCheck() {
  const P = RM.players;
  if (RM.count > 0 || P.length < rmSeats() || !P.every(p => p[3] === 'Pronto')) return;
  RM.count = 3;
  if ($('#veil .bsheet.sala')) paintRoom();
  RM.cd = setInterval(() => {
    if (!RM.open) { clearInterval(RM.cd); return; }
    RM.count--;
    if (RM.count <= 0) { clearInterval(RM.cd); rmLaunch(); } else rmRepaint();
  }, 1000);
}
function rmLaunch() {
  RM.count = 0;
  if (RM.paid && ST.saldo < RM.val) { paintSaldo(); return; }
  ST.room = {code: RM.code, free: !RM.paid, people: RM.players.slice(1).map(p => [p[0], p[1], p[2]]), role: RM.role, host: RM.host};
  Object.assign(ST, {game: RM.game, variant: RM.variant, stake: RM.paid ? RM.val : 1, tourney: null});
  if (RM.game === 'truco') ST.trucoMode = RM.fmt;
  ST.training = !RM.paid; if (ST.training) ST.trainSaldo = ST.saldo;
  RM.open = false; rmClear(); $('#sheet').innerHTML = '';
  launchGame('Sala ' + RM.code);
}
// os nomes da mesa viram os da sala (launchGame chama depois do syncNick)
function salaPeople() {
  const P = ST.room.people, f = formatOf(ST.game, ST.variant, ST.trucoMode);
  const set = (o, p) => { if (p) { o.n = p[0]; o.c = p[1]; o.g = p[2]; } };
  if (f === '2x2') { set(PAR, P[0]); set(OPP, P[1]); set(OPP2, P[2]); } else set(OPP, P[0]);
  BU_NAMES.splice(0, 4, ST.nick, OPP.n, PAR.n, OPP2.n);
  PK_PEOPLE[1] = [OPP.n, OPP.c, OPP.g];
  if (f === 'Mesa de 6') P.forEach((p, i) => { PK_PEOPLE[i + 1] = p.slice(); });
}
// "Voltar para a sala" no resultado: a mesma turma, todos de novo em "Não pronto"
function salaAgain() {
  ST.room = null; ST.training = false; endAllGames();
  go('lobby', {}, {noHist: true, reset: true});
  RM.open = true; RM.players.forEach(p => { p[3] = 'Não pronto'; });
  paintRoom();
  RM.players.slice(1).forEach(p => rmLater(rnd(1200, 3200), () => { p[3] = 'Pronto'; rmRepaint(); rmCheck(); }));
}
function paintFechar() {
  RM.view = 'fechar';
  const dono = RM.role === 'dono';
  rmSheet(`<div class="task">${ic(dono ? 'lock' : 'key', 'hero')}<div class="tx"><h2>${dono ? 'Fechar a sala?' : 'Sair da sala?'}</h2>
    <p>${dono ? 'Quem já entrou volta para o lobby e o link deixa de funcionar. Ninguém paga nada: a entrada só sai do saldo quando a partida começa.' : 'Você volta para o lobby. Dá pra entrar de novo pelo mesmo link enquanto a sala estiver aberta.'}</p></div>
    ${btn(dono ? 'Continuar com a sala' : 'Continuar na sala', 'pri', 'l', 'data-rm="room"', 'wide')}<button class="leave-btn" data-rm="closeGo">${dono ? 'Fechar sala' : 'Sair da sala'}</button></div>`);
}

/* ---------- 5 · convidado: link → convite (sem login) → senha → sala de espera ---------- */
function salaFromLink(qs) {
  const code = (qs.get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); if (!code) return null;
  const g = gameById(qs.get('j') || 'truco');
  if (!g || !playableSel(g.id, qs.get('v') || g.def)) return {code, bad: true, host: qs.get('de') || 'betinh4'};
  const v = g.variants.includes(qs.get('v')) ? qs.get('v') : g.def;
  let pw = ''; try { pw = qs.get('k') ? atob(qs.get('k')) : ''; } catch (e) { pw = ''; }
  return {code, host: (qs.get('de') || 'betinh4').slice(0, 16), game: g.id, variant: v, fmt: g.id === 'truco' ? (qs.get('f') === '1x1' ? '1x1' : '2x2') : formatOf(g.id, v), val: Math.max(0, parseMoney(qs.get('e') || '0')), pw: /^\d{4}$/.test(pw) ? pw : ''};
}
SCREENS.convite = {cls: 'convite', render: () => {
  const I = INV, g = gameById(I.game), h = hostOf(I.host), n = seatsOf(I.fmt);
  return `<div class="cv"><i class="cvglow"></i><div class="cv-top">
    <div class="marca"><img src="${A}ui/logo_icon.webp" alt=""><b>Liquid</b></div>
    <div class="cv-host">${av(h[1], h[2], 'xl')}${ic(GAME_ICON[g.id], 'gic')}</div>
    <div class="cv-tx"><h1>${esc(I.host)} te chamou pra jogar ${g.name}!</h1><p>Sala ${I.code} · ${g.id === 'poker' ? 'Poker' : g.name + ' ' + I.variant} · ${I.fmt}. Depois de entrar, você cai direto na sala.</p></div>
    <div class="cv-card"><div class="room-info">${cell('Entrada', I.val ? fmt(I.val) : 'Grátis')}${cell('Prêmio', I.val ? fmt(prizeOf(I.val, I.fmt === 'Mesa de 6' ? 3.6 : 1.8)) : '—')}${cell('Vagas', `${n - 1} de ${n}`)}</div>
      <div class="cv-pl"><span class="avs">${av(h[1], h[2], 's')}${Array.from({length: Math.min(3, n - 1)}, () => av('nenhum', 'ele', 's')).join('')}</span><small>${esc(I.host)} já está na sala</small></div>
      ${I.pw ? `<div class="cv-lock">${ic('lock')}<small>Sala com senha: ela veio junto com o convite.</small></div>` : ''}</div></div>
    <div class="cv-bot"><div class="acts"><div>${btn('Já tenho conta', 'sec', 'm m44', 'data-a="invLogin"')}</div><div>${btn('Criar conta e jogar', 'pri', 'm m44', 'data-a="invSignup"')}</div></div>
      <p class="legal">+18 · Jogue com responsabilidade</p></div></div>`;
}};
function salaOpenInvite() {
  const I = INV; if (!I || I.done) return; I.done = true;
  $('#sheet').innerHTML = '';
  if (I.bad) { RM.role = 'convidado'; paintIndisp(); return; }
  ST.game = I.game; ST.variant = I.variant; if (I.game === 'truco') ST.trucoMode = I.fmt;
  if (CUR === 'lobby' || CUR === 'jogos') rerender(); else go('lobby', {}, {noHist: true, reset: true});
  rmClear();
  Object.assign(RM, {open: false, role: 'convidado', game: I.game, variant: I.variant, fmt: I.fmt, paid: I.val > 0, val: I.val, pass: !!I.pw, pw: I.pw, code: I.code, host: I.host, invited: {}, pwTry: '', pwErr: false, players: []});
  if (I.pw) paintSenha(); else salaJoin();
}
function paintSenha() {
  RM.view = 'senha';
  const g = gameById(RM.game);
  rmSheet(`${rmHead('lock', `Sala do ${esc(RM.host)}`, `Sala ${RM.code} · ${g.name} ${RM.variant} · ${rmFmt()} · ${RM.paid ? fmt(RM.val) : 'Grátis'}`)}
    <p class="sh-p">Digite a senha de 4 números que veio junto com o convite.</p>
    <label class="otp ${RM.pwErr ? 'err' : ''}" id="rmOtp" for="rmPw">${[0, 1, 2, 3].map(k => `<span class="bx ${k === RM.pwTry.length && !RM.pwErr ? 'act' : ''}">${RM.pwTry[k] || ''}</span>`).join('')}</label>
    <input class="otp-in" id="rmPw" inputmode="numeric" maxlength="4" autocomplete="off" value="${RM.pwTry}">
    ${RM.pwErr ? '<small class="help err">Senha incorreta. Confira com quem te convidou.</small>' : ''}
    ${btn('Entrar na sala', 'pri', 'l', `data-rm="pwgo" ${RM.pwTry.length === 4 ? '' : 'disabled'}`, 'wide')}`);
  const i = $('#rmPw'); if (i) { i.focus({preventScroll: true}); i.setSelectionRange(i.value.length, i.value.length); }
}
function salaJoin() {
  if (RM.paid && ST.saldo < RM.val) { paintSaldo(); return; }
  const h = hostOf(RM.host);
  RM.players = [[ST.nick, ST.crew, ST.g, 'Não pronto'], [h[0], h[1], h[2], 'Pronto', 'dono']];
  RM.open = true; paintRoom(); rmJoinLoop();
}
function paintSaldo() {
  RM.view = 'saldo';
  const of = RM.role === 'dono' ? 'da sua sala' : `da sala do ${esc(RM.host)}`;
  rmSheet(`<div class="task">${ic('wallet', 'hero')}<div class="tx"><h2>Saldo insuficiente</h2><p>A entrada ${of} é ${fmt2(RM.val)} e você tem ${fmt2(ST.saldo)}.</p></div>
    <div class="tsum"><div><span>Entrada</span><b>${fmt2(RM.val)}</b></div><div><span>Seu saldo</span><b>${fmt2(ST.saldo)}</b></div><i></i><div><span>Faltam</span><b class="err">${fmt2(+(RM.val - ST.saldo).toFixed(2))}</b></div></div>
    <div class="row">${btn('Agora não', 'sec', 'm', 'data-rm="end"', 'fill')}${btn('Comprar fichas', 'pri', 'm', 'data-a="wallet"', 'fill')}</div>
    <p class="qinfo">Depois da compra, abra o link do convite de novo.</p></div>`);
}
function paintIndisp() {
  RM.view = 'indisp';
  rmSheet(`<div class="task">${ic('timer', 'hero')}<div class="tx"><h2>Sala indisponível</h2><p>A sala lotou, a partida já começou ou o dono fechou a sala. Peça um link novo ou jogue numa mesa aberta.</p></div>
    ${btn('Ver mesas abertas', 'pri', 'l', 'data-rm="end"', 'wide')}</div>`);
}

/* ---------- eventos do sheet ---------- */
function rmClick(e) {
  const t = e.target.closest('[data-rm],[data-rmv],[data-rmf],[data-rmp],[data-rmq]'); if (!t || t.disabled) return;
  const d = t.dataset;
  if (d.rmv) { RM.variant = d.rmv; paintCriar(); return; }
  if (d.rmf) { RM.fmt = d.rmf; paintCriar(); return; }
  if (d.rmp) { RM.paid = d.rmp === 'valor'; paintCriar(); if (RM.paid) setTimeout(() => { const i = $('#rmVal'); if (i) i.focus({preventScroll: true}); }, 30); return; }
  if (d.rmq) { RM.val = +d.rmq; const i = $('#rmVal'); if (i) i.value = money2(RM.val); paintValor(); return; }
  const [k, v] = d.rm.split(':');
  // o X depende de onde está: criar fecha · sala criada/amigos voltam pra sala · na sala pergunta antes de fechar
  const X = {criar: closeSheet, criada: paintRoom, amigos: paintRoom, espera: paintFechar, fechar: paintRoom};
  const A2 = {
    x: () => (X[RM.view] || rmEnd)(),
    pass: () => { RM.pass = !RM.pass; if (RM.pass && !RM.pw) RM.pw = newPw(); paintCriar(); },
    newpw: () => { RM.pw = newPw(); paintCriar(); },
    create: rmCreate,
    copy: () => { copyTxt(v === 'link' ? rmLink(true) : v === 'code' ? RM.code : RM.pw); paintCriada(v); toast(v === 'link' ? 'Link copiado · cole no WhatsApp, no Instagram ou onde quiser' : v === 'code' ? 'Código da sala copiado' : 'Senha copiada'); rmLater(2000, () => { if (RM.view === 'criada') paintCriada(); }); },
    wa: () => { window.open(`https://wa.me/?text=${encodeURIComponent(rmMsg())}`, '_blank', 'noopener'); toast('Abrindo o WhatsApp…'); },
    share: () => { if (navigator.share) navigator.share({title: rmTr('Sala no Liquid'), text: rmMsg(), url: rmLink(true)}).catch(() => {}); else { copyTxt(rmMsg()); toast('Convite copiado · cole onde quiser'); } },
    friends: () => { RM.q = ''; paintAmigos(); },
    invite: () => { RM.invited[v] = true; paintAmigos(); toast(`Convite enviado para ${v}`); if (RM.open && RM.players.length < rmSeats()) rmJoinLoop(); },
    criada: () => paintCriada(),
    room: paintRoom,
    ready: () => { RM.players[0][3] = 'Pronto'; paintRoom(); rmCheck(); },
    close: paintFechar,
    closeGo: () => { const dono = RM.role === 'dono'; rmEnd(); toast(dono ? 'Sala fechada · o link deixou de funcionar' : 'Você saiu da sala'); },
    pwgo: () => { if (RM.pwTry === RM.pw) salaJoin(); else { RM.pwErr = true; paintSenha(); } },
    end: rmEnd
  };
  if (A2[k]) A2[k]();
}
function rmInput(e) {
  const t = e.target;
  if (t.id === 'rmVal') { RM.val = parseMoney(t.value); paintValor(); }
  else if (t.id === 'rmQ') { RM.q = t.value; paintAmigos(); const i = $('#rmQ'); i.focus({preventScroll: true}); i.setSelectionRange(i.value.length, i.value.length); }
  else if (t.id === 'rmPw') { RM.pwTry = t.value.replace(/\D/g, '').slice(0, 4); RM.pwErr = false; paintSenha(); }
}
function rmBlur(e) { if (e.target.id === 'rmVal' && RM.val) e.target.value = money2(RM.val); }

Object.assign(ACT, {
  criarSala: () => {
    if (RM.open) { $('#sheet').innerHTML = ''; paintRoom(); return; } // já tem uma sala aberta: volta pra ela
    if (!playableSel()) { ST.game = 'truco'; ST.variant = 'Mineiro'; }
    const g = game();
    rmClear();
    Object.assign(RM, {role: 'dono', game: g.id, variant: ST.variant, fmt: g.id === 'truco' ? ST.trucoMode : formatOf(g.id, ST.variant), paid: false, val: 25, pass: false, pw: newPw(), code: '', host: ST.nick, invited: {}, q: '', players: []});
    $('#sheet').innerHTML = ''; paintCriar();
  },
  invLogin: () => { OB.mode = 'login'; go('ob2'); },
  invSignup: () => { OB.mode = 'signup'; go('ob2'); }
});
