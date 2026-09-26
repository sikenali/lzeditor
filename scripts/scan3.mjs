import fs from 'fs';
import path from 'path';

function scan(d: string, patterns: string[]) {
  fs.readdirSync(d).forEach(f => {
    const fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) scan(fp, patterns);
    else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css')) {
      const c = fs.readFileSync(fp, 'utf8');
      for (const p of patterns) {
        if (c.includes(p)) {
          const lines = c.split('\n');
          lines.forEach((line, i) => {
            if (line.includes(p)) console.log(`${path.relative('src', fp)}:${i+1}: ${line.trim()}`);
          });
        }
      }
    }
  });
}

scan('src', ['UDToggle', 'ud-toggle', 'role="switch"', 'checked:', 'onChange']);
