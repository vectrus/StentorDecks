/**
 * Free a TCP listen port (Windows + Unix). Used before Vite so relaunches don't fail.
 */
import { execSync } from 'node:child_process';

const port = Number(process.argv[2] || 5173);

function freeWindows(p) {
  let out = '';
  try {
    out = execSync(`netstat -ano | findstr :${p}`, { encoding: 'utf8' });
  } catch {
    return; // nothing listening
  }
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      console.info(`[free-port] killed PID ${pid} on :${p}`);
    } catch {
      /* already gone */
    }
  }
}

function freeUnix(p) {
  try {
    const out = execSync(`lsof -ti tcp:${p} -sTCP:LISTEN`, { encoding: 'utf8' });
    for (const pid of out.split(/\s+/).filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGTERM');
        console.info(`[free-port] killed PID ${pid} on :${p}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* nothing listening */
  }
}

if (process.platform === 'win32') freeWindows(port);
else freeUnix(port);
