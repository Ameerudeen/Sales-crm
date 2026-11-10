import React from 'react';
import { AlertTriangle, GitMerge, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DuplicateAlertProps {
  duplicates: { [key: string]: any[] };
  type: 'accounts' | 'contacts' | 'leads';
  onMerge: (items: any[]) => void;
  onDismiss: () => void;
  onOpenDetails: () => void;
}

export const DuplicateAlert: React.FC<DuplicateAlertProps> = ({ 
  duplicates, 
  type, 
  onMerge, 
  onDismiss,
  onOpenDetails
}) => {
  const duplicateNames = Object.keys(duplicates);
  if (duplicateNames.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-8 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 rounded-3xl p-5 backdrop-blur-xl shadow-xl shadow-amber-500/5"
      >
        <div className="flex items-start gap-5">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-amber-900 dark:text-amber-100 tracking-tight">
              Potential Duplicates Detected
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1 font-medium">
              We found {duplicateNames.length} {type} with the same name. Would you like to merge them?
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5 items-center">
              {duplicateNames.slice(0, 3).map(name => (
                <button
                  key={name}
                  onClick={() => onMerge(duplicates[name])}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all shadow-sm active:scale-95"
                >
                  <GitMerge className="w-4 h-4" />
                  Merge "{name}"
                </button>
              ))}
              {duplicateNames.length > 3 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 self-center ml-2 uppercase tracking-widest">
                  + {duplicateNames.length - 3} more
                </span>
              )}
              <button
                onClick={onOpenDetails}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all shadow-md active:scale-95 ml-2"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
