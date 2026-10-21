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
  Layers,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { parseUPBoardFile, processUPBoardRows } from '../utils/upBoardParser';
import { UP_BOARD_SUBJECT_CODES } from '../data/examSchemeData';

const SAMPLE_UP_BOARD_TSV = `DistrictCode\tSchoolCode\tClass\tYear\tFormNumber\tCandidateName\tFatherName\tMotherName\tCandidateNameKruti\tFatherNameKruti\tMotherNameKruti\tGender\tddmmyyyy\tMedium\tCasteCategory\tCandidateType1\tCandidateType2\tPhysicallyHandicapped\tRegulationCode\tIsMinority\tSubject01\tSubject02\tSubject03\tSubject04\tSubject05\tSubject06\tSubject07\tSubjectVOC\tSubjectRevVOC\tMobileNumber\tAadharNumber\tEmailID\tAddress1\tAddress2\tAddressDistrict\tAddressPinCode
28\t1060\t9\t26\t9101\tABHAY KUMAR YADAV\tAJAY KUMAR YADAV\tSUNITA DEVI\tvHk; dqekj ;kno\tvt; dqekj ;kno\tlquhrk nsoh\t1\t25-02-2013\t1\t3\t1\t0\t \t1\t0\t901\t917\t928\t931\t932\t941\t944\t \t \t9125713389\t922707123456\tajayyadav77425@gmail.com\tAHRAN\tMIRANPUR KATRA\t28-SHAHJAHANPUR\t242301
28\t1060\t9\t26\t9102\tAMIT KUMAR SHARMA\tRAMESH SHARMA\tSARITA SHARMA\tvfer dqekj\tjes'k 'kekZ\tlfjrk 'kekZ\t1\t14-07-2012\t1\t1\t1\t0\t \t1\t0\t901\t917\t928\t931\t932\t936\t944\t \t \t9876543210\t922707654321\tamit@gmail.com\tKATRA\tMIRANPUR KATRA\t28-SHAHJAHANPUR\t242301
28\t1060\t10\t26\t10101\tPRIYA VERMA\tSURESH VERMA\tREKHA VERMA\tfe;k oekZ\tlqjs'k oekZ\tjs[kk oekZ\t2\t10-09-2011\t1\t3\t1\t0\t \t1\t0\t901\t917\t928\t931\t932\t935\t944\t \t \t9450123456\t922707987654\tpriya@gmail.com\tMAIN BAZAR\tMIRANPUR KATRA\t28-SHAHJAHANPUR\t242301
28\t1060\t11\t26\t11101\tRAHUL MISHRA\tDINESH MISHRA\tANITA MISHRA\tjkfgy feJk\tfpdsk feJk\tvfurk feJk\t1\t05-04-2010\t1\t1\t1\t0\t \t1\t0\t102\t117\t131\t151\t152\t \t \t \t \t9123456780\t922707112233\trahul@gmail.com\tKATRA\tMIRANPUR KATRA\t28-SHAHJAHANPUR\t242301
28\t1060\t12\t26\t12101\tNEHA SINGH\tVIJAY SINGH\tPOOJA SINGH\tusgk flag\tfot; flag\twtk flag\t2\t19-12-2009\t1\t2\t1\t0\t \t1\t0\t102\t117\t153\t151\t152\t \t \t \t \t9988776655\t922707445566\tneha@gmail.com\tKATRA\tMIRANPUR KATRA\t28-SHAHJAHANPUR\t242301`;

export default function ExcelImporterModal({ isOpen, onClose, onImportClasses }) {
  const [activeInputMode, setActiveInputMode] = useState('file'); // 'file' or 'paste'
  const [pastedText, setPastedText] = useState('');
  const [sectionCapacity, setSectionCapacity] = useState(50);
  const [importStrategy, setImportStrategy] = useState('merge'); // 'merge' or 'replace'
  const [resetRollPerSection, setResetRollPerSection] = useState(true); // default true for anonymous copy checking
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

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
        const res = parseUPBoardFile(data, true, Number(sectionCapacity) || 50, resetRollPerSection);
        if (res.success) {
          setParseResult(res);
        } else {
          setErrorMsg(res.message);
        }
      } catch (err) {
        setErrorMsg(`फ़ाइल पढ़ने में त्रुटि: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Handle direct text/TSV/CSV parse
  const handleParsePastedData = (textToParse = pastedText, resetRoll = resetRollPerSection) => {
    if (!textToParse || !textToParse.trim()) {
      setErrorMsg('कृपया एक्सेल से कॉपी किया गया डेटा पेस्ट करें।');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const res = parseUPBoardFile(textToParse, false, Number(sectionCapacity) || 50, resetRoll);
      if (res.success) {
        setParseResult(res);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg(`डेटा पार्स करने में त्रुटि: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load sample test data
  const handleLoadSample = () => {
    setPastedText(SAMPLE_UP_BOARD_TSV);
    setActiveInputMode('paste');
    handleParsePastedData(SAMPLE_UP_BOARD_TSV);
  };

  // Confirm import and update app state
  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.classes) return;
    onImportClasses(parseResult.classes, importStrategy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 no-print select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileSpreadsheet className="w-6 h-6 text-indigo-100" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  यूपी बोर्ड एक्सेल / सीएसवी इम्पोर्ट (UP Board Portal Data)
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-black uppercase tracking-wider">
                  Official Format
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                बोर्ड पोर्टल से डाउनलोड की गई शीट सीधे अपलोड करें — 1 क्लिक में सभी छात्र व विषय लोड होंगे
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Mode Switcher & Section Size Setting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveInputMode('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeInputMode === 'file'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>एक्सेल फ़ाइल चुनें (.xlsx / .csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInputMode('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeInputMode === 'paste'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>कॉपी-पेस्ट डेटा (Paste Rows)</span>
              </button>
            </div>

            {/* Section Size Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">
                छात्र प्रति सेक्शन:
              </span>
              <select
                value={sectionCapacity}
                onChange={(e) => {
                  const val = e.target.value;
                  setSectionCapacity(val);
                  if (activeInputMode === 'paste' && pastedText) {
                    handleParsePastedData(pastedText, resetRollPerSection);
                  }
                }}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-indigo-500"
              >
                <option value={40}>40 छात्र (A, B, C...)</option>
                <option value={50}>50 छात्र (A, B, C...)</option>
                <option value={60}>60 छात्र (A, B, C...)</option>
                <option value={70}>70 छात्र (A, B, C...)</option>
                <option value={100}>100 छात्र</option>
              </select>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                title="सैंपल डेटा से टेस्ट करें"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>सैंपल से टेस्ट करें</span>
              </button>
            </div>
          </div>

          {/* Options: Import Strategy & Anonymous Roll Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            {/* Import Strategy */}
            <div>
              <span className="block font-bold text-slate-800 mb-1">
                1. कक्षा इम्पोर्ट रणनीति (Import Mode):
              </span>
              <div className="space-y-1">
                <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="radio"
                    name="importStrategy"
                    value="merge"
                    checked={importStrategy === 'merge'}
                    onChange={() => setImportStrategy('merge')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>मौजूदा कक्षाओं में जोड़ें (Merge & Keep):</strong> केवल आयातित क्लास (जैसे 9वीं) अपडेट होगी, बाकी (10, 11, 12) सुरक्षित रहेंगी ताकि 9वीं के साथ 10वीं/11वीं बेंच पर बैठ सके।
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-600">
                  <input
                    type="radio"
                    name="importStrategy"
                    value="replace"
                    checked={importStrategy === 'replace'}
                    onChange={() => setImportStrategy('replace')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>सभी कक्षाएं बदलें (Replace All):</strong> मौजूदा कक्षाएं हट जाएंगी।
                  </span>
                </label>
              </div>
            </div>

            {/* Roll Number Mode */}
            <div>
              <span className="block font-bold text-slate-800 mb-1">
                2. रोल नंबर प्रारूप (Copy Checking Confidentiality):
              </span>
              <div className="space-y-1">
                <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="radio"
                    name="resetRoll"
                    checked={resetRollPerSection === true}
                    onChange={() => {
                      setResetRollPerSection(true);
                      if (activeInputMode === 'paste' && pastedText) {
                        handleParsePastedData(pastedText, true);
                      }
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>प्रत्येक सेक्शन में 1 से शुरू (1, 2, 3...):</strong> 9A, 9B सबमें रोल नंबर 1 से शुरू होगा ताकि कॉपी जांचते समय शिक्षक सेक्शन न जान सके।
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-600">
                  <input
                    type="radio"
                    name="resetRoll"
                    checked={resetRollPerSection === false}
                    onChange={() => {
                      setResetRollPerSection(false);
                      if (activeInputMode === 'paste' && pastedText) {
                        handleParsePastedData(pastedText, false);
                      }
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>क्रमिक बोर्ड फॉर्म नंबर रखें:</strong> (उदा. 9101, 9102...)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Mode 1: File Upload */}
          {activeInputMode === 'file' && (
            <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-2xl p-6 sm:p-8 text-center transition-all">
              <input
                type="file"
                id="upboard-file-input"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="upboard-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <span className="text-sm font-bold text-slate-800 mt-1">
                  कंप्यूटर से यूपी बोर्ड की एक्सेल शीट चुनें या यहाँ ड्रैग करें
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  समर्थित प्रारूप: <strong>.xlsx, .xls, .csv</strong> (पोर्टल से डाउनलोड किया हुआ मूल प्रारूप)
                </span>
                <span className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all">
                  फ़ाइल ब्राउज़ करें
                </span>
              </label>
            </div>
          )}

          {/* Mode 2: Paste Rows */}
          {activeInputMode === 'paste' && (
            <div className="space-y-3">
              <textarea
                rows={5}
                placeholder="एक्सेल शीट की पंक्तियों को कॉपी करें और सीधे यहाँ पेस्ट करें (Header सहित या बिना Header के)..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleParsePastedData()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>पेस्ट किया गया डेटा पार्स करें</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Section */}
          {parseResult && parseResult.success && (
            <div className="space-y-4 border-t border-slate-200 pt-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-emerald-950">
                      डेटा सफलतापूर्वक पढ़ा गया!
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      कुल छात्र: <strong>{parseResult.totalStudents}</strong> • कुल जनरेटेड क्लासेस/सेक्शन: <strong>{parseResult.totalClasses}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {Object.entries(parseResult.studentsByClass).map(([g, list]) => (
                    <span
                      key={g}
                      className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-black text-emerald-800 shadow-2xs"
                    >
                      Class {g}th: {list.length} छात्र
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Students Preview Table */}
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-2">
                  प्रारंभिक छात्रों का पूर्वावलोकन (Preview of Students with Subjects):
                </span>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 w-16">रोल / फॉर्म</th>
                        <th className="py-2.5 px-3 w-16">कक्षा</th>
                        <th className="py-2.5 px-3">छात्र का नाम (Candidate Name)</th>
                        <th className="py-2.5 px-3">पिता का नाम (Father's Name)</th>
                        <th className="py-2.5 px-3">दर्ज विषय कोड (Subject Codes)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {parseResult.classes.flatMap((c) => c.studentList || []).slice(0, 5).map((st, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                            #{st.rollNo}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-black">
                              {st.className}-{st.section}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {st.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {st.fatherName || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {st.subjects.map((code) => {
                                const info = UP_BOARD_SUBJECT_CODES[code];
                                return (
                                  <span
                                    key={code}
                                    className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-[10px] font-mono font-bold"
                                    title={info ? `${info.name} (${info.englishName})` : code}
                                  >
                                    {code} {info ? `(${info.name})` : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500">
            * इम्पोर्ट करने पर वर्तमान कक्षा सूची इन नए छात्रों और सेक्शनों से स्वतः अपडेट हो जाएगी।
          </p>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              रद्द करें
            </button>
            <button
              type="button"
              disabled={!parseResult || !parseResult.success}
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>सिस्टम में लोड करें (Apply Classes)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
