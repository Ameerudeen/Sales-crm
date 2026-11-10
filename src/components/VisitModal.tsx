import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Target, Users, StickyNote, CheckCircle2, RotateCcw, Trash2, FileText } from 'lucide-react';
import { Account, Lead, MarketInsight, Visit } from '../types';
import { crmService } from '../services/crmService';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit?: Visit | null;
  accounts: Account[];
  leads: Lead[];
  prospects: MarketInsight[];
  onSave: () => void;
  initialTarget?: { id: string, type: 'account' | 'lead' | 'prospect' | 'external', name: string };
  onToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const VisitModal: React.FC<VisitModalProps> = ({ 
  isOpen, 
  onClose, 
  visit, 
  accounts, 
  leads, 
  prospects, 
  onSave,
  initialTarget,
  onToast
}) => {
  const [targetId, setTargetId] = useState('');
  const [targetType, setTargetType] = useState<'account' | 'lead' | 'prospect' | 'external'>('account');
  const [targetName, setTargetName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [status, setStatus] = useState<'Planned' | 'Visited' | 'Postponed' | 'Cancelled'>('Planned');
  const [notes, setNotes] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (visit) {
      setTargetId(visit.targetId);
      setTargetType(visit.targetType);
      setTargetName(visit.targetName);
      setDate(visit.date);
      setTime(visit.time);
      setStatus(visit.status);
      setNotes(visit.notes || '');
      setMeetingNotes(visit.meetingNotes || '');
    } else if (initialTarget) {
      setTargetId(initialTarget.id);
      setTargetType(initialTarget.type);
      setTargetName(initialTarget.name);
      setDate(new Date().toISOString().split('T')[0]);
      setTime('10:00');
      setStatus('Planned');
      setNotes('');
      setMeetingNotes('');
    } else {
      setTargetId('');
      setTargetType('account');
      setTargetName('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('10:00');
      setStatus('Planned');
      setNotes('');
      setMeetingNotes('');
    }
  }, [visit, initialTarget, isOpen]);

  const handleTargetChange = (id: string) => {
    setTargetId(id);
    let name = '';
    if (targetType === 'account') name = accounts.find(a => a.id === id)?.name || '';
    else if (targetType === 'lead') name = leads.find(l => l.id === id)?.accountName || leads.find(l => l.id === id)?.firstName + ' ' + leads.find(l => l.id === id)?.lastName || '';
    else if (targetType === 'prospect') name = prospects.find(p => p.id === id)?.projectName || '';
    else if (targetType === 'external') name = targetName; // For external, name is already set
    setTargetName(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !date || !time) {
      if (onToast) {
        onToast('Target Type, Select Customer, and Visit Date are mandatory', 'warning');
      } else {
        alert('Target Type, Select Customer, and Visit Date are mandatory');
      }
      return;
    }

    // Validate future date/time
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    if (selectedDateTime < now && status === 'Planned') {
      if (onToast) {
        onToast('Please select a future date and time for a planned visit.', 'warning');
      } else {
        alert('Please select a future date and time for a planned visit.');
      }
      return;
    }

    setIsSaving(true);
    try {
      const visitData = {
        targetId,
        targetType,
        targetName,
        date,
        time,
        status,
        notes,
        meetingNotes
      };

      if (visit) {
        await crmService.updateVisit(visit.id, visitData);
      } else {
        await crmService.createVisit(visitData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving visit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {visit ? 'Edit Scheduled Visit' : 'Schedule New Visit'}
              </h2>
              <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Visit Planning</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Target Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value as any);
                    setTargetId('');
                    setTargetName('');
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all dark:text-white font-bold text-[11px] md:text-[13px]"
                >
                  <option value="account">Existing Account</option>
                  <option value="lead">Lead</option>
                  <option value="prospect">AI Prospect</option>
                  <option value="external">Nearby Customer</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                {targetType === 'external' ? (
                  <input
                    type="text"
                    value={targetName}
                    readOnly
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none dark:text-white font-bold text-[11px] md:text-[13px] opacity-70"
                  />
                ) : (
                  <select
                    value={targetId}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all dark:text-white font-bold text-[11px] md:text-[13px]"
                  >
                    <option value="">Select...</option>
                    {targetType === 'account' && accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    {targetType === 'lead' && leads.map(l => <option key={l.id} value={l.id}>{l.accountName || `${l.firstName} ${l.lastName}`}</option>)}
                    {targetType === 'prospect' && prospects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Visit Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={date}
                    min={todayStr}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all dark:text-white font-bold text-[11px] md:text-[13px]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Time</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all dark:text-white font-bold text-[11px] md:text-[13px]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <div className="flex flex-wrap gap-2">
                {(['Planned', 'Visited', 'Postponed', 'Cancelled'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                      status === s 
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Planning Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What is the objective of this visit?"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all dark:text-white font-medium text-[11px] md:text-[13px] min-h-[80px]"
              />
            </div>

            {status === 'Visited' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">Meeting Notes (Post-Visit)</label>
                  <button
                    type="button"
                    disabled={isCreatingNote || !meetingNotes}
                    onClick={async () => {
                      setIsCreatingNote(true);
                      try {
                        await crmService.addNote({
                          title: `Meeting Note: ${targetName} (${date})`,
                          content: meetingNotes,
                          date: date,
                          accountId: targetType === 'account' ? targetId : undefined,
                          leadId: targetType === 'lead' ? targetId : undefined,
                          location: targetName
                        });
                        if (onToast) {
                          onToast('Note created successfully in the Meeting Notes tab!', 'success');
                        } else {
                          alert('Note created successfully in the Meeting Notes tab!');
                        }
                      } catch (error) {
                        console.error('Error creating note:', error);
                      } finally {
                        setIsCreatingNote(false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-bold hover:bg-emerald-200 transition-all disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Sync to Notes Tab
                  </button>
                </div>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Record what happened during the meeting..."
                  className="w-full px-4 py-3 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-white font-medium text-[11px] md:text-[13px] min-h-[120px]"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-[13px] hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-[2] px-6 py-4 bg-orange-600 text-white rounded-2xl font-bold text-[13px] hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {visit ? 'Update Visit' : 'Schedule Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitModal;
