import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, ChevronUp, ChevronDown, RotateCcw, Clock, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Activity } from '../types';
import { crmService } from '../services/crmService';

interface ActivityBarProps {
  onRefresh: () => void;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ onRefresh }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReverting, setIsReverting] = useState<string | null>(null);

  const fetchActivities = async () => {
    const data = await crmService.getRecentActivities();
    setActivities(data);
  };

  useEffect(() => {
    fetchActivities();
    // Refresh every minute to keep the 24h window accurate and show new actions
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  // Also fetch when an action might have happened (this is a bit reactive but simple)
  useEffect(() => {
    const handleAction = () => fetchActivities();
    window.addEventListener('crm-action', handleAction);
    return () => window.removeEventListener('crm-action', handleAction);
  }, []);

  const handleRevert = async (activity: Activity) => {
    setIsReverting(activity.id);
    try {
      await crmService.revertActivity(activity);
      await fetchActivities();
      onRefresh();
    } catch (error) {
      console.error('Revert failed:', error);
    } finally {
      setIsReverting(null);
    }
  };

  if (activities.length === 0) return null;

  const latestActivity = activities[0];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="max-w-4xl mx-auto px-4 pb-4 pointer-events-auto">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-t-2xl overflow-hidden"
        >
          {/* Header / Summary Bar */}
          <div 
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <History className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Activity History</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Last 24 hours • {activities.length} actions
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {!isExpanded && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                  <span className="font-medium truncate max-w-[200px]">{latestActivity.description}</span>
                  <span className="text-[10px] opacity-50">{new Date(latestActivity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {/* Expanded History */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                  {activities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'create' ? 'bg-emerald-500' :
                          activity.type === 'delete' ? 'bg-rose-500' :
                          activity.type === 'update' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`} />
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{activity.description}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevert(activity)}
                        disabled={isReverting === activity.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        {isReverting === activity.id ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        {activity.type === 'delete' ? 'Restore' : 'Undo'}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default ActivityBar;
