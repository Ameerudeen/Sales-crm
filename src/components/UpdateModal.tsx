import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, X, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { APP_VERSION, CHANGELOG } from '../constants/version';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateModal({ isOpen, onClose }: UpdateModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[25000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            <div className="relative p-8">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-[24px] bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">New Update!</h2>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-200 dark:border-blue-800">
                      v{APP_VERSION}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">We've added some great new features for you.</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">What's New</h3>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {CHANGELOG.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                        {feature}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                Got it, let's go!
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
