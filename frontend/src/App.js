import React, { useState, useRef } from 'react';
import { Upload, FileText, Lock, Unlock, Download, BarChart3, Clock, Cpu, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';

const API_BASE_URL = 'http://localhost:5001';

export default function FileEncryptorApp() {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [operation, setOperation] = useState('encrypt');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [currentMethod, setCurrentMethod] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      alert('Please select files first');
      return;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setUploadedFiles(result.files);
        alert(`${result.files.length} files uploaded successfully!`);
      } else {
        alert('Error uploading files: ' + result.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading files');
    }
  };

  const processFiles = async (method) => {
    if (uploadedFiles.length === 0) {
      alert('Please upload files first');
      return;
    }

    setProcessing(true);
    setCurrentMethod(method);

    try {
      const response = await fetch(`${API_BASE_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: uploadedFiles,
          operation,
          method,
          shift: 3
        }),
      });

      const result = await response.json();
      if (result.success) {
        setResults(prev => [...prev, result]);
        
        // Update performance data
        const newPerformanceData = {
          method: result.method,
          time: result.processingTime,
          files: uploadedFiles.length,
          operation
        };
        
        setPerformanceData(prev => [...prev, newPerformanceData]);
        
        alert(`${operation} completed in ${result.processingTime}ms using ${result.method}`);
      } else {
        alert('Error processing files: ' + result.message);
      }
    } catch (error) {
      console.error('Processing error:', error);
      alert('Error processing files');
    } finally {
      setProcessing(false);
      setCurrentMethod('');
    }
  };

  const downloadFile = async (filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/download/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error downloading file');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file');
    }
  };

  const clearAll = () => {
    setFiles([]);
    setUploadedFiles([]);
    setResults([]);
    setPerformanceData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (time) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'multithreading':
        return <Cpu className="w-4 h-4" />;
      case 'multiprocessing':
        return <Zap className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const chartData = performanceData.map((data, index) => ({
    name: data.method,
    time: data.time,
    files: data.files,
    id: index
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Parallel File Encryptor/Decryptor
          </h1>
          <p className="text-gray-600">
            Compare performance between multithreading and multiprocessing
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Upload className="w-6 h-6 mr-2 text-blue-600" />
              File Upload
            </h2>
            
            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Select multiple text files (up to 1000 files)
                </p>
              </div>
              
              {files.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    Selected: {files.length} files
                  </p>
                  <div className="max-h-32 overflow-y-auto mt-2">
                    {files.slice(0, 10).map((file, index) => (
                      <div key={index} className="flex items-center text-xs text-gray-600 py-1">
                        <FileText className="w-3 h-3 mr-1" />
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </div>
                    ))}
                    {files.length > 10 && (
                      <p className="text-xs text-gray-500">...and {files.length - 10} more files</p>
                    )}
                  </div>
                </div>
              )}
              
              <button
                onClick={uploadFiles}
                disabled={files.length === 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Upload Files
              </button>
            </div>
          </div>

          {/* Operation Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Operation Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="encrypt"
                      checked={operation === 'encrypt'}
                      onChange={(e) => setOperation(e.target.value)}
                      className="mr-2"
                    />
                    <Lock className="w-4 h-4 mr-1" />
                    Encrypt
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="decrypt"
                      checked={operation === 'decrypt'}
                      onChange={(e) => setOperation(e.target.value)}
                      className="mr-2"
                    />
                    <Unlock className="w-4 h-4 mr-1" />
                    Decrypt
                  </label>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-green-700">
                    Ready to process: {uploadedFiles.length} files
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Processing Buttons */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Processing Methods
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => processFiles('multithreading')}
                disabled={processing}
                className="flex items-center justify-center py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Cpu className="w-5 h-5 mr-2" />
                {processing && currentMethod === 'multithreading' ? 'Processing...' : 'Multithreading'}
              </button>
              
              <button
                onClick={() => processFiles('multiprocessing')}
                disabled={processing}
                className="flex items-center justify-center py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Zap className="w-5 h-5 mr-2" />
                {processing && currentMethod === 'multiprocessing' ? 'Processing...' : 'Multiprocessing'}
              </button>
              
              <button
                onClick={() => processFiles('sequential')}
                disabled={processing}
                className="flex items-center justify-center py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Clock className="w-5 h-5 mr-2" />
                {processing && currentMethod === 'sequential' ? 'Processing...' : 'Sequential'}
              </button>
            </div>
          </div>
        )}

        {/* Performance Chart */}
        {performanceData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
              Performance Comparison
            </h2>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [formatTime(value), 'Processing Time']}
                  />
                  <Legend />
                  <Bar dataKey="time" fill="#3B82F6" name="Processing Time (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {performanceData.map((data, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    {getMethodIcon(data.method.toLowerCase())}
                    <h3 className="font-semibold text-gray-800 ml-2">{data.method}</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Time: <span className="font-medium">{formatTime(data.time)}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Files: <span className="font-medium">{data.files}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Operation: <span className="font-medium capitalize">{data.operation}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Processing Results
            </h2>
            
            <div className="space-y-4">
              {results.map((result, resultIndex) => (
                <div key={resultIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">
                      {result.method} - {formatTime(result.processingTime)}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {result.results.length} files processed
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {result.results.map((file, fileIndex) => (
                      <div key={fileIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <span className="truncate mr-2">{file.originalName}</span>
                        <button
                          onClick={() => downloadFile(file.processedPath)}
                          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clear All Button */}
        {(files.length > 0 || uploadedFiles.length > 0 || results.length > 0) && (
          <div className="text-center mt-8">
            <button
              onClick={clearAll}
              className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}