import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Building2, Trash2, GitMerge, AlertCircle, Check, Eye, ExternalLink, Pencil } from 'lucide-react';
import { crmService } from '../services/crmService';
import { Account } from '../types';

interface DuplicateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: { [name: string]: any[] };
  type: 'accounts' | 'contacts' | 'leads';
  onMerge: (items: any[]) => void;
  onEdit: (item: any) => void;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  accounts?: Account[];
}

const DuplicateDetailsModal: React.FC<DuplicateDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  duplicates, 
  type, 
  onMerge,
  onEdit,
  onRefresh,
  addToast,
  accounts = []
}) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isIgnoring, setIsIgnoring] = useState<string | null>(null);

  const duplicateKeys = Object.keys(duplicates);

  const handleDelete = async (item: any) => {
    if (deleteConfirm !== item.id) {
      setDeleteConfirm(item.id);
      return;
    }
    
    setIsDeleting(item.id);
    try {
      if (type === 'accounts') await crmService.deleteAccount(item.id);
      else if (type === 'contacts') await crmService.deleteContact(item.id);
      else await crmService.deleteLead(item.id);
      setDeleteConfirm(null);
      addToast('Record deleted successfully.', 'success');
      onRefresh();
    } catch (error) {
      console.error('Delete failed:', error);
      addToast('Failed to delete record.', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleIgnore = async (groupKey: string) => {
    setIsIgnoring(groupKey);
    try {
      const items = duplicates[groupKey];
      const ids = items.map(i => i.id);
      // Permanent ignore stored in Firestore
      await crmService.ignoreDuplicates(ids, type);
      addToast('Group ignored permanently.', 'success');
      onRefresh();
    } catch (error) {
      console.error('Ignore failed:', error);
      addToast('Failed to ignore duplicates.', 'error');
    } finally {
      setIsIgnoring(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/10">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
                  Potential Duplicates Detected
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                    {type}
                  </span>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {duplicateKeys.length} matching groups found based on name, email, or phone.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
            {duplicateKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Check className="w-16 h-16 mb-4 text-emerald-500" />
                <h3 className="text-xl font-black">All Clean!</h3>
                <p className="text-sm font-bold">No duplicates detected in your {type} list.</p>
              </div>
            ) : (
              duplicateKeys.map((groupKey) => (
                <div key={groupKey} className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Match Group: {groupKey.split(':')[1] || groupKey}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Criteria: {groupKey.split(':')[0]} match
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onMerge(duplicates[groupKey])}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        <GitMerge className="w-3 h-3" />
                        Merge All
                      </button>
                      <button
                        onClick={() => handleIgnore(groupKey)}
                        disabled={isIgnoring === groupKey}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isIgnoring === groupKey ? 'Processing...' : 'Ignore Permanently'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {duplicates[groupKey].map((item) => {
                      const account = type === 'contacts' ? accounts.find(a => a.id === item.accountId) : null;
                      
                      return (
                        <div 
                          key={item.id} 
                          className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400">
                            {type === 'accounts' ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {type === 'accounts' ? item.name : `${item.firstName} ${item.lastName}`}
                            </h4>
                            {account && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                  Account: {account.name}
                                </span>
                                {account.accountId && (
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                    (ID: {account.accountId})
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                              Created: {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="truncate">{item.email || item.emails?.[0] || 'No Email'}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="truncate">{item.phone || item.phones?.[0] || 'No Phone'}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                onEdit(item);
                                onClose();
                              }}
                              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all active:scale-90"
                              title="Edit this record"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={isDeleting === item.id}
                              className={`p-2 rounded-xl transition-all active:scale-90 flex items-center gap-2 ${
                                deleteConfirm === item.id 
                                  ? 'bg-rose-600 text-white text-[10px] font-black uppercase px-3' 
                                  : 'hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500'
                              }`}
                              title={deleteConfirm === item.id ? 'Click again to confirm' : 'Delete this record'}
                            >
                              {deleteConfirm === item.id ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Confirm Delete
                                </>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                            {deleteConfirm === item.id && (
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-center italic">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              * Merging will combine all history, notes, and contacts into a single record.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DuplicateDetailsModal;
