import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Briefcase, Mail, X, Save, Shield, RefreshCw } from 'lucide-react';
import { UserProfile, Department } from '../types';
import { crmService } from '../services/crmService';

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const DEPARTMENTS: Department[] = ['Administration', 'Engineering', 'Finance', 'IT', 'Others', 'Purchase', 'Reception', 'Sales', 'Owner/CEO'];

const AdminUserModal: React.FC<AdminUserModalProps> = ({ isOpen, onClose, user, onToast }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        salutation: user.salutation,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationName: user.organizationName,
        designation: user.designation,
        role: user.role,
        accountType: user.accountType || 'classic',
        about: user.about || ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!window.confirm('Are you sure you want to save these changes to the user profile?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await crmService.adminUpdateUserProfile(user.uid, formData);
      onToast?.('User updated successfully', 'success');
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      onToast?.('Failed to update user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white uppercase tracking-tight">Edit User</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Admin Controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Salutation</label>
              <select
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white text-sm"
                value={formData.salutation}
                onChange={e => setFormData({ ...formData, salutation: e.target.value })}
              >
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Role</label>
              <select
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white text-sm"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' || 'user' })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Account Type</label>
              <select
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white text-sm"
                value={formData.accountType}
                onChange={e => setFormData({ ...formData, accountType: e.target.value as 'classic' | 'pro' })}
              >
                <option value="classic">Classic</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">First Name</label>
              <input
                required
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white text-sm"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Last Name</label>
              <input
                required
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white text-sm"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Organization</label>
            <input
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white text-sm"
              value={formData.organizationName}
              onChange={e => setFormData({ ...formData, organizationName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Designation</label>
            <input
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white text-sm"
              value={formData.designation}
              onChange={e => setFormData({ ...formData, designation: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">About / Bio</label>
            <textarea
              rows={3}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white text-sm resize-none"
              value={formData.about}
              onChange={e => setFormData({ ...formData, about: e.target.value })}
            />
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminUserModal;
