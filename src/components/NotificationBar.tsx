import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Activity as ActivityIcon, Tag, Users, Target, Calendar, StickyNote, MapPin, Trash2, Edit3, Plus, GitMerge, RotateCcw, RefreshCw, AlertCircle } from 'lucide-react';
import { Activity } from '../types';
import { crmService } from '../services/crmService';

interface NotificationBarProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  onRefresh?: () => void;
  onOpenDetail?: (activity: Activity) => void;
}

const NotificationBar: React.FC<NotificationBarProps> = ({ isOpen, onClose, activities, onRefresh, onOpenDetail }) => {
  const [isReverting, setIsReverting] = useState<string | null>(null);

  const handleRevert = async (activity: Activity) => {
    setIsReverting(activity.id);
    try {
      await crmService.revertActivity(activity);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Revert failed:', error);
    } finally {
      setIsReverting(null);
    }
  };
  const getIcon = (type: Activity['type'], entityType: Activity['entityType']) => {
    switch (entityType) {
      case 'lead': return <Tag className="w-4 h-4" />;
      case 'contact': return <Users className="w-4 h-4" />;
      case 'account': return <Target className="w-4 h-4" />;
      case 'visit': return <MapPin className="w-4 h-4" />;
      case 'note': return <StickyNote className="w-4 h-4" />;
      case 'reminder': return <Calendar className="w-4 h-4" />;
      case 'system': return <ActivityIcon className="w-4 h-4" />;
      default: return <ActivityIcon className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: Activity['type']) => {
    switch (type) {
      case 'create': return <Plus className="w-3 h-3 text-emerald-500" />;
      case 'update': return <Edit3 className="w-3 h-3 text-blue-500" />;
      case 'delete': return <Trash2 className="w-3 h-3 text-rose-500" />;
      case 'merge': return <GitMerge className="w-3 h-3 text-purple-500" />;
      case 'restore': return <RotateCcw className="w-3 h-3 text-amber-500" />;
      case 'system_alert': return <ActivityIcon className="w-3 h-3 text-amber-500" />;
      case 'system_error': return <AlertCircle className="w-3 h-3 text-rose-500" />;
      default: return null;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[14500]"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-[15000] border-l border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Notifications</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity Log</p>
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
                  <ActivityIcon className="w-12 h-12 mb-4" />
                  <p className="text-sm font-bold">No recent activity</p>
                  <p className="text-xs">Changes you make will appear here</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div 
                    key={activity.id}
                    onClick={() => onOpenDetail?.(activity)}
                    className="group relative bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all cursor-pointer"
                  >
                    <div className="flex gap-4">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700">
                          {getIcon(activity.type, activity.entityType)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm">
                          {getTypeIcon(activity.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${
                            activity.type === 'system_error' ? 'text-rose-600 dark:text-rose-400' :
                            activity.type === 'system_alert' ? 'text-amber-600 dark:text-amber-400' :
                            'text-blue-600 dark:text-blue-400'
                          }`}>
                            {activity.entityType} {activity.type.replace('system_', '')}
                          </p>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {getRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                          {activity.description}
                        </p>
                        {activity.data?.name && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                            {activity.data.name}
                          </p>
                        )}
                        
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details & Undo
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
              <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-[0.2em]">
                Auto-syncing with Cloud Database
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationBar;
