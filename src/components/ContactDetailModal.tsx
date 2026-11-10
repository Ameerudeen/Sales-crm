import React from 'react';
import { X, User, Building2, Mail, Phone, Briefcase, MapPin, Target, Calendar, Clock, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, Account } from '../types';
import HistoryViewer from './HistoryViewer';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  account: Account | null;
  onEdit: (contact: Contact) => void;
}

export default function ContactDetailModal({ 
  isOpen, 
  onClose, 
  contact, 
  account,
  onEdit
}: ContactDetailModalProps) {
  if (!contact) return null;

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
                      {contact.salutation} {contact.firstName} {contact.lastName}
                    </h2>
                    <button
                      onClick={() => onEdit(contact)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                      title="Edit Contact"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest flex items-center gap-2 mt-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {contact.designation} • {contact.department}
                  </p>
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
              {account && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100/50 dark:border-blue-900/20">
                  <h3 className="text-[10px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Associated Account
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{account.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        {account.industry || account.industries?.join(', ')}
                      </p>
                    </div>
                    {account.accountId && (
                      <div className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">ID: {account.accountId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Numbers
                  </h3>
                  <div className="space-y-2">
                    {(contact.phones && contact.phones.length > 0 ? contact.phones : [contact.phone]).map((phone, i) => (
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
                    {(contact.emails && contact.emails.length > 0 ? contact.emails : [contact.email]).map((email, i) => (
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

              {/* History */}
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <HistoryViewer 
                  history={contact.history} 
                  createdAt={contact.createdAt}
                  title="Contact History" 
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
