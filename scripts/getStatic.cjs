const fs = require('fs').promises; // 使用fs的promises API实现异步操作
const path = require('path');

async function scanDirectory(directory) {
  try {
    const items = await fs.readdir(directory);
    const arr = []
    for (const item of items) {
      const suffix = path.extname(item).toLocaleLowerCase().replace('.', '');
      const cls = {
        mid: 'MidiFileItem',
        png: 'ImageFileItem',
        mp3: 'SoundFileItem',
      }[suffix]
      arr.push({ name: item, suffix, cls, line: `"${item.replace(/\..*/, '')}":  new ${cls}({ path: "${item}" })` });
    }

    arr.sort((a, b) => a.suffix.localeCompare(b.suffix))
    console.log(arr.map(item => item.line).join(',\n'))
  } catch (error) {
    console.error("Error scanning directory:", error.message);
  }
}

const targetDirectory = "./public";

scanDirectory(targetDirectory);