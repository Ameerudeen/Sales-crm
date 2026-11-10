import React, { useState, useCallback, useEffect } from 'react';
import { X, Target, MapPin, Phone, Mail, Globe, Briefcase, Search, AlertCircle, RefreshCw, Plus, Minus, Clock, ChevronDown, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Account, UserProfile } from '../types';
import { crmService } from '../services/crmService';
import { auth } from '../firebase';
import { splitPhone } from '../lib/phoneUtils';
import { COUNTRIES_DATA, COUNTRIES, PHONE_CODES } from '../constants';
import HistoryViewer from './HistoryViewer';

const libraries: ("places")[] = ["places"];

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: Account) => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  initialData?: Account | null;
  onShowOnMap?: (location: { lat: number, lng: number }) => void;
  onViewContacts?: (account: Account) => void;
  isLoaded: boolean;
  userProfile?: UserProfile | null;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSuccess, onToast, initialData, onShowOnMap, onViewContacts, isLoaded, userProfile }) => {
  const [formData, setFormData] = useState({
    name: '',
    industries: [] as string[],
    address: {
      flatHouseNo: '',
      street: '',
      city: 'Dubai',
      pinCode: '',
      country: 'United Arab Emirates'
    },
    phones: ['+971'],
    telephone: '',
    emails: [''],
    website: '',
    lat: 25.2048,
    lng: 55.2708
  });

  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);
  const [industrySearch, setIndustrySearch] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const fetchIndustries = async () => {
      const list = await crmService.getIndustries();
      setAvailableIndustries(list);
    };
    if (isOpen) {
      fetchIndustries();
    }
  }, [isOpen]);

  const onPlaceChanged = (place: google.maps.places.PlaceResult) => {
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const placeId = place.place_id;
      
      // Extract address components
      let street = '';
      let city = '';
      let country = formData.address.country;
      let pinCode = '';

      if (place.address_components) {
        for (const component of place.address_components) {
          const types = component.types;
          if (types.includes('route')) {
            street = component.long_name;
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
          } else if (types.includes('postal_code')) {
            pinCode = component.long_name;
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        name: place.name || prev.name,
        website: place.website || prev.website,
        phones: place.international_phone_number ? [place.international_phone_number] : prev.phones,
        address: {
          ...prev.address,
          street: street || prev.address.street,
          city: city || prev.address.city,
          country: country || prev.address.country,
          pinCode: pinCode || prev.address.pinCode
        },
        lat,
        lng,
        placeId
      }));
    }
  };

  // Initialize Autocomplete
  useEffect(() => {
    if (!isLoaded || !searchInputRef.current || !isOpen) return;

    const options = {
      fields: ["address_components", "geometry", "name", "formatted_address", "international_phone_number", "website", "place_id"],
      componentRestrictions: getCountryCode(formData.address.country) ? { country: getCountryCode(formData.address.country) as string } : undefined
    };

    autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, options);

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place) {
        onPlaceChanged(place);
      }
    });

    return () => {
      if (google.maps.event && searchInputRef.current) {
        google.maps.event.clearInstanceListeners(searchInputRef.current);
      }
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => container.remove());
    };
  }, [isLoaded, isOpen]);

  // Update restrictions if country changes
  useEffect(() => {
    if (autocompleteRef.current) {
      const countryCode = getCountryCode(formData.address.country);
      if (countryCode) {
        autocompleteRef.current.setComponentRestrictions({ country: countryCode as string });
      } else {
        autocompleteRef.current.setComponentRestrictions(null as any);
      }
    }
  }, [formData.address.country]);

  const getCountryCode = (country: string) => {
    if (!country) return undefined;
    if (country.length === 2) return country.toLowerCase();
    const map: Record<string, string> = {
      'united arab emirates': 'ae',
      'uae': 'ae',
      'united kingdom': 'gb',
      'uk': 'gb',
      'united states': 'us',
      'usa': 'us',
      'india': 'in',
      'saudi arabia': 'sa',
      'qatar': 'qa',
      'oman': 'om',
      'kuwait': 'kw',
      'bahrain': 'bh'
    };
    return map[country.toLowerCase()];
  };

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        industries: initialData.industries || (initialData.industry ? [initialData.industry] : []),
        address: { ...initialData.address },
        phones: initialData.phones && initialData.phones.length > 0 ? initialData.phones : [initialData.phone || ''],
        telephone: initialData.telephone || '',
        emails: initialData.emails && initialData.emails.length > 0 ? initialData.emails : [initialData.email || ''],
        website: initialData.website || '',
        lat: initialData.lat,
        lng: initialData.lng
      });
    } else {
      setFormData({
        name: '',
        industries: [],
        address: {
          flatHouseNo: '',
          street: '',
          city: '',
          pinCode: '',
          country: 'United Arab Emirates'
        },
        phones: [''],
        telephone: '',
        emails: [''],
        website: '',
        lat: 25.2048,
        lng: 55.2708
      });
    }
  }, [initialData, isOpen]);

  const handleGeocode = async () => {
    setIsGeocoding(true);
    const address = formData.address;
    const fullAddress = `${address.flatHouseNo} ${address.street} ${address.city} ${address.country}`.trim();
    const location = await crmService.geocode(fullAddress);
    if (location) {
      setFormData(prev => ({ ...prev, lat: location.lat, lng: location.lng }));
    }
    setIsGeocoding(false);
  };

  useEffect(() => {
    if (!formData.address.country || typeof PHONE_CODES === 'undefined') return;
    
    const newCode = PHONE_CODES[formData.address.country];
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
  }, [formData.address.country]);

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
    if (!formData.industries.includes(industryToAdd)) {
      setFormData(prev => ({
        ...prev,
        industries: [...prev.industries, industryToAdd]
      }));
    }
    
    setNewIndustry('');
  };

  const toggleIndustry = (industry: string) => {
    setFormData(prev => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter(i => i !== industry)
        : [...prev.industries, industry]
    }));
  };

  // Handle automatic country code population
  useEffect(() => {
    if (!formData.address.country || typeof PHONE_CODES === 'undefined') return;
    
    // Find matching country case-insensitively
    const countryName = Object.keys(PHONE_CODES).find(
      c => c.toLowerCase() === formData.address.country.trim().toLowerCase()
    );
    
    if (countryName) {
      const code = PHONE_CODES[countryName];
      
      const updatedPhones = formData.phones.map((p, idx) => {
        // Update if empty, just '+', or exactly a phone code from constants
        if (!p || p === '+' || Object.values(PHONE_CODES).includes(p)) {
          return code;
        }
        return p;
      });
      
      if (JSON.stringify(updatedPhones) !== JSON.stringify(formData.phones)) {
        setFormData(prev => ({ ...prev, phones: updatedPhones }));
      }
    }
  }, [formData.address.country]);

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
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
      const duplicate = await crmService.checkDuplicateAccount(formData.name, formData.emails, formData.phones, uid, initialData?.id);
      if (duplicate && duplicate.found) {
        const fieldName = duplicate.field === 'email' ? 'Email' : duplicate.field === 'phone' ? 'Phone Number' : 'Account Name';
        const msg = `Duplicate Found! The ${fieldName} "${duplicate.value || duplicate.name}" is already associated with a ${duplicate.type}: "${duplicate.name}". Please use a unique ${fieldName} to save this account.`;
        setError(msg);
        setIsSubmitting(false);
        formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Clean up empty phones and emails
      const cleanData = {
        ...formData,
        phones: formData.phones.filter(p => p.trim() !== ''),
        emails: formData.emails.filter(e => e.trim() !== ''),
        // For backward compatibility
        phone: formData.phones[0] || '',
        email: formData.emails[0] || '',
        industry: formData.industries[0] || ''
      };

      let savedAccount: Account;
      if (initialData) {
        savedAccount = await crmService.updateAccount(initialData.id, cleanData);
        onToast?.('Account updated successfully', 'success');
      } else {
        savedAccount = await crmService.addAccount(cleanData as any);
        onToast?.('Account created successfully', 'success');
      }
      onSuccess(savedAccount);
      setShowDuplicateWarning(false);
      onClose();
    } catch (err) {
      console.error('Account submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save account. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const googleMapsApiKey = userProfile?.googleMapsApiKey || (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
  const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${formData.lat},${formData.lng}`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh]"
      >
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100 dark:border-gray-800">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Target className="w-5 h-5 text-blue-600" />
              {initialData ? (
                <div className="flex flex-col">
                  <span className="leading-tight">{initialData.name}</span>
                  {initialData.accountId && (
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mt-0.5">ID: {initialData.accountId}</span>
                  )}
                </div>
              ) : 'Add New Account'}
            </h2>
            <div className="flex items-center gap-2">
              {initialData && onViewContacts && (
                <button
                  type="button"
                  onClick={() => onViewContacts(initialData)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  View Contacts
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors md:hidden text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
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
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Potential Duplicate Account</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">An account with the name "{formData.name}" already exists. Do you want to create it anyway?</p>
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
            <div className="grid grid-cols-2 gap-6">
              {/* Google Maps Search Bar - Moved to Top */}
              {isLoaded && (
                <div className="col-span-2 space-y-3 pb-6 border-b-2 border-blue-50 dark:border-blue-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Search className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <label className="text-xs md:text-sm font-bold text-gray-900 dark:text-white">Customer Search</label>
                        <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400">Search by name to auto-fill details</p>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search for a company or place..."
                      className="w-full p-4 bg-crm-card-light dark:bg-crm-card-dark border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm pr-12"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <Search className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 col-span-2">
                <label className="text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                  Industries <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl min-h-[50px]">
                    {formData.industries.map(ind => (
                      <span key={ind} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                        {ind}
                        <button type="button" onClick={() => toggleIndustry(ind)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formData.industries.length === 0 && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs italic">No industries selected</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type to add a new industry (e.g. Renewable Energy Solutions)..."
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                        value={newIndustry}
                        onChange={e => setNewIndustry(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddIndustry())}
                      />
                      <button
                        type="button"
                        onClick={handleAddIndustry}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold text-xs"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-1">Select from existing list</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsIndustryDropdownOpen(!isIndustryDropdownOpen)}
                          className="w-full p-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-between outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-600 dark:text-gray-300 text-xs md:text-sm font-medium"
                        >
                          <span>Choose an industry...</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isIndustryDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isIndustryDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 left-0 right-0 mt-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col gap-2"
                            >
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Search industries..."
                                  className="w-full pl-10 pr-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white text-xs font-medium"
                                  value={industrySearch}
                                  onChange={e => setIndustrySearch(e.target.value)}
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                {availableIndustries
                                  .filter(ind => ind.toLowerCase().includes(industrySearch.toLowerCase()))
                                  .sort()
                                  .map(ind => (
                                    <button
                                      key={ind}
                                      type="button"
                                      disabled={formData.industries.includes(ind)}
                                      onClick={() => {
                                        toggleIndustry(ind);
                                        setIsIndustryDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                        formData.industries.includes(ind)
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 cursor-not-allowed'
                                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                      }`}
                                    >
                                      {ind}
                                    </button>
                                  ))}
                                {availableIndustries.filter(ind => ind.toLowerCase().includes(industrySearch.toLowerCase())).length === 0 && (
                                  <p className="text-[10px] text-gray-400 text-center py-2">No industries found</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Website</label>
                <input
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                  placeholder="www.example.com"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              
              <div className="col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Precise Location</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white"
                      value={formData.lat}
                      onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white"
                      value={formData.lng}
                      onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Address Details</h3>
                  <div className="flex items-center gap-4">
                    {onShowOnMap && (
                      <button 
                        type="button"
                        onClick={() => onShowOnMap({ lat: formData.lat, lng: formData.lng })}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Show on Map
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={handleGeocode}
                      disabled={isGeocoding}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <MapPin className={`w-3 h-3 ${isGeocoding ? 'animate-spin' : ''}`} />
                      Geocode Address
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Flat / House No."
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                    value={formData.address.flatHouseNo}
                    onChange={e => setFormData({ ...formData, address: { ...formData.address, flatHouseNo: e.target.value } })}
                  />
                  <input
                    placeholder="Street"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                    value={formData.address.street}
                    onChange={e => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                  />
                  {COUNTRIES_DATA[formData.address.country] ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                        City <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-sm"
                        value={formData.address.city}
                        onChange={e => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                      >
                        <option value="">Select City...</option>
                        {COUNTRIES_DATA[formData.address.country].map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        placeholder="City"
                        required
                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                        value={formData.address.city}
                        onChange={e => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-sm"
                      value={formData.address.country}
                      onChange={e => {
                        const newCountry = e.target.value;
                        const newCode = PHONE_CODES[newCountry] || '';
                        const updatedPhones = formData.phones.map(phone => {
                          const { number } = splitPhone(phone);
                          return newCode + number;
                        });
                        setFormData({ 
                          ...formData, 
                          address: { ...formData.address, country: newCountry, city: '' },
                          phones: updatedPhones
                        });
                      }}
                    >
                      <option value="">Select Country...</option>
                      {COUNTRIES.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                      <option value="Other">Other...</option>
                    </select>
                  </div>
                  <input
                    placeholder="Pin Code"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                    value={formData.address.pinCode}
                    onChange={e => setFormData({ ...formData, address: { ...formData.address, pinCode: e.target.value } })}
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Phone Numbers</label>
                  <button
                    type="button"
                    onClick={handleAddPhone}
                    className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline uppercase tracking-widest"
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
                        className="w-24 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm font-bold text-center"
                        placeholder="+000"
                        value={code}
                        onChange={e => {
                          let val = e.target.value;
                          if (val && !val.startsWith('+')) val = '+' + val;
                          handlePhoneChange(index, val + number);
                        }}
                      />
                      <input
                        className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                        placeholder={`Phone ${index + 1}`}
                        value={number}
                        onChange={e => handlePhoneChange(index, code + e.target.value)}
                      />
                      {formData.phones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhone(index)}
                          className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="col-span-2 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Emails</label>
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline uppercase tracking-widest"
                  >
                    <Plus className="w-3 h-3" />
                    Add Email
                  </button>
                </div>
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs md:text-sm"
                      placeholder={`Email ${index + 1}`}
                      value={email}
                      onChange={e => handleEmailChange(index, e.target.value)}
                    />
                    {formData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(index)}
                        className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
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
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <HistoryViewer 
                  history={initialData.history} 
                  createdAt={initialData.createdAt}
                  title="Account History" 
                />
              </div>
            )}

            <div className="pt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {initialData ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  initialData ? 'Update Account' : 'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="hidden md:flex flex-col w-96 bg-slate-50 dark:bg-slate-800 relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-900 rounded-full shadow-sm transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-crm-card-light dark:bg-crm-card-dark">
            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Location
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Interactive map preview of the account location.</p>
          </div>

          <div className="flex-1 relative">
            {googleMapsApiKey ? (
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-100 dark:bg-gray-800">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">Map Preview Unavailable</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Please configure your Google Maps API key to see the live view.</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-crm-card-light dark:bg-crm-card-dark border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <span>Coordinates</span>
              <span className="text-blue-600">Auto-Synced</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">LAT</p>
                <p className="text-xs font-mono font-bold dark:text-white">{formData.lat.toFixed(6)}</p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">LNG</p>
                <p className="text-xs font-mono font-bold dark:text-white">{formData.lng.toFixed(6)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AccountModal;
