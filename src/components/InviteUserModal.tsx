import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Link, Send, UserCheck, Copy, Sparkles, Shield, RefreshCw } from 'lucide-react';
import { crmService } from '../services/crmService';
import { auth } from '../firebase';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, onToast }) => {
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState<'classic' | 'pro'>('classic');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const appLink = window.location.origin;
  const invitationMessage = `Hi,

You are invited to join our CRM system as a ${accountType === 'pro' ? 'Pro' : 'Classic'} version user. 

Please register an account here: ${appLink}

Once registered, your account will be automatically configured with your ${accountType === 'pro' ? 'Pro' : 'Classic'} permissions.

Best regards,
CRM Admin`;

  const handleSendInvite = async () => {
    if (!email) {
      onToast?.('Please enter an email address', 'error');
      return;
    }

    setIsSending(true);
    try {
      // 1. Create invitation record in Firestore
      const authUser = auth.currentUser;
      await crmService.createInvitation(email, accountType);
      
      // 2. Send automated email via backend
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Invitation to join CRM System',
          text: invitationMessage,
          html: `
            <div style="font-family: sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc; border-radius: 20px;">
              <div style="background-color: white; padding: 40px; border-radius: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                <h1 style="color: #059669; margin-top: 0; font-size: 24px;">Welcome to our CRM System</h1>
                <p style="font-size: 16px; line-height: 1.6;">You have been invited by <strong>${authUser?.email || 'udeen3197@gmail.com'}</strong> to join as a <strong>${accountType === 'pro' ? 'Pro' : 'Classic'}</strong> version user.</p>
                <div style="margin: 40px 0;">
                  <a href="${appLink}" style="background-color: #059669; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">Register Your Account</a>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">Once registered, your account will be automatically configured with your permissions.</p>
                <p style="font-size: 10px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
                  Sent from udeen3197@gmail.com via CRM Automation
                </p>
              </div>
            </div>
          `
        }),
      });

      if (!response.ok) {
        let errorInfo = 'Failed to send automated email';
        try {
          const errorData = await response.json();
          errorInfo = errorData.error || errorInfo;
        } catch (e) {}
        throw new Error(errorInfo);
      }

      onToast?.('Invitation sent successfully!', 'success');
      onClose();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      let message = error.message || 'Failed to record invitation';
      
      // Try to parse Firestore JSON error
      if (message.includes('{')) {
        try {
          const match = message.match(/\{.*\}/);
          if (match) {
            const errData = JSON.parse(match[0]);
            message = `Registration Error: ${errData.error || 'Permission Denied'}`;
          }
        } catch (e) {}
      }
      
      onToast?.(message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appLink);
    onToast?.('App link copied to clipboard', 'success');
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white uppercase tracking-tight">Invite Team Member</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Expand your workforce</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
              Enter the email address of the team member you wish to invite. This will open your default email client with a pre-formatted invitation including the system registration link.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Team Member's Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full p-3 pl-11 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all dark:text-white text-sm"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Account Version</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('classic')}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                    accountType === 'classic'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <Shield className={`w-5 h-5 ${accountType === 'classic' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${accountType === 'classic' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-400'}`}>Classic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('pro')}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                    accountType === 'pro'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-500'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 ${accountType === 'pro' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${accountType === 'pro' ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-400'}`}>Pro Version</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Shareable System Link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none dark:text-white text-sm opacity-60"
                  value={appLink}
                />
                <button
                  onClick={handleCopyLink}
                  className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-slate-50 transition-all group"
                  title="Copy registration link"
                >
                  <Copy className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvite}
            className="flex-3 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <Send className="w-5 h-5" />
            Send Email Invitation
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default InviteUserModal;
