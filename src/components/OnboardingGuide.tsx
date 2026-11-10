import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronRight, Zap, Target, Users, LayoutDashboard } from 'lucide-react';

interface OnboardingGuideProps {
  isOpen: boolean;
  step: number;
  onNext: () => void;
  onClose: () => void;
}

const steps = [
  {
    title: "Welcome to Sales Perks CRM!",
    description: "Let's take a quick tour of your new CRM. It's designed to help you manage leads, contacts, and accounts efficiently.",
    icon: LayoutDashboard,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20"
  },
  {
    title: "Manage Your Leads",
    description: "The Leads tab is where you track potential customers. You can import them from Excel or add them manually.",
    icon: Target,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20"
  },
  {
    title: "Contacts & Accounts",
    description: "Organize your business relationships. Link contacts to accounts and view them all in one place.",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20"
  },
  {
    title: "Nearby Customers Tracking",
    description: "Use the Nearby Customers feature to find accounts near you. Perfect for planning your daily field visits.",
    icon: Zap,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20"
  }
];

export default function OnboardingGuide({ isOpen, step, onNext, onClose }: OnboardingGuideProps) {
  if (!isOpen) return null;

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: '0%' }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex flex-col items-center text-center">
          <div className={`w-20 h-20 ${currentStep.bgColor} rounded-3xl flex items-center justify-center mb-6 shadow-inner`}>
            <Icon className={`w-10 h-10 ${currentStep.color}`} />
          </div>

          <h3 className="text-2xl font-black tracking-tight text-crm-text-light dark:text-crm-text-dark mb-3 uppercase">
            {currentStep.title}
          </h3>
          <p className="text-crm-muted-light dark:text-crm-muted-dark leading-relaxed mb-8 font-medium">
            {currentStep.description}
          </p>

          <div className="flex items-center justify-between w-full gap-4">
            <button
              onClick={onClose}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors tracking-widest uppercase"
            >
              Skip Tour
            </button>
            <button
              onClick={step === steps.length - 1 ? onClose : onNext}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 tracking-widest uppercase"
            >
              {step === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Get Started
                </>
              ) : (
                <>
                  Next Step
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {steps.map((_, i) => (
            <div 
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
