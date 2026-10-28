# Liquid · protótipo navegável

Versão da marca Liquid gerada a partir do protótipo EstrelaGames (`egames-tools/brandify.py`): cores do modo Liquid, logo, header, verso das cartas, pacote principal da Loja, vídeo de boas-vindas e mesa da sinuca na cor da marca com o logo ao centro.

Protótipo mobile do **Liquid** (redesign *Apple Gamer Style*), fiel ao Figma e ao Design System Liquid. Todos os jogos liberados funcionam contra **bots**:

| Jogo | Modos |
| --- | --- |
| Truco | Paulista e Mineiro · 1x1 e 2x2 |
| Cacheta | Pif-Paf e Cacheta · 1x1 (Cachetão em breve) |
| Buraco | Aberto e Fechado · 2x2 |
| Tranca | Clássica · 2x2 |
| Poker | Texas Hold'em Sit & Go · 1x1 e mesa de 6 |
| Sinuca | Bola 8 · 1x1 em mesa 3D (Brasileira em breve) |

**Fluxo:** o app abre no cadastro (boas-vindas → celular → código → senha → apelido), **sem personagem**. A Loja desbloqueia os pacotes de skins (Liquid (Rakin e Bárbara Passos), Magia do bar, Reis do baralho); ao embarcar, a aba **Jogos** vira a Home com o vídeo do personagem e as escolhas (avatar, mesa, baralho) passam para todos os jogos.

**Diamantes:** moeda da Loja, só cosmético (skins, baralhos, molduras, efeitos, troca de nome e de foto) e nunca entra em partida. É o único pagamento dentro do app: o saldo de diamantes fica no topo da Loja e o + abre a página Diamantes (50 +8 · 195 +15 · 960 +40 · 4.500 +100, por R$ 6,90 · 29,90 · 129,90 · 599,90). A confirmação é a tela da App Store / Google Play (no protótipo, uma referência). Pacote de skins = 70 diamantes; sem saldo, o Comprar abre a página Diamantes.

**Batalhas:** lobby com busca e filtro por jogo, criação em 5 passos (jogo → modo e formato → rodadas 1/3/5/10 → buy-in → aberta ou fechada com senha), sala de espera que enche com bots e **série de partidas**: vence quem ganhar mais rodadas e leva o prêmio.

Também navegáveis com dados de exemplo: Chat (bônus e mesas no chat), Notificações, Perfil, Histórico, Ranking (geral e por jogo) e Ajustes.

**Fichas** (fora do app, no formato de fichasv2.cacheta.com): o app não tem carteira dentro. O + do saldo (e Fichas no Perfil, em Ajustes e no menu do desktop) mostra "Redirecionando…" e abre `fichas/index.html` na mesma aba: saldo, comprar fichas com Pix (valor → pagamento → confirmação), sacar (identidade no 1º saque → valor → pronto), histórico, limites e dados. "Voltar para o jogo" reabre o app onde estava, com o saldo novo e o aviso "Fichas na conta!" (o estado vai e volta pelo sessionStorage: `eg.resume`, `eg.fichas`, `eg.back`).

**Desktop** (só no computador, com mouse ou trackpad e janela de 1024 px ou mais na horizontal; celular e tablet continuam no layout mobile, mesmo deitados): as telas e os jogos ficam numa coluna 9:16 no meio. Em volta, um header largo (marca, saldo e bônus, sino, perfil), o menu à esquerda (os itens da navbar mais Perfil, Fichas, Histórico, Ranking e Ajustes) e o chat ao vivo do jogo à direita, que vira o Chat da mesa durante a partida. Em partida, o menu e o header ficam travados (sai-se pelo Voltar do jogo). Entre 1024 e 1279 px o menu vira trilho e o chat volta a ser a aba Chat.

## Rodar

É um site estático. Abra `index.html` por um servidor local (vídeos e fontes precisam de http):

```bash
python3 -m http.server 8000
```

e acesse http://localhost:8000. No celular, use o link do GitHub Pages.

Atalhos de teste na URL: `?home` pula o cadastro · `&skin=gamer_ela` já entra com um personagem · `&go=loja` abre uma tela · `&game=sinuca` escolhe o jogo do lobby · `&play=truco:Mineiro:2x2` abre uma partida · `&desk=1` / `&desk=0` forçam ou desligam o layout desktop.

A Sinuca usa Three.js (carregado do jsDelivr), então precisa de internet.

## Estrutura

```
index.html        casca (telas são renderizadas pelos scripts)
css/tokens.css    tokens do DS Liquid (cores, tipografia) resolvidos 1:1
css/ui.css        componentes (header-game, navbar-glass, game-block, tabs, button-glass, stake-pill, table-glass…)
css/screens.css   telas (cadastro, lobby, Home com skin, Loja, Batalhas, Chat, Perfil, Ranking, Redirecionando…)
css/game.css      tela de jogo (match-top, match-nav, cartas, chamada de truco, resultado)
css/desk.css      desktop: header largo, menu, chat ao vivo e a coluna 9:16
js/core.js        dados e estado
js/ui.js          componentes em HTML
js/screens.js     navegação, cadastro, lobby, Home, fila e resultado
js/loja.js        Loja, pacotes, diamantes, escolha de personagem e recompensa
js/social.js      Chat, Notificações, Perfil, Ajustes, Ranking e o redirecionamento para Fichas
fichas/           página de Fichas (fora do app): index.html, fichas.css, fichas.js
js/battles.js     Batalhas e série de partidas
js/games.js       motores dos jogos e bots
js/sinuca.js      abre a Sinuca (mesa 3D) e recebe o resultado dela
js/desk.js        desktop: liga o layout largo e pinta header, menu e chat ao vivo
sinuca/           Sinuca Bola 8: mesa 3D, física e bot (página própria, aberta num iframe)
assets/           ícones 3D, fotos e vídeos dos personagens, mesas, artes da Loja
```

**Sinuca:** a fila e o resultado são do app. A mesa roda em `sinuca/index.html#embed=<aposta>&nick=&crew=&g=&opp=&mesa=&q=0` e avisa o app por `postMessage` (`{source: 'sinuca', type: 'result', win, prize, reason}` ao terminar, `{source: 'sinuca', type: 'exit', forfeit}` ao sair). Batalhas de Sinuca usam a mesma mesa, rodada a rodada.

**Adicionar um jogo:** registre `GAME_START.<id> = start<Jogo>` num script próprio, inclua o script no `index.html` e tire `soon: true` do jogo em `GAMES` (`js/core.js`).

## Créditos

- Mesa 3D: “Pool Table” (https://sketchfab.com/3d-models/pool-table-b70954caef624015a7ab415189c7088f) por EpicRatt (https://sketchfab.com/Schrodingers_rat), licença CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/), com cores alteradas.
- Banquetas, sofás e textura do pano: Poly Haven (CC0).
