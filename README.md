# COSMOBRASIL LEARNING LAB (MVP 1)

O **COSMOBRASIL LEARNING LAB** é um ambiente digital de desenvolvimento intelectual assistido por Inteligência Artificial (IA) para jovens universitárias recém-ingressadas nas atividades da CosmoBrasil. 

Mais do que apenas uma central de atendimento automática, o laboratório adota uma filosofia baseada no **método de questionamento orientado**. Em vez de fornecer resoluções ou relatórios extensivos de imediato, o sistema instiga as estudantes por meio de questionamentos e reflexões estruturadas, capacitando o desenvolvimento de pensamento crítico, formulação de hipóteses, modelagem de negócios, marketing estratégico e economia do amanhã.

---

## 🚀 FUNCIONALIDADES CHAVE (MVP 1)

1. **Tela Principal de Investigação:** Um espaço focado e despolarizado que questiona: *"Qual ideia você está tentando compreender hoje?"*, servindo de ponto de apoio inicial.
2. **Área de Conversa (Chat):** Canal interativo onde a estudante expõe suas reflexões e o **Mentor Circular** (integrado via IA no Backend) responde conduzindo-a por novos prismas intelectuais.
3. **Pills e Micro-Ações de Aprendizado:** Cada resposta da IA gera dinamicamente perguntas reflexivas recomendadas, conceitos sugeridos para pesquisa e hipóteses práticas a testar, permitindo reflexões rápidas em um único clique.
4. **Painel de Evolução Cognitiva (Lado Direito):**
   - **Temas Explorados:** Tags e palavras-chave descobertas que podem ser clicadas para iniciar novos diálogos de pesquisa.
   - **Conceitos Dominados:** Indicadores deslizantes que crescem organicamente e em tempo real quando termos técnicos são debatidos no chat.
   - **Investigações Orientativas:** Um medidor de bioluminescência ilustrando a frequência de indagações realizadas pela estudante.
   - **Grafo de Conhecimento:** Uma representação majestosa em SVG que conecta os conceitos explorados com fios neuronais reativos.
5. **Painel de Navegação (Lado Esquerdo):** Menu modular com atalhos de navegação que indicam dinamicamente a atividade do Mentor Orientador.

---

## 🛠️ TECNOLOGIAS E ARQUITETURA

O sistema foi modelado com uma arquitetura **Full-Stack (Vite + React + Express)** para garantir máximo desempenho, tipo-segurança estrita com TypeScript e segurança da chave de acesso privado (API Key) mantendo-a protegida no servidor Node.js:

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide-React.
- **Backend:** Node.js, Express, dotenv and a configurable HTTP-based LLM provider (FIREWORKS in this repo).
- **Compilação e Agrupamento:** Isomorfo via **esbuild** no backend para agrupar as rotas nativas e o servidor em um único arquivo autossuficiente (`dist/server.cjs`) isento de falhas de caminhos de módulos ES.

---

## 📦 COMO EXECUTAR LOCALMENTE

### Requisitos Prévios
- **Node.js** v18 ou superior instalado.
- **NPM** v9 ou superior instalado.

### 1. Clonar e Instalar as Dependências
Abra o terminal em seu ambiente do projeto e rode:
```bash
npm install
```

### 2. Configurar as Chaves de Ambiente
 Crie um arquivo `.env` na raiz do seu workspace (ou copie de `.env.example`):
 ```env
 FIREWORKS_API_KEY="SUA_CHAVE_DE_API_FIREWORKS"
 FIREWORKS_API_URL="https://api.fireworks.ai/v1/generate" # opcional
 FIREWORKS_MODEL="fireworks-1" # opcional
 NODE_ENV="development"
 ```

### 3. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O servidor de desenvolvimento isomorfo subirá sincronizado na porta **3000** (http://localhost:3000), unindo o middleware do Vite para o frontend e as requisições ativas para o backend do express na rota `/api/chat`.

---

## 🛠️ ESTRUTURA DO PROJETO

```
/
├── .env.example            # Molde de variáveis de ambiente do sistema
├── index.html              # Ponto de entrada de tela principal, fonte & ícones
├── metadata.json           # Permissões e metadados oficiais do Applet
├── package.json            # Dependências, scripts customizados e builds
├── server.ts               # Servidor Express, inits e integração de IA Socrática
├── tsconfig.json           # Definições estritas de compilação TypeScript
├── vite.config.ts          # Plugin React & Tailwind 4 para o bundler do Vite
└── src/
    ├── types.ts            # Interfaces compartilhadas e representações de dados
    ├── main.tsx            # Inicialização de entrada React no DOM
    ├── index.css           # Estilizações customizadas, animações e tokens Tailwind 4
    ├── App.tsx             # Layout global e gerenciamento reativo do Learning Lab
    └── components/
        ├── LeftSidebar.tsx  # Central de abas e sinalizadores de menu
        └── RightSidebar.tsx # Cockpit de evolução cognitivo e Grafo SVG integrativo
```

---

## 🚀 INSTRUÇÕES DE DEPLOY (RAILWAY)

Este ecossistema já está 100% otimizado e configurado para subir no **Railway** instantaneamente sem a necessidade de configurações manuais de inicialização:

### Passo a Passo Simplificado:

1. **Vincular seu Repositório Git:**
   - Faça push das pastas do projeto para seu repositório no GitHub.

2. **Criar um Novo Projeto no Railway:**
   - Acesse o painel do [Railway](https://railway.app), clique em **New Project** e selecione **Deploy from GitHub repo**.
   - Escolha o repositório deste projeto.

3. **Configurar as Variáveis de Ambiente:**
   - No painel da sua aplicação no Railway, vá em **Variables** e adicione a chave vital:
      - `FIREWORKS_API_KEY` = `[Insira sua chave do provedor Fireworks]`
      - O Railway injetará automaticamente a chave e o App subirá com o modelo orientativo ativado.

4. **Instruções de Boot Embutidas (Automáticas):**
   - O Railway lerá o `package.json` atualizado. Ele rodará automaticamente:
     - Primeiro, a fase de Build: `npm run build` (que gera os arquivos estáticos do Vite na pasta `/dist` e paralelamente compila o servidor TypeScript em um empacotado CJS unificado em `/dist/server.cjs` via esbuild).
     - Segundo, o comando de Inicialização de Produção: `npm start` (que executa `node dist/server.cjs` ligando o servidor de produção integrado e otimizado na porta apropriada).

5. **Pronto!**
   - O Railway fornecerá um subdomínio público gratuito com SSL ativo em segundos expondo o aplicativo para seus testes intelectuais!
