import React, { useState } from 'react';
import { 
  Building, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertTriangle,
  Armchair,
  Columns3
} from 'lucide-react';
import { getColumnSplit } from '../utils/seatingAlgorithm';

export default function RoomManager({ rooms, setRooms, totalStudentsRequired }) {
  const [newRoom, setNewRoom] = useState({
    name: 'Room 106',
    benches: 20,
    columns: 4,
  });

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoom.name) return;

    const newEntry = {
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newRoom.name.trim(),
      benches: parseInt(newRoom.benches) || 10,
      columns: parseInt(newRoom.columns) || 3,
    };

    setRooms([...rooms, newEntry]);

    // Guess next room name
    const match = newRoom.name.match(/\d+/);
    if (match) {
      const nextNum = parseInt(match[0]) + 1;
      setNewRoom({
        ...newRoom,
        name: newRoom.name.replace(/\d+/, nextNum),
      });
    }
  };

  const handleUpdate = (id, field, value) => {
    setRooms(
      rooms.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            [field]: field === 'benches' || field === 'columns' ? parseInt(value) || 1 : value,
          };
        }
        return r;
      })
    );
  };

  const handleDelete = (id) => {
    setRooms(rooms.filter((r) => r.id !== id));
  };

  const moveRoom = (index, direction) => {
    const newRooms = [...rooms];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rooms.length) return;
    const temp = newRooms[index];
    newRooms[index] = newRooms[targetIndex];
    newRooms[targetIndex] = temp;
    setRooms(newRooms);
  };

  const totalBenches = rooms.reduce((sum, r) => sum + (Number(r.benches) || 0), 0);
  const totalCapacity = totalBenches * 2;
  const isCapacitySufficient = totalCapacity >= totalStudentsRequired;
  const capacityDiff = totalCapacity - totalStudentsRequired;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 text-white rounded-lg">
              <Building className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              कमरे और उनकी क्षमता (Rooms & Bench Capacity)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            हर कमरे का नाम और उसकी बेंच क्षमता (1 बेंच = 2 छात्र) डायनामिक रूप से सेट करें
          </p>
        </div>

        {/* Capacity Comparison Metric */}
        <div className="flex items-center gap-2">
          {isCapacitySufficient ? (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>सीटें पर्याप्त हैं ({totalCapacity} सीटें / {totalStudentsRequired} छात्र)</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>सीटों की कमी: {Math.abs(capacityDiff)} और छात्र हैं</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Rooms Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center">क्रम</th>
                <th className="px-3 py-2.5">कमरे का नाम (Room / Hall Name)</th>
                <th className="px-3 py-2.5">बेंच क्षमता (Benches)</th>
                <th className="px-3 py-2.5">कुल सीटें (Capacity: 2/bench)</th>
                <th className="px-3 py-2.5">कॉलम लेआउट (Cols)</th>
                <th className="px-3 py-2.5 w-24 text-center">क्रम बदलें</th>
                <th className="px-3 py-2.5 w-16 text-center">हटाएं</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room, idx) => {
                const seats = (Number(room.benches) || 0) * 2;
                return (
                  <tr key={room.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        <Armchair className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => handleUpdate(room.id, 'name', e.target.value)}
                          className="w-48 px-2 py-1 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={room.benches}
                          onChange={(e) => handleUpdate(room.id, 'benches', e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-200 rounded font-bold text-slate-800 focus:outline-blue-500 text-center"
                        />
                        <span className="text-slate-500 font-medium">बेंच</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold text-xs">
                        {seats} छात्र (सीटें)
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <select
                          value={room.columns || 3}
                          onChange={(e) => handleUpdate(room.id, 'columns', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded font-medium text-slate-700 bg-white"
                        >
                          <option value={2}>2 कॉलम</option>
                          <option value={3}>3 कॉलम (Left, Mid, Right)</option>
                          <option value={4}>4 कॉलम</option>
                          <option value={5}>5 कॉलम</option>
                          <option value={6}>6 कॉलम</option>
                        </select>
                        <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-center">
                          पंक्ति: {getColumnSplit(Number(room.benches) || 0, Number(room.columns) || 3, room.columnSplit).join(' + ')}
                          {(Number(room.columns) || 3) === 3 && Number(room.benches) === 20 && ' (7+6+7)'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveRoom(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                          title="ऊपर ले जाएं"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRoom(idx, 1)}
                          disabled={idx === rooms.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                          title="नीचे ले जाएं"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleDelete(room.id)}
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

        {/* Add Room Form */}
        <form onSubmit={handleAddRoom} className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-3">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>एक और कमरा / हॉल जोड़ें (Add Room or Hall):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">कमरे / हॉल का नाम</label>
              <input
                type="text"
                placeholder="उदा. Room 106 या Hall 3"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">बेंच क्षमता (Desk Count)</label>
              <input
                type="number"
                placeholder="उदा. 18"
                value={newRoom.benches}
                onChange={(e) => setNewRoom({ ...newRoom, benches: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">कॉलम लेआउट (Cols)</label>
              <select
                value={newRoom.columns}
                onChange={(e) => setNewRoom({ ...newRoom, columns: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value={2}>2 कॉलम</option>
                <option value={3}>3 कॉलम</option>
                <option value={4}>4 कॉलम</option>
                <option value={5}>5 कॉलम</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ कमरा जोड़ें</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
