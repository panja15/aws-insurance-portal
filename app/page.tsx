'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';

interface UploadResponse {
  success: boolean;
  message: string;
  fileName?: string;
  s3Key?: string;
}

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    s3Key?: string;
  }>({
    type: null,
    message: '',
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setStatus({ type: null, message: '' });
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setStatus({
        type: 'error',
        message: 'File upload failed. Please select a file first.',
      });
      return;
    }

    setIsUploading(true);
    setStatus({ type: null, message: '' });

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResponse = await response.json();

      if (response.ok && data.success) {
        setStatus({
          type: 'success',
          message: 'File uploaded successfully.',
          s3Key: data.s3Key,
        });
      } else {
        setStatus({
          type: 'error',
          message: data.message || 'File upload failed.',
        });
      }
    } catch {
      setStatus({
        type: 'error',
        message: 'File upload failed. Network error or server unreachable.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="portal-container">
      <header className="portal-header">
        <h1>Insurance Document Upload Portal</h1>
        <p>Upload an insurance document for processing.</p>
      </header>

      <form onSubmit={handleUpload} className="upload-form">
        <div className="file-input-wrapper">
          <label htmlFor="file-upload" className="file-input-label">
            Select Document
          </label>
          <div className="file-picker-box">
            <label htmlFor="file-upload" className="browse-btn">
              Browse...
            </label>
            <input
              id="file-upload"
              type="file"
              className="file-input-hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <span
              className={`selected-file-name ${!selectedFile ? 'placeholder' : ''}`}
            >
              {selectedFile ? selectedFile.name : 'No file selected'}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="upload-btn"
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>

        {isUploading && (
          <div className="status-message loading" role="status">
            <div className="spinner" />
            <span>Uploading document to S3...</span>
          </div>
        )}

        {status.type === 'success' && (
          <div className="status-message success" role="alert">
            <strong>{status.message}</strong>
            {status.s3Key && (
              <div className="s3-key-info">
                S3 Key: <code>{status.s3Key}</code>
              </div>
            )}
          </div>
        )}

        {status.type === 'error' && (
          <div className="status-message error" role="alert">
            <strong>{status.message}</strong>
          </div>
        )}
      </form>
    </main>
  );
}
