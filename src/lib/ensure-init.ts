// Ensure app is initialized before handling API requests
// Idempotent — safe to call multiple times (no-op after first init)
import { initializeApp } from '@/app/api/startup';

let initPromise: Promise<void> | null = null;

export function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeApp().catch((err) => {
      initPromise = null; // Allow retry on failure
      throw err;
    });
  }
  return initPromise;
}
