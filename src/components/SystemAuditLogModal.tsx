import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Search, Download, Calendar, ArrowUpRight, Zap, Target, Users, Tag, AlertCircle, RotateCcw, User, RefreshCw } from 'lucide-react';
import { Activity } from '../types';
import { crmService } from '../services/crmService';

interface SystemAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  onRefresh: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const SystemAuditLogModal: React.FC<SystemAuditLogModalProps> = ({ isOpen, onClose, activities, onRefresh, onToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUndoing, setIsUndoing] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredActivities = activities.filter(a => 
    a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'create': return <Zap className="w-3 h-3 text-emerald-500" />;
      case 'update': return <Target className="w-3 h-3 text-blue-500" />;
      case 'delete': return <AlertCircle className="w-3 h-3 text-rose-500" />;
      case 'restore': return <RotateCcw className="w-3 h-3 text-indigo-500" />;
      case 'system_alert': return <AlertCircle className="w-3 h-3 text-amber-500" />;
      case 'system_error': return <AlertCircle className="w-3 h-3 text-rose-500" />;
      default: return <History className="w-3 h-3 text-slate-400" />;
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'lead': return <Tag className="w-3 h-3" />;
      case 'contact': return <Users className="w-3 h-3" />;
      case 'account': return <Target className="w-3 h-3" />;
      default: return <History className="w-3 h-3" />;
    }
  };

  const handleUndo = async (activity: Activity) => {
    if (isUndoing) return;
    
    const confirmUndo = window.confirm(`Are you sure you want to undo this ${activity.type} action on ${activity.entityType}?`);
    if (!confirmUndo) return;

    setIsUndoing(activity.id);
    try {
      await crmService.undoActivity(activity.id);
      onToast?.('Action reversed successfully', 'success');
      onRefresh();
    } catch (error: any) {
      onToast?.(`Undo failed: ${error.message}`, 'error');
    } finally {
      setIsUndoing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[20px] bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 dark:shadow-none">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">System Audit logs</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Activity Stream</p>
                <div className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                  {activities.length} Events Total
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
               onClick={onRefresh}
               className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-slate-50 transition-all text-slate-500 dark:text-slate-400"
               title="Refresh logs"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-colors text-slate-400 border border-transparent hover:border-slate-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Filter activities by keyword, user or type..."
              className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2 hover:bg-slate-100 transition-all text-sm">
            <Download className="w-4 h-4" />
            Export Log
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-3">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity, idx) => (
                <div 
                  key={activity.id || idx}
                  className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all duration-300 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                        {getEntityIcon(activity.entityType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                            activity.type === 'create' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            activity.type === 'update' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            activity.type === 'delete' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            activity.type === 'restore' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {getTypeIcon(activity.type)}
                            {activity.type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {activity.entityType}
                          </span>
                          {activity.userEmail && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              <User className="w-3 h-3 text-slate-400" />
                              {activity.userName || activity.userEmail.split('@')[0]}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-6 text-right">
                      {(activity.type === 'create' || activity.type === 'update' || activity.type === 'delete') && activity.entityType !== 'system' && (
                        <button
                          onClick={() => handleUndo(activity)}
                          disabled={isUndoing === activity.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isUndoing === activity.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Undo Action
                        </button>
                      )}
                      
                      <div className="flex flex-col items-end gap-0.5 min-w-[80px]">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 rounded-md text-[8px] font-bold text-slate-500 font-mono uppercase">
                          ID: {activity.entityId.substring(0, 8)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/30 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">No Activities Found</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  No system logs match your current filter. Try searching for something else.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex justify-between items-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Audit trail is immutable and synchronized with Cloud database
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            Close Viewer
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SystemAuditLogModal;
