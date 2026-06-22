import type { KeyboardEvent } from "react";

/**
 * Faz um elemento que NÃO é `<button>` (card, chip, linha clicável) responder ao
 * teclado como um botão: dispara `handler` em Enter ou Espaço, com `preventDefault`
 * (o Espaço, sozinho, rolaria a página). Use sempre acompanhado de
 * `role="button"` + `tabIndex={0}` e um nome acessível (`aria-label`/texto).
 *
 *   <div role="button" tabIndex={0} onClick={open} onKeyDown={onActivate(open)} />
 *
 * Para alternâncias (chips on/off), some `aria-pressed={ativo}`.
 *
 * Obs.: se o elemento contém outros controles interativos (botões, links),
 * NÃO o transforme em `role="button"` — interativo dentro de interativo é
 * inválido. Nesses casos prefira um alvo de clique dedicado.
 */
export function onActivate<T extends HTMLElement = HTMLElement>(handler: () => void) {
  return (e: KeyboardEvent<T>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}
