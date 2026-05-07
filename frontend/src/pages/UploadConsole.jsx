import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function UploadConsole() {
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const onDrop = useCallback(acceptedFiles => {
    setFile(acceptedFiles[0]);
    setStatus('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'text/*': [],
      'image/*': []
    }
  });

  const getFileIcon = (fileName) => {
    if (!fileName) return '📎';
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = { pdf: '📄', docx: '📝', doc: '📝', txt: '📃', png: '🖼️', jpg: '🖼️', jpeg: '🖼️' };
    return icons[ext] || '📎';
  };

  const handleProcess = async () => {
    setLoading(true); setStatus('');
    try {
      let extractedText = rawText;
      let imageBase64 = null;
      let imageMime = null;

      if (file) {
        setLoadingStep('📤 Uploading file...');
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await axios.post(`${API}/upload`, formData, {
          headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.extractedText.startsWith('[IMAGE:')) {
          const parts = uploadRes.data.extractedText.split(':');
          imageBase64 = parts[1];
          imageMime = parts[2].replace(']', '');
        } else {
          extractedText = uploadRes.data.extractedText;
        }
      }

      setLoadingStep('🤖 Processing with AI...');
      const aiRes = await axios.post(`${API}/ai/generate`,
        { rawText: extractedText, imageBase64, imageMime },
        { headers: getHeaders() }
      );

      setLoadingStep('💾 Creating draft...');
      const articleRes = await axios.post(`${API}/articles`, {
        title: aiRes.data.title,
        summary: aiRes.data.summary,
        steps: aiRes.data.steps,
        tags: aiRes.data.tags,
        raw_input: extractedText,
        status: 'draft',
        conflict_flag: aiRes.data.conflicts && aiRes.data.conflicts.length > 0,
        conflict_note: aiRes.data.conflicts?.length
          ? `Possible conflict with: ${aiRes.data.conflicts.map(c => c.title).join(', ')}`
          : null
      }, { headers: getHeaders() });

      navigate(`/draft/${articleRes.data.id}?aiData=${encodeURIComponent(JSON.stringify(aiRes.data))}`);
    } catch (err) {
      setStatus('Error: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
    setLoadingStep('');
  };

  const canProcess = !loading && (rawText.trim() || file);

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '36px 32px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#D40511', margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>
            📤 Upload Console
          </h2>
          <p style={{ color: '#888', margin: 0, fontSize: 14 }}>
            Upload a file or paste raw content — AI will structure it into a KB article automatically.
          </p>
        </div>

        {/* Supported formats banner */}
        <div style={{
          background: '#fff5f5', border: '1px solid #fecaca',
          borderRadius: 10, padding: '10px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 13, color: '#D40511', fontWeight: 700 }}>Supported formats:</span>
          {['📄 PDF', '📝 DOCX', '📃 TXT', '🖼️ PNG', '🖼️ JPG'].map(f => (
            <span key={f} style={{
              background: 'white', border: '1px solid #fca5a5',
              borderRadius: 6, padding: '2px 10px', fontSize: 12,
              color: '#666', fontWeight: 600
            }}>{f}</span>
          ))}
        </div>

        {/* Upload card */}
        <div style={{
          background: 'white', borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          overflow: 'hidden', marginBottom: 20
        }}>
          {/* Dropzone */}
          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? '#D40511' : file ? '#27ae60' : '#e5e7eb'}`,
            borderRadius: 12, margin: 20,
            padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
            background: isDragActive ? '#fff5f5' : file ? '#f0fdf4' : '#fafafa',
            transition: 'all 0.2s'
          }}>
            <input {...getInputProps()} />
            {file ? (
              <div>
                <div style={{ fontSize: 48, marginBottom: 10 }}>{getFileIcon(file.name)}</div>
                <p style={{ color: '#27ae60', fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>
                  {file.name}
                </p>
                <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>
                  {(file.size / 1024).toFixed(1)} KB · Click or drag to replace
                </p>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                  style={{
                    marginTop: 10, background: '#fee2e2', border: 'none',
                    color: '#c00', borderRadius: 6, padding: '4px 12px',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600
                  }}>
                  ✕ Remove file
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 48, marginBottom: 12 }}>
                  {isDragActive ? '📂' : '☁️'}
                </div>
                <p style={{ color: isDragActive ? '#D40511' : '#555', fontWeight: 600, fontSize: 15, margin: '0 0 6px' }}>
                  {isDragActive ? 'Drop your file here!' : 'Drag & drop your file here'}
                </p>
                <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 14px' }}>
                  PDF, DOCX, TXT, PNG, JPG supported
                </p>
                <span style={{
                  background: '#D40511', color: 'white',
                  borderRadius: 8, padding: '8px 20px',
                  fontSize: 13, fontWeight: 600
                }}>Browse Files</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
            <span style={{
              padding: '0 14px', color: '#bbb', fontSize: 13,
              fontWeight: 600, background: 'white'
            }}>OR paste text</span>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          </div>

          {/* Textarea */}
          <div style={{ padding: '0 20px 20px' }}>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={7}
              placeholder="Paste chat messages, email threads, notes, SOPs, or any raw content here...&#10;&#10;Example:&#10;Teams message: 'Label not printing — please fix ASAP'&#10;Reply: 'Restart print spooler and clear the queue'"
              style={{
                width: '100%', padding: '14px 16px',
                border: '1.5px solid #e5e7eb', borderRadius: 10,
                fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'inherit', lineHeight: 1.6,
                outline: 'none', color: '#333',
                background: rawText ? 'white' : '#fafafa'
              }}
            />
            {rawText && (
              <p style={{ color: '#aaa', fontSize: 12, margin: '4px 0 0', textAlign: 'right' }}>
                {rawText.length} characters
              </p>
            )}
          </div>
        </div>

        {/* Error message */}
        {status && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            color: '#dc2626', fontSize: 14, display: 'flex', gap: 8
          }}>
            ⚠️ {status}
          </div>
        )}

        {/* Process button */}
        <button
          onClick={handleProcess}
          disabled={!canProcess}
          style={{
            width: '100%', padding: '15px',
            background: canProcess
              ? 'linear-gradient(135deg, #D40511, #ff2020)'
              : '#e5e7eb',
            color: canProcess ? 'white' : '#aaa',
            border: 'none', borderRadius: 12,
            fontSize: 16, cursor: canProcess ? 'pointer' : 'not-allowed',
            fontWeight: 700, letterSpacing: 0.3,
            boxShadow: canProcess ? '0 4px 20px rgba(212,5,17,0.35)' : 'none',
            transition: 'all 0.2s'
          }}>
          {loading ? (
            <span>⏳ {loadingStep || 'Processing...'}</span>
          ) : (
            <span>Process & Generate Draft →</span>
          )}
        </button>

        {/* Helper text */}
        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 12 }}>
          AI will automatically generate title, summary, steps and tags from your content
        </p>

      </div>
    </div>
  );
}