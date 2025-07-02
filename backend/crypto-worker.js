const { parentPort, workerData } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');

// Caesar cipher function
const caesarCipher = (text, shift, decrypt = false) => {
  const actualShift = decrypt ? -shift : shift;
  return text.replace(/[a-zA-Z]/g, (char) => {
    const start = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - start + actualShift + 26) % 26) + start);
  });
};

const processFiles = async () => {
  const { files, operation, shift } = workerData;
  const results = [];

  try {
    for (const file of files) {
      const content = await fs.readFile(file.path, 'utf8');
      const processedContent = caesarCipher(content, shift, operation === 'decrypt');
      
      const outputPath = path.join('processed', 
        `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.originalname}`);
      
      await fs.writeFile(outputPath, processedContent);
      
      results.push({
        originalName: file.originalname,
        processedPath: path.basename(outputPath),
        size: content.length,
        operation
      });
    }

    parentPort.postMessage(results);
  } catch (error) {
    console.error('Worker error:', error);
    parentPort.postMessage([]);
  }
};

processFiles();