const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { Worker } = require('worker_threads');
const { spawn } = require('child_process');
const os = require('os');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/processed', express.static('processed'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Ensure directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir('uploads', { recursive: true });
    await fs.mkdir('processed', { recursive: true });
    await fs.mkdir('workers', { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
};

// Simple Caesar cipher for demonstration
const caesarCipher = (text, shift, decrypt = false) => {
  const actualShift = decrypt ? -shift : shift;
  return text.replace(/[a-zA-Z]/g, (char) => {
    const start = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - start + actualShift + 26) % 26) + start);
  });
};

// Worker thread implementation
const processWithWorkerThreads = async (files, operation, shift) => {
  const startTime = Date.now();
  const numWorkers = Math.min(os.cpus().length, files.length);
  const filesPerWorker = Math.ceil(files.length / numWorkers);
  
  const workers = [];
  const results = [];

  for (let i = 0; i < numWorkers; i++) {
    const workerFiles = files.slice(i * filesPerWorker, (i + 1) * filesPerWorker);
    if (workerFiles.length === 0) break;

    const worker = new Worker(path.join(__dirname, 'crypto-worker.js'), {
      workerData: {
        files: workerFiles,
        operation,
        shift
      }
    });

    const workerPromise = new Promise((resolve, reject) => {
      worker.on('message', (result) => {
        results.push(...result);
        resolve();
      });
      worker.on('error', reject);
    });

    workers.push(workerPromise);
  }

  await Promise.all(workers);
  const endTime = Date.now();
  
  return {
    results,
    processingTime: endTime - startTime,
    method: 'Worker Threads'
  };
};

// Child process implementation
const processWithChildProcesses = async (files, operation, shift) => {
  const startTime = Date.now();
  const numProcesses = Math.min(os.cpus().length, files.length);
  const filesPerProcess = Math.ceil(files.length / numProcesses);
  
  const processes = [];
  const results = [];

  for (let i = 0; i < numProcesses; i++) {
    const processFiles = files.slice(i * filesPerProcess, (i + 1) * filesPerProcess);
    if (processFiles.length === 0) break;

    const processPromise = new Promise((resolve, reject) => {
      const child = spawn('node', [
        path.join(__dirname, 'crypto-process.js'),
        JSON.stringify({ files: processFiles, operation, shift })
      ]);

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            results.push(...result);
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on('error', reject);
    });

    processes.push(processPromise);
  }

  await Promise.all(processes);
  const endTime = Date.now();
  
  return {
    results,
    processingTime: endTime - startTime,
    method: 'Child Processes'
  };
};

// Sequential processing for comparison
const processSequentially = async (files, operation, shift) => {
  const startTime = Date.now();
  const results = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file.path, 'utf8');
      const processedContent = caesarCipher(content, shift, operation === 'decrypt');
      
      const outputPath = path.join('processed', 
        `${operation}_${Date.now()}_${file.originalname}`);
      
      await fs.writeFile(outputPath, processedContent);
      
      results.push({
        originalName: file.originalname,
        processedPath: outputPath,
        size: content.length
      });
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }

  const endTime = Date.now();
  
  return {
    results,
    processingTime: endTime - startTime,
    method: 'Sequential'
  };
};

// Routes
app.post('/upload', upload.array('files', 1000), (req, res) => {
  try {
    const files = req.files.map(file => ({
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size
    }));
    
    res.json({
      success: true,
      message: `${files.length} files uploaded successfully`,
      files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: error.message
    });
  }
});

app.post('/process', async (req, res) => {
  try {
    const { files, operation, method, shift = 3 } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    let result;
    
    switch (method) {
      case 'multithreading':
        result = await processWithWorkerThreads(files, operation, shift);
        break;
      case 'multiprocessing':
        result = await processWithChildProcesses(files, operation, shift);
        break;
      case 'sequential':
        result = await processSequentially(files, operation, shift);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid processing method'
        });
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing files',
      error: error.message
    });
  }
});

app.get('/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'processed', filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    res.download(filePath);
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
const startServer = async () => {
  await ensureDirectories();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch(console.error);