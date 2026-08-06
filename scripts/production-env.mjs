import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function unquote(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadProductionEnvironment() {
  const environmentPath = resolve(process.cwd(), '.env');

  if (!existsSync(environmentPath)) {
    return;
  }

  for (const line of readFileSync(environmentPath, 'utf8').split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const name = trimmedLine.slice(0, separatorIndex).trim();
    const value = unquote(trimmedLine.slice(separatorIndex + 1));

    if (!process.env[name]) {
      process.env[name] = value;
    }
  }
}
