# Quickerest

Launcher leve do Pinterest feito com [Tauri 2](https://tauri.app) (Rust). O app abre o
Pinterest numa janela própria usando o motor web nativo do sistema operacional:

| Sistema | Motor |
| ------- | ----- |
| macOS   | WKWebView (WebKit) |
| Linux   | WebKitGTK |
| Windows | WebView2 (Edge/Chromium, já vem no Windows 10/11) |

Como não há navegador embutido (ao contrário do Electron/Nativefier), o executável fica
com poucos MB: o binário de release no Linux tem **~4,4 MB** e o pacote `.deb` **~1,9 MB**.

## Recursos

- Janela dedicada do Pinterest, que reabre no mesmo tamanho e posição.
- Uma única instância: abrir o app de novo só traz a janela existente para frente.
- Links externos (lojas, blogs, sites de origem dos pins) abrem no navegador padrão.
- Login com e-mail/senha e popups de login do Google, Facebook e Apple ficam no app.
- Downloads de imagens vão para a pasta **Downloads** do sistema.
- Removedor de anúncios e rastreadores conhecidos, ativado por padrão no Pinterest.
- O site remoto **não** recebe acesso à API do Tauri (capabilities mínimas).
- Atalhos de teclado:

| Atalho | Ação |
| ------ | ---- |
| `F` | Focar a busca do Pinterest |
| `R` | Salvar a imagem principal do pin/página |
| `Ctrl/Cmd + C` | Copiar a imagem principal |
| `Ctrl/Cmd + Shift + C` | Copiar o link da página ou pin aberto |
| `Q` | Voltar para a página inicial |
| `Alt + ←` / `Ctrl/Cmd + [` / botão "voltar" do mouse | Voltar |
| `Alt + →` / `Ctrl/Cmd + ]` / botão "avançar" do mouse | Avançar |
| `Ctrl/Cmd + R` / `F5` | Recarregar |
| `Alt + Home` | Página inicial |
| `Ctrl/Cmd + Shift + A` | Ativar ou pausar o removedor de anúncios |

## Desenvolvimento

Pré-requisitos: [Rust](https://rustup.rs), Node.js 18+ e as
[dependências do Tauri para o seu sistema](https://v2.tauri.app/start/prerequisites/)
(no Linux: `libwebkit2gtk-4.1-dev`, `librsvg2-dev`, `libayatana-appindicator3-dev`).

```bash
npm install
npm run dev      # abre o app em modo de desenvolvimento
npm run build    # gera o instalador em src-tauri/target/release/bundle/
```

Testes e lint do código Rust:

```bash
cd src-tauri
cargo test
cargo clippy --all-targets
```

Para trocar o ícone, edite `icon.svg` e rode `npm run icon`.

## Releases

Ao enviar uma tag `v*` (ex.: `git tag v0.4.0 && git push --tags`), o workflow
`.github/workflows/release.yml` compila o app para macOS (universal), Windows e Linux e
publica um release no GitHub com os instaladores. Também dá para rodar o
workflow manualmente em *Actions → release → Run workflow*; a tag `v<versão>` é
criada a partir da versão em `src-tauri/tauri.conf.json`.

Os builds não são assinados: no macOS é preciso liberar o app em
*Ajustes do Sistema → Privacidade e Segurança* na primeira execução, e o Windows
SmartScreen pode exibir um aviso.

## Estrutura

```
src-tauri/
  src/lib.rs         janela, regras de navegação, downloads e plugins
  src/shortcuts.js   atalhos de teclado injetados na página
  src/adblock.js     bloqueio leve de anúncios e rastreadores
  tauri.conf.json    configuração do app e do empacotamento
  capabilities/      permissões (mínimas) do webview
dist/                fallback local exigido pelo Tauri (não é usado em runtime)
icon.svg             fonte dos ícones em src-tauri/icons/
```

## Limitações

- **Memória:** o app economiza a RAM do navegador inteiro (abas, extensões, processos
  extras), mas a página do Pinterest em si continua rodando num motor web completo,
  então o consumo da página é parecido com o de uma aba.
- **Bloqueio de anúncios:** o removedor oculta pins identificados como promovidos e
  bloqueia chamadas `fetch`/XHR para uma lista local de domínios de publicidade e
  rastreamento. Anúncios servidos pelo próprio Pinterest ou mudanças na marcação da
  página podem escapar do filtro.
- **Login com Google:** o Google às vezes bloqueia login em webviews embutidos
  ("este navegador ou app pode não ser seguro"). Se acontecer, use e-mail e senha.
- Notificações push do site não são suportadas.
