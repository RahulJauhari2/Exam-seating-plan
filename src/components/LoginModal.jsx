import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserCheck, 
  Lock, 
  Phone, 
  KeyRound, 
  ShieldCheck, 
  GraduationCap, 
  User, 
  X, 
  AlertCircle, 
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const { login } = useAuth();
  const [tab, setTab] = useState('teacher'); // 'teacher' | 'admin'
  
  // Teacher credentials
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  // Admin/Principal credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    let creds = {};
    if (tab === 'teacher') {
      if (!phone || !pin) {
        setError('कृपया मोबाइल नंबर और 4-अंकों का पिन दर्ज करें।');
        setLoading(false);
        return;
      }
      creds = { phone: phone.trim(), pin: pin.trim() };
    } else {
      if (!username || !password) {
        setError('कृपया यूजरनेम और पासवर्ड दर्ज करें।');
        setLoading(false);
        return;
      }
      creds = { username: username.trim(), password: password.trim() };
    }

    try {
      const res = await login(creds);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
          if (onLoginSuccess) onLoginSuccess(res.user);
        }, 700);
      } else {
        setError(res.message || 'लॉगिन विफल। कृपया क्रेडेंशियल्स जांचें।');
      }
    } catch (err) {
      setError(`त्रुटि: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick autofill demo buttons
  const setQuickDemo = (type) => {
    setError('');
    if (type === 'teacher1') {
      setTab('teacher');
      setPhone('9800000001');
      setPin('1234');
    } else if (type === 'principal') {
      setTab('admin');
      setUsername('principal');
      setPassword('principal@123');
    } else if (type === 'coordinator') {
      setTab('admin');
      setUsername('coordinator');
      setPassword('exam@123');
    } else if (type === 'superadmin') {
      setTab('admin');
      setUsername('superadmin');
      setPassword('admin@123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-inner">
              <ShieldCheck className="w-7 h-7 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">परीक्षा कक्ष सुरक्षा लॉगिन</h2>
              <p className="text-xs text-blue-100 mt-0.5">Role-Based Access Control (RBAC) System</p>
            </div>
          </div>

          {/* Dual Tabs */}
          <div className="flex gap-2 mt-5 bg-black/25 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setTab('teacher'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tab === 'teacher'
                  ? 'bg-white text-blue-900 shadow-md scale-[1.02]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              शिक्षक (Mobile + PIN)
            </button>
            <button
              type="button"
              onClick={() => { setTab('admin'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tab === 'admin'
                  ? 'bg-white text-blue-900 shadow-md scale-[1.02]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              प्रधानाचार्य / एडमिन
            </button>
          </div>
        </div>

        {/* Content & Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-medium">{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'teacher' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    पंजीकृत मोबाइल नंबर (10 अंक)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="उदा. 9800000001 या 9876543210"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex justify-between">
                    <span>4-अंकों का गुप्त पिन (4-Digit PIN)</span>
                    <span className="text-[11px] text-blue-600 font-normal">डिफ़ॉल्ट: 1234</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
                  💡 <strong>शिक्षक सूचना:</strong> लॉगिन करने पर आपको केवल वही कमरा दिखेगा जिसमें आज आपकी ड्यूटी लगाई गई है। आप अपने कक्ष के छात्रों को 1-टैप में अनुपस्थित (Absent) मार्क कर सकेंगे।
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    यूजरनेम (Username)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="उदा. principal, coordinator, superadmin"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    पासवर्ड (Password)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="पासवर्ड दर्ज करें"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>लॉगिन करें (Sign In)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Demo Buttons */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>त्वरित परीक्षण (1-Click Demo Login):</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQuickDemo('teacher1')}
                className="p-2 border border-blue-200 hover:bg-blue-50 text-blue-800 rounded-lg text-left transition flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <span className="truncate">शिक्षक: 9800000001 (1234)</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickDemo('principal')}
                className="p-2 border border-purple-200 hover:bg-purple-50 text-purple-800 rounded-lg text-left transition flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                <span className="truncate">प्रधानाचार्य (Principal)</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickDemo('coordinator')}
                className="p-2 border border-indigo-200 hover:bg-indigo-50 text-indigo-800 rounded-lg text-left transition flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                <span className="truncate">परीक्षा प्रभारी (Incharge)</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickDemo('superadmin')}
                className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-800 rounded-lg text-left transition flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                <span className="truncate">सुपर एडमिन (SuperAdmin)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
