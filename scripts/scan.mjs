import fs from 'fs';
import path from 'path';

function scan(dir, patterns) {
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) scan(fp, patterns);
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const c = fs.readFileSync(fp, 'utf8');
      for (const p of patterns) {
        if (c.includes(p)) {
          console.log('\n=== ' + fp + ' ===');
          c.split('\n').forEach((line, i) => {
            if (line.includes(p)) console.log('  L' + (i+1) + ': ' + line.trim());
          });
        }
      }
    }
  });
}

scan('src', ['stopPropagation', 'handleMouseDown', 'mousedown']);
