import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, startOfMonth, endOfMonth, isSameMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, X, BookOpen, ChevronDown } from 'lucide-react';
import { databases, DATABASE_ID, TOPICS_COLLECTION_ID, NOTES_COLLECTION_ID } from './appwrite';
import calendarData from './data/calendarData.json';
import syllabusData from './data/syllabusData.js';
import { Query } from 'appwrite';
import PdfSetupModal from './PdfSetupModal';
import TopicCameraModal from './TopicCameraModal';

const EXPECTED_PASSWORD = import.meta.env.VITE_LOGIN_PASSWORD || 'password123';
const TOTAL_SYLLABUS = calendarData.length;
const AUTH_KEY = 'ssc_cal_auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date('2026-08-23'));
  const [view, setView] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isPdfSetupOpen, setIsPdfSetupOpen] = useState(false);
  const [isTopicCameraOpen, setIsTopicCameraOpen] = useState(false);
  const [pdfConfig, setPdfConfig] = useState(null);

  const [completedTopics, setCompletedTopics] = useState(new Set());
  const [notes, setNotes] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
    }
  }, [isAuthenticated]);

  const fetchUserData = async () => {
    try {
      const topicsResponse = await databases.listDocuments(DATABASE_ID, TOPICS_COLLECTION_ID, [Query.limit(1000)]);
      setCompletedTopics(new Set(topicsResponse.documents.map(doc => doc.$id)));

      const notesResponse = await databases.listDocuments(DATABASE_ID, NOTES_COLLECTION_ID, [Query.limit(1000)]);
      const notesMap = {};
      notesResponse.documents.forEach(doc => { notesMap[doc.$id] = doc.content; });
      setNotes(notesMap);
    } catch {
      const localTopics = JSON.parse(localStorage.getItem('completedTopics') || '[]');
      setCompletedTopics(new Set(localTopics));
      setNotes(JSON.parse(localStorage.getItem('notes') || '{}'));
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === EXPECTED_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const toggleTopicCompletion = async (taskId) => {
    const newCompleted = new Set(completedTopics);
    const isCompleted = newCompleted.has(taskId);

    if (isCompleted) {
      newCompleted.delete(taskId);
      try { await databases.deleteDocument(DATABASE_ID, TOPICS_COLLECTION_ID, taskId); } catch {}
    } else {
      newCompleted.add(taskId);
      try { await databases.createDocument(DATABASE_ID, TOPICS_COLLECTION_ID, taskId, { completed: true }); } catch {}
    }

    setCompletedTopics(newCompleted);
    localStorage.setItem('completedTopics', JSON.stringify(Array.from(newCompleted)));
  };

  const saveNote = async (dateStr, content) => {
    const newNotes = { ...notes, [dateStr]: content };
    setNotes(newNotes);
    localStorage.setItem('notes', JSON.stringify(newNotes));
    try {
      if (notes[dateStr] === undefined) {
        await databases.createDocument(DATABASE_ID, NOTES_COLLECTION_ID, dateStr, { content });
      } else {
        await databases.updateDocument(DATABASE_ID, NOTES_COLLECTION_ID, dateStr, { content });
      }
    } catch {}
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-box animate-fade-in">
          <h2 className="login-title">Welcome Back</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className={`input ${loginError ? 'input-error' : ''}`}
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
            />
            {loginError && <p className="login-error">Incorrect password. Try again.</p>}
            <button type="submit" className="btn btn-primary login-btn">Login</button>
          </form>
        </div>
      </div>
    );
  }

  const startDate = view === 'week' ? startOfWeek(currentDate) : startOfMonth(currentDate);
  const daysInView = eachDayOfInterval({ start: startOfWeek(startDate), end: endOfWeek(view === 'week' ? endOfWeek(currentDate) : endOfMonth(currentDate)) });

  const nextPeriod = () => setCurrentDate(view === 'week' ? addDays(currentDate, 7) : addDays(currentDate, 30));
  const prevPeriod = () => setCurrentDate(view === 'week' ? subDays(currentDate, 7) : subDays(currentDate, 30));

  const progressPercentage = TOTAL_SYLLABUS > 0 ? Math.round((completedTopics.size / TOTAL_SYLLABUS) * 100) : 0;

  return (
    <div className="app-layout">
      <div className="app-inner animate-fade-in">
        <header className="header">
          <div className="header-nav">
            <button className="btn btn-outline btn-icon" onClick={prevPeriod}><ChevronLeft size={18} /></button>
            <h2 className="header-title">
              {format(currentDate, view === 'week' ? 'MMM d, yyyy' : 'MMMM yyyy')}
            </h2>
            <button className="btn btn-outline btn-icon" onClick={nextPeriod}><ChevronRight size={18} /></button>
          </div>

          <div className="header-actions">
            <button
              className={`btn btn-sm ${view === 'week' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setView('week')}
            >Week</button>
            <button
              className={`btn btn-sm ${view === 'month' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setView('month')}
            >Month</button>
            <button
              className="btn btn-sm btn-outline syllabus-btn"
              onClick={() => setIsSyllabusOpen(true)}
            >
              <BookOpen size={14} /> <span>Syllabus</span>
            </button>
          </div>
        </header>

        <div className="calendar-wrapper">
          <div className="cal-header-row">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="calendar-header-cell">{day}</div>
            ))}
          </div>

          <div className="cal-days-grid">
            {daysInView.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTasks = calendarData.filter(t => t.date === dateStr);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isSameDay(day, new Date());

              return (
                <div
                  key={idx}
                  className={`calendar-cell ${!isCurrentMonth ? 'empty' : ''} ${isTodayDate ? 'today' : ''}`}
                  onClick={() => { setSelectedDate(day); setIsModalOpen(true); }}
                >
                  <div className="date-num"><span>{format(day, 'd')}</span></div>
                  <div className="cell-tasks">
                    {dayTasks.slice(0, 3).map(task => (
                      <div key={task.id} className={`task-indicator ${completedTopics.has(task.id) ? 'completed' : ''}`}>
                        {task.subject}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="task-indicator task-more">+{dayTasks.length - 3}</div>
                    )}
                  </div>
                  {dayTasks.length > 0 && (
                    <div className="cell-dot-row">
                      {dayTasks.map(task => (
                        <span key={task.id} className={`cell-dot ${completedTopics.has(task.id) ? 'dot-done' : ''}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isSyllabusOpen && <SyllabusModal close={() => setIsSyllabusOpen(false)} openPdfSetup={() => { setIsSyllabusOpen(false); setIsPdfSetupOpen(true); }} />}

      {isPdfSetupOpen && (
        <PdfSetupModal 
          close={() => setIsPdfSetupOpen(false)} 
          onProceed={(config) => {
            setPdfConfig(config);
            setIsPdfSetupOpen(false);
            setIsTopicCameraOpen(true);
          }} 
        />
      )}

      {isTopicCameraOpen && pdfConfig && (
        <TopicCameraModal 
          close={() => setIsTopicCameraOpen(false)} 
          pdfConfig={pdfConfig} 
          calendarData={calendarData} 
        />
      )}

      {isModalOpen && selectedDate && (
        <DayModal
          date={selectedDate}
          close={() => setIsModalOpen(false)}
          tasks={calendarData.filter(t => t.date === format(selectedDate, 'yyyy-MM-dd'))}
          completedTopics={completedTopics}
          toggleTopic={toggleTopicCompletion}
          note={notes[format(selectedDate, 'yyyy-MM-dd')] || ''}
          saveNote={saveNote}
        />
      )}

      <div className="progress-container">
        <div className="container progress-wrapper">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <div className="progress-text">{completedTopics.size}/{TOTAL_SYLLABUS} · {progressPercentage}%</div>
        </div>
      </div>
    </div>
  );
}

function DayModal({ date, close, tasks, completedTopics, toggleTopic, note, saveNote }) {
  const [currentNote, setCurrentNote] = useState(note);
  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    return () => { if (currentNote !== note) saveNote(dateStr, currentNote); };
  }, [currentNote, note, dateStr, saveNote]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal-content animate-fade-in">
        <div className="modal-header">
          <h3 className="modal-title">{format(date, 'EEE, MMM d, yyyy')}</h3>
          <button className="btn btn-icon-bare" onClick={close}><X size={20} color="var(--text-muted)" /></button>
        </div>

        <div className="modal-body">
          <p className="section-label">Scheduled Topics</p>

          {tasks.length === 0 ? (
            <p className="empty-msg">No topics scheduled.</p>
          ) : (
            <div className="task-list">
              {tasks.map(task => {
                const isCompleted = completedTopics.has(task.id);
                return (
                  <div key={task.id} className={`task-item ${isCompleted ? 'completed' : ''}`} onClick={() => toggleTopic(task.id)}>
                    <div className="task-checkbox">
                      {isCompleted ? <CheckCircle2 size={20} color="#10b981" /> : <Circle size={20} color="var(--border-dark)" />}
                    </div>
                    <div className="task-details">
                      <div className="task-title">{task.subject}: {task.chapter}</div>
                      <div className="task-desc">{task.whatToStudy}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="notes-section">
            <p className="section-label">Notes</p>
            <textarea
              className="notes-textarea"
              placeholder="Write your notes for today..."
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              onBlur={() => saveNote(dateStr, currentNote)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SyllabusModal({ close, openPdfSetup }) {
  const [activeSubject, setActiveSubject] = useState(syllabusData[0]);
  const [showSubjectList, setShowSubjectList] = useState(false);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal-content animate-fade-in syllabus-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 className="modal-title">Syllabus</h3>
            <button className="btn btn-primary btn-sm" onClick={openPdfSetup} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 8px' }}>
              Make PDF
            </button>
          </div>
          <button className="btn btn-icon-bare" onClick={close}><X size={20} color="var(--text-muted)" /></button>
        </div>

        <div className="mobile-subject-picker" onClick={() => setShowSubjectList(v => !v)}>
          <span>{activeSubject.subject}</span>
          <ChevronDown size={16} style={{ transform: showSubjectList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {showSubjectList && (
          <div className="mobile-subject-dropdown">
            {syllabusData.map(s => (
              <button
                key={s.subject}
                className={`mobile-subject-opt ${activeSubject.subject === s.subject ? 'active' : ''}`}
                onClick={() => { setActiveSubject(s); setShowSubjectList(false); }}
              >{s.subject}</button>
            ))}
          </div>
        )}

        <div className="syllabus-body">
          <div className="syllabus-subject-list">
            {syllabusData.map(s => (
              <button
                key={s.subject}
                className={`syllabus-subject-btn ${activeSubject.subject === s.subject ? 'active' : ''}`}
                onClick={() => setActiveSubject(s)}
              >{s.subject}</button>
            ))}
          </div>

          <div className="syllabus-topic-panel">
            <div className="syllabus-topic-header">
              <h4 style={{ fontWeight: 600 }}>{activeSubject.subject}</h4>
              <span className="topic-count">{activeSubject.topics.length} topics</span>
            </div>
            <ol className="syllabus-topic-list">
              {activeSubject.topics.map((topic, i) => (
                <li key={i} className="syllabus-topic-item">{topic}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
