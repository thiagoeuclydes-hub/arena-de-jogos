# ARENA DE JOGOS

Plataforma web interativa de sala de aula gamificada desenvolvida em React + Vite + Tailwind CSS + Firebase Firestore (Tempo Real).

## Passo a Passo para Configuração no Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Crie ou selecione um projeto.
3. Ative o **Cloud Firestore** em modo de teste (ou use as regras fornecidas em `firestore.rules`).
4. Crie um aplicativo Web nas configurações do projeto para obter as chaves de configuração.
5. Copie as credenciais e configure as Variáveis de Ambiente no Vercel (ou no arquivo `.env` localmente):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## Deploy no Vercel
- Conecte o repositório ao Vercel.
- Adicione as variáveis de ambiente prefixadas com `VITE_`.
- O arquivo `vercel.json` já está configurado para o redirecionamento de rotas SPA.
