import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Save, 
  Download, 
  Trash2, 
  X, 
  ShieldCheck, 
  Server,
  Cloud,
  FileCheck
} from 'lucide-react';
import { 
  checkServerHealth, 
  saveExamSessionToDB, 
  fetchSessionsListFromDB, 
  loadExamSessionFromDB, 
  deleteExamSessionFromDB 
} from '../services/api';

export default function DatabaseSyncModal({
  isOpen,
  onClose,
  currentSessionData,
  onLoadSession
}) {
  const [activeTab, setActiveTab] = useState('save'); // 'save' | 'load'
  const [sessionName, setSessionName] = useState('Half_Yearly_2026_27');
  const [dbStatus, setDbStatus] = useState({ connected: false, loading: true });
  const [savedSessions, setSavedSessions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message, errors: [] }

  // Check health and list sessions when modal opens
  useEffect(() => {
    if (isOpen) {
      handleRefreshStatus();
    }
  }, [isOpen]);

  const handleRefreshStatus = async () => {
    setDbStatus((prev) => ({ ...prev, loading: true }));
    setFeedback(null);

    const health = await checkServerHealth();
    const isConn = health?.database?.connected || false;
    setDbStatus({
      connected: isConn,
      loading: false,
      host: health?.database?.host,
      name: health?.database?.name,
    });

    if (isConn) {
      const list = await fetchSessionsListFromDB();
      setSavedSessions(list);
    }
  };

  // Save current session to MongoDB with Zod validation
  const handleSaveToDB = async (e) => {
    e.preventDefault();
    if (!sessionName.trim()) {
      setFeedback({ type: 'error', message: 'कृपया सत्र का नाम दर्ज करें (Session Name is required)।' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    // Prepare full payload
    const payload = {
      sessionName: sessionName.trim(),
      activeShift: currentSessionData.activeShift || 'shift_1',
      examDetails: currentSessionData.examDetails || { schoolName: 'A B V I C', examName: 'Exam' },
      classes: currentSessionData.classes || [],
      rooms: currentSessionData.rooms || [],
      teachers: currentSessionData.teachers || [],
      dutyRoster: currentSessionData.dutyRoster || {},
      marksData: currentSessionData.marksData || {},
      subjectConfig: currentSessionData.subjectConfig || {},
    };

    const res = await saveExamSessionToDB(payload);
    setIsSaving(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message || 'सत्र सफलतापूर्वक MongoDB में सुरक्षित हो गया!',
      });
      // Refresh saved sessions list
      const list = await fetchSessionsListFromDB();
      setSavedSessions(list);
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
        errors: res.errors || [],
      });
    }
  };

  // Load a session from MongoDB into React State
  const handleLoadSessionItem = async (sessionItem) => {
    if (!window.confirm(`क्या आप सत्र '${sessionItem.sessionName}' (${sessionItem.activeShift}) को लोड करना चाहते हैं? वर्तमान असहेजा डेटा बदल जाएगा।`)) {
      return;
    }

    setIsLoadingSession(true);
    const res = await loadExamSessionFromDB(sessionItem.sessionName, sessionItem.activeShift);
    setIsLoadingSession(false);

    if (res.success && res.data) {
      onLoadSession(res.data);
      setFeedback({
        type: 'success',
        message: `सत्र '${sessionItem.sessionName}' सफलतापूर्वक लोड हो गया!`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'सत्र लोड करने में त्रुटि।',
      });
    }
  };

  // Delete a session from MongoDB
  const handleDeleteSession = async (sessionItem) => {
    if (!window.confirm(`क्या आप सत्र '${sessionItem.sessionName}' को सचमुच MongoDB से हटाना चाहते हैं?`)) {
      return;
    }

    const res = await deleteExamSessionFromDB(sessionItem.sessionName, sessionItem.activeShift);
    if (res.success) {
      setSavedSessions(savedSessions.filter((s) => !(s.sessionName === sessionItem.sessionName && s.activeShift === sessionItem.activeShift)));
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Database className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  MongoDB + Mongoose Database Sync
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                  Zod Validated
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                सीटिंग प्लान, कक्षाएं, अध्यापक ड्यूटी एवं अंकतालिका को क्लाउड या लोकल MongoDB में सुरक्षित करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Live Status Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                dbStatus.connected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="font-bold text-slate-700">
              MongoDB स्थिति:
            </span>
            {dbStatus.loading ? (
              <span className="text-slate-400">जाँच हो रही है...</span>
            ) : dbStatus.connected ? (
              <span className="text-emerald-700 font-black">
                🟢 कनेक्टेड ({dbStatus.host || 'Local'}/{dbStatus.name || 'exam_seating_db'})
              </span>
            ) : (
              <span className="text-rose-600 font-bold">
                🔴 डिस्कनेक्टेड (Backend / MongoDB Offline)
              </span>
            )}
          </div>

          <button
            onClick={handleRefreshStatus}
            disabled={dbStatus.loading}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${dbStatus.loading ? 'animate-spin' : ''}`} />
            <span>पुनः जाँचें</span>
          </button>
        </div>

        {/* Instructions Banner when Disconnected */}
        {!dbStatus.connected && !dbStatus.loading && (
          <div className="p-4 mx-4 sm:mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-black text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>MongoDB से कनेक्ट करने के निर्देश:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              1. टर्मिनल में बैकएंड सर्वर शुरू करें: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">npm run server</code>
              <br />
              2. सुनिश्चित करें कि आपका <strong>MongoDB Service</strong> चल रहा है (या <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">.env</code> फ़ाइल में अपना MongoDB Atlas URI डालें)।
            </p>
          </div>
        )}

        {/* Feedback Alert Box */}
        {feedback && (
          <div
            className={`p-4 mx-4 sm:mx-5 mt-4 rounded-xl border text-xs space-y-1 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-black">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>

            {feedback.errors && feedback.errors.length > 0 && (
              <ul className="pl-6 list-disc space-y-0.5 text-[11px] text-rose-800 mt-2">
                {feedback.errors.map((err, idx) => (
                  <li key={idx}>
                    <strong className="font-mono">{err.field}:</strong> {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-4 sm:px-5 mt-4 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('save'); setFeedback(null); }}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'save'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>1. वर्तमान सत्र सुरक्षित करें (Save Session)</span>
          </button>
          <button
            onClick={() => { setActiveTab('load'); setFeedback(null); }}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'load'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>2. सहेजे गए सत्र लोड करें (Load Saved Sessions)</span>
            {savedSessions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                {savedSessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5">
          {/* TAB 1: SAVE */}
          {activeTab === 'save' && (
            <form onSubmit={handleSaveToDB} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  सत्र का नाम दर्ज करें (Session Name / Unique Identifier)
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="उदा. Half_Yearly_2026_27"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  सुझाव: परीक्षा का नाम व सत्र डालें ताकि भविष्य में आसानी से पहचान सकें।
                </span>
              </div>

              {/* Summary of data being saved */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">कक्षाएं</span>
                  <strong className="text-slate-800 font-black">
                    {currentSessionData?.classes?.length || 0} सेक्शन
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">कमरे</span>
                  <strong className="text-slate-800 font-black">
                    {currentSessionData?.rooms?.length || 0} रूम्स
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">अध्यापक</span>
                  <strong className="text-slate-800 font-black">
                    {currentSessionData?.teachers?.length || 0} टीचर्स
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">शिफ्ट</span>
                  <strong className="text-indigo-700 font-black uppercase">
                    {currentSessionData?.activeShift === 'shift_1' ? '1st Shift (9-12)' : '2nd Shift (6-8)'}
                  </strong>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Mongoose Schema + Zod Validation सुरक्षित
                </span>

                <button
                  type="submit"
                  disabled={isSaving || !dbStatus.connected}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'सुरक्षित हो रहा है...' : 'MongoDB में सेव करें'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LOAD */}
          {activeTab === 'load' && (
            <div className="space-y-3">
              {savedSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                  {dbStatus.connected
                    ? 'MongoDB में अभी कोई सहेजा गया सत्र उपलब्ध नहीं है। "1. वर्तमान सत्र सुरक्षित करें" से सत्र सेव करें।'
                    : 'सहेजे गए सत्र देखने के लिए कृपया पहले MongoDB सर्वर कनेक्ट करें।'}
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {savedSessions.map((item) => (
                    <div
                      key={`${item.sessionName}_${item.activeShift}`}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-black text-slate-800">
                            {item.sessionName}
                          </strong>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                            {item.activeShift}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.examDetails?.schoolName} • {item.examDetails?.examName}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          अंतिम अपडेट: {new Date(item.updatedAt || item.createdAt).toLocaleString('hi-IN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoadSessionItem(item)}
                          disabled={isLoadingSession}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          लोड करें
                        </button>
                        <button
                          onClick={() => handleDeleteSession(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="हटाएं"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
