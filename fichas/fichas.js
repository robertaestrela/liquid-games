/* Liquid · Fichas: página fora do app, no formato de fichasv2.cacheta.com (Figma: página Wallet, W01–W09 / DW01–DW09).
   Saldo, comprar e sacar fichas com Pix, histórico, limites e dados. O app abre esta página pelo + do saldo (mesma aba)
   e deixa o saldo em sessionStorage (eg.fichas). "Voltar para o jogo" devolve o saldo novo e as compras/saques
   (eg.fichas.events) e o app reabre onde estava (../?resume). Sem sessionStorage, a página abre com os dados de exemplo. */
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const A = '../assets/', I = n => `${A}icons/${n}.webp`;
const ic = (n, cls = '') => `<img class="ic ${cls}" src="${I(n)}" alt="">`;
const svg = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const num = v => (+v).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const fmt2 = v => 'R$ ' + num(v);
const fmt = v => 'R$ ' + (+v).toLocaleString('pt-BR', {minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2});
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const parse = s => parseFloat(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
const btn = (label, type = 'pri', size = 'l', attr = '', cls = '') => `<button class="btn ${type} ${size} ${cls}" ${attr}>${label}</button>`;
const tag = (t, type) => `<span class="tag ${type}">${t}</span>`;
const SS = {
  get: k => { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- estado (o que o app mandou + o que acontece aqui) ---------- */
const CAP = 15000, MAX_OUT = 4;
const F = Object.assign({
  saldo: 1250, bonus: 35, nick: 'betinh4', crew: 'nenhum', g: 'ela', verified: false, events: [],
  today: {compras: 0, sacado: 0, saques: 0},
  tx: [
    {at: '27/10/2026 14:32', t: 'Compra', key: '—', id: '01a163bb-136c-38f7-6d71-ed73d856c2be', v: 50},
    {at: '26/10/2026 21:10', t: 'Saque', key: '123.***.***-00', id: '7c2e90d1-4b8a-41f2-9a3e-5f61c8d0b7a4', v: -100},
    {at: '22/10/2026 10:09', t: 'Compra', key: '—', id: 'b4f02a77-9e13-4c5d-8a20-1d6e3f9c0b55', v: 20},
    {at: '15/10/2026 19:47', t: 'Compra', key: '—', id: '9d3c51e0-2f7a-4b19-8c66-0ea4b7d21f38', v: 50}
  ]
}, SS.get('eg.fichas') || {});
const save = () => SS.set('eg.fichas', F);
const CREW = {engenheiro: 'var(--crew-engenheiro)', comandante: 'var(--crew-comandante)', piloto: 'var(--crew-piloto)', navegador: 'var(--crew-navegador)', explorador: 'var(--crew-explorador)', bar: 'var(--crew-bar)', reis: 'var(--crew-reis)'};
const crewColor = () => F.crew === 'gamer' ? (F.g === 'ela' ? 'var(--crew-inhui)' : 'var(--crew-nobru)') : CREW[F.crew] || 'var(--border-strong)';
const photo = () => !F.crew || F.crew === 'nenhum' ? A + 'ui/avatar_empty.webp' : `${A}photo/${F.crew}_${F.g}.webp`;
const hav = (w, h) => `<span class="hav" style="--w:${w}px;--h:${h}px;--cc:${crewColor()}"><i class="gl"></i><span class="hx"><img src="${photo()}" alt=""></span><i class="on"></i></span>`;
(function hexPath() {
  const pts = [[.5, 0], [1, .25], [1, .75], [.5, 1], [0, .75], [0, .25]], t = .2;
  let d = '';
  pts.forEach((p, i) => {
    const a = pts[(i + 5) % 6], b = pts[(i + 1) % 6];
    const s = [p[0] + (a[0] - p[0]) * t, p[1] + (a[1] - p[1]) * t], e = [p[0] + (b[0] - p[0]) * t, p[1] + (b[1] - p[1]) * t];
    d += (i ? 'L' : 'M') + s.map(n => n.toFixed(4)).join(' ') + 'Q' + p.join(' ') + ' ' + e.map(n => n.toFixed(4)).join(' ');
  });
  document.getElementById('hexpath').setAttribute('d', d + 'Z');
})();

let toastT;
function toast(msg, ms = 2200) { $('#toastTxt').textContent = msg; $('#toast').classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => $('#toast').classList.remove('show'), ms); }
const two = n => String(n).padStart(2, '0');
const hhmm = (d = new Date()) => `${two(d.getHours())}:${two(d.getMinutes())}`;
// os limites renovam à meia-noite de Brasília (UTC−3)
function renewIn() {
  const b = new Date(Date.now() - 3 * 3600e3), left = 86400 - (b.getUTCHours() * 3600 + b.getUTCMinutes() * 60 + b.getUTCSeconds());
  return `${two(Math.floor(left / 3600))}:${two(Math.floor(left / 60) % 60)}:${two(left % 60)}`;
}
setInterval(() => $$('[data-renew]').forEach(e => { e.textContent = renewIn(); }), 1000);

/* ---------- navegação ---------- */
const PAGES = {fichas: 'Fichas', historico: 'Histórico', limites: 'Limites', dados: 'Dados'};
const page = () => PAGES[location.hash.slice(1)] ? location.hash.slice(1) : 'fichas';
function back(to) { SS.set('eg.back', {to: to || null}); save(); location.href = '../?resume'; }

function side() {
  const p = page(), it = (k, i, l) => `<a class="it ${k === p ? 'on' : ''}" href="#${k}" ${k === p ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`;
  return `<div class="brand"><img src="${A}ui/logo_icon.webp" alt=""><span><b>Liquid</b><small>Fichas</small></span></div>
    <nav>${it('fichas', 'coins', 'Fichas')}${it('historico', 'timer', 'Histórico')}<span class="lb">Conta</span>${it('limites', 'lock', 'Meus limites')}${it('dados', 'user', 'Meus dados')}</nav>
    <div class="sft">${btn('Voltar para o jogo', 'sec', 'm', 'data-a="back"', 'wide')}<small>+18 · Jogue com responsabilidade</small></div>`;
}
function mtop() {
  const p = page();
  return `<div class="row"><button class="bk" data-a="back" aria-label="Voltar para o jogo">${svg('i-chev-l-light')}</button>
      <div class="brand"><img src="${A}ui/logo_icon.webp" alt=""><span><b>Liquid</b><small>Fichas</small></span></div>${hav(32, 35)}</div>
    <div class="tabs" role="tablist">${Object.entries(PAGES).map(([k, l]) => `<button role="tab" class="${k === p ? 'on' : ''}" aria-selected="${k === p}" data-go="${k}">${l}</button>`).join('')}</div>`;
}
const me = () => `<div class="me">${hav(32, 35)}<span><b>${esc(F.nick)}</b><small>ID 529024054</small></span></div>`;
function ptitle(t, sub, mob) {
  const right = page() === 'fichas' ? me() : `<div class="avail"><small>Disponível para saque</small><b>${fmt2(F.saldo)}</b></div>${btn('Comprar fichas', 'pri', 'm', 'data-a="buy"')}${me()}`;
  return `<div class="ptitle ${mob ? 'mob' : ''}"><div class="tx"><h1>${t}</h1><small>${sub}</small></div><div class="r">${right}</div></div>`;
}

/* ---------- peças ---------- */
function limitsCard(title) {
  const L = F.today, row = (l, v, p) => `<div class="lrow"><span>${l}</span><b>${v}</b></div><i class="lbar"><i style="width:${Math.min(100, p * 100)}%"></i></i>`;
  return `<section class="card lim"><div class="lh"><b>${title}</b><span class="renew">${ic('timer')}<small>Renova em</small><b data-renew>${renewIn()}</b></span></div>
    ${row('Valor sacado', `${fmt2(L.sacado)} de ${fmt2(CAP)}`, L.sacado / CAP)}${row('Saques realizados', `${L.saques} de ${MAX_OUT}`, L.saques / MAX_OUT)}
    <div class="lrow"><span>Compras</span><b>${fmt2(L.compras)} · sem limite</b></div></section>`;
}
const shortId = id => `${id.slice(0, 8)}...${id.slice(-4)}`;
function txList(list) {
  const val = t => `${t.v > 0 ? '+' : '−'} ${fmt2(Math.abs(t.v))}`;
  return `<table class="tbl"><thead><tr><th>Data e hora</th><th>Tipo</th><th>Chave Pix</th><th>ID da transação</th><th>Valor</th></tr></thead>
      <tbody>${list.map(t => `<tr><td>${t.at}</td><td>${tag(t.t, t.v > 0 ? 'success' : 'neutral')}</td><td class="mu">${t.key}</td><td class="id">${t.id}</td><td class="v ${t.v > 0 ? 'ok' : ''}">${val(t)}</td></tr>`).join('')}</tbody></table>
    <div class="tlist">${list.map(t => `<div class="trow"><span class="l">${tag(t.t, t.v > 0 ? 'success' : 'neutral')}<small>${t.at.slice(0, 5)} · ${t.at.slice(11)}</small></span>
      <span class="r"><b class="${t.v > 0 ? 'ok' : ''}">${val(t)}</b><small>Pix · ${t.v > 0 ? shortId(t.id) : t.key}</small></span></div>`).join('')}</div>`;
}

/* ---------- páginas ---------- */
let HF = 'todos', Q = '';
const VIEW = {
  fichas: () => {
    const now = hhmm();
    return `${ptitle('Fichas', `Saldo atualizado às ${now}`)}
    <div class="grid">
      <section class="card bal"><small class="lbl"><span class="od">Disponível para saque</span><span class="om">Disponível para saque · atualizado às ${now}</span></small>
        <div class="amt">${ic('coins')}<b>${fmt2(F.saldo)}</b></div>
        <div class="chips"><span class="chip"><small>Total de fichas</small><b>${num(F.saldo + F.bonus)}</b></span><span class="chip"><small>Bônus</small><b class="prize">${num(F.bonus)}</b></span></div>
        <small class="bnote">Fichas de bônus não podem ser sacadas.</small>
        <div class="acts">${btn('Comprar fichas', 'pri', 'l', 'data-a="buy"')}${btn('Sacar', 'sec', 'l', 'data-a="out"')}</div></section>
      ${limitsCard('Limites de hoje')}
      <section class="banner"><img src="${A}art/pack-nobru.webp" alt=""><div class="gl"><span><b>Rakin e Bárbara Passos chegaram</b><small>Pacote novo na Loja<span class="od"> do Liquid</span></small></span>${btn('Ver na Loja', 'sec', 's', 'data-a="back:loja"')}</div></section>
      <section class="card help">${ic('headset')}<span class="tx"><small class="k">Suporte</small><b>Precisa de ajuda?</b><span>Dúvidas sobre compra, saque ou limites?<span class="od"> Fale com a gente pelo chat.</span></span></span>${btn('Abrir chat', 'sec', 's', 'data-a="help"')}</section>
      <section class="card txs"><div class="th"><b>Últimas transações</b><a href="#historico"><span class="od">Ver histórico completo</span><span class="om">Ver tudo</span> →</a></div>${txList(F.tx.slice(0, 3))}</section>
    </div>`;
  },
  historico: () => {
    const all = F.tx, nc = all.filter(t => t.v > 0).length, ns = all.length - nc;
    const list = all.filter(t => (HF === 'todos' || (HF === 'compras' ? t.v > 0 : t.v < 0)) && (!Q || t.id.toLowerCase().includes(Q.toLowerCase())));
    const got = all.filter(t => t.v > 0).reduce((s, t) => s + t.v, 0), out = all.filter(t => t.v < 0).reduce((s, t) => s - t.v, 0);
    return `${ptitle('Histórico de transações', 'Compras e saques das suas fichas')}
    <section class="card hist">
      <div class="hbar"><div class="tabs" role="tablist">${[['todos', `Todos · ${all.length}`], ['compras', `Compras · ${nc}`], ['saques', `Saques · ${ns}`]].map(([k, l]) => `<button role="tab" class="${k === HF ? 'on' : ''}" aria-selected="${k === HF}" data-hf="${k}">${l}</button>`).join('')}</div>
        <div class="flt"><button class="fbtn" data-a="period">${ic('calendar')}<span class="od">Últimos 30 dias</span><span class="om">30 dias</span></button>
          <label class="search">${ic('key')}<input id="q" placeholder="Buscar pelo ID${innerWidth >= 1024 ? ' da transação' : ''}" value="${esc(Q)}" autocomplete="off"></label></div></div>
      <div class="sum"><div><small>Comprado<span class="od"> no período</span></small><b class="ok">${fmt2(got)}</b></div><div><small>Sacado<span class="od"> no período</span></small><b>${fmt2(out)}</b></div><div><small>Transações</small><b>${all.length}</b></div></div>
      <div class="hl">${list.length ? txList(list) : '<p class="empty">Nenhuma transação com esse filtro.</p>'}
      <small class="pag">1–${list.length} de ${list.length}<span class="od"> · Página 1 de 1</span> · horário de Brasília</small></div>
    </section>`;
  },
  limites: () => `${ptitle('Meus limites', 'Os limites diários renovam à meia-noite, horário de Brasília.', true)}
    <div class="col">${limitsCard('Hoje')}<p class="tip">Precisa de um limite maior de saque? Fale com o suporte pelo chat.</p></div>`,
  dados: () => `${ptitle('Meus dados', 'Dados cadastrados na sua conta', true)}
    <div class="col"><section class="card dados">${[['Apelido', esc(F.nick)], ['ID', '529024054'], ['Nome', 'BE**** SI**** ****'], ['CPF', '123.***.***-00'], ['E-mail', 'b*****4@gmail.com'], ['Celular', '+55 31 9****-6899']].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</section>
    <p class="tip">Para alterar seus dados, fale com o suporte pelo chat.</p></div>`
};
const foot = () => `<span class="lk"><a href="#" data-a="terms">Termos &amp; Condições</a><a href="#" data-a="terms">Política de Privacidade</a></span><span class="pix">${svg('i-pix')}Pagamentos via Pix<span class="om"> · +18</span> · Liquid © 2026</span>`;

function render() {
  $('#side').innerHTML = side(); $('#mtop').innerHTML = mtop();
  $('#page').innerHTML = VIEW[page()](); $('#foot').innerHTML = foot();
}

/* ---------- comprar e sacar (drawer à direita no computador, tela cheia no celular) ---------- */
let D = null, pixT, expT;
const PIX = '00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef0123456789';
const QR = (() => { let s = ''; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { const f = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13); const on = f ? (x % 6 === 0 || y % 6 === 0 || (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5) || (x > 13 && (x - 14) % 6 === 0)) : ((x * 7 + y * 13 + x * y) % 3 === 0); if (on) s += `<rect x="${x}" y="${y}" width="1" height="1"/>`; } return `<svg viewBox="0 0 21 21" fill="#111113">${s}</svg>`; })();
const balMini = () => `<div class="bmini">${ic('coins')}<span class="a"><small>Saldo disponível</small><b>${fmt2(F.saldo)}</b></span><span class="b"><small>Bônus</small><b>${fmt2(F.bonus)}</b></span></div>`;
function steps(names, at) {
  return `<ol class="steps">${names.map((n, i) => `<li class="${i < at ? 'done' : i === at ? 'on' : ''}"><i>${i < at ? svg('i-check') : i + 1}</i><span>${n}</span></li>`).join('<b></b>')}</ol>`;
}
const BODY = {
  buy0: () => `${balMini()}<p class="q">Quanto você quer comprar? 1 ficha = R$ 1</p>
    <div class="amts">${[20, 50, 100, 200].map(v => `<button class="${D.amt === v ? 'on' : ''}" data-a="amt:${v}">${fmt(v)}</button>`).join('')}</div>
    <div class="field"><label for="amtIn">Outro valor</label><div class="box"><input id="amtIn" inputmode="decimal" value="${fmt2(D.amt)}"></div></div>
    <div class="info">${svg('i-pix', 'pix')}<span>Pix · cai na hora · sem taxa · mínimo R$ 10</span></div>
    ${btn(`Gerar Pix · ${fmt(D.amt)}`, 'pri', 'l', 'data-a="genPix"', 'wide')}
    <p class="note">Ao comprar, você concorda com os Termos &amp; Condições e a Política de Privacidade.</p>
    <p class="note">A compra de fichas só é permitida com uma conta bancária do mesmo CPF cadastrado.</p>`,
  buy1: () => `<div class="qr">${QR}</div><p class="exp">${ic('timer')}<span>Expira em <b id="pixExp">29:58</b> · ${fmt2(D.amt)}</span></p>
    <div class="code"><span>${PIX}</span><button class="xbtn" data-a="copy" aria-label="Copiar código Pix">${svg('i-copy')}</button></div>
    ${btn(`${svg('i-copy', 'bi')}Copiar código Pix`, 'pri', 'l', 'data-a="copy"', 'wide')}
    <p class="cap">Assim que o pagamento cair, as fichas entram na sua conta automaticamente.</p>`,
  buy2: () => `<div class="fin"><span class="okc">${svg('i-check')}</span><h2>Fichas compradas!</h2><b class="big ok">${ic('coins')}+ ${fmt2(D.amt)}</b>
    <p>Já está no seu saldo: ${fmt2(F.saldo)}. É só voltar pro jogo.</p>${btn(`${ic('swords')}Voltar a jogar`, 'pri', 'l', 'data-a="back"', 'wide')}</div>`,
  out0: () => `<div class="idv">${ic('verified')}<h2>Verifique sua identidade</h2><p>Só no primeiro saque, leva 1 minuto. É exigência legal e protege o seu dinheiro.</p></div>
    <div class="field"><label for="cpf">CPF</label><div class="box"><input id="cpf" value="123.456.789-00" inputmode="numeric"></div></div>
    <div class="field"><label for="nasc">Data de nascimento</label><div class="box"><input id="nasc" value="14/03/1998" inputmode="numeric"></div></div>
    ${btn('Verificar e sacar', 'pri', 'l', 'data-a="verify"', 'wide')}${btn('Fazer depois', 'sec', 'l', 'data-a="close"', 'wide')}
    <p class="note">O saque só é permitido para uma conta bancária do mesmo CPF cadastrado.</p>`,
  out1: () => `${balMini()}
    <div class="field"><label>Chave Pix</label><div class="box"><input value="CPF · 123.456.789-00" readonly></div></div>
    <div class="field"><label for="outIn">Valor do saque</label><div class="box"><input id="outIn" inputmode="decimal" value="${fmt2(D.out)}"></div></div>
    <div class="info">${svg('i-pix', 'pix ok')}<span>Saque mínimo R$ 20 · cai em até 1 h · sem taxa · bônus não pode ser sacado</span></div>
    ${btn(`Sacar ${fmt(D.out)}`, 'pri', 'l', 'data-a="doOut"', 'wide')}
    <p class="note">O saque só é permitido para uma conta bancária do mesmo CPF cadastrado.</p>`,
  out2: () => `<div class="fin"><span class="okc">${svg('i-check')}</span><h2>Saque solicitado!</h2><b class="big">− ${fmt2(D.out)}</b>
    <p>Cai na sua conta Pix em até 1 h. Saldo agora: ${fmt2(F.saldo)}.</p>${btn(`${ic('swords')}Voltar a jogar`, 'pri', 'l', 'data-a="back"', 'wide')}${btn('Ver histórico', 'sec', 'l', 'data-a="hist"', 'wide')}</div>`
};
function drawer() {
  clearTimeout(pixT); clearInterval(expT);
  if (!D) { $('#veil').hidden = true; document.body.classList.remove('lock'); return; }
  const buy = D.kind === 'buy';
  $('#drawer').innerHTML = `<div class="dh"><b>${buy ? 'Comprar fichas' : 'Sacar fichas'}</b><button class="xbtn" data-a="close" aria-label="Fechar">${svg('i-x')}</button></div>
    ${steps(buy ? ['Valor', 'Pagamento', 'Confirmação'] : ['Identidade', 'Valor', 'Pronto'], D.step)}<div class="db">${BODY[D.kind + D.step]()}</div>`;
  $('#veil').hidden = false; document.body.classList.add('lock');
  if (buy && D.step === 1) {
    let s = 29 * 60 + 58; expT = setInterval(() => { s--; const e = $('#pixExp'); if (e) e.textContent = `${two(Math.floor(s / 60))}:${two(s % 60)}`; }, 1000);
    pixT = setTimeout(paid, 6000);
  }
  const ai = $('#amtIn'); if (ai) ai.onchange = () => { const v = parse(ai.value); if (v > 0) { D.amt = v; drawer(); } };
  const oi = $('#outIn'); if (oi) oi.onchange = () => { const v = parse(oi.value); if (v > 0) { D.out = v; drawer(); } };
}
function paid() {
  if (!D || D.kind !== 'buy' || D.step !== 1) return;
  F.saldo = +(F.saldo + D.amt).toFixed(2); F.today.compras += D.amt;
  F.tx.unshift({at: stamp(), t: 'Compra', key: '—', id: uid(), v: D.amt}); F.events.push({t: 'compra', v: D.amt});
  save(); D.step = 2; drawer(); render();
}
const stamp = (d = new Date()) => `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${hhmm(d)}`;
const uid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));

/* ---------- ações ---------- */
const ACT = {
  back: to => back(to),
  buy: () => { D = {kind: 'buy', step: 0, amt: 50}; drawer(); },
  out: () => { D = {kind: 'out', step: F.verified ? 1 : 0, out: Math.min(100, Math.floor(F.saldo))}; drawer(); },
  close: () => { D = null; drawer(); },
  amt: v => { D.amt = +v; drawer(); },
  genPix: () => { if (D.amt < 10) { toast('Compra mínima R$ 10'); return; } D.step = 1; drawer(); },
  copy: () => { try { navigator.clipboard.writeText(PIX).catch(() => {}); } catch (e) {} toast('Código Pix copiado · simulando o pagamento…'); clearTimeout(pixT); pixT = setTimeout(paid, 1600); },
  verify: () => { F.verified = true; save(); D.step = 1; drawer(); toast('Identidade verificada'); },
  doOut: () => {
    const v = D.out;
    if (v < 20) { toast('Saque mínimo R$ 20'); return; }
    if (v > F.saldo) { toast('Valor maior que o seu saldo disponível'); return; }
    if (F.today.saques >= MAX_OUT) { toast('Você já fez 4 saques hoje · renova à meia-noite'); return; }
    if (F.today.sacado + v > CAP) { toast('Passa do limite de R$ 15.000 por dia'); return; }
    F.saldo = +(F.saldo - v).toFixed(2); F.today.sacado += v; F.today.saques++;
    F.tx.unshift({at: stamp(), t: 'Saque', key: '123.***.***-00', id: uid(), v: -v}); F.events.push({t: 'saque', v});
    save(); D.step = 2; drawer(); render();
  },
  hist: () => { D = null; drawer(); HF = 'todos'; Q = ''; location.hash = 'historico'; },
  help: () => toast('Suporte pelo chat · em breve no protótipo'),
  period: () => toast('Outros períodos · em breve no protótipo'),
  terms: () => toast('Termos e privacidade · em breve no protótipo')
};
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { location.hash = g.dataset.go; return; }
  const h = e.target.closest('[data-hf]'); if (h) { HF = h.dataset.hf; render(); return; }
  const a = e.target.closest('[data-a]');
  if (a) { e.preventDefault(); const [k, ...r] = a.dataset.a.split(':'); if (ACT[k]) ACT[k](r.join(':')); return; }
  if (e.target.id === 'veil') ACT.close();
});
document.addEventListener('input', e => {
  if (e.target.id !== 'q') return;
  Q = e.target.value; const pos = e.target.selectionStart; render();
  const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && D) ACT.close(); });
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
render();
window.__fx = {F, ACT, page};
