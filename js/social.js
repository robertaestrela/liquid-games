/* Liquid · Chat, Notificações, Perfil, Histórico, Card do jogador, Ajustes, Fichas (redireciona) e Ranking */
'use strict';

/* ======================================================================
   CHAT (M01–M05) · um chat por jogo, bônus e mesas enviados no chat
   ====================================================================== */
const CHAT = {game: 'truco', feeds: {}, bonusTaken: false};
const ONLINE = {truco: '1.248', cacheta: '864', tranca: '402', buraco: '611', poker: '935', sinuca: '388'};
function seedFeed(gid) {
  const gn = gameById(gid).name;
  const base = [
    {who: 'dutra77', c: 'comandante', g: 'ele', t: gid === 'truco' ? 'alguém pra um truco valendo R$ 5?' : `alguém pra ${doG(gameById(gid)) === 'da' ? 'uma' : 'um'} ${gn.toLowerCase()} valendo R$ 5?`},
    {who: 'af_07', c: 'piloto', g: 'ela', t: gid === 'truco' ? 'bora! mas no Mineiro' : 'bora!'},
    {type: 'oficial', who: 'Liquid', t: `bônus no ar pra galera ${doG(gameById(gid))} ${gn}! Corre que é por ordem de chegada.`, bonus: {v: 5, left: 7, of: 10}},
    {type: 'estrela', who: 'alfonso.dutra', c: 'navegador', g: 'ele', t: gid === 'truco' ? 'ganhei 5 seguidas no Paulista, tô on fire 🔥' : 'ganhei 5 seguidas hoje, tô on fire 🔥'},
    {who: 'luana.m', c: 'explorador', g: 'ela', t: 'quem topa uma partida depois?'},
    {who: 'dutra77', c: 'comandante', g: 'ele', t: 'entra aí na minha mesa 👇', table: {id: gameById(gid).pfx + '104', game: gid, v: 1, seats: '2/4'}},
    {who: 'af_07', c: 'piloto', g: 'ela', t: '@dutra77 tô indo!'}
  ];
  return base;
}
const feedOf = gid => CHAT.feeds[gid] || (CHAT.feeds[gid] = seedFeed(gid));
const NICK_C = ['#5fc8eb', '#c9a8ff', '#8cf0a9'];
const nickColor = n => NICK_C[[...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % 3];
// chat-message (DS): Default · Estrela · Oficial · com anexo (chat-card de bônus ou mesa)
function msgHTML(m, i) {
  if (m.type === 'sys') return `<div class="sys">${m.t}</div>`;
  const of = m.type === 'oficial', es = m.type === 'estrela';
  const avt = of ? `<span class="av s of"><img src="${A}ui/logo_icon.webp" alt=""></span>` : m.me ? av(ST.crew, ST.g, 's') : av(m.c, m.g, 's');
  const badge = of ? `<span class="badge of">${ic('verified')}OFICIAL</span>` : es ? `<span class="badge es">${ic('star')}ESTRELA</span>` : '';
  const nc = m.me || es ? '#bceafb' : of ? '#5fc8eb' : nickColor(m.who);
  let card = '';
  if (m.bonus) { const taken = (CHAT.bonusTaken && !m.mine) || m.bonus.left <= 0; card = `<div class="ccard">${ic('gift')}<span class="tx"><small>Bônus</small><b class="prize">${fmt(m.bonus.v)}</b><span>${m.bonus.left} de ${m.bonus.of} restantes</span></span>${m.mine ? btn('Enviado', 'sec', 's', 'disabled') : btn(taken ? 'Resgatado' : 'Resgatar', taken ? 'sec' : 'pri', 's', taken ? 'disabled' : `data-a="chatBonus:${i}"`)}</div>`; }
  if (m.table) { const g = gameById(m.table.game); card = `<div class="ccard">${ic(GAME_ICON[g.id])}<span class="tx"><small>Mesa ${m.table.id}</small><b>${g.name}${g.id === 'truco' ? ' Paulista' : ''}</b><span>${fmt(m.table.v)} · ${m.table.seats} jogadores</span></span>${btn('Entrar', 'pri', 's', `data-a="chatTable:${i}"`)}</div>`; }
  return `<div class="cmsg ${of ? 'of' : es ? 'es' : ''}"><div class="row"><button data-a="${m.me || of ? 'noop' : 'playerCard:' + esc(m.who)}" aria-label="${esc(m.who)}">${avt}</button><div class="ln">${badge}<span class="tx"><b style="color:${nc}">${esc(m.who)}:</b> <span${of ? ' style="color:#5fc8eb"' : ''}>${esc(m.t)}</span></span></div></div>${card}</div>`;
}
SCREENS.chat = {cls: 'chat', render: () => {
  const g = gameById(CHAT.game), feed = feedOf(CHAT.game);
  return `<div class="pg-top">${header()}${ptop('Chat', {live: true, text: `${g.name} · ${ONLINE[g.id]} online`}, 'home')}</div>
    <div class="hscroll gtabs">${GAMES.map(x => gameBlock(x, x.id === g.id, `data-cgame="${x.id}"`)).join('')}</div>
    <div class="feed" id="feed"><span class="spacer"></span><div class="sys">Chat ${doG(g)} ${g.name} · ${ONLINE[g.id]} online</div>${feed.map(msgHTML).join('')}</div>
    <div class="composer"><div class="chint"><span>Você está conversando como ${esc(ST.nick)}</span><span id="cCount">0/200</span></div>
      <div class="row"><button class="bicon" data-a="chatSend" aria-label="Enviar bônus ou mesa">${svg('i-plus')}</button>
        <label class="in"><input id="cIn" maxlength="200" placeholder="Diga algo…" autocomplete="off"></label>
        <button class="send" data-a="chatPost" aria-label="Enviar">${svg('i-send')}</button></div></div>
    ${navbar('chat')}`;
}, after: () => {
  const f = $('#feed'); f.scrollTop = f.scrollHeight;
  const i = $('#cIn'); i.addEventListener('input', () => { $('#cCount').textContent = `${i.value.length}/200`; });
  i.addEventListener('keydown', e => { if (e.key === 'Enter') ACT.chatPost(); });
}, click: e => { const t = e.target.closest('[data-cgame]'); if (t) { CHAT.game = t.dataset.cgame; rerender(); } }};
const BOT_REPLIES = ['kkkkk boa', 'partiu mesa!', 'quem vem?', 'tô dentro', 'hoje eu levo 😎', 'gg', 'bora uma rodada', 'esse truco tá pegando fogo'];
Object.assign(ACT, {
  noop: () => {},
  chatPost: () => {
    const i = $('#cIn'); if (!i || !i.value.trim()) return;
    const feed = feedOf(CHAT.game); feed.push({me: true, who: ST.nick, t: i.value.trim()});
    rerender();
    setTimeout(() => { if (CUR !== 'chat') return; const p = pickOne(PEOPLE); feedOf(CHAT.game).push({who: p[0], c: p[1], g: p[2], t: pickOne(BOT_REPLIES)}); rerender(); }, rnd(1200, 2200));
  },
  chatBonus: i => {
    const m = feedOf(CHAT.game)[+i]; if (!m || CHAT.bonusTaken) return;
    CHAT.bonusTaken = true; m.bonus.left = Math.max(0, m.bonus.left - 1); ST.bonus += m.bonus.v; rerender();
    const t = document.createElement('div'); t.className = 'gtoast-card'; t.innerHTML = `${ic('gift')}<div><b>${fmt(m.bonus.v)} de bônus resgatado!</b><small>Já está no seu saldo de bônus.</small></div>`;
    $('#view').appendChild(t); setTimeout(() => t.remove(), 2400);
  },
  chatTable: i => {
    const m = feedOf(CHAT.game)[+i]; ST.game = m.table.game; ST.variant = m.table.game === 'truco' ? 'Paulista' : defVariant(game()); ST.trucoMode = '2x2'; ST.stake = m.table.v;
    if (!playableSel()) { toast('Em breve · esse jogo ainda não abre'); return; }
    startQueue(m.table.id);
  },
  chatSend: () => chatSendSheet('bonus')
});
const SEND = {tab: 'bonus', v: 5, n: 10, table: 0};
function chatSendSheet(tab) {
  SEND.tab = tab;
  const body = tab === 'bonus'
    ? `<div class="field"><label>Valor do bônus</label><div class="amt-grid">${[2, 5, 10, 20].map(v => `<button class="amt ${SEND.v === v ? 'on' : ''}" data-a="sendV:${v}">${fmt(v)}</button>`).join('')}</div></div>
       <div class="field"><label>Quantas pessoas podem resgatar</label><div class="stepper"><span>${SEND.n} pessoas</span><div><button class="bicon s" data-a="sendN:-1" aria-label="Menos"><b style="font:600 16px/1 var(--f-display)">−</b></button><button class="bicon s" data-a="sendN:1" aria-label="Mais">${svg('i-plus')}</button></div></div></div>
       <div class="total"><small>Total<br>sai do seu saldo</small><b>${fmt(SEND.v * SEND.n)}</b></div>
       ${btn(`Enviar ${fmt(SEND.v * SEND.n)} em bônus`, 'pri', 'l', 'data-a="sendDo"', 'wide')}`
    : `<div class="nlist">${lobbyTables(gameById(CHAT.game), defVariant(gameById(CHAT.game))).slice(0, 4).map((t, k) => `<button class="nitem" data-a="sendT:${k}" style="${SEND.table === k ? 'box-shadow:inset 0 0 0 1.5px var(--btn-secondary-border),0 0 12px var(--glow-info)' : ''}">${ic(GAME_ICON[t.game])}<span class="tx"><b>Mesa ${t.id} · ${t.fmt}</b><span>${fmt(t.val)} · ${t.players.length}/${t.max} jogadores · ${t.pts}</span></span></button>`).join('')}</div>
       ${btn('Enviar mesa no chat', 'pri', 'l', 'data-a="sendDo"', 'wide')}`;
  openSheet(`${sheetHead('chat', 'Enviar no chat', `Chat ${doG(gameById(CHAT.game))} ${gameById(CHAT.game).name}`)}${tabs([['bonus', 'Bônus'], ['mesas', 'Mesas']], tab, '', 'stab')}${body}`, {cls: 'g16'});
  $$('#sheet [data-stab]').forEach(b => b.onclick = () => chatSendSheet(b.dataset.stab));
}
Object.assign(ACT, {
  sendV: v => { SEND.v = +v; chatSendSheet('bonus'); },
  sendN: d => { SEND.n = Math.max(1, Math.min(50, SEND.n + +d)); chatSendSheet('bonus'); },
  sendT: k => { SEND.table = +k; chatSendSheet('mesas'); },
  sendDo: () => {
    const feed = feedOf(CHAT.game);
    if (SEND.tab === 'bonus') {
      const tot = SEND.v * SEND.n; if (ST.saldo < tot) { toast('Saldo insuficiente'); return; }
      ST.saldo = +(ST.saldo - tot).toFixed(2);
      feed.push({me: true, who: ST.nick, t: `mandei ${fmt(SEND.v)} de bônus pra ${SEND.n} pessoas, corre!`, bonus: {v: SEND.v, left: SEND.n, of: SEND.n}, mine: true});
    } else {
      const t = lobbyTables(gameById(CHAT.game), defVariant(gameById(CHAT.game)))[SEND.table];
      feed.push({me: true, who: ST.nick, t: 'bora jogar comigo 👇', table: {id: t.id, game: t.game, v: t.val, seats: `${t.players.length}/${t.max}`}});
    }
    closeSheet(); rerender(); toast('Enviado no chat');
  }
});

/* ======================================================================
   NOTIFICAÇÕES · dropdown do sino (N01–N04)
   ====================================================================== */
const NOTIFS = [
  {id: 1, icon: 'gift', t: 'Bônus diário liberado', d: 'Você tem R$ 5,00 para resgatar na Loja.', at: 'há 1 h', unread: true, fav: false},
  {id: 2, icon: 'coins', t: 'Fichas compradas', d: 'R$ 50,00 em fichas já estão no seu saldo.', at: 'há 2 h', unread: true, fav: false},
  {id: 3, icon: 'swords', t: 'Batalha do Alfonso começa já', d: 'Faltam 5 min. Sua vaga na mesa está garantida.', at: 'ontem', unread: false, fav: true},
  {id: 4, icon: 'verified', t: 'Verificação aprovada', d: 'Seus documentos foram aprovados. Já pode sacar suas fichas.', at: 'há 3 dias', unread: false, fav: false}
];
let NTAB = 'todas';
function closeNotifs() { const d = $('#ndrop'); if (d) d.remove(); }
function renderNotifs() {
  const unread = NOTIFS.filter(n => n.unread).length;
  const list = NOTIFS.filter(n => NTAB === 'todas' || (NTAB === 'naolidas' ? n.unread : n.fav));
  const empty = NTAB === 'favoritas' ? ['star', 'Nenhuma favorita ainda', 'Toque na estrela de uma notificação para guardar aqui.'] : ['bell', 'Tudo em dia', 'Você não tem notificações não lidas.'];
  return `<div class="panel" role="dialog" aria-label="Notificações"><div class="nh"><b>Notificações</b><button data-a="nAll">Marcar todas como lidas</button></div>
    ${tabs([['todas', 'Todas'], ['naolidas', unread ? `Não lidas · ${unread}` : 'Não lidas'], ['favoritas', 'Favoritas']], NTAB, '', 'ntab')}
    <div class="nlist">${list.length ? list.map(n => `<div class="nitem" data-a="nRead:${n.id}"><span class="itile">${ic(n.icon)}</span><span class="tx"><span class="tr"><b>${n.t}</b>${n.unread ? '<i></i>' : ''}<button class="fav ${n.fav ? 'on' : ''}" data-a="nFav:${n.id}" aria-label="${n.fav ? 'Desfavoritar' : 'Favoritar'}">${ic('star')}</button></span><span>${n.d}</span><small>${n.at}</small></span></div>`).join('')
      : `<div class="nempty">${ic(empty[0])}<b>${empty[1]}</b><span>${empty[2]}</span></div>`}</div></div>`;
}
function openNotifs() {
  closeNotifs();
  const d = document.createElement('div'); d.className = 'ndrop'; d.id = 'ndrop'; d.innerHTML = renderNotifs();
  d.addEventListener('click', e => { if (e.target === d) closeNotifs(); const t = e.target.closest('[data-ntab]'); if (t) { NTAB = t.dataset.ntab; d.innerHTML = renderNotifs(); } });
  // no desktop o painel cai do sino do header largo, fora da coluna
  (DK.on ? document.body : $('#app')).appendChild(d);
}
const repaintNotifs = () => { const d = $('#ndrop'); if (d) d.innerHTML = renderNotifs(); ST.unread = NOTIFS.filter(n => n.unread).length; $$('.hbell i').forEach(b => { b.hidden = !ST.unread; }); };
Object.assign(ACT, {
  notifs: () => { if ($('#ndrop')) closeNotifs(); else openNotifs(); },
  nAll: () => { NOTIFS.forEach(n => n.unread = false); repaintNotifs(); },
  nRead: id => { const n = NOTIFS.find(x => x.id === +id); if (n) n.unread = false; repaintNotifs(); },
  nFav: id => { const n = NOTIFS.find(x => x.id === +id); if (n) n.fav = !n.fav; repaintNotifs(); }
});

/* ======================================================================
   PERFIL (M01) · Histórico (M03) · Card do jogador (M02)
   ====================================================================== */
const homeTab = () => hasSkin() ? 'jogos' : 'lobby';
// stat-cell e list-item (DS)
const stat = (i, v, l) => `<div class="c">${ic(i)}<span><b>${v}</b><small>${l}</small></span></div>`;
const li = (a, i, t, sub, val, cls = '') => `<button class="li" data-a="${a}"><span class="itile">${ic(i)}</span><span class="tx"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span>${val ? `<span class="val ${cls}">${val}</span>` : ''}${svg('i-chev-r')}</button>`;
SCREENS.profile = {cls: 'prof', render: () => {
  const skin = hasSkin(), rw = ST.reward && ST.reward.later;
  const role = skin ? `${crewName(ST.crew, ST.g)}${packOf(ST.crew) === 'estelar' ? ' Estelar' : ''} · Nível 12` : 'Sem skin · Nível 12';
  return `<div class="pg-top">${header()}${ptop('Perfil', null, 'home')}</div><div class="scroll"><div class="pcontent">
    <div class="phero" style="--cc:${skin ? crewColor(ST.crew, ST.g) : 'var(--text-subtle)'}">${hex(ST.crew, ST.g, 64, 70, true)}<span class="tx"><b>${esc(ST.nick)}</b><span><i></i>${role}</span><small>ID 529024054</small></span>${btn(skin ? 'Trocar' : 'Escolher skin', 'sec', 's', `data-a="${skin ? 'changeSkin' : 'goLoja'}"`)}</div>
    ${rw ? `<div role="button" tabindex="0" class="uopt owned" data-a="rewardNow">${ic('gift')}<span class="tx"><b>Recompensa guardada</b><small>${crewName(ST.reward.c, ST.reward.g)} · toque para ativar</small></span>${svg('i-chev-r')}</div>` : ''}
    <div class="gcard stats"><div class="r">${stat('gamepad', '1.280', 'partidas')}${stat('trophy', '742', 'vitórias')}</div><div class="r">${stat('coins', '58%', 'taxa de vitória')}${stat('crown', '312', 'vezes em 1º')}</div></div>
    <div class="grp"><div class="gcard">
      ${li('wallet', 'coins', 'Fichas', '', fmt2(ST.saldo))}${li('go:history', 'timer', 'Histórico de partidas')}${li('go:ranking', 'podium', 'Ranking')}${li('go:settings', 'gear', 'Ajustes')}${li('toast:Ajuda e suporte · fale com a gente pelo chat', 'headset', 'Ajuda e suporte')}
    </div><button class="logout" data-a="logout">Sair da conta</button></div>
  </div></div>${navbar(homeTab())}`;
}};
Object.assign(ACT, {
  profile: () => go('profile'),
  go: s => go(s),
  goLoja: () => { HIST = []; go('loja', {}, {noHist: true}); },
  loja: () => { HIST = []; go('loja', {}, {noHist: true}); },
  changeSkin: () => openPicker(packOf(ST.crew), 'profile'),
  logout: () => {
    Object.assign(ST, {onboarded: false, crew: 'nenhum', g: 'ela', owned: {nobru: false, magia: false, reis: false, estelar: false}, saldo: 1250, bonus: 35, reward: null, series: null});
    HIST = []; go('ob1', {}, {noHist: true}); toast('Você saiu da conta');
  }
});
const SEED_HIST = [
  {day: 'HOJE', game: 'truco', name: 'Truco Paulista', vs: 'dutra77', win: true, delta: 9, at: 'há 12 min'},
  {day: 'HOJE', game: 'cacheta', name: 'Pif-Paf', vs: 'af.dutra', win: false, delta: -5, at: 'há 1 h'},
  {day: 'ONTEM', game: 'poker', name: 'Poker 1x1', vs: 'alfonso_d', win: true, delta: 18, at: 'ontem'},
  {day: 'ONTEM', game: 'truco', name: 'Truco Mineiro', vs: 'dutra.bet', win: true, delta: 1.8, at: 'ontem'},
  {day: 'ONTEM', game: 'buraco', name: 'Buraco Aberto', vs: 'af_07', win: false, delta: -20, at: '2 dias'}
];
let HFILTER = 'todas';
SCREENS.history = {cls: 'prof', render: () => {
  const live = HISTORY.map(h => ({day: 'HOJE', game: h.game, name: h.name, vs: h.vs, win: h.win, tie: h.tie, delta: h.delta, at: 'agora'}));
  const all = [...live, ...SEED_HIST].filter(h => HFILTER === 'todas' || (HFILTER === 'vitorias' ? h.win : HFILTER === 'derrotas' ? !h.win && !h.tie : h.game === HFILTER));
  const wk = [...live, ...SEED_HIST].reduce((s, h) => s + h.delta, 48.2 - 3.8);
  const days = [...new Set(all.map(h => h.day))];
  const chips = [['todas', 'all', 'Todas'], ['vitorias', 'trophy', 'Vitórias'], ['derrotas', 'defeat', 'Derrotas'], ['truco', 'truco', 'Truco'], ['cacheta', 'cacheta', 'Cacheta'], ['buraco', 'buraco', 'Buraco'], ['poker', 'poker', 'Poker']];
  return `<div class="pg-top">${header()}${ptop('Histórico de partidas')}</div><div class="scroll"><div class="pcontent" style="padding-top:8px">
    <div class="hscroll hfilters">${chips.map(([k, i, l]) => `<button class="chip ${HFILTER === k ? 'on' : ''}" data-hf="${k}">${ic(i)}${l}</button>`).join('')}</div>
    <div class="hsum"><div><small>Esta semana</small><b class="${wk >= 0 ? 'ok' : 'err'}">${wk >= 0 ? '+' : '−'} ${fmt2(Math.abs(wk))}</b></div><div><small>Partidas</small><b>${37 + live.length}</b></div><div><small>Win rate</small><b style="color:var(--text-brand)">62%</b></div></div>
    ${all.length ? days.map(d => `<span class="hday">${d}</span><div class="hlist">${all.filter(h => h.day === d).map(h => `<div class="hrow" style="--gc:${gameById(h.game).color}"><i></i><span class="tx"><b>${h.name} · vs @${esc(h.vs)}</b><small>${h.win ? 'Vitória' : h.tie ? 'Empate' : 'Derrota'} · ${h.at}</small></span>${tag(`${h.delta >= 0 ? '+' : '–'} ${fmt2(Math.abs(h.delta))}`, h.delta >= 0 ? 'success' : 'danger')}</div>`).join('')}</div>`).join('') : '<div class="empty-st">Nenhuma partida com esse filtro.</div>'}
  </div></div>${navbar(homeTab())}`;
}, click: e => { const t = e.target.closest('[data-hf]'); if (t) { HFILTER = t.dataset.hf; rerender(); } }};

function playerCard(nick) {
  const p = PEOPLE.find(x => x[0] === nick) || [nick, 'comandante', 'ele'];
  openSheet(`<div class="pcard"><span class="onl">Online</span>${av(p[1], p[2], 'xl', {level: 18})}<h3>@${esc(p[0])}</h3><span class="sub">${crewName(p[1], p[2])} · membro desde mar 2026</span>
    <div class="st3"><div class="cell"><b>1.280</b><small>Partidas</small></div><div class="cell"><b>58%</b><small>Vitórias</small></div><div class="cell"><b>7</b><small>Sequência</small></div></div>
    <span class="rk-h">RANKING POR JOGO</span>
    <div class="rk-rows"><div>${ic('truco')}<span>Truco<small>Mineiro · 2x2</small></span><b>#12</b><em>▲ 3</em></div><div>${ic('cacheta')}<span>Cacheta<small>Pif-Paf · 1x1</small></span><b>#40</b><em>▲ 1</em></div></div>
    <div class="row">${btn('Adicionar amigo', 'sec', 'm m44', 'data-a="toast:Pedido de amizade enviado"')}${btn('Desafiar', 'pri', 'm m44', `data-a="challenge:${esc(p[0])}"`)}</div></div>`, {cls: ''});
}
Object.assign(ACT, {
  playerCard: n => playerCard(n),
  challenge: n => { closeSheet(); go('batalhas'); toast(`Crie uma batalha e convide @${n} no chat`); }
});

/* ======================================================================
   AJUSTES (M01) · Personalizar
   ====================================================================== */
const PREFS = {music: true, sfx: true};
SCREENS.settings = {cls: 'prof', render: () => {
  const sw = (k, i, t) => `<button class="li" data-a="pref:${k}"><span class="itile">${ic(i)}</span><span class="tx"><b>${t}</b></span><span class="tgl-sw ${PREFS[k] ? 'on' : ''}"></span></button>`;
  const ph = ST.phone || '(31) 99651-6899', phm = ph.replace(/(\(\d\d\) \d)\d{3}(\d)-?(\d{4})/, '$1…$3');
  return `<div class="pg-top">${header()}${ptop('Ajustes')}</div><div class="scroll"><div class="pcontent">
    <div class="grp"><small>CONTA</small><div class="gcard">${li('toast:Dados pessoais · em breve no protótipo', 'user', 'Dados pessoais', 'Nome, CPF e data de nascimento')}${li('toast:Celular verificado', 'phone', 'Celular', '', phm)}${li('toast:Adicionar e-mail · em breve', 'mail', 'E-mail', '', 'Adicionar', 'link')}</div></div>
    <div class="grp"><small>PERSONALIZAR</small><div class="gcard">${li('custom', 'star', 'Avatar, mesa e baralho', 'Muda na hora, em todos os jogos', hasSkin() ? crewName(ST.crew, ST.g) : 'Sem skin')}</div></div>
    <div class="grp"><small>SEGURANÇA</small><div class="gcard">${li('toast:Trocar senha · em breve no protótipo', 'key', 'Trocar senha')}${li('logout', 'friends', 'Trocar de conta')}</div></div>
    <div class="grp"><small>HISTÓRICO</small><div class="gcard">${li('go:history', 'calendar', 'Histórico do lobby')}${li('toast:Histórico exportado para o seu e-mail', 'export', 'Exportar histórico')}</div></div>
    <div class="grp"><small>PREFERÊNCIAS</small><div class="gcard">${li('toast:Mais idiomas em breve', 'globe', 'Idioma', '', 'Português')}${sw('music', 'music', 'Música')}${sw('sfx', 'sound', 'Efeitos sonoros')}</div></div>
    <div class="grp"><small>FICHAS</small><div class="gcard">${li('wallet', 'coins', 'Fichas', 'Comprar, sacar, limites e verificação')}</div></div>
    <div class="grp"><small>SOBRE</small><div class="gcard">${li('toast:Termos de uso · em breve', 'scroll', 'Termos de uso')}${li('toast:Privacidade · em breve', 'lock', 'Privacidade')}${li('toast:Certificado · em breve', 'medal', 'Certificado')}<div class="li"><span class="itile">${ic('gear')}</span><span class="tx"><b>Versão</b></span><span class="val">0.1.0 · build 42</span></div></div></div>
    <button class="logout" data-a="logout">Sair da conta</button>
  </div></div>${navbar(homeTab())}`;
}};
Object.assign(ACT, {
  pref: k => { PREFS[k] = !PREFS[k]; rerender(); },
  custom: () => personalizar()
});

/* ======================================================================
   FICHAS · comprar, sacar, limites e dados ficam na página de Fichas (fichas/index.html).
   O + do saldo (e Fichas no Perfil, em Ajustes e no menu do desktop) mostra "Redirecionando…" e abre a página
   na mesma aba. O app guarda onde estava; na volta (?resume) reabre no mesmo ponto, com o saldo que a página devolveu.
   ====================================================================== */
const FICHAS_URL = 'fichas/index.html?v=20261027h';
const SS = {
  get: k => { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del: k => { try { sessionStorage.removeItem(k); } catch (e) {} }
};
// telas que voltam como estavam (as outras dependem de algo em andamento e voltam para o início)
const RESUME_OK = ['jogos', 'lobby', 'chat', 'loja', 'batalhas', 'profile', 'history', 'ranking', 'settings'];
ACT.wallet = () => {
  if ($('#redir')) return;
  closeNotifs(); closeSheet();
  SS.set('eg.fichas', Object.assign(SS.get('eg.fichas') || {}, {saldo: ST.saldo, bonus: ST.bonus, nick: ST.nick, crew: ST.crew, g: ST.g, verified: !!ST.verified}));
  SS.set('eg.resume', {st: ST, cur: CUR, curp: CURP, notifs: NOTIFS, history: HISTORY, battles: BATTLES}); SS.set('eg.away', 1);
  const r = document.createElement('div'); r.className = 'redir'; r.id = 'redir';
  r.innerHTML = `<div class="card" role="status">${ic('coins')}<span class="tx"><b>Redirecionando…</b><span>Levando você para sua carteira e fichas.</span></span><i class="bar"><i></i></i></div>`;
  $('#app').appendChild(r);
  setTimeout(() => { location.href = FICHAS_URL; }, 1400);
};
// o que aconteceu na página de Fichas: saldo novo, verificação e as compras/saques feitos lá
function fichasSync() {
  const f = SS.get('eg.fichas'); let got = 0, out = 0;
  if (f) {
    ST.saldo = f.saldo; ST.bonus = f.bonus; ST.verified = !!f.verified;
    (f.events || []).forEach(e => {
      if (e.t === 'compra') { got += e.v; NOTIFS.unshift({id: Date.now() + NOTIFS.length, icon: 'coins', t: 'Fichas compradas', d: `${fmt2(e.v)} em fichas já estão no seu saldo.`, at: 'agora', unread: true, fav: false}); }
      else if (e.t === 'saque') out += e.v;
    });
    f.events = []; SS.set('eg.fichas', f);
  }
  ST.unread = NOTIFS.filter(n => n.unread).length;
  if (got || out) setTimeout(() => {
    const t = document.createElement('div'); t.className = 'gtoast-card fx';
    t.innerHTML = got ? `${ic('coins')}<div><b>Fichas na conta! + ${fmt2(got)}</b><small>Saldo atualizado: ${fmt2(ST.saldo)}. Bora jogar?</small></div>`
      : `${ic('coins')}<div><b>Saque de ${fmt2(out)} solicitado</b><small>Cai na sua conta em até 1 h.</small></div>`;
    $('#app').appendChild(t); setTimeout(() => t.remove(), 3600);
  }, 400);
}
function fichasResume(R) {
  const back = SS.get('eg.back') || {}; SS.del('eg.back'); SS.del('eg.away');
  Object.assign(ST, R.st, {series: null, training: false});
  NOTIFS.splice(0, NOTIFS.length, ...(R.notifs || NOTIFS));
  HISTORY.splice(0, HISTORY.length, ...(R.history || []));
  if (R.battles) BATTLES.splice(0, BATTLES.length, ...R.battles);
  fichasSync();
  const to = back.to && SCREENS[back.to] ? back.to : RESUME_OK.includes(R.cur) ? R.cur : null;
  if (to) go(to, to === R.cur ? R.curp || {} : {}, {noHist: true, reset: true}); else goHome();
  try { history.replaceState(null, '', location.pathname + '?home'); } catch (e) {}
}
// voltou pelo "voltar" do navegador e a página veio do cache: tira o aviso e atualiza o saldo
window.addEventListener('pageshow', e => {
  if (!e.persisted || !$('#redir')) return;
  $('#redir').remove(); SS.del('eg.away'); SS.del('eg.back');
  fichasSync(); refreshChrome(); if (CUR === 'profile') rerender();
});

/* ======================================================================
   RANKING · geral (M01) e por jogo (R01/R02, aberto pelo troféu do lobby)
   ====================================================================== */
const RANK_TOP = [['af.dutra', 'piloto', 'ela', '11.900'], ['dutra77', 'comandante', 'ele', '12.480'], ['alfonso_d', 'navegador', 'ele', '10.350']];
const RANK_ROWS = [['dutra.bet', 'Truco · 480 vitórias', '9.870', '+1'], ['af_07', 'Cacheta · 443 vitórias', '9.120', '–'], ['capitao.lu', 'Tranca · 406 vitórias', '8.450', '+3'], ['mari_truco', 'Buraco · 369 vitórias', '8.100', '-2'], ['joao.poker', 'Poker · 332 vitórias', '7.980', '+1'], ['lu.reis', 'Truco · 301 vitórias', '7.420', '+2'], ['caio.s', 'Cacheta · 288 vitórias', '6.990', '-1']];
const RK = {period: 'semana', geral: 'semanal', gfilter: 'todos', variant: null};
const rowHTML = (r, i, gname) => { const d = r[3]; return `<button class="rrow" data-a="playerCard:${r[0]}"><em>${i}</em>${av(PEOPLE[i % PEOPLE.length][1], PEOPLE[i % PEOPLE.length][2], 's')}<span class="tx"><b>@${r[0]}</b><small>${gname ? r[1].replace(/^\w+/, gname) : r[1]}</small></span><span class="pts"><b>${r[2]}</b><small class="${d.startsWith('-') ? 'dn' : d === '–' ? 'eq' : ''}">${d}</small></span></button>`; };
// podium-estrela-games (ranking do jogo) e rank-race (ranking geral)
const podiumHTML = gc => `<div class="rrace" style="--gc:${gc}"><i class="glw"></i><div class="podium">${[0, 1, 2].map(k => { const p = RANK_TOP[k], n = [2, 1, 3][k]; return `<div role="button" tabindex="0" class="p n${n}" data-a="playerCard:${p[0]}">${av(p[1], p[2], n === 1 ? 'l' : 'm')}<b>@${p[0]}</b><small>${p[3]} pts</small><span class="blk">${n}</span></div>`; }).join('')}</div></div>`;
const raceHTML = () => `<div class="race"><i class="glw"></i><i class="alt" style="top:88px"></i><i class="alt" style="top:176px"></i>${[0, 1, 2].map(k => { const p = RANK_TOP[k], n = [2, 1, 3][k]; return `<div role="button" tabindex="0" class="racer n${n}" data-a="playerCard:${p[0]}"><span class="badge">${n === 1 ? ic('crown') : ''}<span class="shield">${n}</span></span>${av(p[1], p[2], 'm')}<b>@${p[0]}</b><span class="pts">${p[3]} pts</span></div>`; }).join('')}</div>`;
const meRow = gname => `<div class="rme"><div class="rrow me"><em>12</em>${ST.crew === 'nenhum' ? av('nenhum', 'ela', 's') : av(ST.crew, ST.g, 's')}<span class="tx"><b>Você · @${esc(ST.nick)}</b><small>${gname || 'Truco'} · 342 vitórias</small></span><span class="pts"><b>3.120</b><small>+4</small></span></div></div>`;
SCREENS.ranking = {cls: 'rk', render: () => `<div class="pg-top">${header()}${ptop('Ranking', 'Fecha em 2d 14h · ranking da semana')}</div>
  <div class="scroll"><div class="content">${tabs([['semanal', 'Semanal'], ['geral', 'Geral']], RK.geral, '', 'rkg')}
    <div class="hscroll rkf"><button class="chip big ${RK.gfilter === 'todos' ? 'on' : ''}" data-rkf="todos">${ic('all')}Todos</button>${GAMES.map(x => `<button class="chip big ${RK.gfilter === x.id ? 'on' : ''}" data-rkf="${x.id}">${ic(GAME_ICON[x.id])}${x.name}</button>`).join('')}</div>
    ${raceHTML()}
    <div class="rlist">${RANK_ROWS.map((r, k) => rowHTML(r, k + 4, RK.gfilter === 'todos' ? '' : gameById(RK.gfilter).name)).join('')}</div></div></div>
  ${meRow(RK.gfilter === 'todos' ? '' : gameById(RK.gfilter).name)}`,
click: e => { const t = e.target.closest('[data-rkg],[data-rkf]'); if (!t) return; if (t.dataset.rkg) RK.geral = t.dataset.rkg; else RK.gfilter = t.dataset.rkf; rerender(); }};
SCREENS.rankGame = {cls: 'rk', render: ({game: gid}) => {
  const g = gameById(gid), v = RK.variant && g.variants.includes(RK.variant) ? RK.variant : ST.variant, st = tabStyle(g, v);
  return `<div class="pg-top">${header()}${ptop(`Ranking ${doG(g)} ${g.name}`, 'Fecha em 2d 14h · ranking da semana')}</div>
  <div class="scroll"><div class="content">${g.variants.length > 1 ? tabs(g.variants, v, st, 'rkv') : ''}${tabs([['semana', 'Semana'], ['mes', 'Mês'], ['geral', 'Geral']], RK.period, st, 'rkp')}
    ${podiumHTML(st === 'azul' ? 'var(--game-paulista)' : g.color)}
    <div class="rlist">${RANK_ROWS.map((r, k) => rowHTML(r, k + 4, g.name)).join('')}</div></div></div>${meRow(g.name)}`;
}, click: e => { const t = e.target.closest('[data-rkv],[data-rkp]'); if (!t) return; if (t.dataset.rkv) RK.variant = t.dataset.rkv; else RK.period = t.dataset.rkp; rerender(); }};
