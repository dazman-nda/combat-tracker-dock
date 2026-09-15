# Carousel Combat Tracker — GUM Custom

Build customizado do Carousel Combat Tracker para o sistema GURPS GUM no Foundry VTT.

O módulo mantém a atribuição ao projeto original de [theripper93/combat-tracker-dock](https://github.com/theripper93/combat-tracker-dock) e acrescenta a integração usada pelo GUM:

- imagem própria do ator para o Carrossel, com fallback para retrato e Token;
- botão **Carrossel** no cabeçalho da ficha GUM para escolher essa imagem;
- barra de vida contínua atrás da imagem transparente;
- faixa de PV negativos até `-5×` ou `-10×` o PV máximo;
- rotação da imagem quando o combatente é derrotado.

## Instalação pelo Manifest URL

No Foundry VTT, abra **Install Module**, cole o endereço abaixo em **Manifest URL** e clique em **Install**:

```text
https://raw.githubusercontent.com/dazman-nda/combat-tracker-dock/main/module.json
```

Depois ative o módulo no mundo GUM. A versão publicada e o arquivo ZIP ficam na página de [Releases](https://github.com/dazman-nda/combat-tracker-dock/releases).

## Desenvolvimento

```text
npm install
npx webpack --config webpack.config.js
```

O build gera `index.js` e `styles/module.css`, que são os arquivos carregados pelo Foundry.
