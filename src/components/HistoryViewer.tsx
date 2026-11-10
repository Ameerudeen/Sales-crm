import React from 'react';
import { Clock, User, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HistoryEntry } from '../types';

interface HistoryViewerProps {
  history?: HistoryEntry[];
  createdAt?: string;
  title?: string;
}

const HistoryViewer: React.FC<HistoryViewerProps> = ({ history, createdAt, title = "Activity History" }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Synthesize history if empty but createdAt exists
  const displayHistory = React.useMemo(() => {
    let baseHistory = history ? [...history] : [];
    
    // If no "Created" entry exists but we have a createdAt date, add one
    const hasCreatedEntry = baseHistory.some(entry => entry.action === 'Created');
    if (!hasCreatedEntry && createdAt) {
      baseHistory.push({
        timestamp: createdAt,
        action: 'Created',
        userId: 'system',
        userName: 'System',
        details: 'Initial record creation'
      });
    } else if (baseHistory.length === 0 && !createdAt) {
      // If absolutely no history and no createdAt, we can't show much
      return [];
    }
    
    return baseHistory
      .filter(entry => entry && entry.timestamp) // Ensure entry and timestamp exist
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        return timeB - timeA;
      });
  }, [history, createdAt]);

  if (displayHistory.length === 0) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">No history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-1 group"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</h3>
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md text-[8px] font-bold">
            {displayHistory.length}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pl-2 border-l-2 border-slate-100 dark:border-slate-800 ml-2 py-1">
              {displayHistory.map((entry, index) => (
                <div key={index} className="relative pl-6 pb-2 last:pb-0">
                  {/* Dot */}
                  <div className="absolute left-[-9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 z-10" />
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                        {entry.action}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <User className="w-3 h-3" />
                      <span className="font-medium">{entry.userName}</span>
                    </div>

                    {entry.details && (
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                        {entry.details}
                      </p>
                    )}

                    {entry.changes && entry.changes.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {entry.changes.map((change, cIdx) => (
                          <div key={cIdx} className="text-[9px] bg-white dark:bg-slate-900 p-1.5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter mr-2">{change.field}:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-red-500 line-through opacity-70 truncate max-w-[100px]">
                                {typeof change.oldValue === 'object' ? 'Object' : String(change.oldValue || 'None')}
                              </span>
                              <ArrowRight className="w-2 h-2 text-slate-300" />
                              <span className="text-emerald-500 font-bold truncate max-w-[100px]">
                                {typeof change.newValue === 'object' ? 'Object' : String(change.newValue || 'None')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryViewer;
