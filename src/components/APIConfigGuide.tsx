import React from 'react';
import { motion } from 'motion/react';
import { X, Globe, Key, CheckCircle2, AlertCircle, ExternalLink, Map as MapIcon, Search, Navigation } from 'lucide-react';

interface APIConfigGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const APIConfigGuide: React.FC<APIConfigGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">API Configuration Guide</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Setup Instructions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Google Maps Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <MapIcon className="w-5 h-5" />
              <h3 className="text-lg font-black uppercase tracking-tight">Google Maps API Key</h3>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">1</span>
                  Obtain your API Key
                </h4>
                <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3" /></a></span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Create a new project or select an existing one.</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Navigate to <strong>APIs & Services &gt; Library</strong>.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">2</span>
                  Enable Required APIs
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium italic">You must enable these 4 APIs for all features to work:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Maps JavaScript API</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Maps Embed API</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-2">
                    <Search className="w-5 h-5 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Places API</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-2">
                    <Navigation className="w-5 h-5 text-orange-500" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Geocoding API</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">3</span>
                  Create Credentials
                </h4>
                <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Go to <strong>APIs & Services &gt; Credentials</strong>.</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Click <strong>Create Credentials &gt; API Key</strong>.</span>
                  </li>
                  <li className="flex gap-3">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span className="text-xs italic">Recommendation: Restrict your key to only the APIs enabled above to prevent unauthorized use.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Gemini Section */}
          <section className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Key className="w-5 h-5" />
              <h3 className="text-lg font-black uppercase tracking-tight">Gemini AI API Key</h3>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-1">Google AI Studio <ExternalLink className="w-3 h-3" /></a></span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Click <strong>Create API key in new project</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Copy the generated key and paste it into the <strong>Update Keys</strong> section of your profile.</span>
                </li>
                <li className="flex gap-3">
                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span className="text-xs italic">Note: Ensure the "Generative Language API" is enabled for your project in the Google Cloud Console if you encounter "API key not valid" errors.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* How to Set Section */}
          <section className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">How to Set Keys</h3>
            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                Once you have your keys, go to <strong>Settings &gt; API Configuration</strong> and click <strong>Update Keys</strong>. Paste your keys into the respective fields and click <strong>Save Profile</strong>. Your keys will be stored securely and used for all AI and Map features.
              </p>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm hover:opacity-90 transition-all active:scale-95"
          >
            Got it, thanks!
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default APIConfigGuide;
