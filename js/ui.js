/* Liquid · componentes do DS em HTML (mesmos nomes e medidas do Figma) */
'use strict';
const ic = (n, cls = '', alt = '') => `<img class="ic ${cls}" src="${I(n)}" alt="${alt}">`;
const svg = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const GAME_HEX = {cacheta: '#8752f2', truco: '#e5484d', tranca: '#2cc160', buraco: '#1f9a4a', poker: '#0fa968', sinuca: '#2fa35a', todos: '#3bb0d4'};
const GAME_ICON = {cacheta: 'cacheta', truco: 'truco', tranca: 'tranca', buraco: 'buraco', poker: 'poker', sinuca: 'sinuca', todos: 'all'};

// header-avatar · hexágono com a cor da tripulação. Aceita tamanho em px (compatível com os motores) ou xs/s/m/l
const HAV_SIZE = {xs: [24, 26], s: [32, 35], m: [44, 48], l: [56, 60]};
function hex(crew, g, w = 'm', h, dot = true, opts = {}) {
  if (typeof w === 'string') [w, h] = HAV_SIZE[w];
  if (!h) h = Math.round(w * 48 / 44);
  if (crew === 'nenhum' || !crew) return `<span class="hav empty" style="--w:${w}px;--h:${w}px"><svg class="av0" viewBox="0 0 40 40" fill="none" stroke="#eeeef0" stroke-width="2" aria-hidden="true"><circle cx="20" cy="20" r="18.5"/><circle cx="20" cy="15.5" r="6"/><path d="M8.6 32.4c2.3-4.5 6.5-7.4 11.4-7.4s9.1 2.9 11.4 7.4"/></svg>${opts.add ? `<span class="add">${svg('i-plus')}</span>` : ''}</span>`;
  return `<span class="hav" style="--w:${w}px;--h:${h}px;--cc:${crewColor(crew, g)}"><i class="gl"></i><span class="hx"><img src="${photo(crew, g)}" alt=""></span>${dot ? '<i class="on"></i>' : ''}</span>`;
}
// avatar-estrela-games · círculo com foto (Loja, sala, perfil)
function av(crew, g, size = 'm', opts = {}) {
  const lvl = opts.level ? `<span class="lvl">${opts.level}</span>` : '';
  if (crew === 'nenhum' || !crew) return `<span class="av empty ${size}"><svg class="ph" viewBox="0 0 448 512"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"/></svg>${opts.add ? `<span class="addb">${svg('i-plus')}</span>` : ''}${lvl}</span>`;
  return `<span class="av ${size}"><img src="${photo(crew, g)}" alt="">${lvl}</span>`;
}

function header() {
  return `<header class="hdr">
    <div class="side"><button class="logo" data-a="home" aria-label="Início"><img src="${A}ui/logo_icon.webp" alt="Liquid"></button>
      <button class="cpill" data-a="wallet" aria-label="Saldo">${ic('banknote')}<span class="t"><small>Saldo</small><b>${fmt(ST.saldo)}</b></span><span class="plus">${svg('i-plus')}</span></button></div>
    <button data-a="${hasSkin() ? 'profile' : 'loja'}" aria-label="${hasSkin() ? 'Perfil' : 'Escolher skin na Loja'}">${hex(ST.crew, ST.g, 'm', 0, true, {add: true})}</button>
    <div class="side" style="justify-content:flex-end"><button class="cpill bonus" data-a="wallet" aria-label="Bônus">${ic('gift')}<span class="t"><small>Bônus</small><b>${fmt2(ST.bonus)}</b></span></button>
      <button class="hbell" data-a="notifs" aria-label="Notificações">${ic('bell')}<i ${ST.unread ? '' : 'hidden'}></i></button></div>
  </header>`;
}

const NAV_ITEMS = [['jogos', 'gamepad', 'Jogos'], ['lobby', 'swords', 'Lobby'], ['chat', 'chat', 'Chat'], ['loja', 'shop', 'Loja'], ['batalhas', 'fire', 'Batalhas']];
function navbar(active) {
  const items = NAV_ITEMS.filter(([k]) => k !== 'jogos' || hasSkin());
  return `<nav class="nav" aria-label="Navegação">${items.map(([k, i, l]) => k === active
    ? `<button class="on" data-nav="${k}" aria-current="page">${ic(i)}<span class="lr"><i data-a="navstep:-1">${svg('i-chev-l')}</i><span>${l}</span><i data-a="navstep:1">${svg('i-chev-r')}</i></span></button>`
    : `<button data-nav="${k}">${ic(i)}<span>${l}</span></button>`).join('')}</nav>`;
}

function gameBlock(g, on, attr = '', label) {
  const gid = typeof g === 'string' ? g : g.id, G = gameById(gid);
  const color = gid === 'todos' ? 'var(--game-todos)' : G.color;
  return `<div role="button" tabindex="0" class="gb ${on ? 'on' : ''}" style="--gc:${color};--gs:${GAME_HEX[gid]}3d" ${attr}>${ic(GAME_ICON[gid])}${label || (G ? G.name : 'Todos')}${G && G.soon ? `<img class="lk" src="${I('lock')}" alt="Em breve">` : ''}</div>`;
}

function tabs(items, sel, style = '', attr = 'tab', extra = '') {
  return `<div class="tabs ${style ? 't-' + style : ''}" role="tablist" ${extra}>${items.map((it, i) => {
    const [val, label, note] = Array.isArray(it) ? it : [it, it];
    return `<button role="tab" class="${val === sel ? 'on' : ''}" aria-selected="${val === sel}" data-${attr}="${esc(val)}">${label}${note ? `<span class="lk">· ${note}</span>` : ''}</button>`;
  }).join('')}</div>`;
}

const btn = (label, type = 'pri', size = 'l', attr = '', cls = '') => `<button class="btn ${type} ${size} ${cls}" ${attr}>${label}</button>`;
const tag = (t, type = 'neutral') => `<span class="tag ${type}">${t}</span>`;
const stitle = (t, sub, action) => `<div class="stitle"><div class="tx"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>${action || ''}</div>`;
function ptop(title, sub, back = 'back', action = '') {
  return `<div class="ptop"><div class="l"><button class="back" data-a="${back}" aria-label="Voltar">${svg('i-chev-l-light')}</button><div class="tx"><b>${title}</b>${sub ? `<small>${sub.live ? '<i></i>' : ''}${sub.text || sub}</small>` : ''}</div></div>${action}</div>`;
}

// stake-pill · tamanhos S 68 / M 88 / L 112
function stakePill(s, size, on, attr = '', opts = {}) {
  const pr = opts.prize != null ? fmt(opts.prize) : fmt(prizeOf(s.v));
  return `<div role="button" tabindex="0" class="sp ${size} ${s.tag ? 'ini' : ''} ${on ? 'on' : ''}" ${attr}>
    <span class="st"><span class="v">${ic('coins')}${opts.money ? fmt(s.v) : s.v.toLocaleString('pt-BR')}</span>${s.tag ? `<span class="tg">${s.tag}</span>` : ''}${s.q && size !== 'S' ? `<span class="q">${s.q}</span>` : ''}</span>
    ${size !== 'S' ? `<span class="ft"><small>Prêmio</small><b>${pr}</b></span>` : ''}</div>`;
}

// table-glass · mesa aberta (Cartas · cápsula / Sinuca · retângulo)
function tableCard(t) {
  const pool = t.game === 'sinuca';
  const seats = t.players.map(p => `<span style="--cc:${crewColor(p[1], p[2])}"><img src="${photo(p[1], p[2])}" alt=""></span>`).join('');
  return `<div role="button" tabindex="0" class="tgl ${pool ? 'pool' : ''} ${t.locked ? 'locked' : ''}" data-table="${t.id}">
    <span class="felt">${pool ? '<i class="pk" style="left:4px;top:4px"></i><i class="pk" style="left:calc(50% - 5px);top:2px"></i><i class="pk" style="right:4px;top:4px"></i><i class="pk" style="left:4px;bottom:4px"></i><i class="pk" style="left:calc(50% - 5px);bottom:2px"></i><i class="pk" style="right:4px;bottom:4px"></i>' : ''}
      <span class="vals"><b>${fmt(t.val)}</b><small>${t.pts}</small><span class="seats"><span class="pl">${seats}</span><em>${t.players.length}/${t.max}</em></span></span></span>
    <span class="tab">${t.id} · ${t.fmt}</span>${ic(GAME_ICON[t.game], 'deck')}</div>`;
}

/* ---------- bottom sheet ---------- */
let sheetClose = null;
function openSheet(inner, opts = {}) {
  $('#sheet').innerHTML = `<div class="veil" id="veil"><div class="bsheet ${opts.cls || ''}" role="dialog" aria-modal="true">${opts.handle === false ? '' : '<span class="handle"></span>'}${inner}</div></div>`;
  sheetClose = opts.onClose || null;
  $('#veil').addEventListener('click', e => { if (e.target.id === 'veil' && opts.dismiss !== false) closeSheet(); });
}
function closeSheet() { const v = $('#veil'); if (!v) return; const f = sheetClose; sheetClose = null; v.style.transition = 'opacity .18s'; v.style.opacity = '0'; setTimeout(() => { if ($('#veil') === v) $('#sheet').innerHTML = ''; }, 180); if (f) f(); }
const sheetHead = (icon, title, sub, close = true, subCls = '') => `<div class="sh-h">${ic(icon)}<div class="tx"><b>${title}</b>${sub ? `<small class="${subCls}">${sub}</small>` : ''}</div>${close ? `<button class="xbtn" data-a="closeSheet" aria-label="Fechar">${svg('i-x')}</button>` : ''}</div>`;
