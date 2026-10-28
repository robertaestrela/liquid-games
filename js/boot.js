/* Liquid · início: o app abre no cadastro, sem personagem, e vai herdando as escolhas */
'use strict';
function fit() {
  const ph = $('#phone');
  dkApply();
  if (DK.on) dkFit();
  else if (window.innerWidth > 520) { const s = Math.min(1, (window.innerHeight - 40) / 812, (window.innerWidth - 40) / 375); ph.style.transform = `scale(${s})`; } else ph.style.transform = '';
  fitBoard();
}
window.addEventListener('resize', fit);
// atalhos de teste: ?home pula o cadastro · &skin=gamer_ela · &go=tela · &game=sinuca · &act=ação (ex.: ?home&skin=bar_ele&go=profile)
const QS = new URLSearchParams(location.search);
// volta da página de Fichas (?resume ou pelo voltar do navegador): reabre o app onde estava; sem nada guardado, abre no início
const FICHAS_BACK = QS.has('resume') || SS.get('eg.away') ? SS.get('eg.resume') : null;
if (FICHAS_BACK) fichasResume(FICHAS_BACK);
else if (QS.has('home') || QS.has('go') || QS.has('resume')) {
  ST.onboarded = true;
  const sk = QS.get('skin'); if (sk) { const [c, g] = sk.split('_'); ST.crew = c; ST.g = g; ST.owned[packOf(c)] = true; }
  if (QS.has('own')) PACK_ORDER.forEach(p => { ST.owned[p] = true; });
  if (QS.get('step')) { CB.step = +QS.get('step'); cbFormatFix(); }
  const gq = QS.get('game'); if (gq && gameById(gq)) { ST.game = gq; ST.variant = defVariant(gameById(gq)); }
  const scr = QS.get('go'); go(scr && SCREENS[scr] ? scr : hasSkin() ? 'jogos' : 'lobby', scr === 'pacote' ? {id: QS.get('id') || 'nobru'} : scr === 'rankGame' ? {game: QS.get('id') || 'truco'} : {}, {noHist: true, reset: true});
  const pl = QS.get('play'); if (pl) { const [g, v, m] = pl.split(':'); Object.assign(ST, {game: g, variant: v || defVariant(gameById(g))}); if (m) ST.trucoMode = m; launchGame(game().pfx + '104'); }
  const act = QS.get('act'); if (act) { const [k, ...r] = act.split(':'); setTimeout(() => ACT[k] && ACT[k](r.join(':')), 50); }
} else go('ob1', {}, {noHist: true, reset: true});
fit();
window.__eg = Object.assign(window.__eg || {}, {ST, go, BATTLES, HISTORY, ACT});
Object.defineProperty(window.__eg, 'CUR', {get: () => CUR});
