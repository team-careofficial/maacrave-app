/** Tiny event bus so errors from anywhere (e.g. a failed action without its own handler) can show a toast. */
type Listener = (message: string) => void;
const listeners = new Set<Listener>();
export function onAppError(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
export function reportError(e: unknown) {
  const message = e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
  listeners.forEach((l) => l(message));
}
