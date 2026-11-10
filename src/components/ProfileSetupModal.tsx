import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Target, Briefcase, Phone, Mail, X, Save, Key, Globe } from 'lucide-react';
import { UserProfile } from '../types';
import { splitPhone } from '../lib/phoneUtils';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Omit<UserProfile, 'uid' | 'createdAt' | 'theme'>) => void;
  initialEmail: string;
  initialData?: UserProfile | null;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ isOpen, onClose, onSave, initialEmail, initialData }) => {
  const [formData, setFormData] = useState({
    salutation: initialData?.salutation || 'Mr.',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    organizationName: initialData?.organizationName || '',
    designation: initialData?.designation || '',
    phone: initialData?.phone || '+971',
    email: initialData?.email || initialEmail,
    password: initialData?.password || '',
    about: initialData?.about || '',
    geminiApiKey: initialData?.geminiApiKey || '',
    googleMapsApiKey: initialData?.googleMapsApiKey || ''
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        salutation: initialData.salutation,
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        organizationName: initialData.organizationName,
        designation: initialData.designation,
        phone: initialData.phone,
        email: initialData.email,
        password: initialData.password || '',
        about: initialData.about || '',
        geminiApiKey: initialData.geminiApiKey || '',
        googleMapsApiKey: initialData.googleMapsApiKey || ''
      });
    }
  }, [initialData, isOpen]);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-crm-card-light dark:bg-crm-card-dark w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-crm-text-light dark:text-crm-text-dark uppercase">Complete Your Profile</h2>
              <p className="text-sm text-crm-muted-light dark:text-crm-muted-dark font-medium">Please provide your details to get started.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 uppercase tracking-tight">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Salutation</label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-medium outline-none"
                  value={formData.salutation}
                  onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                >
                  <option>Mr.</option>
                  <option>Ms.</option>
                  <option>Mrs.</option>
                  <option>Dr.</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-medium outline-none"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Name</label>
              <input
                required
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-medium outline-none"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Organization Name</label>
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-medium outline-none"
                  placeholder="Acme Corp"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Designation</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-medium outline-none"
                    placeholder="Sales Engineer"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</label>
                <div className="flex gap-2">
                  <div className="relative w-24 shrink-0">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl pl-11 pr-2 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-bold text-center outline-none"
                      placeholder="+000"
                      value={splitPhone(formData.phone).code}
                      onChange={(e) => {
                        const { number } = splitPhone(formData.phone);
                        let val = e.target.value;
                        if (val && !val.startsWith('+')) val = '+' + val;
                        setFormData({ ...formData, phone: val + number });
                      }}
                    />
                  </div>
                  <input
                    type="tel"
                    className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-medium outline-none"
                    placeholder="50 123 4567"
                    value={splitPhone(formData.phone).number}
                    onChange={(e) => {
                      const { code } = splitPhone(formData.phone);
                      setFormData({ ...formData, phone: code + e.target.value });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Create Password</label>
                <input
                  required
                  type="password"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-medium outline-none"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirm Password</label>
                <input
                  required
                  type="password"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-medium outline-none"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">About You</label>
              <textarea
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white min-h-[100px] font-medium outline-none"
                placeholder="Tell us a bit about yourself..."
                value={formData.about}
                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Gemini API Key (Free Tier)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, geminiApiKey: '' })}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest"
                  >
                    Clear
                  </button>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    Get Key
                  </a>
                </div>
              </div>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  className="w-full bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-mono outline-none"
                  placeholder="Paste your Gemini API Key here..."
                  value={formData.geminiApiKey}
                  onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                Your API key is stored securely in your profile. This allows you to use AI features like business card scanning and market insights.
              </p>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Google Maps API Key</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, googleMapsApiKey: '' })}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest"
                  >
                    Clear
                  </button>
                  <a 
                    href="https://console.cloud.google.com/google/maps-apis/credentials" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    Get Key
                  </a>
                </div>
              </div>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  className="w-full bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white font-mono outline-none"
                  placeholder="Paste your Google Maps API Key here..."
                  value={formData.googleMapsApiKey}
                  onChange={(e) => setFormData({ ...formData, googleMapsApiKey: e.target.value })}
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                Used for maps, address searching, and location-based insights.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSetupModal;
