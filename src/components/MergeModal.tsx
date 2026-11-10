import React, { useState } from 'react';
import { X, GitMerge } from 'lucide-react';
import { motion } from 'motion/react';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (sourceId: string, targetId: string, mergedData?: any) => void;
  items: any[];
  title: string;
  fields?: { key: string; label: string }[];
}

const MergeModal: React.FC<MergeModalProps> = ({ isOpen, onClose, onMerge, items, title, fields }) => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [selectedFields, setSelectedFields] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const sourceItem = items.find(i => i.id === sourceId);
  const targetItem = items.find(i => i.id === targetId);

  const handleFieldSelect = (key: string, value: string) => {
    setSelectedFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId) return;
    if (sourceId === targetId) return;
    
    setIsSubmitting(true);
    try {
      const mergedData = fields ? { ...targetItem, ...selectedFields } : undefined;
      await onMerge(targetId, sourceId, mergedData);
      onClose();
    } catch (error) {
      console.error('Error merging items:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/50"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <GitMerge className="w-5 h-5 text-blue-600" />
            {title}
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Source (Delete)</label>
                <select
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm dark:text-white"
                  value={sourceId}
                  onChange={e => setSourceId(e.target.value)}
                >
                  <option value="" className="dark:bg-slate-900">Select source...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id} className="dark:bg-slate-900">{item.name || `${item.firstName} ${item.lastName}`}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Target (Keep)</label>
                <select
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm dark:text-white"
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                >
                  <option value="" className="dark:bg-slate-900">Select target...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id} className="dark:bg-slate-900">{item.name || `${item.firstName} ${item.lastName}`}</option>
                  ))}
                </select>
              </div>
            </div>

            {fields && sourceItem && targetItem && (
              <div className="space-y-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Select fields to keep in target:</p>
                <div className="space-y-4">
                  {fields.map(field => {
                    const sourceVal = field.key.includes('.') 
                      ? field.key.split('.').reduce((o, i) => o?.[i], sourceItem)
                      : sourceItem[field.key];
                    const targetVal = field.key.includes('.') 
                      ? field.key.split('.').reduce((o, i) => o?.[i], targetItem)
                      : targetItem[field.key];

                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleFieldSelect(field.key, sourceVal)}
                            className={`p-4 text-left rounded-2xl border transition-all text-xs font-bold ${
                              selectedFields[field.key] === sourceVal 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 ring-4 ring-blue-500/10' 
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Source</span>
                            <span className="truncate block">{String(sourceVal || 'N/A')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFieldSelect(field.key, targetVal)}
                            className={`p-4 text-left rounded-2xl border transition-all text-xs font-bold ${
                              selectedFields[field.key] === targetVal || !selectedFields[field.key]
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 ring-4 ring-blue-500/10' 
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Target</span>
                            <span className="truncate block">{String(targetVal || 'N/A')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed border border-blue-100/50 dark:border-blue-900/20 font-bold uppercase tracking-widest">
            <strong>Note:</strong> Merging will move all associated records (if any) from the source to the target, and then delete the source record. This action cannot be undone.
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {isSubmitting ? 'Merging...' : 'Merge Items'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default MergeModal;
