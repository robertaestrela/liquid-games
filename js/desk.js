/* Liquid · desktop (computador com tela ≥ 1024 px na horizontal; celular e tablet ficam no layout mobile). As telas e os jogos seguem numa coluna 9:16 no meio;
   o header vira um header largo, a navbar vira o menu da esquerda e o chat do jogo fica ao vivo na direita
   (em partida, vira o Chat da mesa). Entre 1024 e 1279 px o menu vira trilho e o chat volta a ser a aba Chat. */
'use strict';
const DK = {on: false, chat: false, busy: false, lastGame: null, feed: '', mode: ''};
const DK_W = 396, DK_H = 704;
// só no computador (mouse ou trackpad): celular e tablet seguem com o layout de sempre, mesmo deitados. ?desk=1 / ?desk=0 forçam (testes)
const DK_FORCE = new URLSearchParams(location.search).get('desk');
function isPC() {
  if (DK_FORCE) return DK_FORCE === '1';
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua)) return false;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return false; // iPad se apresenta como Mac
  return matchMedia('(any-hover: hover) and (any-pointer: fine)').matches;
}
const dkMode = () => isPC() && innerWidth >= 1024 && innerWidth >= innerHeight * 1.2;

function dkApply() {
  const on = dkMode(), b = document.body;
  if (on !== DK.on) { closeNotifs(); DK.on = on; b.classList.toggle('dk', on); }
  if (!on) return;
  const rail = innerWidth < 1280;
  b.classList.toggle('dk-rail', rail);
  DK.chat = !rail;
  // com o chat ao vivo do lado, a aba Chat some do menu: se estava aberta, volta para o início
  if (DK.chat && CUR === 'chat') goHome();
  paintDesk();
}
function dkFit() {
  const a = $('.stage-wrap'), ph = $('#phone');
  // no máximo 456×812 (coluna do Figma em 1920×1080); diminui em telas menores
  const s = Math.min(812 / DK_H, (a.clientHeight - 48) / DK_H, (a.clientWidth - 48) / DK_W);
  ph.style.transform = `scale(${Math.max(.5, s)})`;
}

/* ---------- header largo ---------- */
function dkHeader() {
  const skin = hasSkin(), ob = !ST.onboarded || /^ob/.test(CUR || '');
  return `<button class="brand" data-a="${ob ? 'noop' : 'home'}" aria-label="Início"><img src="${A}ui/logo_icon.webp" alt=""><b>Liquid<span></span></b></button>
    <div class="mid"><button class="cpill" data-a="wallet" aria-label="Saldo">${ic('banknote')}<span class="t"><small>Saldo</small><b>${fmt2(ST.saldo)}</b></span><span class="plus">${svg('i-plus')}</span></button>
      <button class="cpill bonus" data-a="wallet" aria-label="Bônus">${ic('gift')}<span class="t"><small>Bônus</small><b>${fmt2(ST.bonus)}</b></span></button></div>
    <div class="right"><button class="hbell" data-a="notifs" aria-label="Notificações">${ic('bell')}<i ${ST.unread ? '' : 'hidden'}></i></button>
      <button class="me" data-a="${skin ? 'profile' : 'loja'}" aria-label="${skin ? 'Perfil' : 'Escolher skin na Loja'}">${hex(ST.crew, ST.g, 's', 0, true, {add: true})}<span class="tx"><b>${esc(ST.nick)}</b><small>${skin ? crewName(ST.crew, ST.g) : 'Escolher skin'}</small></span></button></div>`;
}

/* ---------- menu da esquerda ---------- */
const DK_ACCOUNT = [['profile', 'user', 'Perfil'], ['wallet', 'coins', 'Fichas'], ['history', 'timer', 'Histórico'], ['ranking', 'trophy', 'Ranking'], ['settings', 'gear', 'Ajustes']]; // Ranking = troféu (como no menu do Figma)
function dkActive() {
  const c = CUR;
  if (c === 'pacote' || c === 'picker' || c === 'diamantes') return 'loja';
  if (c === 'cbattle' || c === 'sala') return 'batalhas';
  if (c === 'rankGame') return 'lobby';
  if (c === 'jogos' && !hasSkin()) return 'lobby';
  return c;
}
function dkMenu() {
  const on = dkActive();
  const items = NAV_ITEMS.filter(([k]) => (k !== 'jogos' || hasSkin()) && (k !== 'chat' || !DK.chat));
  const it = (k, i, l, attr) => `<button class="it ${k === on ? 'on' : ''}" ${attr} ${k === on ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`;
  return `<div class="busy"><i></i><span>Partida em andamento · saia pelo Voltar do jogo</span></div>
    ${items.map(([k, i, l]) => it(k, i, l, `data-nav="${k}"`)).join('')}
    <hr><span class="lb">Sua conta</span>
    ${DK_ACCOUNT.map(([k, i, l]) => it(k, i, l, k === 'wallet' ? 'data-a="wallet"' : `data-a="dkGo:${k}"`)).join('')}
    <p class="ft">+18 · Jogue com responsabilidade</p>`;
}
ACT.dkGo = s => { HIST = []; go(s, {}, {noHist: true}); };

/* ---------- chat ao vivo da direita: chat do jogo (fora da partida) ou Chat da mesa (em partida) ---------- */
function dkChatSkeleton() {
  $('#dkr').innerHTML = `<div class="dkc-h" id="dkcH"></div><div class="dkc-tabs" id="dkcTabs"></div><div class="feed" id="dkFeed"></div>
    <div class="composer"><div class="chint"><span>Você está conversando como <b id="dkNick"></b></span><span id="dkCount">0/200</span></div>
      <div class="row"><button class="bicon" id="dkPlus" data-a="chatSend" aria-label="Enviar bônus ou mesa">${svg('i-plus')}</button>
        <label class="in"><input id="dkIn" maxlength="200" placeholder="Diga algo…" autocomplete="off"></label>
        <button class="send" data-a="dkSay" aria-label="Enviar">${svg('i-send')}</button></div></div>`;
  const i = $('#dkIn');
  i.addEventListener('input', () => { $('#dkCount').textContent = `${i.value.length}/200`; });
  i.addEventListener('keydown', e => { if (e.key === 'Enter') ACT.dkSay(); });
  $('#dkcTabs').addEventListener('click', e => { const t = e.target.closest('[data-dkcg]'); if (t) { CHAT.game = t.dataset.dkcg; paintChat(); } });
}
function paintChat() {
  if (!DK.on || !DK.chat || !ST.onboarded) return;
  if (!$('#dkFeed')) dkChatSkeleton();
  const a = activeGame(), g = gameById(CHAT.game), mode = a ? 'mesa:' + a.t : 'jogo:' + g.id;
  if (mode !== DK.mode) {
    // cabeçalho, abas e o + só mudam quando troca o jogo do chat ou a partida começa/acaba
    if (a && !/^mesa/.test(DK.mode)) GAME_CHAT.length = 0;
    DK.mode = mode; DK.feed = '';
    $('#dkcH').innerHTML = a ? `${ic('chat')}<span class="tx"><b>Chat da mesa</b><small><i></i>Mesa ${a.t} · ${a.players.length} jogadores · só quem está na mesa</small></span>`
      : `${ic(GAME_ICON[g.id])}<span class="tx"><b>Chat ${doG(g)} ${g.name}</b><small><i></i>${ONLINE[g.id]} online agora</small></span>`;
    $('#dkcTabs').innerHTML = a ? '' : GAMES.map(x => gameBlock(x, x.id === g.id, `data-dkcg="${x.id}"`).replace('class="gb ', 'class="gb mini ')).join('');
    $('#dkcTabs').hidden = !!a; $('#dkPlus').hidden = !!a;
  }
  $('#dkNick').textContent = ST.nick;
  if (a && !GAME_CHAT.length) a.players.slice(1).forEach((p, k) => GAME_CHAT.push({who: p[0], c: p[1], g: p[2], t: ['boa sorte!', 'segura essa 😤', 'vixe, tá blefando', 'bora!'][k % 4]}));
  const html = a ? `<span class="spacer"></span><div class="sys">Chat da mesa ${a.t}</div>${GAME_CHAT.map(m => msgHTML(m)).join('')}`
    : `<span class="spacer"></span><div class="sys">Chat ${doG(g)} ${g.name} · ${ONLINE[g.id]} online</div>${feedOf(g.id).map(msgHTML).join('')}`;
  if (html !== DK.feed) {
    const f = $('#dkFeed'), bottom = !DK.feed || f.scrollHeight - f.scrollTop - f.clientHeight < 40;
    f.innerHTML = html; DK.feed = html;
    if (bottom) f.scrollTop = f.scrollHeight;
  }
}
ACT.dkSay = () => {
  const i = $('#dkIn'); if (!i || !i.value.trim()) return;
  const t = i.value.trim(), a = activeGame(); i.value = ''; $('#dkCount').textContent = '0/200';
  if (a) {
    GAME_CHAT.push({me: true, who: ST.nick, t}); paintChat();
    setTimeout(() => { const b = activeGame(); if (!b) return; const p = pickOne(b.players.slice(1)); GAME_CHAT.push({who: p[0], c: p[1], g: p[2], t: pickOne(BOT_REPLIES)}); paintChat(); }, rnd(900, 1700));
  } else {
    const gid = CHAT.game; feedOf(gid).push({me: true, who: ST.nick, t}); paintChat();
    setTimeout(() => { const p = pickOne(PEOPLE); feedOf(gid).push({who: p[0], c: p[1], g: p[2], t: pickOne(BOT_REPLIES)}); paintChat(); }, rnd(1200, 2200));
  }
};
// o botão Chat da barra do jogo leva para o chat do lado (no trilho, abre a folha de sempre)
function dkFocusChat() {
  const r = $('#dkr'), i = $('#dkIn'); if (!r || !i) return false;
  r.classList.add('flash'); i.focus(); setTimeout(() => r.classList.remove('flash'), 900);
  return true;
}

/* ---------- pinta tudo · chamado pelo go(), refreshChrome() e quando a partida começa/acaba ---------- */
function paintDesk() {
  if (!DK.on) return;
  const b = document.body, ob = !ST.onboarded || /^ob/.test(CUR || '');
  b.classList.toggle('dk-ob', ob);
  // o chat do lado segue o jogo escolhido no lobby/início
  if (DK.lastGame !== ST.game) { DK.lastGame = ST.game; CHAT.game = ST.game; }
  b.style.setProperty('--dk-gc', game().color);
  $('#dkh').innerHTML = dkHeader();
  $('#dkl').innerHTML = dkMenu();
  dkBusy();
  paintChat();
  dkFit();
}
function dkBusy() {
  const busy = !$('#scr-game').hidden || !!$('#sinucaWrap') || CUR === 'sala' || !!$('#qSlots') || !!$('#overlay .res2');
  if (busy !== DK.busy) { DK.busy = busy; document.body.classList.toggle('dk-busy', busy); }
}
// partida, fila e resultado abrem e fecham sem passar pelo go(): observa o app para travar/soltar o menu e trocar o chat
let dkRaf = 0;
new MutationObserver(() => { if (!DK.on || dkRaf) return; dkRaf = requestAnimationFrame(() => { dkRaf = 0; dkBusy(); paintChat(); }); })
  .observe($('#app'), {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden']});
