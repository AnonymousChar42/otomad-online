const fs = require('fs').promises; // 使用fs的promises API实现异步操作
const path = require('path');

async function scanDirectory(directory) {
  try {
    const items = await fs.readdir(directory);
    for (const item of items) {
      const suffix = path.extname(item);
      const cls = {
        mid: 'MidiFileItem',
        png: 'ImageFileItem',
        mp3: 'SoundFileItem',
      }[suffix.toLocaleLowerCase().replace('.', '')]
      console.log(`"${item.replace(/\..*/, '')}":  new ${cls}({ path: "${item}" }),`);
    }
  } catch (error) {
    console.error("Error scanning directory:", error.message);
  }
}

const targetDirectory = "./public";

scanDirectory(targetDirectory);