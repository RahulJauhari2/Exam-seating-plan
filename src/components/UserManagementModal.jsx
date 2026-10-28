import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUsersListAPI, updateUserRoleAPI } from '../services/api';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  KeyRound, 
  Phone, 
  X, 
  Search, 
  Check, 
  AlertCircle,
  RefreshCw,
  Crown
} from 'lucide-react';

export default function UserManagementModal({ isOpen, onClose }) {
  const { isSuperAdmin, isPrincipal, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [editingPinId, setEditingPinId] = useState(null);
  const [newPin, setNewPin] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchUsersListAPI();
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = async (user, newRole) => {
    if (user.role === newRole) return;
    setUpdatingId(user._id);
    setStatusMsg('');

    try {
      const res = await updateUserRoleAPI(user._id, { role: newRole });
      if (res.success) {
        setStatusMsg(`'${user.name}' की भूमिका '${newRole}' में बदल दी गई।`);
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, role: newRole } : u))
        );
      } else {
        setStatusMsg(`त्रुटि: ${res.message}`);
      }
    } catch (err) {
      setStatusMsg(`त्रुटि: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetPin = async (user) => {
    if (!newPin || newPin.length < 4) {
      alert('कृपया कम से कम 4-अंकों का नया पिन दर्ज करें।');
      return;
    }

    setUpdatingId(user._id);
    try {
      const res = await updateUserRoleAPI(user._id, { pin: newPin });
      if (res.success) {
        setStatusMsg(`'${user.name}' का पिन अपडेट कर दिया गया।`);
        setEditingPinId(null);
        setNewPin('');
      } else {
        setStatusMsg(`त्रुटि: ${res.message}`);
      }
    } catch (err) {
      setStatusMsg(`त्रुटि: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">स्टाफ रोल एवं अनुमति प्रबंधन (RBAC Management)</h2>
              <p className="text-xs text-blue-200">
                {isSuperAdmin ? 'सुपर एडमिन (सभी अधिकार)' : 'प्रधानाचार्य पैनल (कॉलेज स्तर)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="नाम, मोबाइल या रोल से खोजें..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            रीफ्रेश
          </button>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')} className="text-blue-500 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              स्टाफ सूची लोड हो रही है...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">कोई स्टाफ सदस्य नहीं मिला।</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((u) => {
                const isCurrent = currentUser?.id === u._id || currentUser?.username === u.username;
                const isEditingThisPin = editingPinId === u._id;

                return (
                  <div key={u._id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {u.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{u.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded font-semibold">
                              आप (You)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {u.phone || 'फोन नहीं'}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-gray-400">@{u.username}</span>
                        </div>
                      </div>
                    </div>

                    {/* Role Selector & PIN reset */}
                    <div className="flex items-center gap-2.5">
                      {/* Role Dropdown */}
                      <select
                        value={u.role}
                        disabled={updatingId === u._id || (u.role === 'superadmin' && !isSuperAdmin)}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg border focus:outline-none transition cursor-pointer ${
                          u.role === 'principal'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : u.role === 'coordinator'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : u.role === 'superadmin'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <option value="teacher">शिक्षक (Teacher)</option>
                        <option value="coordinator">परीक्षा प्रभारी (Coordinator)</option>
                        <option value="principal">प्रधानाचार्य (Principal)</option>
                        {isSuperAdmin && <option value="superadmin">सुपर एडमिन (Super Admin)</option>}
                      </select>

                      {/* Reset PIN button or input */}
                      {isEditingThisPin ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            maxLength={4}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="नया पिन"
                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
                          />
                          <button
                            onClick={() => handleResetPin(u)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs"
                            title="सहेजें"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditingPinId(null); setNewPin(''); }}
                            className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs"
                            title="रद्द करें"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingPinId(u._id); setNewPin('1234'); }}
                          className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition"
                          title="पिन रीसेट करें"
                        >
                          <KeyRound className="w-3 h-3 text-gray-500" />
                          <span>पिन रीसेट</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>कुल पंजीकृत स्टाफ: <strong>{users.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl text-xs transition"
          >
            पूर्ण हुआ
          </button>
        </div>
      </div>
    </div>
  );
}
