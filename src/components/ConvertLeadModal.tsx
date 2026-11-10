import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Phone, Mail, Globe, Briefcase, Zap, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Lead, Account } from '../types';
import { crmService } from '../services/crmService';

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  lead: Lead;
}

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({ isOpen, onClose, onSuccess, onToast, lead }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState('');
  const [accountData, setAccountData] = useState({
    industries: [] as string[],
    address: {
      flatHouseNo: '',
      street: '',
      city: '',
      pinCode: '',
      country: ''
    },
    phones: [] as string[],
    telephone: '',
    emails: [] as string[],
    website: '',
    lat: 25.2048,
    lng: 55.2708
  });

  useEffect(() => {
    const fetchIndustries = async () => {
      const list = await crmService.getIndustries();
      setAvailableIndustries(list);
    };
    if (isOpen) {
      fetchIndustries();
      setAccountData({
        industries: lead.industries || [],
        address: {
          flatHouseNo: '',
          street: '',
          city: lead.city || '',
          pinCode: '',
          country: lead.country || ''
        },
        phones: lead.phones && lead.phones.length > 0 ? lead.phones : [lead.phone || ''],
        telephone: lead.telephone || '',
        emails: lead.emails && lead.emails.length > 0 ? lead.emails : [lead.email || ''],
        website: lead.website || '',
        lat: lead.lat || 25.2048,
        lng: lead.lng || 55.2708
      });
    }
  }, [isOpen, lead]);

  const handleAddIndustry = async () => {
    if (!newIndustry.trim()) return;
    
    const industryToAdd = newIndustry.trim();
    
    // Check for duplicates in the global list first
    if (availableIndustries.some(ind => ind.toLowerCase() === industryToAdd.toLowerCase())) {
      alert(`The industry "${industryToAdd}" already exists in the system.`);
      setNewIndustry('');
      return;
    }
    
    // Add to global list
    await crmService.addIndustry(industryToAdd);
    setAvailableIndustries(prev => [...prev, industryToAdd]);
    
    // Add to the account's selected industries if not already there
    if (!accountData.industries.includes(industryToAdd)) {
      setAccountData(prev => ({
        ...prev,
        industries: [...prev.industries, industryToAdd]
      }));
    }
    
    setNewIndustry('');
  };

  const toggleIndustry = (industry: string) => {
    setAccountData(prev => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter(i => i !== industry)
        : [...prev.industries, industry]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanData = {
        ...accountData,
        phones: accountData.phones.filter(p => p.trim() !== ''),
        emails: accountData.emails.filter(e => e.trim() !== ''),
        // Backward compatibility
        phone: accountData.phones[0] || '',
        email: accountData.emails[0] || '',
        industry: accountData.industries[0] || ''
      };
      await crmService.convertLead(lead.id, cleanData as any);
      
      // Dispatch event to refresh UI
      window.dispatchEvent(new CustomEvent('crm-action'));
      
      onToast?.('Lead converted successfully to Account and Contact.', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error converting lead:', error);
      onToast?.('Failed to convert lead. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/50"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-blue-600 text-white">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Convert Lead: {lead.firstName} {lead.lastName}
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100/50 dark:border-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-400 font-bold">
            Converting this lead will simultaneously create an Account for <strong>{lead.accountName}</strong> and a Contact for <strong>{lead.firstName} {lead.lastName}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Industries</label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl min-h-[60px]">
                  {accountData.industries.map(ind => (
                    <span key={ind} className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-blue-200 dark:border-blue-900/30">
                      {ind}
                      <button type="button" onClick={() => toggleIndustry(ind)} className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {accountData.industries.length === 0 && (
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold italic uppercase tracking-widest">No industries selected</span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to add a new industry..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-bold"
                      value={newIndustry}
                      onChange={e => setNewIndustry(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddIndustry())}
                    />
                    <button
                      type="button"
                      onClick={handleAddIndustry}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Or select from existing list</label>
                    <select
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-bold"
                      onChange={e => e.target.value && toggleIndustry(e.target.value)}
                      value=""
                    >
                      <option value="" className="dark:bg-slate-900">Choose an industry...</option>
                      {availableIndustries.sort().map(ind => (
                        <option key={ind} value={ind} disabled={accountData.industries.includes(ind)} className="dark:bg-slate-900">
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Website</label>
              <input
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold dark:text-white text-xs md:text-sm"
                placeholder="www.example.com"
                value={accountData.website}
                onChange={e => setAccountData({ ...accountData, website: e.target.value })}
              />
            </div>
            
            <div className="col-span-2 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Account Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Flat / House No."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold dark:text-white text-xs md:text-sm"
                  value={accountData.address.flatHouseNo}
                  onChange={e => setAccountData({ ...accountData, address: { ...accountData.address, flatHouseNo: e.target.value } })}
                />
                <input
                  placeholder="Street"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold dark:text-white text-xs md:text-sm"
                  value={accountData.address.street}
                  onChange={e => setAccountData({ ...accountData, address: { ...accountData.address, street: e.target.value } })}
                />
                <input
                  placeholder="City"
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold dark:text-white text-xs md:text-sm"
                  value={accountData.address.city}
                  onChange={e => setAccountData({ ...accountData, address: { ...accountData.address, city: e.target.value } })}
                />
                <input
                  placeholder="Country"
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold dark:text-white text-xs md:text-sm"
                  value={accountData.address.country}
                  onChange={e => setAccountData({ ...accountData, address: { ...accountData.address, country: e.target.value } })}
                />
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Account Phone(s)</label>
              <div className="flex flex-col gap-3">
                {accountData.phones.map((phone, i) => (
                  <input
                    key={i}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold dark:text-white text-xs md:text-sm"
                    value={phone}
                    onChange={e => {
                      const newPhones = [...accountData.phones];
                      newPhones[i] = e.target.value;
                      setAccountData({ ...accountData, phones: newPhones });
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Account Email(s)</label>
              <div className="flex flex-col gap-3">
                {accountData.emails.map((email, i) => (
                  <input
                    key={i}
                    type="email"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold dark:text-white text-xs md:text-sm"
                    value={email}
                    onChange={e => {
                      const newEmails = [...accountData.emails];
                      newEmails[i] = e.target.value;
                      setAccountData({ ...accountData, emails: newEmails });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {isSubmitting ? 'Converting...' : 'Convert & Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ConvertLeadModal;
