(() => {
  "use strict";

  const formularios = [...document.querySelectorAll(".busca-cabecalho")];
  if (!formularios.length) return;

  formularios.forEach((formulario) => {
    const campo = formulario.querySelector('input[type="search"]');
    if (!campo) return;
    formulario.action = "/busca.html";
    formulario.method = "get";
    campo.name = "busca";
    campo.setAttribute("autocomplete", "off");
  });

  fetch("/assets/data/produtos.json", { cache: "no-store" })
    .then((resposta) => {
      if (!resposta.ok) throw new Error("Catálogo indisponível");
      return resposta.json();
    })
    .then((catalogo) => {
      const produtos = Array.isArray(catalogo.produtos) ? catalogo.produtos : [];
      if (!produtos.length) return;

      const lista = document.createElement("datalist");
      lista.id = "sugestoes-busca-global";

      const sugestoes = new Set();
      produtos.forEach((produto) => {
        sugestoes.add(produto.nome);
        sugestoes.add(produto.categoria);
      });
      ["Air fryer", "Cafeteira", "Robô aspirador", "Fone Bluetooth"].forEach((item) => sugestoes.add(item));

      [...sugestoes].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach((sugestao) => {
        const opcao = document.createElement("option");
        opcao.value = sugestao;
        lista.append(opcao);
      });

      document.body.append(lista);
      formularios.forEach((formulario) => {
        formulario.querySelector('input[type="search"]')?.setAttribute("list", lista.id);
      });
    })
    .catch(() => {
      // O formulário continua levando para a página de busca mesmo sem sugestões.
    });
})();
