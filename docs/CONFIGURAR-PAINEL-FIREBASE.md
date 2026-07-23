# Configurar o painel com Firebase e Firestore

O painel usa Firebase Authentication para o login e Cloud Firestore para armazenar os links. O guia continua usando o catálogo local enquanto a configuração estiver vazia.

## 1. Criar o projeto e o aplicativo

1. Crie um projeto no Firebase.
2. Na tela inicial do projeto, adicione um aplicativo Web.
3. Copie o objeto `firebaseConfig` mostrado pelo Firebase.
4. Preencha `assets/js/firebase-config.js` com esses valores.

Exemplo:

```js
export const firebaseConfig = Object.freeze({
  apiKey: "SUA_API_KEY",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.firebasestorage.app",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
  adminUid: "UID_DO_SEU_USUARIO"
});
```

A configuração Web e a `apiKey` são públicas. A segurança das alterações fica nas regras do Firestore. Nunca coloque credenciais de servidor ou arquivos de conta de serviço no site.

## 2. Criar o Firestore

1. Abra Firestore Database.
2. Crie o banco em modo de produção.
3. Escolha uma região próxima dos seus visitantes.

## 3. Criar o administrador

1. Abra Authentication.
2. Em Sign-in method, ative E-mail/senha.
3. Em Users, crie manualmente seu usuário.
4. Copie o UID desse usuário.
5. Coloque o UID no campo `adminUid` de `assets/js/firebase-config.js`.

## 4. Publicar as regras

1. Abra o arquivo `firestore.rules`.
2. No Firestore, abra a aba Rules.
3. Cole o conteúdo completo e clique em Publish.

As regras deixam as ofertas visíveis para o site, mas somente o UID do administrador pode cadastrar ou alterar links.

## 5. Autorizar o domínio

Em Authentication > Settings > Authorized domains, confirme que estes domínios estão autorizados:

- `localhost`
- `ofertas-que-valem.vercel.app`
- `ofertasquevalem.shop`
- `www.ofertasquevalem.shop`

## 6. Liberar o envio de imagens

1. Abra Storage no Firebase e conclua a criação do armazenamento.
2. Abra a aba Rules do Storage.
3. Cole o conteúdo completo de `storage.rules`.
4. Clique em Publish.

As imagens enviadas pelo painel são guardadas automaticamente em:

`catalogo/<categoria>/<guia>/<produto>/`

Somente o administrador pode enviar imagens. A leitura é pública porque as imagens aparecem nos guias.

## 7. Usar o painel

1. Publique os arquivos atualizados.
2. Acesse `/painel-ofertas.html`.
3. Entre com o usuário administrador.
4. Crie a categoria e o guia.
5. Cadastre os produtos do ranking.
6. Cole os links das lojas e salve.

Para retirar uma oferta, apague o link daquela loja e salve novamente.

O site gera a página em `/guia/<endereco>`, adiciona os produtos à busca e ao comparador e inclui o guia no sitemap dinâmico.
