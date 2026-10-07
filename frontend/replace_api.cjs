const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.vue')) results.push(file);
    }
  });
  return results;
}

const files = walk('d:/EmBong/frontend/src/views');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'http:\/\/localhost:5000\/api/g, "(import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '");
  content = content.replace(/`http:\/\/localhost:5000\/api/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}");
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
