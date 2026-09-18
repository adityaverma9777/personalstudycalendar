import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import syllabusData from './data/syllabusData';

export default function PdfSetupModal({ close, onProceed }) {
  const [subject, setSubject] = useState(syllabusData[0]?.subject || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleProceed = () => {
    if (!subject || !startDate || !endDate) {
      setError('Please fill all fields');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date');
      return;
    }
    onProceed({ subject, startDate, endDate });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal-content animate-fade-in setup-modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">PDF Setup</h3>
          <button className="btn btn-icon-bare" onClick={close}><X size={20} color="var(--text-muted)" /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {error && <div style={{ color: '#ef4444', fontSize: '14px', backgroundColor: '#fef2f2', padding: '8px', borderRadius: '4px' }}>{error}</div>}
          
          <div className="input-group">
            <label className="section-label">Select Subject</label>
            <select 
              className="input" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-dark)', backgroundColor: 'var(--bg-darker)', color: 'var(--text-light)' }}
            >
              {syllabusData.map(s => (
                <option key={s.subject} value={s.subject}>{s.subject}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="section-label">From Date</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--text-muted)" />
              <input 
                type="date" 
                className="input" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-dark)', backgroundColor: 'var(--bg-darker)', color: 'var(--text-light)' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="section-label">To Date</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--text-muted)" />
              <input 
                type="date" 
                className="input" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-dark)', backgroundColor: 'var(--bg-darker)', color: 'var(--text-light)' }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleProceed} style={{ width: '100%' }}>Continue to Camera</button>
        </div>
      </div>
    </div>
  );
}
