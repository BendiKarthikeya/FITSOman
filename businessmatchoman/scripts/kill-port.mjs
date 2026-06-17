#!/usr/bin/env node
// Cross-platform port killer. Usage: node scripts/kill-port.mjs [port...]
import { execSync } from 'node:child_process';

const ports = process.argv.slice(2).map(n => parseInt(n, 10)).filter(Boolean);
if (ports.length === 0) ports.push(5000);

function killOnWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const pids = [...new Set(
      out
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => l.split(/\s+/).pop())
        .filter(Boolean)
    )];
    pids.forEach(pid => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`Killed PID ${pid} on :${port}`);
      } catch {}
    });
  } catch {
    // Nothing listening
  }
}

function killOnUnix(port) {
  try {
    const pidsStr = execSync(`lsof -ti :${port} || true`, { stdio: ['ignore', 'pipe', 'ignore'], shell: '/bin/bash' }).toString();
    const pids = pidsStr.split(/\s+/).filter(Boolean);
    pids.forEach(pid => {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        console.log(`Killed PID ${pid} on :${port}`);
      } catch {}
    });
  } catch {}
}

const isWindows = process.platform === 'win32';
for (const port of ports) {
  if (isWindows) killOnWindows(port); else killOnUnix(port);
}

