import React, { useState, useEffect } from 'react';
import { X, GitMerge, Check, Users, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Account, Contact } from '../types';
import { crmService } from '../services/crmService';

interface MergeAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (keepId: string, mergeIds: string[], mergedData: Partial<Account>, contactMerges?: { sourceId: string, targetId: string }[], contactIdsToKeep?: string[]) => void;
  accounts: Account[];
  contacts: Contact[];
  selectedAccountIds: string[];
}

const MergeAccountModal: React.FC<MergeAccountModalProps> = ({ isOpen, onClose, onMerge, accounts, contacts, selectedAccountIds }) => {
  const [keepId, setKeepId] = useState('');
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [mergedData, setMergedData] = useState<Partial<Account>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactMerges, setContactMerges] = useState<{ sourceId: string, targetId: string }[]>([]);
  const [contactIdsToKeep, setContactIdsToKeep] = useState<string[]>([]);

  const selectedAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));
  const keepAccount = selectedAccounts.find(a => a.id === keepId);
  const accountsToMerge = selectedAccounts.filter(a => mergeIds.includes(a.id));

  const allContacts = contacts.filter(c => selectedAccountIds.includes(c.accountId));
  const targetContacts = contacts.filter(c => c.accountId === keepId);
  const mergeAccountContacts = contacts.filter(c => mergeIds.includes(c.accountId));
  
  const potentialDuplicateContacts = mergeAccountContacts.filter(sc => 
    targetContacts.some(tc => 
      tc.email.toLowerCase() === sc.email.toLowerCase() || 
      (tc.firstName.toLowerCase() === sc.firstName.toLowerCase() && tc.lastName.toLowerCase() === sc.lastName.toLowerCase())
    )
  );

  useEffect(() => {
    if (isOpen && selectedAccountIds.length >= 2) {
      if (!keepId) {
        setKeepId(selectedAccountIds[0]);
        setMergeIds(selectedAccountIds.slice(1));
      }
    }
  }, [isOpen, selectedAccountIds]);

  useEffect(() => {
    if (keepAccount) {
      setMergedData({ ...keepAccount });
    }
    setContactMerges([]);
    // By default, keep all contacts from selected accounts
    setContactIdsToKeep(allContacts.map(c => c.id));
    setError(null);
  }, [keepAccount, mergeIds, contacts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keepId || mergeIds.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onMerge(keepId, mergeIds, mergedData, contactMerges, contactIdsToKeep);
      onClose();
    } catch (err: any) {
      console.error('Error merging accounts:', err);
      let msg = 'Failed to merge accounts. Please try again.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) msg = parsed.error;
      } catch (e) {}
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMergeId = (id: string) => {
    setMergeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleContactKeep = (id: string) => {
    setContactIdsToKeep(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleField = (field: keyof Account | 'address.street' | 'address.city' | 'address.country', value: any) => {
    if (field.startsWith('address.')) {
      const subField = field.split('.')[1] as keyof Account['address'];
      setMergedData(prev => ({
        ...prev,
        address: {
          ...prev.address!,
          [subField]: value
        }
      }));
    } else {
      setMergedData(prev => ({ ...prev, [field]: value }));
    }
  };

  const toggleContactMerge = (sourceContactId: string, targetContactId: string) => {
    setContactMerges(prev => {
      const exists = prev.find(m => m.sourceId === sourceContactId);
      if (exists) {
        if (exists.targetId === targetContactId) {
          return prev.filter(m => m.sourceId !== sourceContactId);
        }
        return prev.map(m => m.sourceId === sourceContactId ? { ...m, targetId: targetContactId } : m);
      }
      return [...prev, { sourceId: sourceContactId, targetId: targetContactId }];
    });
  };

  const renderFieldOption = (label: string, field: keyof Account | 'address.street' | 'address.city' | 'address.country', targetVal: any, keepVal: any) => {
    let currentVal;
    if (field.startsWith('address.')) {
      const subField = field.split('.')[1] as keyof Account['address'];
      currentVal = mergedData.address?.[subField];
    } else {
      currentVal = mergedData[field as keyof Account];
    }

    return (
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => toggleField(field, targetVal)}
            className={`p-3 rounded-xl border text-left transition-all ${
              currentVal === targetVal 
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' 
                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{targetVal || 'N/A'}</span>
              {currentVal === targetVal && <Check className="w-3 h-3 text-blue-600" />}
            </div>
            <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">From Merge Account</p>
          </button>
          <button
            type="button"
            onClick={() => toggleField(field, keepVal)}
            className={`p-3 rounded-xl border text-left transition-all ${
              currentVal === keepVal 
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' 
                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{keepVal || 'N/A'}</span>
              {currentVal === keepVal && <Check className="w-3 h-3 text-blue-600" />}
            </div>
            <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">From Primary Account</p>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-[40px] w-full max-w-3xl overflow-hidden shadow-2xl my-8 border border-slate-100 dark:border-slate-800/50"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Merge Accounts</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Consolidate records & contacts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all hover:rotate-90 text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-black text-red-900 dark:text-red-400 uppercase tracking-widest">Merge Error</p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1 font-bold">{error}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Primary Account (Keep)</label>
              <select
                required
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                value={keepId}
                onChange={e => {
                  const newKeepId = e.target.value;
                  const oldKeepId = keepId;
                  setKeepId(newKeepId);
                  setMergeIds(prev => {
                    const filtered = prev.filter(id => id !== newKeepId);
                    if (oldKeepId && !filtered.includes(oldKeepId) && selectedAccountIds.includes(oldKeepId)) {
                      return [...filtered, oldKeepId];
                    }
                    return filtered;
                  });
                }}
              >
                <option value="" className="dark:bg-slate-900">Select account to keep...</option>
                {selectedAccounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="dark:bg-slate-900">{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Accounts to Merge (Delete)</label>
              <div className="grid grid-cols-1 gap-2">
                {selectedAccounts.filter(acc => acc.id !== keepId).map(acc => {
                  const isSelected = mergeIds.includes(acc.id);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggleMergeId(acc.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10' 
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{acc.name}</span>
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-200 dark:border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
                {selectedAccounts.length <= 1 && (
                  <p className="text-[10px] text-slate-500 italic font-bold uppercase tracking-widest ml-1">Select more accounts in the table to merge.</p>
                )}
              </div>
            </div>
          </div>

          {keepAccount && mergeIds.length > 0 && (
            <div className="space-y-10">
              {/* Field Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Account Details to Keep
                </h3>
                <p className="text-[10px] text-slate-500 font-black italic uppercase tracking-widest ml-1">
                  Select fields from the primary account or the first merge account to keep.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderFieldOption('Account Name', 'name', accountsToMerge[0]?.name, keepAccount.name)}
                  {renderFieldOption('Industry', 'industry', accountsToMerge[0]?.industry, keepAccount.industry)}
                  {renderFieldOption('Email', 'email', accountsToMerge[0]?.email, keepAccount.email)}
                  {renderFieldOption('Phone', 'phone', accountsToMerge[0]?.phone, keepAccount.phone)}
                  {renderFieldOption('Street', 'address.street', accountsToMerge[0]?.address.street, keepAccount.address.street)}
                  {renderFieldOption('City', 'address.city', accountsToMerge[0]?.address.city, keepAccount.address.city)}
                  {renderFieldOption('Country', 'address.country', accountsToMerge[0]?.address.country, keepAccount.address.country)}
                  {renderFieldOption('Website', 'website', accountsToMerge[0]?.website, keepAccount.website)}
                </div>
              </div>

              {/* Contact Merging */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Contacts to Keep
                </h3>
                
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest ml-1">
                    Select which contacts should be kept in the merged account. Unselected contacts will be deleted.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allContacts.map(contact => {
                      const isSelected = contactIdsToKeep.includes(contact.id);
                      const isPrimary = contact.accountId === keepId;
                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => toggleContactKeep(contact.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10' 
                              : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                              isPrimary ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                            }`}>
                              {contact.firstName.charAt(0)}
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{contact.firstName} {contact.lastName}</p>
                              <p className="text-[10px] text-slate-500 font-bold truncate">{contact.email}</p>
                              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{isPrimary ? 'From Primary' : 'From Merge'}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-200 dark:border-slate-700'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {potentialDuplicateContacts.length > 0 && (
                  <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest ml-1">Consolidate Duplicates</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest ml-1">
                      You can also merge these potential duplicates into a single record:
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {potentialDuplicateContacts.map(sc => {
                        const matches = targetContacts.filter(tc => 
                          tc.email.toLowerCase() === sc.email.toLowerCase() || 
                          (tc.firstName.toLowerCase() === sc.firstName.toLowerCase() && tc.lastName.toLowerCase() === sc.lastName.toLowerCase())
                        );
                        
                        return (
                          <div key={sc.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-black text-xs">
                                  {sc.firstName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900 dark:text-white">{sc.firstName} {sc.lastName}</p>
                                  <p className="text-[10px] text-slate-500 font-bold">{sc.email}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2">
                              {matches.map(tc => {
                                const isSelected = contactMerges.some(m => m.sourceId === sc.id && m.targetId === tc.id);
                                return (
                                  <button
                                    key={tc.id}
                                    type="button"
                                    onClick={() => toggleContactMerge(sc.id, tc.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                      isSelected 
                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10' 
                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <div className="text-left">
                                      <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Merge with: {tc.firstName} {tc.lastName}</p>
                                      <p className="text-[8px] text-slate-500 font-bold">{tc.email}</p>
                                    </div>
                                    {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100/50 dark:border-blue-900/20">
                <div className="flex gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest">Merge Summary:</p>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1.5 list-disc pl-4 font-bold uppercase tracking-widest">
                      <li>Primary account <span className="font-black">"{keepAccount.name}"</span> will be updated and kept.</li>
                      <li>{mergeIds.length} secondary account(s) will be merged and deleted.</li>
                      <li>All associated leads, notes, and reminders will be transferred to <span className="font-black">"{keepAccount.name}"</span>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !keepId || mergeIds.length === 0}
              className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <GitMerge className="w-4 h-4" />}
              {isSubmitting ? 'Merging...' : 'Confirm Merge'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default MergeAccountModal;
