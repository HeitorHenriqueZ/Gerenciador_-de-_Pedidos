# 🖥️ Sistema de Gestão de Pedidos — Desktop (Electron)

> Sistema desktop focado em performance e gestão de pedidos, empacotado com Electron. Conta com proteção de licença vinculada ao hardware (HWID) e suporte nativo a "White Label".

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalação e Execução](#instalação-e-execução)
- [Sistema de Licenciamento (HWID)](#sistema-de-licenciamento-hwid)
- [Gerando o Executável (Build)](#gerando-o-executável-build)

---

## 📖 Visão Geral

Desenvolvido para pequenos e médios negócios, este aplicativo desktop permite a gestão completa de clientes, produtos e pedidos de forma totalmente offline e rápida. O sistema foi desenhado sem depender de frameworks pesados no frontend, garantindo máxima fluidez.

Além disso, o aplicativo possui um sistema de licenciamento proprietário: ele só funciona em máquinas previamente autorizadas através da validação de um Hardware ID único gerado a partir dos componentes físicos do computador do usuário.

---

## ✨ Funcionalidades Principais

- **Gestão de Pedidos:** Criação, edição e acompanhamento de status.
- **Cadastros Base:** Gerenciamento organizado de Produtos e Clientes.
- **Dashboard Financeiro:** Resumo automático de ganhos e métricas.
- **Impressão Nativa:** Geração de recibos de pagamento e vias de pedidos formatados para impressão.
- **White Label:** Interface adaptável para receber o nome e logotipo da empresa final.
- **Armazenamento Local:** Dados salvos localmente, garantindo privacidade e funcionamento offline.

---

## 🛠️ Stack Tecnológico

- **Frontend:** HTML5, CSS3 (CSS Variables, Grid/Flexbox), Vanilla JavaScript.
- **Backend/Desktop:** Node.js encapsulado no Electron.
- **Segurança:** Identificação de máquina via `node-machine-id` (com fallback nativo de OS) e validação criptográfica (SHA-256) com IPC seguro via `contextBridge`.

---

## 🚀 Instalação e Execução

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### Passos para rodar localmente

1. Clone este repositório:
   ```bash
   git clone [https://github.com/seu-usuario/gerenciador-de-pedidos.git](https://github.com/seu-usuario/gerenciador-de-pedidos.git)
   ```

2. Acesse a pasta do projeto e instale as dependências:
   ```bash
   cd gerenciador-de-pedidos
   npm install
   ```

3. Inicie a aplicação em modo de desenvolvimento:
   ```bash
   npm start
   ```

---

## 🔐 Sistema de Licenciamento (HWID)

O projeto possui um fluxo de proteção contra pirataria:

1. Ao abrir o software pela primeira vez, a tela de ativação exibirá um **Machine ID** exclusivo daquele hardware.
2. O administrador do sistema deve gerar uma **Chave de Ativação** vinculada àquele ID.
3. O usuário insere a chave e o software é desbloqueado permanentemente para aquela máquina.

> **Nota para desenvolvedores (Fork):** As rotinas de ofuscação de chaves e os scripts geradores não são versionados por motivos de segurança. Caso faça um fork, implemente sua própria regra de geração de chaves no arquivo principal de processos.

---

## 📦 Gerando o Executável (Build)

Para empacotar a aplicação e gerar o instalador para o cliente final, o projeto utiliza o `electron-builder`. 

Execute o comando correspondente ao sistema operacional desejado:

- **Para Windows (.exe):**
  ```bash
  npm run build:win
  ```
- **Para macOS (.dmg):**
  ```bash
  npm run build:mac
  ```
- **Para Linux:**
  ```bash
  npm run build:linux
  ```

Os arquivos finais serão gerados dentro da pasta `/dist`.

---
*Copyright © 2025. Todos os direitos reservados.*
