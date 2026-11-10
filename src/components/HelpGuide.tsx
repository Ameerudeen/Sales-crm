import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Target, Users, LayoutDashboard, Database, Navigation, StickyNote, Calendar, ShieldCheck, Info } from 'lucide-react';

interface HelpGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const guideSections = [
  {
    title: "Dashboard Overview",
    icon: LayoutDashboard,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    content: "The dashboard provides a high-level view of your CRM activities, including recent leads, upcoming reminders, and key metrics."
  },
  {
    title: "Lead Management",
    icon: Target,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    content: "Track potential customers in the Leads tab. You can convert qualified leads into Contacts and Accounts with a single click."
  },
  {
    title: "Contacts & Accounts",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    content: "Organize your business relationships. Accounts represent companies, and Contacts are the individuals within those companies."
  },
  {
    title: "Nearby Customers Tracking",
    icon: Navigation,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    content: "Find accounts near your current location. Perfect for field sales reps to plan their daily visits and optimize travel time."
  },
  {
    title: "Meeting Notes & Reminders",
    icon: StickyNote,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    content: "Keep track of all interactions. Add notes to accounts or contacts and set reminders for follow-up activities."
  },
  {
    title: "Data Import & Export",
    icon: Database,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    content: "Easily bulk import data from Excel or CSV files. You can also export any list to Excel for offline reporting."
  }
];

export default function HelpGuide({ isOpen, onClose }: HelpGuideProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 dark:shadow-none">
                  <Zap className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Help & User Guide</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Everything you need to know about Sales Perks CRM.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 transition-all hover:rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {guideSections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${section.bgColor} flex items-center justify-center shrink-0 shadow-inner`}>
                          <Icon className={`w-6 h-6 ${section.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">{section.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            {section.content}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pro Tips Section */}
              <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2 uppercase tracking-tight">
                  <ShieldCheck className="w-6 h-6" />
                  Pro Tips for Success
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-blue-700 dark:text-blue-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                    <p className="text-sm font-medium">Keep your data clean by using the <strong>Merge</strong> tool to combine duplicate records.</p>
                  </li>
                  <li className="flex items-start gap-3 text-blue-700 dark:text-blue-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                    <p className="text-sm font-medium">Set <strong>Reminders</strong> for every lead follow-up to ensure no opportunity falls through the cracks.</p>
                  </li>
                  <li className="flex items-start gap-3 text-blue-700 dark:text-blue-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                    <p className="text-sm font-medium">Use the <strong>Nearby Customers</strong> feature when you're on the road to find nearby clients for impromptu visits.</p>
                  </li>
                </ul>
              </div>

              {/* Troubleshooting Section */}
              <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
                  <Info className="w-6 h-6 text-slate-400" />
                  Troubleshooting & Known Issues
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-tight">WebSocket / Vite Connection Errors</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      If you see errors like <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-rose-500">failed to connect to websocket</code>, please ignore them. These are benign development environment messages related to Hot Module Replacement (HMR) being disabled in the preview sandbox. They do not affect the application's functionality.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-tight">Gemini API Quota & Refresh Schedule</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Market Insights and Prospects are automatically refreshed twice daily at <strong>08:00 AM</strong> and <strong>02:00 PM UAE Time</strong> to optimize API usage and reduce rate limits.
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      If you see "Quota Exceeded" warnings, please provide your own Gemini API Key in the <strong>Settings</strong> tab. You can get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-tight">Location Permission Errors</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      If the app cannot get your location, ensure you have granted location permissions in your browser. In some browsers, you may need to open the app in a new tab to successfully grant these permissions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest"
              >
                Got it, Thanks!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
