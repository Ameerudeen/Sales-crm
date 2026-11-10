import React from 'react';
import { X, Users, User, Mail, Phone, MapPin, Briefcase, Target, Plus, Trash2, Pencil, Building2, Globe, Calendar, Clock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, Account } from '../types';
import HistoryViewer from './HistoryViewer';

interface AccountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  contacts: Contact[];
  onEditAccount: (account: Account) => void;
  onEditContact: (contact: Contact) => void;
  onAddContact: (accountId: string) => void;
  onDeleteContact: (contactId: string) => void;
}

export default function AccountDetailModal({ 
  isOpen, 
  onClose, 
  account, 
  contacts, 
  onEditAccount,
  onEditContact, 
  onAddContact,
  onDeleteContact
}: AccountDetailModalProps) {
  if (!account) return null;

  const accountContacts = contacts.filter(c => c.accountId === account.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{account.name}</h2>
                    <button 
                      onClick={() => onEditAccount(account)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                      title="Edit Account"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-black uppercase tracking-widest">
                      <Target className="w-4 h-4" />
                      {account.industry || account.industries?.join(', ')}
                    </p>
                    {account.accountId && (
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">ID: {account.accountId}</span>
                    )}
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Account Info */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/50 space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Address
                      </h3>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                        {account.address.flatHouseNo}, {account.address.street}<br />
                        {account.address.city}, {account.address.pinCode}<br />
                        {account.address.country}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${account.lat},${account.lng}${account.placeId ? `&query_place_id=${account.placeId}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-0.5 uppercase tracking-widest"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Google Maps
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Website
                      </h3>
                      {account.website ? (
                        <a 
                          href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-blue-600 hover:underline truncate block"
                        >
                          {account.website}
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-slate-400 italic">No website provided</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Contact Info
                      </h3>
                      <div className="space-y-1">
                        {(account.phones && account.phones.length > 0 ? account.phones : [account.phone]).map((phone, i) => (
                          <p key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300">{phone || 'N/A'}</p>
                        ))}
                        {(account.emails && account.emails.length > 0 ? account.emails : [account.email]).map((email, i) => (
                          <p key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{email || 'N/A'}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/50">
                    <HistoryViewer 
                      history={account.history} 
                      createdAt={account.createdAt}
                      title="Account History" 
                    />
                  </div>
                </div>

                {/* Right Column: Associated Contacts */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      Associated Contacts ({accountContacts.length})
                    </h3>
                    <button
                      onClick={() => onAddContact(account.id)}
                      className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Contact
                    </button>
                  </div>

                  {accountContacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accountContacts.map((contact, index) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={contact.id}
                          className="group p-5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight">
                                  {contact.salutation} {contact.firstName} {contact.lastName}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{contact.designation}</p>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onEditContact(contact)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteContact(contact.id)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{contact.phone}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                      <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No contacts associated with this account</p>
                      <button
                        onClick={() => onAddContact(account.id)}
                        className="mt-4 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest hover:underline"
                      >
                        Add your first contact
                      </button>
                    </div>
                  )}
                </div>
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
