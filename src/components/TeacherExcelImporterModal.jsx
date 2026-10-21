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

const SAMPLE_TEACHER_TSV = `Name\tDesignation\tSubject\tMobile
श्री ब्रजमोहन शर्मा\tप्रवक्ता (Lecturer)\tभौतिक विज्ञान\t9415123456
श्री अखिलेश कुमार\tसहायक अध्यापक\tगणित\t9415234567
श्रीमती नीलम वर्मा\tसहायक अध्यापक\tअंग्रेजी\t9415345678
श्री सत्य प्रकाश मिश्र\tप्रवक्ता (Lecturer)\tहिन्दी\t9415456789
श्री देवेन्द्र सिंह\tसहायक अध्यापक\tसामाजिक विज्ञान\t9415567890`;

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

    // Identify header keys
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    const findKey = (candidates) => {
      return keys.find((k) => {
        const cleaned = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return candidates.some((c) => cleaned.includes(c));
      });
    };

    const nameKey = findKey(['name', 'teacher', 'shikshak', 'adhypak', 'staff', 'candidatename']);
    const desigKey = findKey(['designation', 'post', 'pad', 'padnam', 'role', 'cadre']);
    const subjectKey = findKey(['subject', 'vishay', 'sub', 'teaching']);
    const mobileKey = findKey(['mobile', 'phone', 'contact', 'durwash', 'phonenumber']);

    if (!nameKey) {
      throw new Error(`शिक्षक का नाम (Name/Teacher) का कॉलम नहीं मिला। उपलब्ध कॉलम: ${keys.join(', ')}`);
    }

    const teachers = [];
    rows.forEach((r, idx) => {
      const rawName = String(r[nameKey] || '').trim();
      if (!rawName) return;

      const rawDesig = desigKey && r[desigKey] ? String(r[desigKey]).trim() : 'सहायक अध्यापक';
      const rawSubject = subjectKey && r[subjectKey] ? String(r[subjectKey]).trim() : 'General';
      const rawMobile = mobileKey && r[mobileKey] ? String(r[mobileKey]).trim().replace(/\D/g, '') : '';

      teachers.push({
        id: `t_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        name: rawName,
        englishName: rawName.toUpperCase(),
        designation: rawDesig,
        subject: rawSubject,
        mobile: rawMobile,
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

    reader.readAsBinaryString(file);
  };

  // Handle direct text/TSV/CSV parse
  const handleParsePastedData = (textToParse = pastedText) => {
    if (!textToParse || !textToParse.trim()) {
      setErrorMsg('कृपया एक्सेल से कॉपी किया गया डेटा पेस्ट करें।');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      // Split into lines
      const lines = textToParse.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('कम से कम 1 हेडर लाइन और 1 डेटा लाइन आवश्यक है।');
      }

      // Determine separator: Tab or Comma
      const firstLine = lines[0];
      const sep = firstLine.includes('\t') ? '\t' : ',';

      const headers = firstLine.split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        const rowObj = {};
        headers.forEach((h, hIdx) => {
          rowObj[h] = parts[hIdx] !== undefined ? parts[hIdx] : '';
        });
        rows.push(rowObj);
      }

      const teachers = processTeacherRows(rows);
      setParseResult({
        teachers,
        total: teachers.length,
        fileName: 'Pasted Excel Table',
      });
    } catch (err) {
      setErrorMsg(`डेटा पार्स करने में त्रुटि: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyImport = () => {
    if (!parseResult || !parseResult.teachers) return;
    onImportTeachers(parseResult.teachers, importStrategy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 to-purple-50/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                एक्सेल से शिक्षक स्टाफ इम्पोर्ट करें (Import Teachers)
              </h3>
              <p className="text-xs text-slate-500">
                Excel (.xlsx, .xls), CSV या सीधे कॉपी-पेस्ट से शिक्षक सूची लोड करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Method Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveInputMode('file');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeInputMode === 'file'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>एक्सेल फ़ाइल अपलोड (.xlsx, .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveInputMode('paste');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeInputMode === 'paste'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>सीधे कॉपी-पेस्ट करें</span>
            </button>
          </div>

          {/* Mode 1: File Upload */}
          {activeInputMode === 'file' && (
            <div className="space-y-3">
              <label
                htmlFor="teacher-excel-upload"
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform shadow-xs mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-slate-800">
                  एक्सेल फ़ाइल चुनें या यहाँ ड्रैग करें
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  समर्थित फॉर्मेट: <strong>.xlsx, .xls, .csv</strong>
                </span>
                <input
                  id="teacher-excel-upload"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Mode 2: Paste */}
          {activeInputMode === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  एक्सेल से कॉपी की गई तालिका यहाँ पेस्ट करें:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPastedText(SAMPLE_TEACHER_TSV);
                    handleParsePastedData(SAMPLE_TEACHER_TSV);
                  }}
                  className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>नमूना डेटा भरें (Sample Data)</span>
                </button>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Name	Designation	Subject	Mobile&#10;श्री ब्रजमोहन शर्मा	प्रवक्ता	भौतिक विज्ञान	9415123456&#10;श्री अखिलेश कुमार	सहायक अध्यापक	गणित	9415234567"
                className="w-full h-32 p-3 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => handleParsePastedData()}
                disabled={isProcessing}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>डेटा पढ़ें व प्रोसेस करें (Parse Teachers)</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parse Result Preview */}
          {parseResult && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-900">
                    सफलतापूर्वक पार्स हुआ: {parseResult.total} शिक्षक रिकॉर्ड
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {parseResult.fileName}
                </span>
              </div>

              {/* Sample list preview */}
              <div className="max-h-40 overflow-y-auto border border-emerald-200/60 rounded-xl bg-white text-xs divide-y divide-slate-100">
                {parseResult.teachers.map((t, i) => (
                  <div key={t.id || i} className="p-2 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-slate-400 font-mono text-[10px]">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800">{t.name}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({t.subject})</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {t.designation}
                    </span>
                  </div>
                ))}
              </div>

              {/* Import Options Strategy */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700">इम्पोर्ट का प्रकार (Strategy):</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      value="merge"
                      checked={importStrategy === 'merge'}
                      onChange={() => setImportStrategy('merge')}
                      className="text-indigo-600"
                    />
                    <span className="font-semibold text-slate-700">मौजूदा सूची में जोड़ें (Append)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="strategy"
                      value="replace"
                      checked={importStrategy === 'replace'}
                      onChange={() => setImportStrategy('replace')}
                      className="text-indigo-600"
                    />
                    <span className="font-semibold text-slate-700">पूरी सूची बदलें (Replace)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            रद्द करें
          </button>

          <button
            type="button"
            onClick={handleApplyImport}
            disabled={!parseResult || parseResult.total === 0}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{parseResult ? `${parseResult.total} शिक्षक इम्पोर्ट करें` : 'इम्पोर्ट लागू करें'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
