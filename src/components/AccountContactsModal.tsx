import React from 'react';
import { X, Users, Mail, Phone, MapPin, Briefcase, Target, Plus, Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, Account } from '../types';

interface AccountContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  contacts: Contact[];
  onEditContact: (contact: Contact) => void;
  onAddContact: (accountId: string) => void;
  onDeleteContact: (contactId: string) => void;
}

export default function AccountContactsModal({ 
  isOpen, 
  onClose, 
  account, 
  contacts, 
  onEditContact, 
  onAddContact,
  onDeleteContact
}: AccountContactsModalProps) {
  if (!account) return null;

  const accountContacts = contacts.filter(c => c.accountId === account.id);

  const handleDelete = (contactId: string) => {
    onDeleteContact(contactId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <Target className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{account.name}</h2>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-black uppercase tracking-widest">
                        <Users className="w-4 h-4" />
                        {accountContacts.length} Associated Contacts
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${account.lat},${account.lng}${account.placeId ? `&query_place_id=${account.placeId}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-0.5 uppercase tracking-widest"
                        >
                          <MapPin className="w-3 h-3" />
                          Google Maps
                        </a>
                        <a
                          href={`https://waze.com/ul?q=${account.lat},${account.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-amber-600 hover:underline flex items-center gap-0.5 uppercase tracking-widest"
                        >
                          <MapPin className="w-3 h-3" />
                          Waze
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onAddContact(account.id)}
                  className="ml-4 p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                  title="Add New Contact"
                >
                  <Plus className="w-4 h-4" />
                  Add Contact
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-all hover:rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {accountContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accountContacts.map((contact) => (
                    <div 
                      key={contact.id} 
                      className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl font-black text-blue-600 dark:text-blue-400 shrink-0">
                          {contact.firstName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0">
                              <h4 className="font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                                {contact.salutation} {contact.firstName} {contact.lastName}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black mb-3 uppercase tracking-widest">{contact.designation}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => onEditContact(contact)}
                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                                title="Edit Contact"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(contact.id)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete Contact"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex flex-col gap-1">
                              {(contact.emails && contact.emails.length > 0 ? contact.emails : [contact.email]).map((email, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
                                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                                  <a href={`mailto:${email}`} className="hover:text-blue-600 hover:underline truncate">{email}</a>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-col gap-1">
                              {(contact.phones && contact.phones.length > 0 ? contact.phones : [contact.phone]).map((phone, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
                                  <Phone className="w-3.5 h-3.5 text-green-500" />
                                  <a href={`tel:${phone}`} className="hover:text-blue-600 hover:underline truncate">{phone}</a>
                                </div>
                              ))}
                            </div>
                            {contact.department && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
                                <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                                <span>{contact.department}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">No contacts found</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto font-bold uppercase tracking-widest text-[10px]">
                    There are no contacts associated with this account yet.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all active:scale-95"
              >
                Close Window
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


