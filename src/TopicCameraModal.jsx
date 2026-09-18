import React, { useState, useRef, useMemo } from 'react';
import { X, Camera, CheckCircle2, ChevronLeft, Download, ChevronDown, ChevronRight } from 'lucide-react';
import Webcam from 'react-webcam';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export default function TopicCameraModal({ close, pdfConfig, calendarData }) {
  const { subject, startDate, endDate } = pdfConfig;
  
  // Filter tasks and group by subject
  const groupedTasks = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const filtered = calendarData.filter(task => {
      if (subject !== 'ALL' && task.subject !== subject) return false;
      const taskDate = new Date(task.date);
      return taskDate >= start && taskDate <= end;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by subject
    const groups = {};
    filtered.forEach(task => {
      if (!groups[task.subject]) groups[task.subject] = [];
      groups[task.subject].push(task);
    });

    return Object.keys(groups).map(key => ({
      subject: key,
      tasks: groups[key]
    }));
  }, [subject, startDate, endDate, calendarData]);

  const [view, setView] = useState('list'); // 'list' or 'camera'
  const [activeTask, setActiveTask] = useState(null);
  const [topicImages, setTopicImages] = useState({}); // { [taskId]: [image1, image2...] }
  const [expandedSubjects, setExpandedSubjects] = useState({});
  
  const toggleSubject = (sub) => setExpandedSubjects(prev => ({...prev, [sub]: !prev[sub]}));

  const webcamRef = useRef(null);

  const handleCapture = React.useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc && activeTask) {
        setTopicImages(prev => ({
          ...prev,
          [activeTask.id]: [...(prev[activeTask.id] || []), imageSrc]
        }));
      }
    }
  }, [webcamRef, activeTask]);

  const openCamera = (task) => {
    setActiveTask(task);
    setView('camera');
  };

  const closeCamera = () => {
    setActiveTask(null);
    setView('list');
  };

  const removeImage = (taskId, index) => {
    setTopicImages(prev => {
      const newImages = [...(prev[taskId] || [])];
      newImages.splice(index, 1);
      return { ...prev, [taskId]: newImages };
    });
  };

  const generatePDF = async () => {
    if (Object.keys(topicImages).length === 0) {
      alert('No images captured to generate PDF.');
      return;
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297
    
    let isFirstPage = true;

    for (const group of groupedTasks) {
      // Check if this group has ANY images
      const groupHasImages = group.tasks.some(t => (topicImages[t.id] || []).length > 0);
      if (!groupHasImages) continue;

      // Add Subject Blank Page
      if (!isFirstPage) {
        pdf.addPage();
      } else {
        isFirstPage = false;
      }
      
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(32);
      const subjTitle = `Subject: ${group.subject}`;
      const subjWidth = pdf.getTextWidth(subjTitle);
      pdf.text(subjTitle, (pdfWidth - subjWidth) / 2, pdfHeight / 2);

      // Add Topics
      for (const task of group.tasks) {
        const images = topicImages[task.id] || [];
        if (images.length === 0) continue;

        // Add Topic Blank Page
        pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(24);
        const title = `Topic: ${task.chapter}`;
        const subtitle = `Date: ${format(new Date(task.date), 'MMM d, yyyy')}`;
        
        const titleWidth = pdf.getTextWidth(title);
        const subtitleWidth = pdf.getTextWidth(subtitle);
        pdf.text(title, (pdfWidth - titleWidth) / 2, pdfHeight / 2 - 10);
        
        pdf.setFontSize(16);
        pdf.text(subtitle, (pdfWidth - subtitleWidth) / 2, pdfHeight / 2 + 10);

        // Add images for this topic
        for (const dataUrl of images) {
          pdf.addPage();
          
          const imgProps = pdf.getImageProperties(dataUrl);
          const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
          
          const margin = 5;
          const availableWidth = pdfWidth - (margin * 2);
          const availableHeight = pdfHeight - (margin * 2);
          
          const finalRatio = Math.min(availableWidth / imgProps.width, availableHeight / imgProps.height);
          const width = imgProps.width * finalRatio;
          const height = imgProps.height * finalRatio;
          
          const x = (pdfWidth - width) / 2;
          const y = (pdfHeight - height) / 2;
          
          pdf.addImage(dataUrl, 'JPEG', x, y, width, height);
        }
      }
    }

    const filenamePrefix = subject === 'ALL' ? 'All_Subjects' : subject;
    const filename = `${filenamePrefix}_${format(new Date(startDate), 'MMM_d')}_to_${format(new Date(endDate), 'MMM_d')}.pdf`;
    pdf.save(filename);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content animate-fade-in" style={{ width: '90%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        
        {view === 'list' && (
          <>
            <div className="modal-header">
              <h3 className="modal-title">Topics: {subject === 'ALL' ? 'All Subjects' : subject}</h3>
              <button className="btn btn-icon-bare" onClick={close}><X size={20} color="var(--text-muted)" /></button>
            </div>
            
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <p className="section-label" style={{ marginBottom: '16px' }}>
                {format(new Date(startDate), 'MMM d, yyyy')} to {format(new Date(endDate), 'MMM d, yyyy')}
              </p>
              
              {groupedTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No topics found for this date range.
                </div>
              ) : (
                <div className="task-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {groupedTasks.map(group => (
                    <div key={group.subject}>
                      <button 
                        onClick={() => toggleSubject(group.subject)}
                        style={{ 
                          width: '100%', padding: '14px', display: 'flex', justifyContent: 'space-between', 
                          alignItems: 'center', backgroundColor: '#2a2a35', border: '1px solid var(--border-dark)', 
                          borderRadius: '8px', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s' 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {expandedSubjects[group.subject] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>{group.subject}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {group.tasks.length} topics
                        </div>
                      </button>
                      
                      {expandedSubjects[group.subject] && (
                        <div style={{ padding: '8px 0 8px 16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid var(--border-dark)', marginLeft: '8px', marginTop: '4px' }}>
                          {group.tasks.map(task => {
                            const images = topicImages[task.id] || [];
                            const isDone = images.length > 0;
                            
                            return (
                              <div key={task.id} className={`task-item ${isDone ? 'completed' : ''}`} style={{ cursor: 'default' }}>
                                <div className="task-checkbox">
                                  {isDone ? <CheckCircle2 size={20} color="#10b981" /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-dark)' }} />}
                                </div>
                                <div className="task-details" style={{ flex: 1 }}>
                                  <div className="task-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{task.chapter}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                      {format(new Date(task.date), 'MMM d')}
                                    </span>
                                  </div>
                                  <div className="task-desc">{task.whatToStudy}</div>
                                  {isDone && (
                                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                                      {images.length} Image{images.length > 1 ? 's' : ''} Captured
                                    </div>
                                  )}
                                </div>
                                <button 
                                  className="btn btn-sm btn-outline" 
                                  onClick={() => openCamera(task)}
                                  style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <Camera size={14} /> {isDone ? 'Add More' : 'Capture'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px', borderTop: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                {Object.keys(topicImages).length} Topics Completed
              </div>
              <button 
                className="btn btn-primary" 
                onClick={generatePDF}
                disabled={Object.keys(topicImages).length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: Object.keys(topicImages).length === 0 ? 0.5 : 1 }}
              >
                <Download size={16} /> Generate Final PDF
              </button>
            </div>
          </>
        )}

        {view === 'camera' && activeTask && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
              <button className="btn btn-icon-bare" onClick={closeCamera} style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={20} /> Back
              </button>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '14px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {activeTask.chapter}
              </div>
              <div style={{ width: '60px' }}></div> {/* Spacer */}
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {/* Capture Button Overlay */}
              <div style={{ position: 'absolute', bottom: '30px', left: '0', right: '0', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={handleCapture}
                  style={{ 
                    width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.3)', border: '4px solid white',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: 'white' }}></div>
                </button>
              </div>
            </div>

            {/* Gallery of captured images for current topic */}
            <div style={{ padding: '16px', backgroundColor: '#111', borderTop: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ color: 'white', fontSize: '14px' }}>Captured: {(topicImages[activeTask.id] || []).length}</div>
                <button className="btn btn-primary btn-sm" onClick={closeCamera}>Mark Done</button>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {(topicImages[activeTask.id] || []).map((src, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '60px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={src} alt="captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      onClick={() => removeImage(activeTask.id, idx)}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer', color: 'white' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
