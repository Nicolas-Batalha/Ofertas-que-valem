# Organização do catálogo

- Sempre que uma nova família de produtos for adicionada, crie uma pasta própria em `imagens/<categoria>/<tipo-do-produto>/`.
- Não coloque novas imagens de produto soltas na raiz de `imagens` nem misture tipos diferentes na mesma pasta.
- Todo produto publicado em `assets/data/produtos.json` deve ter `slugGuia` e `imagem` preenchidos. O painel usa esses campos para criar as pastas visuais automaticamente.
- Produtos do mesmo guia devem usar a mesma pasta de imagens. Exemplos atuais: `imagens/cozinha/air-fryer/` e `imagens/cozinha/cafeteira/`.
- Mantenha `precoAtual` e `precoReferencia` como `0` no catálogo. Preços reais devem ser cadastrados pelo painel e carregados do Firestore.
