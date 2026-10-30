/* Liquid · núcleo: helpers, dados e estado. Scripts clássicos compartilham o escopo global (sem build). */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const A = 'assets/';
const I = n => `${A}icons/${n}.webp`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const fmt = v => 'R$ ' + (+v).toLocaleString('pt-BR', {minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2});
const fmt2 = v => 'R$ ' + (+v).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const prizeOf = (stake, mult = 1.8) => +(stake * mult).toFixed(2);

/* ---------- personagens ---------- */
const CREW = {engenheiro: 'var(--crew-engenheiro)', comandante: 'var(--crew-comandante)', piloto: 'var(--crew-piloto)', navegador: 'var(--crew-navegador)', explorador: 'var(--crew-explorador)', bar: 'var(--crew-bar)', reis: 'var(--crew-reis)', gamer: 'var(--crew-nobru)', barbara: 'var(--crew-barbara)'};
const crewColor = (c, g) => c === 'gamer' ? (g === 'ela' ? 'var(--crew-inhui)' : 'var(--crew-nobru)') : CREW[c] || 'var(--border-strong)';
const CREW_LABEL = {engenheiro: ['Engenheiro', 'Engenheira'], comandante: ['Comandante', 'Comandante'], piloto: ['Piloto', 'Piloto'], navegador: ['Navegador', 'Navegadora'], explorador: ['Explorador', 'Exploradora'], bar: ['Rei do bar', 'Rainha do bar'], reis: ['Rei do baralho', 'Rainha do baralho'], gamer: ['Rakin', 'Rakin'], barbara: ['Bárbara Passos', 'Bárbara Passos']};
const crewName = (c, g) => c === 'nenhum' ? 'Sem skin' : CREW_LABEL[c][g === 'ela' ? 1 : 0];
// textos do character-picker (DS)
const ROLE_SUB = {
  engenheiro: 'DE LANÇAMENTO  ·  Faz qualquer nave decolar.', comandante: 'Mantém a calma em qualquer jogada.', piloto: 'DE VOO  ·  Sempre um passo à frente.',
  navegador: 'ESTELAR  ·  Sempre encontra o caminho.', explorador: 'DE MISSÃO  ·  Vai aonde ninguém foi.',
  bar: 'Nunca erra a última bola.', reis: 'Sempre tem a carta certa na manga.', gamer: 'Pro player de estratégia · risada alta e coração enorme', barbara: 'Pro player de tiro tático · o sorriso da arena'
};
// pacotes de skins da Loja · ordem de prioridade: Nobru & Inhui // Magia do bar // Reis do baralho // Estelar
const PACKS = {
  nobru: {name: 'Liquid', roles: ['gamer', 'barbara'], def: ['gamer', 'ele'], skins: 2, solo: true, caption: 'Rakin e Bárbara Passos · 2 skins', incl: 'Rakin e Bárbara Passos', artL: 'pack-nobru', artS: 'pack-nobru', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  magia: {duo: true, name: 'Magia do bar', roles: ['bar'], def: ['bar', 'ele'], skins: 2, caption: 'Rei e Rainha do bar · 2 skins', incl: 'Rei e Rainha do bar', artL: 'pack-magia-l', artS: 'pack-magia-s', posL: 'center 20%', posS: 'center 12%', mesa: 'bar', page: 'Escolha seu personagem'},
  reis: {duo: true, name: 'Reis do baralho', roles: ['reis'], def: ['reis', 'ele'], skins: 2, caption: 'Rei e Rainha do baralho · 2 skins', incl: 'Rei e Rainha do baralho', artL: 'pack-reis-l', artS: 'pack-reis-s', posL: 'center 20%', posS: 'center 12%', mesa: 'reis', page: 'Escolha seu personagem'},
  estelar: {name: 'Estelar', roles: ['engenheiro', 'comandante', 'piloto', 'navegador', 'explorador'], def: ['navegador', 'ela'], skins: 10, caption: 'Tripulação espacial · 10 skins', incl: '5 tripulantes · Ele e Ela', artL: 'pack-estelar', artS: 'pack-estelar', posL: 'center 40%', posS: 'center 30%', mesa: null, page: 'Escolha seu tripulante'}
};
const PACK_ORDER = ['nobru', 'magia', 'reis'];
const packOf = c => ['gamer', 'barbara'].includes(c) ? 'nobru' : c === 'bar' ? 'magia' : c === 'reis' ? 'reis' : 'estelar';
const photo = (crew, g) => crew === 'nenhum' ? A + 'ui/avatar_empty.webp' : `${A}photo/${crew}_${g}.webp`;

/* ---------- jogos ---------- */
// ordem da linha de jogos do lobby: Cacheta · Truco · Buraco · Poker · Sinuca (Tranca saiu do protótipo em 30/10)
const GAMES = [
  {id: 'cacheta', name: 'Cacheta', color: 'var(--game-cacheta)', tabs: 'roxa', variants: ['Cachetão', 'Pif-Paf', 'Cacheta'], soonV: ['Cachetão'], def: 'Pif-Paf', pfx: 'C', pts: v => v === 'Pif-Paf' ? '2 batidas' : '5 vidas'},
  {id: 'truco', name: 'Truco', color: 'var(--game-truco)', tabs: v => v === 'Paulista' ? 'azul' : 'vermelha', variants: ['Paulista', 'Mineiro'], def: 'Mineiro', pfx: 'T', pts: () => '12 pontos'},
  {id: 'buraco', name: 'Buraco', color: 'var(--game-buraco)', tabs: 'verde', variants: ['Aberto', 'Fechado'], def: 'Aberto', pfx: 'B', pts: () => '3.000 pontos'},
  {id: 'poker', name: 'Poker', color: 'var(--game-poker)', tabs: 'verde', variants: ['1x1', 'Mesa de 6'], def: '1x1', pfx: 'P', pts: () => 'Sit & Go'},
  {id: 'sinuca', name: 'Sinuca', color: 'var(--game-sinuca)', tabs: 'verde', variants: ['Bola 8', 'Brasileira'], soonV: ['Brasileira'], def: 'Bola 8', pfx: 'S', pts: () => 'Bola 8 · 1x1'}
];
const gameById = id => GAMES.find(g => g.id === id);
// artigo do nome do jogo: "Chat da Cacheta", "Ranking do Truco"
const doG = g => ['cacheta', 'tranca', 'sinuca'].includes(g.id) ? 'da' : 'do';
const game = () => gameById(ST.game);
const tabStyle = (g, v) => typeof g.tabs === 'function' ? g.tabs(v) : g.tabs;
const defVariant = g => g.def;
// formato de cada jogo/variante (o Truco escolhe 1x1 ou 2x2)
function formatOf(gid, v, trucoMode) {
  if (gid === 'truco') return trucoMode || '2x2';
  if (gid === 'poker') return v === 'Mesa de 6' ? 'Mesa de 6' : '1x1';
  if (gid === 'buraco' || gid === 'tranca') return '2x2';
  return '1x1';
}
const seatsOf = f => f === '2x2' ? 4 : f === 'Mesa de 6' ? 6 : 2;
const playableSel = (gid = ST.game, v = ST.variant) => { const g = gameById(gid); return !g.soon && !(g.soonV || []).includes(v); };
const STAKES = [{v: 20, q: 9}, {v: .25, q: 154, tag: 'Iniciante'}, {v: 1, q: 158}, {v: 5, q: 67}, {v: 10, q: 41}];
const STAKE_ORDER = [.25, 1, 5, 10, 20];
// gente de exemplo (bots)
const PEOPLE = [['dutra77', 'comandante', 'ele'], ['amanda.s', 'engenheiro', 'ela'], ['rafa_10', 'piloto', 'ele'], ['af_07', 'piloto', 'ela'], ['luana.m', 'explorador', 'ela'], ['marcao', 'navegador', 'ele'], ['lu.reis', 'engenheiro', 'ela'], ['caio.s', 'explorador', 'ele']];

/* ---------- estado ---------- */
// o app sempre abre plano (sem skin): as skins vêm da Loja e cada escolha é herdada pelo resto do app
const ST = {
  onboarded: false, nick: 'betinh4', phone: '', saldo: 1250, bonus: 35,
  game: 'truco', variant: 'Mineiro', trucoMode: '2x2', stake: 1,
  crew: 'nenhum', g: 'ela', owned: {nobru: false, magia: false, reis: false, estelar: false}, pack: 'nobru',
  mesaChoice: 'vermelha', mesaPaulista: 'azul', deck: 'estrela', mic: false,
  unread: 2, reward: null, rewardsWon: 18, series: null, training: false,
  diamonds: 1000 // moeda da Loja (só cosmético) · comprada em Loja › Diamantes · protótipo começa com 1.000 para mostrar as liberações nas reuniões
};
const hasSkin = () => ST.crew !== 'nenhum';

let toastT;
function toast(msg, ms = 1900) { $('#toastTxt').textContent = msg; $('#toast').classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => $('#toast').classList.remove('show'), ms); }

// hexágono com cantos arredondados (header-avatar · r6), em unidades da caixa
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
