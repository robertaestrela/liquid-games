/* Liquid · Sinuca Bola 8: mesa 3D e física próprias (sinuca/, aprovada pela Roberta).
   Abre em tela cheia num iframe em modo embed; o jogo devolve o resultado por postMessage
   ({source:'sinuca', type:'result'|'exit'}) e o app cuida do saldo, histórico, resultado e Batalhas. */
'use strict';
let SN = null;
function startSinuca(tableId) {
  closeSinuca();
  SN = {tableId, done: false};
  // a fila já rodou no app (ou é rodada de batalha): abre direto na mesa (q=0)
  const q = new URLSearchParams({nick: ST.nick, crew: ST.crew, g: ST.g, opp: OPP.n, mesa: tableId, q: '0'});
  const w = document.createElement('section');
  w.className = 'scr sinuca-scr'; w.id = 'sinucaWrap';
  w.innerHTML = `<iframe id="sinucaFrame" title="Sinuca · Bola 8" allow="autoplay; fullscreen" src="sinuca/index.html?v=liquid-10301146#embed=${ST.stake}&${q}"></iframe>`;
  closeSheet(); closeNotifs(); pauseViewVideos();
  $('#view').hidden = true; $('#scr-game').hidden = true;
  $('#app').appendChild(w);
}
function closeSinuca() { const w = $('#sinucaWrap'); if (w) w.remove(); }
window.addEventListener('message', e => {
  const d = e.data, f = $('#sinucaFrame');
  if (!d || d.source !== 'sinuca' || !SN || !f || e.source !== f.contentWindow) return;
  if (d.type === 'result' && !SN.done) { SN.done = true; setTimeout(() => sinucaResult(d), 900); }
  else if (d.type === 'exit' && !SN.done) sinucaExit(d);
});
function sinucaResult(d) {
  const sn = SN; if (!sn) return;
  const win = !!d.win, prize = prizeOf(ST.stake), tid = sn.tableId;
  ST.saldo = +(ST.saldo + (win ? prize : 0) - ST.stake).toFixed(2);
  SN = null; closeSinuca();
  showResult({win, sub: d.reason || (win ? 'Você encaçapou a 8' : `${OPP.n} encaçapou a 8`),
    value: win ? `+ ${fmt2(prize)}` : `− ${fmt2(ST.stake)}`, caption: win ? 'Prêmio já está no seu saldo' : 'Valor da entrada',
    ctx: `Mesa ${tid} · Sinuca · Bola 8 · 1x1`, gameColor: 'var(--game-sinuca)',
    left: teamHTML([[ST.nick, ST.crew, ST.g]], 'Você', 'Bola 8'), score: win ? '1 × 0' : '0 × 1', right: teamHTML([[OPP.n, OPP.c, OPP.g]], OPP.n, 'adversário', true),
    hist: 'Sinuca Bola 8', vs: OPP.n, delta: win ? prize - ST.stake : -ST.stake,
    againLabel: ST.training ? 'Treinar de novo' : `${win ? 'Jogar de novo' : 'Revanche'} · ${fmt(ST.stake)}`,
    again: () => { ST.game = 'sinuca'; ST.variant = 'Bola 8'; startQueue(tid); }});
}
function sinucaExit(d) {
  SN = null; closeSinuca();
  if (ST.training) ST.saldo = ST.trainSaldo;
  else if (d.forfeit && !ST.series) ST.saldo = +(ST.saldo - ST.stake).toFixed(2);
  if (ST.series) { const b = ST.series.b; ST.series = null; go('batalhas', {}, {noHist: true, reset: true}); toast(`Você saiu da ${b.name} · entrada de ${fmt(b.buyin)} perdida`); return; }
  leaveGame();
  if (d.forfeit) toast(`Você saiu da partida · entrada de ${fmt(ST.stake)} perdida`);
}
GAME_START.sinuca = startSinuca;
