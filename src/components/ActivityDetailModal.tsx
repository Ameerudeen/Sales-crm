import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, RefreshCw, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Activity } from '../types';
import { crmService } from '../services/crmService';

interface ActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onRefresh?: () => void;
}

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ isOpen, onClose, activity, onRefresh }) => {
  const [isReverting, setIsReverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!activity) return null;

  const handleRevert = async () => {
    setIsReverting(true);
    setError(null);
    try {
      await crmService.revertActivity(activity);
      setSuccess('Action successfully reverted');
      if (onRefresh) onRefresh();
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Revert failed:', err);
      setError(err.message || 'Failed to revert action');
    } finally {
      setIsReverting(false);
    }
  };

  const renderDataDiff = () => {
    if (!activity.data && !activity.previousData) return null;

    const allKeys = Array.from(new Set([
      ...Object.keys(activity.previousData || {}),
      ...Object.keys(activity.data || {})
    ])).filter(key => !['id', 'uid', 'createdAt', 'updatedAt'].includes(key));

    return (
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Changes</h4>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                <th className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Field</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Previous</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allKeys.map(key => {
                const prev = activity.previousData?.[key];
                const curr = activity.data?.[key];
                const isChanged = JSON.stringify(prev) !== JSON.stringify(curr);

                if (!isChanged && activity.type === 'update') return null;

                return (
                  <tr key={key} className={isChanged ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}>
                    <td className="px-4 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                    <td className="px-4 py-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {prev === null || prev === undefined ? <span className="italic opacity-50">empty</span> : String(prev)}
                    </td>
                    <td className="px-4 py-2 text-[10px] text-slate-900 dark:text-white font-bold">
                      {curr === null || curr === undefined ? <span className="italic opacity-50">empty</span> : String(curr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                  activity.type === 'delete' ? 'bg-rose-100 text-rose-600 shadow-rose-200' :
                  activity.type === 'create' ? 'bg-emerald-100 text-emerald-600 shadow-emerald-200' :
                  'bg-blue-100 text-blue-600 shadow-blue-200'
                }`}>
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Activity Details</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activity.entityType} {activity.type} • {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                  {activity.description}
                </p>
              </div>

              {renderDataDiff()}

              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-3 border border-rose-100 dark:border-rose-800/50">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-800/50">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold">{success}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleRevert}
                disabled={isReverting || !!success}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {isReverting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                {activity.type === 'delete' ? 'Restore Changes' : 'Undo Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ActivityDetailModal;
