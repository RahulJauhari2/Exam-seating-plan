import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Layers, 
  BookOpen, 
  Hash, 
  Sparkles,
  AlertCircle 
} from 'lucide-react';
import { COLOR_PALETTE } from '../data/defaultData';

export default function ClassManager({ classes, setClasses }) {
  // New single class form state
  const [newClass, setNewClass] = useState({
    name: '9',
    section: 'A',
    subject: '',
    startRoll: 901,
    totalStudents: 30,
  });

  // Quick 3-section generator modal / state
  const [quickGrade, setQuickGrade] = useState('9');
  const [quickStartRoll, setQuickStartRoll] = useState(901);
  const [quickPerSectionCount, setQuickPerSectionCount] = useState(30);
  const [quickSubject, setQuickSubject] = useState('');

  // Handle single class add
  const handleAddClass = (e) => {
    e.preventDefault();
    if (!newClass.name || !newClass.section) return;

    const color = COLOR_PALETTE[classes.length % COLOR_PALETTE.length];
    const newEntry = {
      id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newClass.name.trim(),
      section: newClass.section.trim().toUpperCase(),
      subject: newClass.subject.trim() || 'General',
      startRoll: parseInt(newClass.startRoll) || 1,
      totalStudents: parseInt(newClass.totalStudents) || 1,
      color,
    };

    setClasses([...classes, newEntry]);

    // Pre-calculate next logical start roll
    const nextStart = (parseInt(newClass.startRoll) || 1) + (parseInt(newClass.totalStudents) || 30);
    setNewClass({
      ...newClass,
      section: String.fromCharCode(newClass.section.charCodeAt(0) + 1),
      startRoll: nextStart,
    });
  };

  // Quick Add 3 Sections (A, B, C)
  const handleAddThreeSections = () => {
    const sections = ['A', 'B', 'C'];
    const newItems = [];
    let currentRoll = parseInt(quickStartRoll) || 1;
    const count = parseInt(quickPerSectionCount) || 30;

    sections.forEach((sec, idx) => {
      const color = COLOR_PALETTE[(classes.length + idx) % COLOR_PALETTE.length];
      newItems.push({
        id: `cls_${Date.now()}_${sec}_${Math.random().toString(36).substring(2, 6)}`,
        name: quickGrade.trim(),
        section: sec,
        subject: quickSubject.trim() || 'General',
        startRoll: currentRoll,
        totalStudents: count,
        color,
      });
      currentRoll += count;
    });

    setClasses([...classes, ...newItems]);
  };

  // Update a field in an existing class
  const handleUpdate = (id, field, value) => {
    setClasses(
      classes.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            [field]: field === 'startRoll' || field === 'totalStudents' ? parseInt(value) || 0 : value,
          };
        }
        return c;
      })
    );
  };

  // Delete a class
  const handleDelete = (id) => {
    setClasses(classes.filter((c) => c.id !== id));
  };

  // Total students sum
  const totalStudents = classes.reduce((sum, c) => sum + (Number(c.totalStudents) || 0), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              कक्षा और सेक्शन प्रबंधन (Classes & Sections)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            हर कक्षा का नाम, सेक्शन (A, B, C), रोल नंबर और कुल संख्या यहाँ जोड़ें
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <span>कुल छात्र:</span>
            <span className="text-sm font-bold text-indigo-700">{totalStudents}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold">
            <span>कुल क्लासेस:</span> {classes.length}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Quick 3 Sections Generator Bar */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">क्विक 3-सेक्शन जनरेटर (A, B, C एक साथ जोड़ें):</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Class (उदा. 9)"
              value={quickGrade}
              onChange={(e) => setQuickGrade(e.target.value)}
              className="w-full md:w-20 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Subject (उदा. Hindi)"
              value={quickSubject}
              onChange={(e) => setQuickSubject(e.target.value)}
              className="w-full md:w-28 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Start Roll"
              value={quickStartRoll}
              onChange={(e) => setQuickStartRoll(e.target.value)}
              className="w-full md:w-24 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="छात्र/सेक्शन"
              value={quickPerSectionCount}
              onChange={(e) => setQuickPerSectionCount(e.target.value)}
              className="w-full md:w-28 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddThreeSections}
              className="col-span-2 sm:col-span-4 md:col-auto w-full md:w-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-all"
            >
              + 3 सेक्शन जोड़ें (A, B, C)
            </button>
          </div>
        </div>

        {/* Classes Table / List */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center">#</th>
                <th className="px-3 py-2.5">कक्षा (Class)</th>
                <th className="px-3 py-2.5">सेक्शन (Section)</th>
                <th className="px-3 py-2.5">विषय (Subject)</th>
                <th className="px-3 py-2.5">Start Roll No.</th>
                <th className="px-3 py-2.5">छात्र संख्या (Total)</th>
                <th className="px-3 py-2.5">Roll No. Range</th>
                <th className="px-3 py-2.5 w-16 text-center">हटाएं</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((cls, idx) => {
                const endRoll = (Number(cls.startRoll) || 1) + (Number(cls.totalStudents) || 1) - 1;
                return (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-full border ${cls.color}`}></span>
                        <input
                          type="text"
                          value={cls.name}
                          onChange={(e) => handleUpdate(cls.id, 'name', e.target.value)}
                          className="w-16 px-2 py-1 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-indigo-500"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={cls.section}
                        onChange={(e) => handleUpdate(cls.id, 'section', e.target.value.toUpperCase())}
                        className="w-14 px-2 py-1 border border-slate-200 rounded font-bold text-indigo-700 uppercase focus:outline-indigo-500 text-center"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={cls.subject}
                        onChange={(e) => handleUpdate(cls.id, 'subject', e.target.value)}
                        className="w-28 px-2 py-1 border border-slate-200 rounded text-slate-700 focus:outline-indigo-500"
                        placeholder="Subject"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={cls.startRoll}
                        onChange={(e) => handleUpdate(cls.id, 'startRoll', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-200 rounded font-mono text-slate-800 focus:outline-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={cls.totalStudents}
                        onChange={(e) => handleUpdate(cls.id, 'totalStudents', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-200 rounded font-bold text-slate-800 focus:outline-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono font-medium text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {cls.startRoll} - {endRoll}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                        title="हटाएं"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Individual Class Form */}
        <form onSubmit={handleAddClass} className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-3">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>एक और क्लास/सेक्शन जोड़ें (Add Single Class):</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">कक्षा (Class)</label>
              <input
                type="text"
                placeholder="उदा. 10"
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">सेक्शन (Section)</label>
              <input
                type="text"
                placeholder="उदा. A"
                value={newClass.section}
                onChange={(e) => setNewClass({ ...newClass, section: e.target.value.toUpperCase() })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">विषय (Subject)</label>
              <input
                type="text"
                placeholder="उदा. English"
                value={newClass.subject}
                onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Roll No.</label>
              <input
                type="number"
                value={newClass.startRoll}
                onChange={(e) => setNewClass({ ...newClass, startRoll: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">छात्र संख्या (Total)</label>
              <input
                type="number"
                value={newClass.totalStudents}
                onChange={(e) => setNewClass({ ...newClass, totalStudents: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ जोड़ें</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
