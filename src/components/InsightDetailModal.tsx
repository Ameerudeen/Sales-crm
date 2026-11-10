import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MapPin, Phone, Mail, User, Target as TargetIcon, Zap, Tag, Briefcase, 
  ExternalLink, Globe, Info, Target, CheckCircle2, Calendar, Heart, Plus
} from 'lucide-react';
import { MarketInsight } from '../types';

interface InsightDetailModalProps {
  insight: MarketInsight | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (insight: MarketInsight) => void;
  isFavorite: boolean;
  onConvertToLead: (insight: MarketInsight) => void;
}

export const InsightDetailModal: React.FC<InsightDetailModalProps> = ({
  insight,
  isOpen,
  onClose,
  onToggleFavorite,
  isFavorite,
  onConvertToLead
}) => {
  if (!insight) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl max-h-[90vh] bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    insight.type === 'project' 
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' 
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                  }`}>
                    {insight.type}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    {insight.category}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {insight.projectName}
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleFavorite(insight)}
                  className={`p-3 rounded-2xl transition-all ${
                    isFavorite 
                      ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' 
                      : 'bg-slate-50 text-slate-400 dark:bg-slate-800 hover:text-rose-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{insight.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{insight.status}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {insight.contractor && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                        <TargetIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contractor</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{insight.contractor}</p>
                      </div>
                    </div>
                  )}
                  
                  {insight.consultant && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Consultant</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{insight.consultant}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Person</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-bold">{insight.contactPerson || 'Not Available'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {insight.contactPhone || 'Not Available'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {insight.contactEmail || 'Not Available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500" />
                    Description
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {insight.description}
                  </p>
                </div>

                {insight.companyDetails && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <TargetIcon className="w-4 h-4 text-emerald-500" />
                      Company Details
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {insight.companyDetails}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-red-500" />
                      Relevance
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {insight.relevance}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Expected Scope
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {insight.scope}
                    </p>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                {insight.website && (
                  <a
                    href={insight.website.startsWith('http') ? insight.website : `https://${insight.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  >
                    <Globe className="w-4 h-4" />
                    Company Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {insight.tenderLink && (
                  <a
                    href={insight.tenderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {insight.type === 'project' ? 'Project/Tender Link' : 'Related News/Info'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-2xl text-sm font-black text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all uppercase tracking-widest"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onConvertToLead(insight);
                  onClose();
                }}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Convert to Lead
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
