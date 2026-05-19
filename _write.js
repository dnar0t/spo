const fs = require('fs');
const content = fs.readFileSync('/dev/stdin', 'utf8');
fs.writeFileSync('/home/andreev/spo/packages/backend/src/application/planning/use-cases/get-backlog.use-case.ts', content);
console.log('Written successfully');
