import React, { useState, useRef, useEffect } from 'react';
import { X, Save, RotateCcw, Type, Pencil, Building2, User, MapPin, Calendar, Bell, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, Account, Contact, Lead } from '../types';
import { crmService } from '../services/crmService';
import AccountModal from './AccountModal';
import ContactModal from './ContactModal';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  note?: Note | null;
  accounts: Account[];
  contacts: Contact[];
  leads: Lead[];
  userLocation?: { lat: number; lng: number } | null;
  currentAddress?: string | null;
  isLoaded: boolean;
  onToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  note,
  accounts,
  contacts,
  leads,
  userLocation,
  currentAddress,
  isLoaded,
  onToast
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'text' | 'scribble'>('text');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderTime, setReminderTime] = useState('09:00');

  // Quick create states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setSelectedAccountId(note.accountId || '');
      setSelectedContactId(note.contactId || '');
      setSelectedLeadId(note.leadId || '');
      setLocation(note.location || '');
      setDate(note.date);
      setMode(note.scribbleData ? 'scribble' : 'text');
    } else {
      setTitle('');
      setContent('');
      setSelectedAccountId('');
      setSelectedContactId('');
      setSelectedLeadId('');
      setLocation(currentAddress || '');
      setDate(new Date().toISOString().split('T')[0]);
      setMode('text');
    }
  }, [note, currentAddress]);

  useEffect(() => {
    if (mode === 'scribble' && canvasRef.current && note?.scribbleData) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { desynchronized: true });
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = note.scribbleData;
      }
    }
  }, [mode, note]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    lastPos.current = coords;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { desynchronized: true });
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#3B82F6';
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const coords = getCoordinates(e);
    if (!coords || !lastPos.current) return;

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    requestRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { desynchronized: true });
      if (!ctx) return;

      // Use quadratic curve for smoother lines
      const midPoint = {
        x: (lastPos.current!.x + coords.x) / 2,
        y: (lastPos.current!.y + coords.y) / 2
      };

      ctx.quadraticCurveTo(lastPos.current!.x, lastPos.current!.y, midPoint.x, midPoint.y);
      ctx.stroke();
      
      lastPos.current = coords;
    });
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPos.current = null;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = async () => {
    if (!title || !content || !date) {
      onToast?.('Note Title, Content, and Date are mandatory', 'warning');
      return;
    }

    let scribbleData: string | undefined;
    if (mode === 'scribble' && canvasRef.current) {
      scribbleData = canvasRef.current.toDataURL();
    }

    let reminderId: string | undefined;
    if (hasReminder) {
      try {
        const reminder = await crmService.addReminder({
          title: `Reminder: ${title}`,
          notes: content,
          date: reminderDate,
          time: reminderTime
        });
        reminderId = reminder.id;
      } catch (error) {
        console.error('Error adding reminder:', error);
      }
    }

    const noteData = {
      title,
      content,
      scribbleData,
      accountId: selectedAccountId || undefined,
      contactId: selectedContactId || undefined,
      leadId: selectedLeadId || undefined,
      location,
      date,
      reminderId
    };

    try {
      if (note) {
        await crmService.updateNote(note.id, noteData);
        onToast?.('Note updated successfully', 'success');
      } else {
        await crmService.addNote(noteData);
        onToast?.('Note created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
      onToast?.('Failed to save note', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800/50"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Pencil className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{note ? 'Edit Note' : 'New Meeting Note'}</h2>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em]">Record your customer visit details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Note Title <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g., Post-visit follow-up with Etisalat"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-base dark:text-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    <button 
                      onClick={() => setMode('text')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'text' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      <Type className="w-4 h-4" />
                      Keyboard
                    </button>
                    <button 
                      onClick={() => setMode('scribble')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'scribble' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      <Pencil className="w-4 h-4" />
                      Scribble
                    </button>
                  </div>
                </div>

                {mode === 'text' ? (
                  <textarea 
                    placeholder="Type your meeting notes here..."
                    className="w-full h-80 px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium resize-none dark:text-white text-[13px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                ) : (
                  <div className="relative group">
                    <canvas 
                      ref={canvasRef}
                      width={600}
                      height={400}
                      className="w-full h-80 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <button 
                      onClick={clearCanvas}
                      className="absolute top-4 right-4 p-3 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                      title="Clear Canvas"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/50 backdrop-blur-md rounded-full text-white text-[9px] font-black uppercase tracking-[0.2em] pointer-events-none">
                      iPad & Apple Pencil Optimized
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-[32px] space-y-6 border border-slate-100 dark:border-slate-800/50">
                <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Link to Entity
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Account</label>
                      <button 
                        onClick={() => setIsAccountModalOpen(true)}
                        className="text-[9px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest"
                      >
                        <Plus className="w-3 h-3" /> Quick Create
                      </button>
                    </div>
                    <select 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-[13px] dark:text-white"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                    >
                      <option value="" className="dark:bg-slate-900">Select Account</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id} className="dark:bg-slate-900">{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Contact</label>
                      <button 
                        onClick={() => setIsContactModalOpen(true)}
                        className="text-[9px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest"
                      >
                        <Plus className="w-3 h-3" /> Quick Create
                      </button>
                    </div>
                    <select 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-[13px] dark:text-white"
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                    >
                      <option value="" className="dark:bg-slate-900">Select Contact</option>
                      {contacts
                        .filter(c => !selectedAccountId || c.accountId === selectedAccountId)
                        .map(c => (
                          <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.firstName} {c.lastName}</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Or Link to Lead</label>
                    <select 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-[13px] dark:text-white"
                      value={selectedLeadId}
                      onChange={(e) => setSelectedLeadId(e.target.value)}
                    >
                      <option value="" className="dark:bg-slate-900">Select Lead</option>
                      {leads.filter(l => l.status !== 'Converted').map(l => (
                        <option key={l.id} value={l.id} className="dark:bg-slate-900">{l.firstName} {l.lastName} ({l.accountName})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] space-y-6 border border-blue-100/50 dark:border-blue-900/20">
                <h3 className="text-[11px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Details
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest ml-1">Location</label>
                    <div className="relative">
                      <input 
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/20 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-[13px] dark:text-white"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest ml-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="date"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/20 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-[13px] dark:text-white"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-[32px] space-y-4 transition-all border ${hasReminder ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className={`w-4 h-4 ${hasReminder ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${hasReminder ? 'text-amber-900 dark:text-amber-400' : 'text-slate-500'}`}>Set Reminder</span>
                  </div>
                  <button 
                    onClick={() => setHasReminder(!hasReminder)}
                    className={`w-12 h-6 rounded-full transition-all relative ${hasReminder ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasReminder ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                {hasReminder && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2"
                  >
                    <input 
                      type="date"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/30 rounded-xl text-[13px] font-bold dark:text-white"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                    />
                    <input 
                      type="time"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/30 rounded-xl text-[13px] font-bold dark:text-white"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-4 text-[13px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-4 bg-blue-600 text-white text-[13px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Save className="w-4 h-4" />
            Save Note
          </button>
        </div>
      </motion.div>

      <AccountModal 
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={() => {
          setIsAccountModalOpen(false);
          onSave(); // Refresh data
        }}
        onToast={onToast}
        isLoaded={isLoaded}
      />

      <ContactModal 
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSuccess={() => {
          setIsContactModalOpen(false);
          onSave(); // Refresh data
        }}
        onToast={onToast}
        onOpenAccountModal={() => {
          setIsContactModalOpen(false);
          setIsAccountModalOpen(true);
        }}
      />
    </div>
  );
};

export default NoteModal;
