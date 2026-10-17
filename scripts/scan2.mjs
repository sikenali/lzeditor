import fs from 'fs';
import path from 'path';

function w(d) {
  fs.readdirSync(d).forEach(f => {
    const fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) w(fp);
    else if (f.endsWith('.tsx')) {
      const c = fs.readFileSync(fp, 'utf8');
      const lines = c.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('panel-container') || line.includes('panel-backdrop') || line.includes('class="panel')) {
          console.log(fp + ':' + (i+1) + ' ' + line.trim());
        }
      });
    }
  });
}
w('src');
