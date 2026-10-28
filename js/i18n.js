// Tradução da interface para as marcas com lang (brandify.py): troca só o texto que aparece na tela
// (nós de texto e placeholder/aria-label/title/alt), nunca as chaves do código (Paulista, Aberto, Mesa de 6…).
// Dicionário em window.I18N = {exact: {pt: en}, rx: [[regex, saída]]} · na saída, $1 = trecho cru e {1} = trecho traduzido.
(() => {
  const L = window.I18N || {exact: {}, rx: []};
  const EX = L.exact, RX = L.rx.map(([s, r]) => [new RegExp('^' + s + '$', 'u'), r]);
  // trechos conhecidos dentro de um texto maior (só frases e palavras com 3+ letras, nunca "e", "de", "com"…)
  const KEYS = Object.keys(EX).filter(k => k.length >= 3 && /\p{L}/u.test(k) && !L.noPhrase?.includes(k)).sort((a, b) => b.length - a.length);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let PH = null;
  const phrase = t => {
    PH = PH || new RegExp('(^|[^\\p{L}\\p{N}_.@])(' + KEYS.map(esc).join('|') + ')(?=$|[^\\p{L}\\p{N}_@])', 'gu');
    return t.replace(PH, (m, a, w) => a + EX[w]);
  };
  const cache = new Map();
  const tr = t => {
    if (cache.has(t)) return cache.get(t);
    let o = EX[t];
    if (o === undefined) for (const [re, r] of RX) {
      const m = t.match(re);
      if (m) { o = r.replace(/\{(\d)\}/g, (_, i) => tr(m[i] || '')).replace(/\$(\d)/g, (_, i) => m[i] || ''); break; }
    }
    if (o === undefined) o = /\p{L}/u.test(t) ? phrase(t) : t;
    cache.set(t, o);
    return o;
  };
  const one = s => { const t = s.trim(); if (!t) return s; const o = tr(t); return o === t ? s : s.replace(t, o); };
  const seen = new WeakMap();
  const text = n => {
    const v = n.nodeValue, p = n.parentNode;
    if (seen.get(n) === v || !p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.closest?.('[data-i18n-skip]')) return;
    const o = one(v); seen.set(n, o); if (o !== v) n.nodeValue = o;
  };
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const attrs = e => { for (const a of ATTRS) { const v = e.getAttribute?.(a); if (v) { const o = one(v); if (o !== v) e.setAttribute(a, o); } } };
  const walk = root => {
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1 || root.nodeName === 'SCRIPT' || root.nodeName === 'STYLE') return;
    attrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? text(n) : attrs(n);
  };
  const mo = new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') text(m.target);
      else if (m.type === 'attributes') attrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  const start = () => { walk(document.documentElement); mo.observe(document.documentElement, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS}); };
  document.documentElement.lang = L.lang || 'en';
  start();
  window.i18n = tr;
})();
