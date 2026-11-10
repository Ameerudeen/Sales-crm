import React from 'react';
import { X, User, Building2, Mail, Phone, Briefcase, MapPin, Target, Calendar, Clock, Pencil, Tag, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from '../types';
import HistoryViewer from './HistoryViewer';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: (lead: Lead) => void;
}

export default function LeadDetailModal({ 
  isOpen, 
  onClose, 
  lead,
  onEdit
}: LeadDetailModalProps) {
  if (!lead) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {lead.salutation} {lead.firstName} {lead.lastName}
                    </h2>
                    <button
                      onClick={() => onEdit(lead)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                      title="Edit Lead"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5" />
                      {lead.designation}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      lead.status === 'New' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      lead.status === 'Contacted' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      lead.status === 'Qualified' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-all hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Account Info */}
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100/50 dark:border-blue-900/20">
                <h3 className="text-[10px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Proposed Account
                </h3>
                <div>
                  <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{lead.accountName}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {lead.industry && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        {lead.industry}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      {lead.department}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lead Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Numbers
                  </h3>
                  <div className="space-y-2">
                    {(lead.phones && lead.phones.length > 0 ? lead.phones : [lead.phone]).map((phone, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{phone || 'N/A'}</span>
                        {phone && (
                          <a href={`tel:${phone}`} className="p-2 bg-white dark:bg-slate-800 text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Addresses
                  </h3>
                  <div className="space-y-2">
                    {(lead.emails && lead.emails.length > 0 ? lead.emails : [lead.email]).map((email, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate mr-2">{email || 'N/A'}</span>
                        {email && (
                          <a href={`mailto:${email}`} className="p-2 bg-white dark:bg-slate-800 text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address Details
                </h3>
                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    {lead.street && `${lead.street}, `}
                    {lead.city}, {lead.country} {lead.pinCode && ` - ${lead.pinCode}`}
                  </p>
                  {(lead.lat && lead.lng) && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lead.lat},${lead.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Get Directions
                    </a>
                  )}
                </div>
              </div>

              {/* History */}
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <HistoryViewer 
                  history={lead.history || []} 
                  createdAt={lead.createdAt}
                  title="Lead History" 
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[13px] uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
