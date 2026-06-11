// Ponte card → modo foco: o SubjectCard pede para estudar uma matéria e o
// StudyTimer (que vive em outro galho da árvore) seleciona e abre o foco.
// Mesmo padrão de evento global do focus-core. Client-safe, zero estado.

const START_EVENT = "lifeos:studies:start";

interface StudyStartDetail {
  subjectId: string;
}

/** Dispara o pedido "estudar esta matéria agora" (chamado pelo card). */
export function requestStudyStart(subjectId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StudyStartDetail>(START_EVENT, { detail: { subjectId } }));
}

/** Escuta pedidos de estudo (chamado pelo StudyTimer). Devolve o unsubscribe. */
export function onStudyStart(cb: (subjectId: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<StudyStartDetail>).detail;
    if (detail?.subjectId) cb(detail.subjectId);
  };
  window.addEventListener(START_EVENT, handler);
  return () => window.removeEventListener(START_EVENT, handler);
}
