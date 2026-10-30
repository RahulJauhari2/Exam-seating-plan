import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ClipboardPaste, 
  Sparkles, 
  Users, 
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import * as XLSX from 'xlsx';

const SAMPLE_TEACHER_TSV = `TEACHER'S NAME\tFATHER/HUSBAND NAME\tMO.NO\tDATE OF BIRTH\tJOINING DATE\tCLASS TEACHER\tSECTION
PRABHAT KUMAR PANDEY\tGORAKHNATH PANDEY\t9919353599\t05-12-1970\t7/1/1997\t11\tA
GIRIJA SHANKAR MISHRA\tMUNSHI LAL MISHRA\t7607495858\t01-08-1965\t7/1/1999\t10\tB
PUSHPENDRA SINGH\tHAR DAYAL SINGH\t8400841223\t03-04-1965\t7/1/1999\t9\tA`;

export default function TeacherExcelImporterModal({ isOpen, onClose, onImportTeachers }) {
  const [activeInputMode, setActiveInputMode] = useState('file'); // 'file' or 'paste'
  const [pastedText, setPastedText] = useState('');
  const [importStrategy, setImportStrategy] = useState('merge'); // 'merge' or 'replace'
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Helper to parse rows into teacher objects
  const processTeacherRows = (rows) => {
    if (!rows || rows.length === 0) {
      throw new Error('कोई डेटा नहीं मिला। कृपया फ़ाइल या टेक्स्ट की जांच करें।');
    }

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    const findKey = (candidates) => {
      return keys.find((k) => {
        const cleaned = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return candidates.some((c) => cleaned.includes(c));
      });
    };

    const nameKey = findKey(['teacher', 'name', 'shikshak', 'adhypak', 'staff', 'candidatename']);
    const fatherKey = findKey(['father', 'husband', 'pita', 'pati', 'guardian', 'parent']);
    const mobileKey = findKey(['mono', 'mobile', 'phone', 'contact', 'durwash', 'phonenumber']);
    const dobKey = findKey(['dob', 'birth', 'janm', 'dateofbirth']);
    const joiningKey = findKey(['joining', 'niryukti', 'dateofjoining', 'joiningdate']);
    const aadharKey = findKey(['adhar', 'aadhar', 'uid']);
    const desigKey = findKey(['designation', 'post', 'pad', 'padnam', 'role', 'cadre']);
    const subjectKey = findKey(['subject', 'vishay', 'sub', 'teaching']);
    const classTeacherKey = findKey(['classteacher', 'class', 'kaksha']);
    const sectionKey = findKey(['section', 'sec', 'varg']);

    if (!nameKey) {
      throw new Error(`शिक्षक का नाम (TEACHER'S NAME) का कॉलम नहीं मिला। उपलब्ध कॉलम: ${keys.join(', ')}`);
    }

    const teachers = [];
    rows.forEach((r, idx) => {
      const rawName = String(r[nameKey] || '').trim();
      if (!rawName) return;

      const rawFather = fatherKey && r[fatherKey] ? String(r[fatherKey]).trim() : '';
      const rawMobile = mobileKey && r[mobileKey] ? String(r[mobileKey]).trim().replace(/\D/g, '').slice(-10) : '';
      const rawDob = dobKey && r[dobKey] ? String(r[dobKey]).trim() : '';
      const rawJoining = joiningKey && r[joiningKey] ? String(r[joiningKey]).trim() : '';
      const rawAadhar = aadharKey && r[aadharKey] ? String(r[aadharKey]).trim() : '';
      const rawDesig = desigKey && r[desigKey] ? String(r[desigKey]).trim() : 'सहायक अध्यापक';
      const rawSubject = subjectKey && r[subjectKey] ? String(r[subjectKey]).trim() : '';
      const rawClass = classTeacherKey && r[classTeacherKey] ? String(r[classTeacherKey]).trim() : '';
      const rawSection = sectionKey && r[sectionKey] ? String(r[sectionKey]).trim().toUpperCase() : '';

      teachers.push({
        id: `t_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        name: rawName,
        englishName: rawName.toUpperCase(),
        fatherName: rawFather,
        designation: rawDesig,
        subject: rawSubject,
        mobile: rawMobile,
        dob: rawDob,
        joiningDate: rawJoining,
        aadharNo: rawAadhar,
        isClassTeacher: !!(rawClass && rawClass !== 'undefined'),
        assignedClass: rawClass,
        assignedSection: rawSection,
        isPresent: true,
      });
    });

    if (teachers.length === 0) {
      throw new Error('कोई मान्य शिक्षक रिकॉर्ड नहीं मिला।');
    }

    return teachers;
  };

  // Handle Excel file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const teachers = processTeacherRows(rawJson);
        setParseResult({
          teachers,
          total: teachers.length,
          fileName: file.name,
        });
      } catch (err) {
        setErrorMsg(`फ़ाइल पढ़ने में त्रुटि: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('फ़ाइल लोड करने में विफल।');
      setIsProcessing(false);
    };
    reader.readAsBinaryString(file);
  };

  // Handle Paste text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg('कृपया एक्सेल से कॉपी किया गया डेटा पेस्ट करें।');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const lines = pastedText.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        throw new Error('कम से कम हेडर और एक शिक्षक का डेटा आवश्यक है।');
      }

      const headers = lines[0].split('\t').map((h) => h.trim());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const rowObj = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = cols[colIdx] !== undefined ? cols[colIdx].trim() : '';
        });
        rows.push(rowObj);
      }

      const teachers = processTeacherRows(rows);
      setParseResult({
        teachers,
        total: teachers.length,
        fileName: 'पेस्ट किया गया डेटा (Pasted TSV)',
      });
    } catch (err) {
      setErrorMsg(`डेटा पार्स करने में त्रुटि: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.teachers) return;
    onImportTeachers(parseResult.teachers, importStrategy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                शिक्षक डेटा एक्सेल इम्पोर्ट (Teacher Directory Sync)
              </h3>
              <p className="text-xs text-emerald-100">
                नाम, पिता का नाम, मोबाइल नंबर व कक्षा अध्यापक जानकारी एक साथ अपडेट करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Tabs: File Upload vs Direct Paste */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => { setActiveInputMode('file'); setErrorMsg(''); }}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeInputMode === 'file'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>एक्सेल फ़ाइल (.xlsx / .xls)</span>
            </button>
            <button
              onClick={() => { setActiveInputMode('paste'); setErrorMsg(''); }}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeInputMode === 'paste'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>सीधा टेक्स्ट पेस्ट करें (Copy-Paste)</span>
            </button>
          </div>

          {/* Mode 1: File Upload Box */}
          {activeInputMode === 'file' && (
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                id="teacher-file-input"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="teacher-file-input"
                className="cursor-pointer flex flex-col items-center gap-2.5"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Upload className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="font-bold text-sm text-emerald-950 block">
                    कंप्यूटर से शिक्षक एक्सेल फ़ाइल चुनें
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    (TEACHER'S NAME, FATHER NAME, MO.NO, DATE OF BIRTH आदि)
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Mode 2: Paste Box */}
          {activeInputMode === 'paste' && (
            <div className="space-y-2">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="एक्सेल शीट से पंक्तियाँ कॉपी करके यहाँ पेस्ट करें..."
                rows={6}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:border-emerald-600 focus:outline-none"
              />
              <button
                onClick={handleParsePastedText}
                disabled={isProcessing}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                डेटा प्रोसेस करें (Parse)
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parse Result Preview */}
          {parseResult && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>सफलतापूर्वक पहचाने गए: <strong>{parseResult.total} शिक्षक</strong></span>
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-black">
                  Ready to Sync
                </span>
              </div>

              {/* Sample 3 Rows */}
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-b">
                    <tr>
                      <th className="p-2">नाम</th>
                      <th className="p-2">पिता का नाम</th>
                      <th className="p-2">मोबाइल</th>
                      <th className="p-2">कक्षा अध्यापक</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {parseResult.teachers.slice(0, 10).map((t, i) => (
                      <tr key={i}>
                        <td className="p-2 font-bold">{t.name}</td>
                        <td className="p-2 text-slate-600">{t.fatherName || '—'}</td>
                        <td className="p-2 font-mono font-bold text-indigo-700">{t.mobile || '—'}</td>
                        <td className="p-2 text-slate-700">
                          {t.assignedClass ? `Class ${t.assignedClass}-${t.assignedSection || 'A'}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Strategy Selector */}
              <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>इम्पोर्ट विधि:</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      value="merge"
                      checked={importStrategy === 'merge'}
                      onChange={() => setImportStrategy('merge')}
                    />
                    <span>मौजूदा में जोड़ें / अपडेट करें (Merge)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      value="replace"
                      checked={importStrategy === 'replace'}
                      onChange={() => setImportStrategy('replace')}
                    />
                    <span>पूरी सूची बदलें (Replace)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            रद्द करें
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={!parseResult}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>इम्पोर्ट लागू करें ({parseResult ? parseResult.total : 0})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
