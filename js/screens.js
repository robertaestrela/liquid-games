/* Liquid · navegação, cadastro, Home/Lobby, fila e resultado */
'use strict';
const SCREENS = {}, ACT = {};
let CUR = null, CURP = {}, HIST = [];

function go(name, p = {}, opts = {}) {
  closeNotifs();
  if (!opts.noHist && CUR && CUR !== name) HIST.push([CUR, CURP]);
  if (opts.reset) HIST = [];
  const keep = opts.keepScroll ? ($('#view .scroll') || {}).scrollTop : 0, keepX = opts.keepScroll ? $$('#view .hscroll').map(x => x.scrollLeft) : [];
  CUR = name; CURP = p;
  const hv = $('#view .stage video'); if (hv) { HOME_VT.src = hv.getAttribute('src'); HOME_VT.t = hv.currentTime || 0; }
  const S = SCREENS[name], v = $('#view');
  v.className = 'scr ' + (S.cls || name);
  v.innerHTML = S.render(p);
  $('#scr-game').hidden = true; v.hidden = false;
  if (S.after) S.after(p, v);
  if (keep) { const sc = $('#view .scroll'); if (sc) sc.scrollTop = keep; }
  // fileiras horizontais (jogos, apostas) não voltam ao início quando a tela se redesenha; o jogo escolhido fica à vista
  $$('#view .hscroll').forEach((x, i) => { if (keepX[i]) x.scrollLeft = keepX[i]; const on = x.querySelector('.gb.on'); if (on && (on.offsetLeft < x.scrollLeft || on.offsetLeft + on.offsetWidth > x.scrollLeft + x.clientWidth)) x.scrollLeft = on.offsetLeft - (x.clientWidth - on.offsetWidth) / 2; });
  playViewVideos();
  paintDesk();
}
const rerender = () => go(CUR, CURP, {noHist: true, keepScroll: true});
function back() { const h = HIST.pop(); if (h) go(h[0], h[1], {noHist: true}); else goHome(); }
function goHome() { go(hasSkin() ? 'jogos' : 'lobby', {}, {noHist: true, reset: true}); }
function navTo(k) { HIST = []; go(k === 'jogos' && !hasSkin() ? 'lobby' : k, {}, {noHist: true}); }
function playViewVideos() { $$('#view video').forEach(vd => { vd.muted = true; vd.play().catch(() => {}); }); }
function pauseViewVideos() { $$('#view video').forEach(vd => vd.pause()); }
// usado pelos motores de jogo
function show(id) { if (id === 'game') { closeSheet(); closeNotifs(); pauseViewVideos(); $('#view').hidden = true; $('#scr-game').hidden = false; requestAnimationFrame(() => typeof fitBoard === 'function' && fitBoard()); } }
function refreshChrome() { const h = $('#view .hdr'); if (h) h.outerHTML = header(); paintDesk(); }

document.addEventListener('click', e => {
  const a = e.target.closest('[data-a]');
  if (a && !a.disabled) { e.stopPropagation(); const [k, ...r] = a.dataset.a.split(':'); if (ACT[k]) ACT[k](r.join(':'), a, e); return; }
  const n = e.target.closest('[data-nav]');
  if (n) { navTo(n.dataset.nav); return; }
  const S = SCREENS[CUR];
  if (S && S.click && !$('#view').hidden && $('#view').contains(e.target)) S.click(e);
});

// teclado nos cards clicáveis (div[role=button]): Enter e Espaço clicam
document.addEventListener('keydown', e => { const t = e.target; if ((e.key === 'Enter' || e.key === ' ') && t.getAttribute && t.getAttribute('role') === 'button') { e.preventDefault(); t.click(); } });
Object.assign(ACT, {
  home: () => goHome(),
  back: () => back(),
  closeSheet: () => closeSheet(),
  navstep: d => {
    // setas do item ativo da navbar: trocam o jogo selecionado (Lobby e Jogos)
    if (CUR !== 'lobby' && CUR !== 'jogos') return;
    const ids = GAMES.map(g => g.id), i = ids.indexOf(ST.game);
    ST.game = ids[(i + +d + ids.length) % ids.length]; ST.variant = defVariant(game());
    if (CUR === 'jogos' && hasSkin()) paintHomeGames(); else rerender();
  }
});

/* ======================================================================
   CADASTRO · M01 boas-vindas → M02 celular → M03 código → M04 senha → M05 apelido
   ====================================================================== */
const OB = {mode: 'signup', phone: '(31) 99651-6899', code: '', pass: '', nick: 'betinh4', eye: false, resend: 36};
let obTimer;
const phoneMask = d => { d = d.replace(/\D/g, '').slice(0, 11); if (d.length <= 2) return d.length ? `(${d}` : ''; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };
function obFrame(step, total, title, sub, form, foot) {
  return `<div class="obtop"><button class="back" data-a="obBack" aria-label="Voltar">${svg('i-chev-l-light')}</button><div class="prog"><i style="width:${step / total * 100}%"></i></div><span>${step}/${total}</span></div>
    <div class="obc"><div style="display:flex;flex-direction:column;gap:24px"><div class="obtx"><h1>${title}</h1><p>${sub}</p></div><div class="form">${form}</div></div><div class="obft">${foot}</div></div>`;
}
SCREENS.ob1 = {cls: 'ob1', render: () => `
  <div class="hero"><video src="${A}video/hero-boas-vindas.mp4" autoplay muted loop playsinline preload="auto"></video></div>
  <div class="bottom">
    <div class="copy"><div class="hscroll" style="gap:8px">${GAMES.map(g => gameBlock(g, false, 'data-a="obSignup"')).join('')}</div></div>
    <div class="acts"><div>${btn('Já tenho conta', 'sec', 'm m44', 'data-a="obLogin"')}</div><div>${btn('Criar conta', 'pri', 'm m44', 'data-a="obSignup"')}</div></div>
    <p class="legal">+18 · Jogue com responsabilidade</p>
  </div>`};
SCREENS.ob2 = {cls: 'ob', render: () => {
  const login = OB.mode === 'login';
  return obFrame(1, login ? 2 : 4, login ? 'Bem-vindo de volta' : 'Qual é o seu celular?', login ? 'Entre com o celular da sua conta. A gente manda um código.' : 'A gente manda um código por SMS para confirmar que é você.',
    `<div class="field"><label for="obPhone">Celular</label><div class="box"><input id="obPhone" type="tel" inputmode="numeric" autocomplete="tel" value="${OB.phone}" placeholder="(00) 00000-0000"></div></div>`,
    `${btn('Continuar', 'pri', 'xl', 'data-a="obNext:2" id="obGo"', 'wide')}<p class="note">Ao continuar você concorda com os <a href="#" data-a="toast:Termos de uso · em breve">Termos</a> e a <a href="#" data-a="toast:Política de privacidade · em breve">Política de privacidade</a>.</p>`);
}, after: () => {
  const i = $('#obPhone'), b = $('#obGo');
  const chk = () => { b.disabled = i.value.replace(/\D/g, '').length < 11; };
  i.addEventListener('input', () => { i.value = phoneMask(i.value); OB.phone = i.value; chk(); }); chk();
}};
SCREENS.ob3 = {cls: 'ob', render: () => obFrame(2, OB.mode === 'login' ? 2 : 4, 'Digite o código', `Enviado para ${OB.phone}.`,
  `<label class="otp" id="otp" for="otpIn">${[0, 1, 2, 3, 4, 5].map(k => `<span class="bx" data-k="${k}"></span>`).join('')}</label><input class="otp-in" id="otpIn" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
   <div class="resend"><span id="obRes">Reenviar em 0:${String(OB.resend).padStart(2, '0')}</span>${btn('Editar número', 'sec', 's', 'data-a="obBack"')}</div>`,
  btn('Continuar', 'pri', 'xl', 'data-a="obNext:3" id="obGo" disabled', 'wide')),
after: () => {
  const inp = $('#otpIn');
  const paint = () => { const v = OB.code; $$('#otp .bx').forEach((b, k) => { b.textContent = v[k] || ''; b.classList.toggle('act', k === v.length && v.length < 6); }); $('#obGo').disabled = v.length < 6; };
  inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 6); OB.code = inp.value; paint(); });
  $('#otp').addEventListener('click', () => inp.focus());
  OB.code = ''; paint();
  clearInterval(obTimer); let s = OB.resend;
  obTimer = setInterval(() => { const el = $('#obRes'); if (!el) { clearInterval(obTimer); return; } s--; el.textContent = s > 0 ? `Reenviar em 0:${String(s).padStart(2, '0')}` : 'Não chegou? Reenviar código'; if (s <= 0) { clearInterval(obTimer); el.style.color = 'var(--text-link)'; el.onclick = () => { toast('Código reenviado por SMS'); OB.resend = 36; go('ob3', {}, {noHist: true}); }; } }, 1000);
  // simula o preenchimento automático do SMS (o usuário também pode digitar)
  const code = '482913';
  setTimeout(async () => { for (const ch of code) { if (CUR !== 'ob3' || OB.code.length >= 6 || document.activeElement === inp && inp.value.length) return; OB.code += ch; inp.value = OB.code; paint(); await wait(140); } }, 1100);
}};
const PW_RULES = [[p => p.length >= 8, '8 caracteres ou mais'], [p => /\d/.test(p), 'Pelo menos 1 número'], [p => /[A-Z]/.test(p), 'Pelo menos 1 letra maiúscula']];
SCREENS.ob4 = {cls: 'ob', render: () => obFrame(3, 4, 'Crie sua senha', 'Uma só, forte. A gente mostra o que falta.',
  `<div class="field"><label for="obPass">Senha</label><div class="box"><input id="obPass" type="${OB.eye ? 'text' : 'password'}" autocomplete="new-password" value="${esc(OB.pass)}" placeholder="Sua senha"><button data-a="obEye" aria-label="Mostrar senha">${svg('i-eye')}</button></div></div>
   <div class="checks" id="obChecks"></div>`,
  btn('Continuar', 'pri', 'xl', 'data-a="obNext:4" id="obGo" disabled', 'wide')),
after: () => {
  const i = $('#obPass');
  const paint = () => { const p = i.value; OB.pass = p; $('#obChecks').innerHTML = PW_RULES.map(([f, t]) => `<div class="${f(p) ? 'on' : ''}">${svg('i-check')}${t}</div>`).join(''); $('#obGo').disabled = !PW_RULES.every(([f]) => f(p)); };
  i.addEventListener('input', paint); paint();
}};
const TAKEN = ['dutra77', 'af_07', 'amanda.s', 'rafa_10', 'luana.m', 'admin', 'estrela'];
const nickOk = n => /^[a-z0-9._]{3,16}$/.test(n) && !TAKEN.includes(n);
SCREENS.ob5 = {cls: 'ob', render: () => obFrame(4, 4, 'Como quer ser chamado?', 'É assim que os outros jogadores vão te ver.',
  `<div class="avatar-pick"><button data-a="toast:Depois você escolhe sua skin na Loja" aria-label="Avatar">${av('nenhum', 'ela', 'xl')}</button></div>
   <div class="field"><label for="obNick">Apelido</label><div class="box"><input id="obNick" maxlength="16" autocomplete="nickname" autocapitalize="none" spellcheck="false" value="${esc(OB.nick)}"></div></div>
   <div class="avail" id="obAvail"></div>
   <div class="sugs"><span class="sl">Sugestões:</span>${['betinh4_truco', 'betinho_br', 'capitao.betinh4'].map(s => `<button class="tag neutral" data-a="obSug:${s}">${s}</button>`).join('')}</div>`,
  btn('Começar a jogar', 'pri', 'xl', 'data-a="obDone" id="obGo"', 'wide')),
after: () => {
  const i = $('#obNick');
  const paint = () => { const n = i.value.trim().toLowerCase(); OB.nick = n; const ok = nickOk(n); const a = $('#obAvail'); a.className = 'avail' + (ok ? '' : ' err'); a.innerHTML = ok ? `${svg('i-check')}${esc(n)} está disponível · ${n.length}/16` : n.length < 3 ? 'Use de 3 a 16 caracteres' : TAKEN.includes(n) ? `${esc(n)} já está em uso` : 'Só letras minúsculas, números, ponto e _'; $('#obGo').disabled = !ok; };
  i.addEventListener('input', paint); paint();
}};
Object.assign(ACT, {
  obSignup: () => { OB.mode = 'signup'; go('ob2'); },
  obLogin: () => { OB.mode = 'login'; go('ob2'); },
  obBack: () => back(),
  obEye: () => { OB.eye = !OB.eye; const i = $('#obPass'); if (i) i.type = OB.eye ? 'text' : 'password'; },
  obSug: s => { const i = $('#obNick'); i.value = s; i.dispatchEvent(new Event('input')); },
  obNext: n => { clearInterval(obTimer); if (n === '3' && OB.mode === 'login') { finishOnboarding('betinh4'); return; } go('ob' + (+n + 1)); },
  obDone: () => { if (nickOk(OB.nick)) finishOnboarding(OB.nick); },
  toast: m => toast(m)
});
function finishOnboarding(nick) {
  ST.nick = nick; ST.phone = OB.phone; ST.onboarded = true;
  go('lobby', {}, {noHist: true, reset: true});
  toast(OB.mode === 'login' ? `Que bom te ver de novo, ${nick}!` : `Conta criada · bem-vindo, ${nick}!`);
}

/* ======================================================================
   LOBBY (Home sem skin) · um lobby por jogo: jogos · modos · partida rápida · mesas abertas
   ====================================================================== */
const TABLE_IDS = [104, 96, 98, 86, 89, 90, 91, 92, 93, 94];
const TABLE_VALS = [100, 50, 50, 20, 20, 20, 10, 5, 5, 2];
const TABLE_FILL = [2, 2, 3, 1, 2, 2, 2, 1, 3, 2];
function lobbyTables(g = game(), v = ST.variant) {
  return TABLE_IDS.map((n, i) => {
    let f = formatOf(g.id, v, ST.trucoMode);
    if (g.id === 'truco') f = i === 3 || i === 7 ? '1x1' : '2x2';
    if (g.id === 'poker') f = i % 2 ? 'Mesa de 6' : '1x1';
    const max = seatsOf(f), k = Math.max(1, Math.min(max - 1, max === 4 ? TABLE_FILL[i] : 1 + (i % (max - 1))));
    const players = Array.from({length: k}, (_, j) => PEOPLE[(i + j * 3) % PEOPLE.length]);
    return {id: g.pfx + n, val: TABLE_VALS[i], fmt: f, f, max, players, pts: g.pts(v), game: g.id, locked: !playableSel(g.id, v)};
  });
}
function stakeCarousel() {
  const i = Math.max(0, STAKE_ORDER.indexOf(ST.stake)), sizes = ['S', 'M', 'L', 'M', 'S'];
  return [-2, -1, 0, 1, 2].map((k, j) => { const v = STAKE_ORDER[(i + k + 5) % 5]; return stakePill(STAKES.find(x => x.v === v), sizes[j], k === 0, `data-stake="${v}" aria-label="Entrada ${fmt(v)}"`); }).join('');
}
const fmtLabel = () => formatOf(ST.game, ST.variant, ST.trucoMode);
function soonNote() {
  const g = game();
  if (g.soon) return `A ${g.name} chega em breve. Por enquanto, jogue Truco, Cacheta, Buraco ou Poker.`;
  if (g.id === 'sinuca') return 'A Sinuca brasileira chega em breve. Por enquanto, jogue a Bola 8.';
  return `O ${ST.variant} chega em breve. Por enquanto, jogue Pif-Paf ou Cacheta.`;
}
SCREENS.lobby = {cls: 'lobby', render: () => {
  const g = game(), ok = playableSel(), tbl = lobbyTables();
  const rows = []; for (let i = 0; i < tbl.length; i += 2) rows.push(`<div class="tg-row">${tableCard(tbl[i])}${tbl[i + 1] ? tableCard(tbl[i + 1]) : ''}</div>`);
  return `${header()}<div class="scroll"><div class="content">
    <div class="hscroll games-row">${GAMES.map(x => gameBlock(x, x.id === g.id, `data-game="${x.id}"`)).join('')}</div>
    ${g.soon ? '' : `<div class="modos">${tabs(g.variants, ST.variant, tabStyle(g, ST.variant), 'var')}<button class="bicon" data-a="rankGame" aria-label="Ranking ${doG(g)} ${g.name}">${ic('trophy')}</button></div>`}
    ${g.id === 'truco' ? tabs(['1x1', '2x2'], ST.trucoMode, '', 'tmode', 'aria-label="Formato"') : ''}
    <section class="sec"><div class="trow"><b>Partida rápida · ${fmtLabel()}</b><small>Taxa da mesa 10%</small></div>
      <div class="stakes" id="stakes"><div class="track">${stakeCarousel()}</div></div>
      ${btn(ok ? `Jogar · ${fmt(ST.stake)}` : 'Em breve', 'pri', 'l', `data-a="quickPlay" ${ok ? '' : 'disabled'}`, 'wide')}</section>
    ${ok ? '' : `<p class="soon-note">${soonNote()}</p>`}
    <section class="sec open"><div class="trow"><b>Mesas abertas</b><small>43 mesas</small></div>${rows.join('')}</section>
    ${g.id === 'sinuca' ? '<p class="credit">Mesa 3D: “Pool Table” por EpicRatt (Sketchfab, CC BY 4.0), com cores alteradas.</p>' : ''}
  </div></div>${navbar('lobby')}`;
}, after: () => swipeStakes($('#stakes')),
click: e => {
  const t = e.target.closest('[data-game],[data-var],[data-tmode],[data-stake],[data-table]'); if (!t) return;
  if (t.dataset.game) { ST.game = t.dataset.game; ST.variant = defVariant(game()); }
  else if (t.dataset.var) ST.variant = t.dataset.var;
  else if (t.dataset.tmode) ST.trucoMode = t.dataset.tmode;
  else if (t.dataset.stake) ST.stake = +t.dataset.stake;
  else if (t.dataset.table) { joinTable(t.dataset.table); return; }
  rerender();
}};
function swipeStakes(el) {
  if (!el) return; let x0 = null;
  el.addEventListener('pointerdown', e => { x0 = e.clientX; });
  el.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) < 30) return; const i = STAKE_ORDER.indexOf(ST.stake); ST.stake = STAKE_ORDER[(i + (dx < 0 ? 1 : -1) + 5) % 5]; rerender(); });
}
function joinTable(id) {
  const t = lobbyTables().find(x => x.id === id); if (!t) return;
  if (t.locked) { toast(game().soon ? `Em breve · a ${game().name} chega logo` : `Em breve · o ${ST.variant} ainda não abre`); return; }
  ST.stake = t.val;
  if (ST.game === 'truco') ST.trucoMode = t.f;
  if (ST.game === 'poker') ST.variant = t.f;
  startQueue(id);
}
Object.assign(ACT, {
  quickPlay: () => { if (playableSel()) startQueue(game().pfx + (100 + Math.floor(Math.random() * 60))); },
  rankGame: () => go('rankGame', {game: ST.game})
});

/* ======================================================================
   HOME COM SKIN (aba Jogos) · palco com o vídeo do personagem
   ====================================================================== */
const stageVid = (c = ST.crew, g = ST.g) => `${A}video/stage/${c}_${g}.mp4`;
// imagem de espera = primeiro quadro do próprio vídeo (egames-tools/make_posters.py), nunca a foto de perfil
const stagePoster = (c = ST.crew, g = ST.g) => `${A}video/stage/${c}_${g}.webp`;
SCREENS.jogos = {cls: 'home', render: () => {
  if (!hasSkin()) return SCREENS.lobby.render();
  const g = game();
  return `${header()}<div class="stage"><video src="${stageVid()}" autoplay muted loop playsinline preload="auto" poster="${stagePoster()}"></video><i class="shade"></i>
    <div class="ct"><div class="gl">${GAMES.map(x => gameBlock(x, x.id === g.id, `data-hgame="${x.id}"`)).join('')}</div>
      <div class="acts"><button class="atile" data-a="treino">${ic('joystick')}Treino</button>${btn(`Jogar ${g.name}`, 'pri', 'l', 'data-a="homePlay"')}</div></div></div>
    ${ST.reward && ST.reward.later ? `<span class="hint-pill rw-hint">Recompensa guardada · toque no seu perfil</span>` : ''}
    ${navbar('jogos')}`;
}, after: () => {
  // o vídeo do personagem segue em loop: volta do ponto em que estava
  const v = $('#view .stage video'); if (v && HOME_VT.src === v.getAttribute('src')) v.addEventListener('loadedmetadata', () => { try { v.currentTime = HOME_VT.t % (v.duration || 1); } catch (e) {} }, {once: true});
}, click: e => { const t = e.target.closest('[data-hgame]'); if (!t) return; ST.game = t.dataset.hgame; ST.variant = defVariant(game()); paintHomeGames(); }};
// troca de jogo na Home com skin sem recriar a tela (o vídeo não reinicia)
function paintHomeGames() {
  const gl = $('#view .stage .gl'); if (!gl) return;
  $$('.gb', gl).forEach(b => { const on = b.dataset.hgame === ST.game; b.classList.toggle('on', on); });
  const cta = $('#view [data-a="homePlay"]'); if (cta) cta.textContent = `Jogar ${game().name}`;
  paintDesk();
}
const HOME_VT = {src: '', t: 0};
Object.assign(ACT, {
  homePlay: () => go('lobby', {}, {noHist: true}),
  treino: () => {
    if (!playableSel()) { ST.game = 'truco'; ST.variant = 'Mineiro'; }
    startQueue('Treino');
  }
});

/* ======================================================================
   FILA · procura jogadores (bots) e abre a mesa
   ====================================================================== */
let queueAbort = false;
function matchLabel() {
  const g = game(), f = fmtLabel();
  if (g.id === 'poker') return `Poker · ${f === 'Mesa de 6' ? 'mesa de 6' : '1x1'} · Sit & Go`;
  if (g.id === 'cacheta') return `${ST.variant} · 1x1`;
  if (g.id === 'sinuca') return 'Sinuca Bola 8 · 1x1';
  if (g.id === 'tranca') return 'Tranca · 2x2';
  if (g.id === 'buraco') return `Buraco ${ST.variant} · 2x2`;
  return `Truco ${ST.variant} · ${ST.trucoMode}`;
}
function queuePeople() {
  const me = [ST.nick, ST.crew, ST.g], g = ST.game, f = fmtLabel();
  if (g === 'poker') return PK_PEOPLE.slice(0, f === 'Mesa de 6' ? 6 : 2).map((x, i) => i ? x : me);
  if (g === 'cacheta' || g === 'sinuca' || (g === 'truco' && ST.trucoMode === '1x1')) return [me, ['dutra77', 'comandante', 'ele']];
  return [me, ['amanda.s', 'engenheiro', 'ela'], ['dutra77', 'comandante', 'ele'], ['rafa_10', 'piloto', 'ele']];
}
function queueRules() {
  const g = ST.game, f = fmtLabel(), st = ST.stake;
  if (g === 'poker') return f === 'Mesa de 6' ? `Texas Hold'em com 6 jogadores · 1.500 fichas cada, blinds sobem a cada 5 mãos. 1º leva ${fmt(prizeOf(st, 3.6))} e 2º ${fmt(prizeOf(st))}.` : `Texas Hold'em 1x1 · 1.500 fichas cada, blinds sobem a cada 5 mãos. Quem ficar com todas as fichas leva ${fmt(prizeOf(st))}.`;
  if (g === 'cacheta') return ST.variant === 'Cacheta' ? 'Você contra 1 jogador. A vira define o curinga. Bata com 9 cartas (−1 vida pro outro) ou com 10 (−2). Quem zerar as 5 vidas perde.' : 'Você contra 1 jogador. Forme 3 jogos com 9 cartas e bata. Vence quem bater 2 vezes.';
  if (g === 'sinuca') return 'Bola 8 · você contra 1 jogador. Encaçape as 7 bolas do seu grupo e depois a 8. Arraste para mirar, puxe para dar força e solte para tacar.';
  if (g === 'tranca') return 'Você e amanda.s contra dutra77 e rafa_10. Sequência ou trinca, o 2 é curinga. 3 preto tranca o lixo, 3 vermelho vale 100. Bata com canastra limpa.';
  if (g === 'buraco') return 'Você e amanda.s contra dutra77 e rafa_10. Baixe sequências, faça canastra limpa, pegue o morto e bata. Uma mão, vence quem fizer mais pontos.';
  return ST.trucoMode === '1x1' ? 'Você contra 1 jogador, 3 cartas cada. Vence quem fizer 12 pontos.' : 'Você e sua dupla contra a outra dupla. Vence quem fizer 12 pontos.';
}
async function startQueue(tableId, opts = {}) {
  queueAbort = false;
  const training = tableId === 'Treino';
  ST.training = training; if (training) ST.trainSaldo = ST.saldo;
  if (!training && !ST.series && ST.saldo < ST.stake) { toast('Saldo insuficiente · compre fichas no + do saldo'); return; }
  const people = opts.people || queuePeople(), g = game();
  openSheet(`${sheetHead(GAME_ICON[g.id], '<span id="qTitle">Buscando jogadores…</span>', training ? `Treino contra bots · ${matchLabel()}` : `${matchLabel()} · ${fmt(ST.stake)} · mesa ${tableId}`, false)}
    <button class="xbtn" data-a="queueCancel" aria-label="Cancelar" style="position:absolute;right:12px;top:20px">${svg('i-x')}</button>
    <div class="qslots" id="qSlots" style="grid-template-columns:repeat(${Math.min(people.length, 4)},minmax(0,1fr))">${people.map((p, i) => `<div class="qslot ${i === 0 ? 'filled' : ''}" data-i="${i}">${i === 0 ? hex(p[1], p[2], 'm', 0, true, {add: false}) + `<b>${esc(p[0])}</b>` : '<span class="spin"></span>vaga'}</div>`).join('')}</div>
    <div class="qcount" id="qCount" hidden>3</div>
    <p class="qinfo">${opts.info || queueRules()}</p>`, {dismiss: false, cls: 'g16'});
  for (let i = 1; i < people.length; i++) { await wait(rnd(450, 850)); if (queueAbort) return; const s = $(`#qSlots [data-i="${i}"]`); if (!s) return; s.classList.add('filled'); s.innerHTML = hex(people[i][1], people[i][2], 'm', 0, true) + `<b>${esc(people[i][0])}</b>`; }
  if (queueAbort) return;
  $('#qTitle').textContent = 'Partida encontrada!'; const c = $('#qCount'); c.hidden = false;
  for (const n of [3, 2, 1]) { c.textContent = n; await wait(600); if (queueAbort) return; }
  $('#sheet').innerHTML = '';
  launchGame(tableId);
}
// registro de motores: um jogo novo (ex.: js/sinuca.js) só precisa fazer GAME_START.sinuca = startSinuca e tirar o soon:true em GAMES
const GAME_START = {};
function launchGame(tableId) {
  syncNick();
  const g = ST.game;
  if (GAME_START[g]) GAME_START[g](tableId);
  else if (g === 'poker') startPoker(tableId); else if (g === 'cacheta') startPif(tableId); else if (g === 'buraco' || g === 'tranca') startBuraco(tableId); else startMatch(tableId);
}
ACT.queueCancel = () => { queueAbort = true; closeSheet(); };

/* ======================================================================
   RESULTADO · R01 Vitória / R02 Derrota (minimal, igual para todos os jogos)
   ====================================================================== */
function teamHTML(players, name, sub, right) {
  const avs = `<span class="avs">${players.map(p => hex(p[1], p[2], 's', 0, false)).join('')}</span>`;
  const tx = `<span class="tx"><b>${esc(name)}</b><small>${sub}</small></span>`;
  return `<div class="team ${right ? 'r' : ''}">${right ? tx + avs : avs + tx}</div>`;
}
// r: {win, tie, title, sub, value, caption, ctx, left, right, score, extra, again, againLabel, gameColor}
function showResult(r) {
  if (ST.training) { ST.saldo = ST.trainSaldo; r.value = r.win ? 'Treino concluído' : 'Treino'; r.caption = 'Partida de treino · sem valor'; r.training = true; }
  logHistory(r);
  if (ST.series && !r.seriesFinal) { battleRoundEnd(r); return; }
  if (r.win && !r.training && !r.seriesFinal) bumpReward();
  const glow = r.win ? 'win' : r.tie ? 'tie' : 'loss';
  $('#overlay').innerHTML = `<div class="res2 ${glow}" style="--gc:${r.gameColor || 'var(--game-todos)'}"><i class="rglow"></i>
    <span class="ctx">${r.ctx || ''}</span>
    <div class="rblock">
      <img class="ic big" src="${I(r.win ? 'trophy' : r.tie ? 'medal' : 'defeat')}" alt="">
      <div class="rt"><h1>${r.title || (r.win ? 'Vitória' : r.tie ? 'Empate' : 'Derrota')}</h1>${r.sub ? `<span>${r.sub}</span>` : ''}</div>
      <div class="rv"><b class="${r.win && !r.training ? 'prize' : 'muted'}">${r.value}</b>${r.caption ? `<small>${r.caption}</small>` : ''}</div>
      ${r.left ? `<div class="score">${r.left}<b class="sc">${r.score}</b>${r.right}</div>` : ''}
      ${r.extra || ''}
    </div>
    <div class="ractions">${btn(r.backLabel || 'Voltar ao lobby', 'sec', 'm', 'data-a="resBack"')}${btn(r.againLabel || (ST.training ? 'Treinar de novo' : `Jogar de novo · ${fmt(ST.stake)}`), 'pri', 'm', 'data-a="resAgain"')}</div>
  </div>`;
  RES = r;
  refreshChrome();
}
let RES = null;
Object.assign(ACT, {
  resBack: () => { $('#overlay').innerHTML = ''; const f = RES && RES.onBack; RES = null; endAllGames(); if (f) f(); else leaveGame(); },
  resAgain: () => { $('#overlay').innerHTML = ''; const r = RES; RES = null; endAllGames(); if (r && r.again) r.again(); }
});
function leaveGame() { endAllGames(); ST.series = null; go('lobby', {}, {noHist: true, reset: true}); }

/* ---------- histórico de partidas (alimenta Perfil → Histórico) ---------- */
const HISTORY = [];
function logHistory(r) {
  if (r.training || !r.hist) return;
  HISTORY.unshift({game: ST.game, name: r.hist, vs: r.vs || 'dutra77', win: !!r.win, tie: !!r.tie, delta: r.delta || 0, at: Date.now()});
}
/* ---------- recompensa "Ganhar jogando" (Vença 20 partidas) ---------- */
function bumpReward() {
  ST.rewardsWon = Math.min(20, ST.rewardsWon + 1);
  if (ST.rewardsWon >= 20 && !ST.reward) {
    const pk = ['magia', 'reis', 'nobru'].find(p => !ST.owned[p]);
    if (!pk) return;
    ST.reward = {pack: pk, c: PACKS[pk].def[0], g: pk === 'magia' ? 'ela' : PACKS[pk].def[1]};
    setTimeout(() => showRewardSheet(), 900);
  }
}
