import React, { useState, useEffect } from 'react';
import { X, User, Building2, Mail, Phone, Briefcase, Plus, Minus, AlertCircle, Clock, Camera, Loader2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, Account, Department } from '../types';
import { crmService } from '../services/crmService';
import { auth } from '../firebase';
import { splitPhone } from '../lib/phoneUtils';
import HistoryViewer from './HistoryViewer';
import BusinessCardScanner from './BusinessCardScanner';
import { compressImage } from '../lib/imageUtils';
import { COUNTRIES, PHONE_CODES } from '../constants';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenAccountModal: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  initialData?: Contact | null;
}

const DEPARTMENTS: Department[] = ['Administration', 'Engineering', 'Finance', 'IT', 'Others', 'Purchase', 'Reception', 'Sales', 'Owner/CEO'];

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onSuccess, onOpenAccountModal, onToast, initialData }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTimer, setScanTimer] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    accountId: '',
    salutation: 'Mr.',
    firstName: '',
    lastName: '',
    designation: '',
    department: 'Others' as Department,
    email: '',
    secondaryEmail: '',
    phone: '+971',
    telephone: '',
    country: 'United Arab Emirates',
    emails: [''],
    phones: ['+971']
  });

  useEffect(() => {
    if (!formData.country || typeof PHONE_CODES === 'undefined') return;
    
    const newCode = PHONE_CODES[formData.country];
    if (!newCode) return;

    const updatedPhones = formData.phones.map(p => {
      // Update if empty, just '+', or exactly a phone code from constants
      if (!p || p === '+' || Object.values(PHONE_CODES).includes(p)) {
        return newCode;
      }
      return p;
    });

    if (JSON.stringify(updatedPhones) !== JSON.stringify(formData.phones)) {
      setFormData(prev => ({ ...prev, phones: updatedPhones }));
    }
  }, [formData.country]);

  const handleAddPhone = () => {
    setFormData(prev => ({ ...prev, phones: [...prev.phones, ''] }));
  };

  const handleRemovePhone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index)
    }));
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData(prev => ({ ...prev, phones: newPhones }));
  };

  const handleAddEmail = () => {
    setFormData(prev => ({ ...prev, emails: [...prev.emails, ''] }));
  };

  const handleRemoveEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...formData.emails];
    newEmails[index] = value;
    setFormData(prev => ({ ...prev, emails: newEmails }));
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      if (isOpen) {
        const fetchedAccounts = await crmService.getAccounts();
        setAccounts(fetchedAccounts);
        
        if (initialData) {
          setFormData({
            accountId: initialData.accountId || '',
            salutation: initialData.salutation || 'Mr.',
            firstName: initialData.firstName || '',
            lastName: initialData.lastName || '',
            designation: initialData.designation || '',
            department: initialData.department || 'Others',
            email: initialData.email || '',
            secondaryEmail: initialData.secondaryEmail || '',
            phone: initialData.phone || '',
            telephone: initialData.telephone || '',
            country: (initialData as any).country || 'United Arab Emirates',
            emails: initialData.emails && initialData.emails.length > 0 ? initialData.emails : [initialData.email || ''],
            phones: initialData.phones && initialData.phones.length > 0 ? initialData.phones : [initialData.phone || '']
          });
        } else {
          setFormData({
            accountId: '',
            salutation: 'Mr.',
            firstName: '',
            lastName: '',
            designation: '',
            department: 'Others' as Department,
            email: '',
            secondaryEmail: '',
            phone: '',
            telephone: '',
            country: 'United Arab Emirates',
            emails: [''],
            phones: ['']
          });
        }
      }
    };
    fetchAccounts();
  }, [isOpen, initialData]);

  const handleScan = async (base64: string) => {
    setShowScanner(false);
    setIsScanning(true);
    setScanTimer(0);
    
    const timerInterval = setInterval(() => {
      setScanTimer(prev => prev + 1);
    }, 1000);

    try {
      const compressedBase64 = await compressImage(base64, 1200, 1200, 0.8);
      const scannedData = await crmService.scanBusinessCard(compressedBase64);
      
      clearInterval(timerInterval);
      if (!scannedData || Object.keys(scannedData).length === 0) {
        throw new Error('No data could be extracted from the card.');
      }

      setFormData(prev => ({
        ...prev,
        salutation: scannedData.salutation || prev.salutation,
        firstName: scannedData.firstName || prev.firstName,
        lastName: scannedData.lastName || prev.lastName,
        designation: scannedData.designation || prev.designation,
        email: scannedData.email || prev.email,
        phone: scannedData.phone || prev.phone,
        phones: scannedData.phone ? [scannedData.phone] : prev.phones,
        emails: scannedData.email ? [scannedData.email] : prev.emails
      }));

      // Try to match account name if provided
      if (scannedData.accountName) {
        const matchingAccount = accounts.find(a => 
          a.name.toLowerCase().includes(scannedData.accountName!.toLowerCase())
        );
        if (matchingAccount) {
          setFormData(prev => ({ ...prev, accountId: matchingAccount.id }));
          onToast?.(`Matched with account: ${matchingAccount.name}`, 'info');
        }
      }

      onToast?.('Card scanned successfully!', 'success');
    } catch (err: any) {
      console.error('Scan failed:', err);
      onToast?.(err.message || 'Scanning failed. Please try again.', 'warning');
    } finally {
      setIsScanning(false);
      setScanTimer(0);
      clearInterval(timerInterval);
    }
  };

  // Handle automatic country code population
  useEffect(() => {
    if (!formData.country || typeof PHONE_CODES === 'undefined') return;
    
    // Find matching country case-insensitively
    const countryName = Object.keys(PHONE_CODES).find(
      c => c.toLowerCase() === formData.country.trim().toLowerCase()
    );
    
    if (countryName) {
      const code = PHONE_CODES[countryName];
      
      const updatedPhones = formData.phones.map(p => {
        // Update if empty, just '+', or exactly a phone code from constants
        if (!p || p === '+' || Object.values(PHONE_CODES).includes(p)) {
          return code;
        }
        return p;
      });
      
      const updates: any = {};
      
      // Update main phone if it's empty or doesn't have a code
      if (!formData.phone || formData.phone === '+' || Object.values(PHONE_CODES).includes(formData.phone)) {
        updates.phone = code;
      }
      
      if (JSON.stringify(updatedPhones) !== JSON.stringify(formData.phones)) {
        updates.phones = updatedPhones;
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [formData.country]);

  // Sync country with selected account
  useEffect(() => {
    if (formData.accountId && accounts.length > 0) {
      const account = accounts.find(a => a.id === formData.accountId);
      if (account && account.address?.country && !initialData) {
        setFormData(prev => ({ ...prev, country: account.address.country }));
      }
    }
  }, [formData.accountId, accounts, initialData]);

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    if (!formData.firstName || !formData.accountId) {
      setError('First Name and Account Name are mandatory');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('User not authenticated');
        setIsSubmitting(false);
        return;
      }

      // 1. Enhanced Duplicate Check
      const duplicate = await crmService.checkDuplicateContact(
        formData.emails, 
        formData.phones, 
        formData.firstName,
        formData.lastName,
        formData.accountId,
        uid,
        initialData?.id
      );

      if (duplicate && duplicate.found) {
        const fieldName = duplicate.field === 'email' ? 'Email' : duplicate.field === 'phone' ? 'Phone Number' : 'Contact Name';
        const msg = `Duplicate Found! The ${fieldName} "${duplicate.value || duplicate.name}" is already associated with a ${duplicate.type}: "${duplicate.name}". Please use a unique ${fieldName} to save this contact.`;
        setError(msg);
        setIsSubmitting(false);
        formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const filteredPhones = formData.phones.filter(p => p.trim() !== '');
      const filteredEmails = formData.emails.filter(e => e.trim() !== '');

      const submitData = {
        ...formData,
        phones: filteredPhones,
        emails: filteredEmails,
        phone: filteredPhones[0] || '',
        telephone: filteredPhones[1] || formData.telephone || '',
        email: filteredEmails[0] || '',
        secondaryEmail: filteredEmails[1] || formData.secondaryEmail || ''
      };

      if (initialData && initialData.id) {
        await crmService.updateContact(initialData.id, submitData);
        onToast?.('Contact updated successfully', 'success');
      } else {
        await crmService.addContact(submitData as any);
        onToast?.('Contact created successfully', 'success');
      }
      
      // Call onSuccess and onClose independently to ensure modal closes
      try {
        onSuccess();
      } catch (e) {
        console.error('Error in onSuccess:', e);
      }
      setShowDuplicateWarning(false);
      onClose();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      setError(error.message || 'Failed to save contact. Please check your permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/50"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <User className="w-5 h-5 text-blue-600" />
            {initialData ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-rose-900 dark:text-rose-100">Validation Error</p>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {showDuplicateWarning && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Potential Duplicate Contact</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">A contact with the same email or phone already exists. Do you want to create it anyway?</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSubmit(null as any, true)}
                    className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Yes, Create Anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDuplicateWarning(false)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 text-amber-600 border border-amber-200 dark:border-amber-800 text-[10px] font-bold rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    No, Let me check
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Account Name <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="text-[10px] font-black text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition-colors uppercase tracking-widest"
                >
                  <Camera className="w-3 h-3" />
                  Scan Card
                </button>
                <button
                  type="button"
                  onClick={onOpenAccountModal}
                  className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3" />
                  New Account
                </button>
              </div>
            </div>
            <select
              required
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
              value={formData.accountId}
              onChange={e => setFormData({ ...formData, accountId: e.target.value })}
            >
              <option value="" className="dark:bg-slate-900 dark:text-white">Select an existing account...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="dark:bg-slate-900 dark:text-white">{acc.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Salutation</label>
              <select
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.salutation}
                onChange={e => setFormData({ ...formData, salutation: e.target.value })}
              >
                <option className="dark:bg-slate-900 dark:text-white">Mr.</option>
                <option className="dark:bg-slate-900 dark:text-white">Ms.</option>
                <option className="dark:bg-slate-900 dark:text-white">Mrs.</option>
                <option className="dark:bg-slate-900 dark:text-white">Dr.</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
              <input
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Designation</label>
              <input
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Department</label>
              <select
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value as Department })}
              >
                {DEPARTMENTS.sort().map(dept => (
                  <option key={dept} value={dept} className="dark:bg-slate-900">{dept}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Country</label>
              <select
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.country}
                onChange={e => {
                  const newCountry = e.target.value;
                  const newCode = PHONE_CODES[newCountry] || '';
                  const updatedPhones = formData.phones.map(phone => {
                    const { number } = splitPhone(phone);
                    return newCode + number;
                  });
                  setFormData({ ...formData, country: newCountry, phones: updatedPhones });
                }}
              >
                {COUNTRIES.map(country => (
                  <option key={country} value={country} className="dark:bg-slate-900">{country}</option>
                ))}
                <option value="Other" className="dark:bg-slate-900">Other...</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Phone Numbers</label>
                <button
                  type="button"
                  onClick={handleAddPhone}
                  className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3" />
                  Add Phone
                </button>
              </div>
              {formData.phones.map((phone, index) => {
                const { code, number } = splitPhone(phone);
                return (
                  <div key={index} className="flex gap-2">
                    <input
                      className="w-24 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-bold text-center"
                      placeholder="+000"
                      value={code}
                      onChange={e => {
                        let val = e.target.value;
                        if (val && !val.startsWith('+')) val = '+' + val;
                        handlePhoneChange(index, val + number);
                      }}
                    />
                    <input
                      className="flex-1 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                      placeholder={`Phone ${index + 1}`}
                      value={number}
                      onChange={e => handlePhoneChange(index, code + e.target.value)}
                    />
                    {formData.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhone(index)}
                        className="p-3.5 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Emails</label>
                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3" />
                  Add Email
                </button>
              </div>
              {formData.emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    className="flex-1 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                    placeholder={`Email ${index + 1}`}
                    value={email}
                    onChange={e => handleEmailChange(index, e.target.value)}
                  />
                  {formData.emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(index)}
                      className="p-3.5 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* History Section */}
          {initialData && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <HistoryViewer 
                history={initialData.history} 
                createdAt={initialData.createdAt}
                title="Contact History" 
              />
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {isSubmitting ? 'Saving...' : (initialData ? 'Update Contact' : 'Create Contact')}
            </button>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {showScanner && (
          <BusinessCardScanner 
            onScan={handleScan} 
            onClose={() => setShowScanner(false)} 
          />
        )}
      </AnimatePresence>

      {isScanning && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900/30 rounded-full animate-spin border-t-blue-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 dark:text-white uppercase tracking-widest">Scanning Card</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Extracting details with AI...</p>
            </div>
            {scanTimer > 0 && (
              <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{scanTimer}s</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactModal;
