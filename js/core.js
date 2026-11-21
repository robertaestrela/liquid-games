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
const CREW = {engenheiro: 'var(--crew-engenheiro)', comandante: 'var(--crew-comandante)', piloto: 'var(--crew-piloto)', navegador: 'var(--crew-navegador)', explorador: 'var(--crew-explorador)', bar: 'var(--crew-bar)', reis: 'var(--crew-reis)', laje: 'var(--crew-laje)', portaria: 'var(--crew-portaria)', live: 'var(--crew-live)', feira: 'var(--crew-feira)', navalha: 'var(--crew-navalha)', varzea: 'var(--crew-varzea)', oficina: 'var(--crew-oficina)', posto: 'var(--crew-posto)', fliper: 'var(--crew-fliper)', grau: 'var(--crew-grau)', palpite: 'var(--crew-palpite)', gamer: 'var(--crew-nobru)', assalto: 'var(--crew-assalto)'};
const crewColor = (c, g) => c === 'gamer' ? (g === 'ela' ? 'var(--crew-inhui)' : 'var(--crew-nobru)') : CREW[c] || 'var(--border-strong)';
const CREW_LABEL = {engenheiro: ['Engenheiro', 'Engenheira'], comandante: ['Comandante', 'Comandante'], piloto: ['Piloto', 'Piloto'], navegador: ['Navegador', 'Navegadora'], explorador: ['Explorador', 'Exploradora'], bar: ['Rei do bar', 'Rainha do bar'], reis: ['Rei do baralho', 'Rainha do baralho'], laje: ['Zapinho', 'Espadilha'], portaria: ['Seu Porteiro', 'Dona Síndica'], live: ['Rei de Copas', 'Dama de Ouros'], feira: ['Zé do Pastel', 'Rainha da Xepa'], navalha: ['Risquinho', 'Purpurina'], varzea: ['Paredão', 'Canhota'], oficina: ['Graxa', 'Calibra'], posto: ['Gasosa', 'Caçapa'], fliper: ['Lanzinho', 'Rayane'], grau: ['Grauzinho', 'Juliete'], palpite: ['Mestre do Palpite', 'Madrinha do Palpite'], gamer: ['Nobru', 'Inhui'], assalto: ['Jeff', 'Lúcia']};
const crewName = (c, g) => c === 'nenhum' ? 'Sem skin' : CREW_LABEL[c][g === 'ela' ? 1 : 0];
// textos do character-picker (DS)
const ROLE_SUB = {
  engenheiro: 'DE LANÇAMENTO  ·  Faz qualquer nave decolar.', comandante: 'Mantém a calma em qualquer jogada.', piloto: 'DE VOO  ·  Sempre um passo à frente.',
  navegador: 'ESTELAR  ·  Sempre encontra o caminho.', explorador: 'DE MISSÃO  ·  Vai aonde ninguém foi.',
  bar: 'Nunca erra a última bola.', reis: 'Sempre tem a carta certa na manga.',
  laje: 'Resenha na laje · carta na mão e sorriso no rosto', portaria: 'Plantão na portaria · vê tudo e não perde uma mão', live: 'Ao vivo do baralho · joga com o chat inteiro torcendo', feira: 'Turma da feira · grita a oferta e leva a mão', navalha: 'Navalha & Esmalte · capricho em cada jogada', varzea: 'Várzea FC · raça de domingo na mesa', oficina: 'Oficina do Zé · conserta qualquer mão', posto: 'Sinuca do posto · não perde uma tacada', fliper: 'Fliperama do bairro · recorde em cada partida', grau: 'Turma do grau · acelera e não freia', palpite: 'Turma do palpite · lê a mesa antes de todo mundo',
  assalto: 'O Grande Assalto · taco no ombro e baralho de pôr do sol',
  gamer: 'Pro player de estratégia · risada alta e coração enorme', barbara: 'Pro player de tiro tático · o sorriso da arena'
};
// pacotes de skins · a Loja do Liquid só vende as famílias da página Skins (Figma Loja › 7, LJ01) · Nobru & Inhui, Reis do baralho e Estelar ficam só nos dados (marcas e bots)
const PACKS = {
  nobru: {name: 'Liquid', roles: ['gamer', 'barbara'], def: ['gamer', 'ele'], skins: 2, solo: true, caption: 'Rakin e Bárbara Passos · 2 skins', incl: 'Rakin e Bárbara Passos', artL: 'pack-nobru', artS: 'pack-nobru', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  magia: {duo: true, name: 'Magia do bar', roles: ['bar'], def: ['bar', 'ele'], skins: 2, caption: 'Rei e Rainha do bar · 2 skins', incl: 'Rei e Rainha do bar', artL: 'pack-magia-l', artS: 'pack-magia-s', posL: 'center 20%', posS: 'center 12%', mesa: 'bar', page: 'Escolha seu personagem'},
  reis: {duo: true, name: 'Reis do baralho', roles: ['reis'], def: ['reis', 'ele'], skins: 2, caption: 'Rei e Rainha do baralho · 2 skins', incl: 'Rei e Rainha do baralho', artL: 'pack-reis-l', artS: 'pack-reis-s', posL: 'center 20%', posS: 'center 12%', mesa: 'reis', page: 'Escolha seu personagem'},
  laje: {name: 'Espadilha e Zap', roles: ['laje'], def: ['laje', 'ela'], skins: 2, caption: 'Resenha da Laje · 2 skins', incl: 'Zapinho e Espadilha', family: 'Resenha da Laje', artL: 'pack-laje-s', artS: 'pack-laje-s', posL: 'center', posS: 'center', mesa: 'laje', page: 'Escolha seu personagem'},
  portaria: {name: 'Seu Porteiro e Dona Síndica', roles: ['portaria'], def: ['portaria', 'ele'], skins: 2, caption: 'Plantão da Portaria · 2 skins', incl: 'Seu Porteiro e Dona Síndica', family: 'Plantão da Portaria', artL: 'pack-portaria-l', artS: 'pack-portaria-s', posL: 'center', posS: 'center', mesa: 'portaria', page: 'Escolha seu personagem'},
  live: {name: 'Dama de Ouros e Rei de Copas', roles: ['live'], def: ['live', 'ela'], skins: 2, caption: 'Live do Baralho · 2 skins', incl: 'Rei de Copas e Dama de Ouros', family: 'Live do Baralho', artL: 'pack-live-s', artS: 'pack-live-s', posL: 'center', posS: 'center', mesa: 'live', page: 'Escolha seu personagem'},
  feira: {name: 'Zé do Pastel e Rainha da Xepa', roles: ['feira'], def: ['feira', 'ele'], skins: 2, caption: 'Turma da Feira · 2 skins', incl: 'Zé do Pastel e Rainha da Xepa', family: 'Turma da Feira', artL: 'pack-feira-s', artS: 'pack-feira-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  navalha: {name: 'Risquinho e Purpurina', roles: ['navalha'], def: ['navalha', 'ele'], skins: 2, caption: 'Navalha & Esmalte · 2 skins', incl: 'Risquinho e Purpurina', family: 'Navalha & Esmalte', artL: 'pack-navalha-s', artS: 'pack-navalha-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  varzea: {name: 'Paredão e Canhota', roles: ['varzea'], def: ['varzea', 'ele'], skins: 2, caption: 'Várzea FC · 2 skins', incl: 'Paredão e Canhota', family: 'Várzea FC', artL: 'pack-varzea-s', artS: 'pack-varzea-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  oficina: {name: 'Graxa e Calibra', roles: ['oficina'], def: ['oficina', 'ele'], skins: 2, caption: 'Oficina do Zé · 2 skins', incl: 'Graxa e Calibra', family: 'Oficina do Zé', artL: 'pack-oficina-s', artS: 'pack-oficina-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  posto: {name: 'Gasosa e Caçapa', roles: ['posto'], def: ['posto', 'ele'], skins: 2, caption: 'Sinuca do Posto · 2 skins', incl: 'Gasosa e Caçapa', family: 'Sinuca do Posto', artL: 'pack-posto-s', artS: 'pack-posto-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  fliper: {name: 'Lanzinho e Rayane', roles: ['fliper'], def: ['fliper', 'ele'], skins: 2, caption: 'Fliperama do Bairro · 2 skins', incl: 'Lanzinho e Rayane', family: 'Fliperama do Bairro', artL: 'pack-fliper-s', artS: 'pack-fliper-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  grau: {name: 'Grauzinho e Juliete', roles: ['grau'], def: ['grau', 'ele'], skins: 2, caption: 'Turma do Grau · 2 skins', incl: 'Grauzinho e Juliete', family: 'Turma do Grau', artL: 'pack-grau-s', artS: 'pack-grau-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  palpite: {name: 'Mestre do Palpite e Madrinha do Palpite', roles: ['palpite'], def: ['palpite', 'ele'], skins: 2, caption: 'Turma do Palpite · 2 skins', incl: 'Mestre do Palpite e Madrinha do Palpite', family: 'Turma do Palpite', artL: 'pack-palpite-s', artS: 'pack-palpite-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  assalto: {name: 'Jeff e Lúcia', roles: ['assalto'], def: ['assalto', 'ele'], skins: 2, caption: 'O Grande Assalto · 2 skins', incl: 'Jeff e Lúcia', family: 'O Grande Assalto', artL: 'pack-assalto-s', artS: 'pack-assalto-s', posL: 'center', posS: 'center', mesa: null, page: 'Escolha seu personagem'},
  estelar: {name: 'Estelar', roles: ['engenheiro', 'comandante', 'piloto', 'navegador', 'explorador'], def: ['navegador', 'ela'], skins: 10, caption: 'Tripulação espacial · 10 skins', incl: '5 tripulantes · Ele e Ela', artL: 'pack-estelar', artS: 'pack-estelar', posL: 'center 40%', posS: 'center 30%', mesa: null, page: 'Escolha seu tripulante'}
};
const PACK_ORDER = ['nobru', 'laje', 'portaria', 'magia', 'live', 'feira', 'navalha', 'varzea', 'oficina', 'posto', 'fliper', 'grau', 'palpite', 'assalto'];
const packOf = c => ['gamer', 'barbara'].includes(c) ? 'nobru' : c === 'bar' ? 'magia' : c === 'reis' ? 'reis' : PACKS[c] ? c : 'estelar';
/* classes de skin (Loja por classe · Figma Loja › 9): a compra vale para a família toda (Ele + Ela) · subir de classe paga só a diferença */
const CLS = [{k: 'comum', n: 'Comum', p: 4.9}, {k: 'rara', n: 'Rara', p: 9.9}, {k: 'mistica', n: 'Mística', p: 19.9}, {k: 'lendaria', n: 'Lendária', p: 39.9}];
// famílias com arte própria por classe (palco, chamada e foto: assets/…/<crew>_<g>_<classe>) · as outras usam a mesma arte em todas as classes
const TIER_ART = {bar: 3, assalto: 4};
// classe que o jogador está usando (comprada ou escolhida ao embarcar) · null = arte padrão
const wearLvl = c => { const id = packOf(c), w = (ST.wear || {})[id]; return w != null ? w : (ST.cls || {})[id] != null ? ST.cls[id] : null; };
// sufixo da arte: t explícito (null = padrão) ou, sem t, a classe do próprio jogador quando o personagem é o dele
const tierSfx = (c, t) => { if (t === undefined) t = c === ST.crew ? wearLvl(c) : null; return t != null && TIER_ART[c] > t ? '_' + CLS[t].k : ''; };
const photo = (crew, g, t) => crew === 'nenhum' ? A + 'ui/avatar_empty.webp' : `${A}photo/${crew}_${g}${tierSfx(crew, t)}.webp`;

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
// regras do protótipo (30/10): o app abre com o 1º personagem homem do pacote principal da marca já liberado e ativo
// (Liquid: Espadilha, do pacote grátis Espadilha e Zap, como na produção · nas marcas, o 1º personagem delas) e o Truco abre sempre na mesa do bar até a pessoa escolher outra em Personalizar
const ST = {
  onboarded: false, nick: 'betinh4', phone: '', saldo: 1250, bonus: 35,
  game: 'truco', variant: 'Mineiro', trucoMode: '2x2', stake: 1,
  crew: 'gamer', g: 'ele', owned: {nobru: true, magia: false, reis: false, estelar: false, laje: false, portaria: false, live: false, feira: false, navalha: false, varzea: false, oficina: false, posto: false, fliper: false, grau: false, palpite: false, assalto: false}, pack: 'nobru', cls: {}, wear: {},
  mesaChoice: 'vermelha', mesaPaulista: 'azul', mesaPicked: false, deck: 'estrela', mic: false,
  fid: {ready: 12, week: 0}, // Bônus Fidelidade: o que está pronto pra resgatar e o que está juntando nesta semana (5% da taxa das mesas, limite R$ 50)
  unread: 2, reward: null, rewardsWon: 18, tourney: null, tPrev: null, training: false, room: null,
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
