import { useState, useEffect } from 'react';

// Module-level singleton — shared across all tab pages without needing Context
let _surveyId: string | undefined = undefined;
const _listeners = new Set<(id: string | undefined) => void>();

export function setGlobalSurveyId(id: string | undefined) {
  _surveyId = id;
  _listeners.forEach(fn => fn(id));
}

export function useSelectedSurveyId(): string | undefined {
  const [id, setId] = useState(_surveyId);
  useEffect(() => {
    _listeners.add(setId);
    return () => { _listeners.delete(setId); };
  }, []);
  return id;
}
