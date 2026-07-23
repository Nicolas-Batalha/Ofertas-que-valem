(() => {
  "use strict";
  const botao = document.querySelector(".botao-menu");
  const menu = document.querySelector("#menu-principal");
  const fechar = () => {
    if (!botao || !menu) return;
    botao.setAttribute("aria-expanded", "false");
    botao.setAttribute("aria-label", "Abrir menu");
    menu.classList.remove("menu-aberto");
  };
  botao?.addEventListener("click", () => {
    const abrir = botao.getAttribute("aria-expanded") !== "true";
    botao.setAttribute("aria-expanded", String(abrir));
    botao.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
    menu?.classList.toggle("menu-aberto", abrir);
  });
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", fechar));
  document.addEventListener("click", (evento) => {
    if (menu?.classList.contains("menu-aberto") && !document.querySelector(".cabecalho-conteudo")?.contains(evento.target)) fechar();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fechar();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 800) fechar();
  }, { passive: true });
})();