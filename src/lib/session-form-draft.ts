const DRAFT_PREFIX = "arranjo-discursos-form-draft:";

function storageKey(key: string): string {
  return `${DRAFT_PREFIX}${key}`;
}

export function readSessionFormDraft<T>(key: string): T | null {
  const raw = sessionStorage.getItem(storageKey(key));
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Rascunho do formulário "${key}" inválido; será removido.`, error);
    sessionStorage.removeItem(storageKey(key));
    return null;
  }
}

export function hasSessionFormDraft(key: string): boolean {
  return sessionStorage.getItem(storageKey(key)) !== null;
}

export function saveSessionFormDraft<T>(key: string, value: T): void {
  sessionStorage.setItem(storageKey(key), JSON.stringify(value));
}

export function clearSessionFormDraft(key: string): void {
  sessionStorage.removeItem(storageKey(key));
}

