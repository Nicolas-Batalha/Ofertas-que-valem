(() => {
  "use strict";
  const navegacao = document.querySelector(".abas-categoria");
  if (!navegacao) return;

  const links = [...navegacao.querySelectorAll('a[href^="#"]')];
  const secoes = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  function ativar(id) {
    links.forEach((link) => {
      const atual = link.getAttribute("href") === "#" + id;
      if (atual) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  let agendado = false;
  function acompanharRolagem() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      let atual = secoes[0];
      secoes.forEach((secao) => {
        if (secao.getBoundingClientRect().top <= 190) atual = secao;
      });
      if (atual) ativar(atual.id);
      agendado = false;
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", () => ativar(link.getAttribute("href").slice(1)));
  });
  window.addEventListener("scroll", acompanharRolagem, { passive: true });
  acompanharRolagem();
})();
