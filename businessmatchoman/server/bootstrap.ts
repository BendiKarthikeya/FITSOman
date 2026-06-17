// Loads environment variables from .env.local (if present) then .env
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

const localPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localPath)) {
  config({ path: localPath });
}
// Fallback to .env as well (won't override existing keys)
config();

// Dynamically import the server AFTER env is loaded to avoid ESM hoisting
// that can cause modules to read env before dotenv finishes.
await import('./index.ts');
