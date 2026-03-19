const fs = require('fs'); const str = fs.readFileSync('schools_output.json', 'utf16le').replace(/^\uFEFF/, ''); const data = JSON.parse(str); data.forEach(s => console.log('School:', s.name));
