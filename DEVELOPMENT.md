# Registro de Desenvolvimento: COSMOBRASIL Learning Lab

Este documento registra a arquitetura, as decisões técnicas, a estruturação de dados e o histórico de implementação do **COSMOBRASIL LEARNING LAB (MVP 1)**.

---

## 🏛️ 1. Arquitetura do Sistema

O sistema foi desenvolvido utilizando um modelo de **desenvolvimento isomórfico/híbrido**, permitindo execução local contínua e publicação instantânea em servidores estáticos serverless (Netlify) sem custos extras de infraestrutura ou alteração de código do cliente.

```
                  ┌────────────────────────────────────────┐
                  │          Dispositivo do Usuário        │
                  │  ┌──────────────────────────────────┐  │
                  │  │          React Frontend          │  │
                  │  │  (LocalStorage para Histórico)   │  │
                  │  └──────────────────┬───────────────┘  │
                  └─────────────────────┼──────────────────┘
                                        │ (Requisições HTTP para /api/chat)
                                        ▼
                  ┌────────────────────────────────────────┐
                  │          Camada de Roteamento          │
                  │   /api/chat mapeia para o backend      │
                  └─────────────────────┬──────────────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       ▼ (Local)                         ▼ (Netlify Produção)
         ┌───────────────────────────┐     ┌───────────────────────────┐
         │     Servidor Express      │     │  Netlify Function (Chat)  │
         │       (server.ts)         │     │  (netlify/functions/chat) │
         └─────────────┬─────────────┘     └─────────────┬─────────────┘
                       │                                 │
                       └────────────────┬────────────────┘
                                        │ (Lê o JSON de Conhecimento)
                                        ▼
                         ┌─────────────────────────────┐
                         │   src/data/knowledge.json   │
                         │ (Fichas e Conceitos do Vault│
                         │     Foresight Compilados)   │
                         └──────────────┬──────────────┘
                                        │ (Injeta Contexto RAG)
                                        ▼
                         ┌─────────────────────────────┐
                          │  Fireworks LLM HTTP API (configurável)  │
                         └─────────────────────────────┘
```

---

## 💾 2. Solução de Armazenamento de Conhecimento: "Markdown-First RAG"

Para equipar o agente com informações oficiais sobre o ecossistema da CosmoBrasil, a circularidade de produto e as matrizes setoriais, integramos o acervo de referência presente na pasta `/ANÁLISE RELATORIO - FORESIGHT`.

### Por que a abordagem Markdown-First?
*   **Aproveitamento de esforço**: A base já estava convertida em fichas atômicas e estruturadas em Markdown (YAML frontmatter + links).
*   **Leveza**: Dispensa a necessidade de rodar e manter contêineres pesados de bancos vetoriais (como ChromaDB ou Pgvector) na produção.
*   **Versionamento**: Toda a base de conhecimento reside sob o controle de versão do Git no mesmo repositório do app.

### Como funciona o fluxo de compilação e consulta?
1.  **Build-Time (`compile-knowledge.ts`)**: Durante a etapa de build (`npm run build` ou `dev`), o script em TypeScript varre a pasta do acervo, lê os 132 arquivos Markdown, interpreta o frontmatter (autor, id, categoria) e consolida todo o conhecimento estruturado em um único arquivo de índice estático `src/data/knowledge.json`.
2.  **RAG local na requisição**: Quando a estudante envia uma pergunta, o endpoint do chat pesquisa no JSON importado as fichas cujo título, id ou conteúdo correspondam à dúvida do usuário (ex: buscando termos como "Manual Operacional" para obter a ficha `C004`).
3.  **Prompt Dinâmico**: Os textos das 4 principais fichas encontradas são injetados diretamente na diretriz do sistema do provedor LLM configurado (FIREWORKS por padrão), orientando a resposta da IA a citar as fontes (`[C004]`, `[C005]`) e seguir o contrato de rigor científico da escola.

---

## 🧠 3. Persistência de Conversas e Evolução Cognitiva

Para atender às restrições serverless (onde o backend Netlify é stateless e não guarda arquivos), a memória de progresso do usuário foi movida inteiramente para o lado do cliente:
*   **LocalStorage**: As mensagens do chat, a frequência de indagações e as barras de progresso do cockpit cognitivo lateral são lidas e sincronizadas em tempo real com o `localStorage` do navegador da estudante.
*   **Limpeza Segura**: Implementamos o botão de reset ("Reiniciar Investigação") no menu lateral esquerdo que apaga as chaves do `localStorage` e limpa o estado reativo do React para que a estudante possa iniciar um novo ciclo pedagógico do zero.

---

## 📝 4. Histórico do Desenvolvimento e Decisões

### Resolução de Conflito de Porta (Porta 3000)
*   **Data**: 03 de Junho de 2026
*   **Motivo**: A porta `3000` padrão da máquina de desenvolvimento estava ocupada por um servidor local alheio (`node server/index.js`).
*   **Ação**: Ajustamos a inicialização do Express local (`server.ts`) para escutar preferencialmente em `process.env.PORT` ou adotar a porta `3000` como default.

### Criação do Script de Compilação (`scripts/compile-knowledge.ts`)
*   **Data**: 03 de Junho de 2026
*   **Desafio**: O script falhava ao rodar a função `fs.statSync` no atalho `Relatorios-Finais`, que apontava para um volume externo ausente (broken symlink).
*   **Ação**: Atualizamos a varredura para utilizar `fs.lstatSync`, ignorando links simbólicos e contornando exceções de arquivos inválidos de forma resiliente.

### Implementação da Netlify Function e Configurações (`netlify.toml`)
*   **Data**: 03 de Junho de 2026
*   **Motivo**: Configurar o projeto para build automatizado no Netlify e expor a API de IA através de uma função serverless segura.
*   **Ação**: Criamos a função serverless em `netlify/functions/chat.ts` (que encapsula a chamada ao provedor LLM com segurança, mantendo a chave API protegida no painel do Netlify) e configuramos o `netlify.toml` para redirecionar de forma invisível as requisições de `/api/chat` para a função.

---

## 🚀 5. Como Executar e Implantar

### Desenvolvimento Local
1. Instale as dependências: `npm install`
2. Certifique-se de configurar a variável `FIREWORKS_API_KEY` no seu `.env`
3. Execute o servidor de desenvolvimento: `npm run dev`
4. Acesse em seu navegador: `http://localhost:3000`

### Build para Produção
*   O comando `npm run build` irá primeiro executar o compilador de conhecimento e depois empacotar o frontend React no diretório `/dist` e o servidor CJS local em `/dist/server.cjs`.

### Publicação no Netlify
1. Conecte o repositório GitHub do projeto ao Netlify.
2. Em **Build Settings**, configure:
   * **Build Command**: `npm run build`
   * **Publish Directory**: `dist`
3. Em **Environment Variables**, adicione a chave privada:
   * `FIREWORKS_API_KEY`: [Sua chave do provedor Fireworks]
4. Publique! O Netlify criará automaticamente a função de chat e hospedará o Learning Lab estático de forma segura.
