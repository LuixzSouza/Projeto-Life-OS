// Coordenadas (px) do cursor dentro de um <textarea>, via técnica do "mirror div".
// Usado para ancorar o menu de comandos "/" exatamente onde o usuário está digitando.
// Sem dependências e sem `any` — espelha o estilo computado do textarea num div oculto.

const MIRRORED_PROPS = [
  "box-sizing", "width", "height",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "font-family", "font-size", "font-weight", "font-style", "font-variant",
  "letter-spacing", "line-height", "text-align", "text-transform", "text-indent",
  "white-space", "word-spacing", "tab-size",
];

export interface CaretCoords {
  top: number;
  left: number;
  height: number;
}

export function getCaretCoordinates(el: HTMLTextAreaElement, position: number): CaretCoords {
  const computed = window.getComputedStyle(el);
  const div = document.createElement("div");
  const style = div.style;

  style.position = "absolute";
  style.visibility = "hidden";
  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.overflow = "hidden";
  for (const prop of MIRRORED_PROPS) {
    style.setProperty(prop, computed.getPropertyValue(prop));
  }

  div.textContent = el.value.substring(0, position);

  const span = document.createElement("span");
  // O caractere garante uma caixa mensurável mesmo no fim do texto.
  span.textContent = el.value.substring(position) || ".";
  div.appendChild(span);

  document.body.appendChild(div);
  const top = span.offsetTop + parseInt(computed.getPropertyValue("border-top-width"), 10);
  const left = span.offsetLeft + parseInt(computed.getPropertyValue("border-left-width"), 10);
  const height = parseInt(computed.getPropertyValue("line-height"), 10) || span.offsetHeight;
  document.body.removeChild(div);

  return { top, left, height };
}
