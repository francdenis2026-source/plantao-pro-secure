# VERSAO final

criar um projeto de um aplicativo chamado: PlantaoPro, Objetivo: Finalizar o aplicativo PlantaoPro (Gestão de Escalas), garantindo que o build funcione em qualquer navegador e que a segurança do banco de dados siga padrões rigorosos.

1. Configuração de Build e Inicialização (Foco em Compatibilidade)
Vite Config: Configurar base: './' e target: 'es2018' para garantir que os arquivos JS/CSS sejam encontrados em subdiretórios e funcionem em navegadores mais antigos.

Zero Bloqueio: Remover qualquer componente de "Splash Screen" ou "Intro Video" que dependa de estados complexos para liberar a UI. O aplicativo deve renderizar o PlantaoHome ou a tela de login imediatamente.

Resiliência de Cache: Manter o script de "App Version" no index.html que limpa Service Workers antigos para evitar loops de carregamento.

Otimização de Dependências: Forçar o optimizeDeps para bibliotecas como recharts e lodash para evitar erros de "export default" durante o carregamento do bundle.

2. Sistema de Autenticação e Admin
Administrador Master: Usuário franc / Senha franc1982.

Login Seguro: Implementar a autenticação de administrador via RPC no PostgreSQL, utilizando a tabela master_session_tokens para validar sessões no lado do servidor, em vez de depender apenas de sessionStorage.

Proteção de Rotas: Garantir que /dashboard e /master verifiquem o estado de isLoading do contexto de autenticação antes de renderizar, evitando flashes de tela preta.

3. Segurança do Banco de Dados (Supabase/PostgreSQL)
Políticas RLS: Aplicar Row Level Security (RLS) restritiva em todas as tabelas (agents, overtime_bank, chat_messages, etc.).

Acesso Autenticado: Nenhuma tabela deve permitir SELECT público. Substituir políticas USING(true) por TO authenticated.

Rate Limiting: Implementar a função check_rate_limit no banco de dados para registrar tentativas de login e bloquear ataques de força bruta após 5 tentativas falhas.

4. Interface e Performance
UI Imediata: Desabilitar animações de entrada com opacity: 0 no carregamento inicial. O conteúdo deve estar visível assim que o componente montar.

Fallback Visível: Garantir que o bg-slate-900 seja aplicado diretamente no body ou na div#root via CSS no index.html para evitar telas brancas durante o download do JavaScript.

O que este prompt faz por você:
Elimina a "Tela Preta": Resolve o problema onde o app só abria em um navegador específico.

Corrige o Build: Garante que, ao baixar o projeto, os caminhos dos arquivos estejam corretos.

Blinda o App: Fecha as brechas de segurança que o scanner do Lovable identificou anteriormente.

Deseja que eu adicione mais alguma regra específica sobre as funcionalidades de escala ou plantão antes de você enviar ao Lovable?

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://csplantaopro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/800ae548-c16a-4f31-b2cf-9fbcd408a19d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
