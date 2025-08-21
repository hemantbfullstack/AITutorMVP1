// Event bus for graph rendering commands
export type GraphPayload = { 
  functions: string[]; 
  xmin: number; 
  xmax: number; 
};

export function emitGraphRender(payload: GraphPayload) {
  window.dispatchEvent(new CustomEvent("app:graph:render", { detail: payload }));
}

export function onGraphRender(callback: (payload: GraphPayload) => void) {
  const handler = (e: Event) => callback((e as CustomEvent).detail);
  window.addEventListener("app:graph:render", handler as EventListener);
  return () => window.removeEventListener("app:graph:render", handler as EventListener);
}