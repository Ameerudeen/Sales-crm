import React, { useState, useEffect, useRef } from 'react';
import { X, User, Target, Mail, Phone, Briefcase, Tag, Search, MapPin, AlertCircle, Plus, Minus, Camera, Loader2, Users, Trash2, Clock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, Department, Account, MarketInsight, UserProfile, ContactPerson } from '../types';
import { crmService } from '../services/crmService';
import { auth } from '../firebase';
import { splitPhone } from '../lib/phoneUtils';
import BusinessCardScanner from './BusinessCardScanner';
import { compressImage } from '../lib/imageUtils';
import { COUNTRIES_DATA, COUNTRIES, PHONE_CODES } from '../constants';
import HistoryViewer from './HistoryViewer';

const libraries: ("places")[] = ["places"];

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Lead | null;
  convertFromInsight?: MarketInsight | null;
  convertFromExternal?: any | null;
  onToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  isLoaded: boolean;
  userProfile?: UserProfile | null;
}

const DEPARTMENTS: Department[] = ['Administration', 'Engineering', 'Finance', 'IT', 'Others', 'Purchase', 'Reception', 'Sales', 'Owner/CEO'];

// Helper to get ISO country code from name (basic mapping)
const getCountryCode = (countryName: string) => {
  const mapping: Record<string, string> = {
    'india': 'in',
    'united states': 'us',
    'united kingdom': 'gb',
    'uae': 'ae',
    'united arab emirates': 'ae',
    'saudi arabia': 'sa',
    'oman': 'om',
    'qatar': 'qa',
    'kuwait': 'kw',
    'bahrain': 'bh',
    'singapore': 'sg',
    'australia': 'au',
    'canada': 'ca',
    'germany': 'de',
    'france': 'fr'
  };
  return mapping[countryName.toLowerCase()] || null;
};

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, onSuccess, initialData, convertFromInsight, convertFromExternal, onToast, isLoaded, userProfile }) => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [industrySearch, setIndustrySearch] = useState('');
  const [showAdditionalContacts, setShowAdditionalContacts] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTimer, setScanTimer] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const allAccounts = await crmService.getAccounts();
        setAccounts(allAccounts);
      } catch (err) {
        console.error('Error fetching accounts:', err);
      }
    };
    const fetchIndustries = async () => {
      try {
        const list = await crmService.getIndustries();
        setAvailableIndustries(list);
      } catch (err) {
        console.error('Error fetching industries:', err);
      }
    };
    if (isOpen) {
      fetchAccounts();
      fetchIndustries();
    }
  }, [isOpen]);

  const handleScan = async (base64: string) => {
    setShowScanner(false);
    setIsScanning(true);
    setScanTimer(0);
    
    // Start timer for user feedback
    const timerInterval = setInterval(() => {
      setScanTimer(prev => prev + 1);
    }, 1000);

    try {
      // Optimize: Compress image before sending to server (reduces upload time significantly)
      console.log('Compressing image for faster scanning...');
      const compressedBase64 = await compressImage(base64, 1200, 1200, 0.8);
      
      console.log('Sending compressed image to AI scanner...');
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
          accountName: scannedData.accountName || prev.accountName,
          email: scannedData.email || prev.email,
          phone: scannedData.phone || prev.phone,
          website: scannedData.website || prev.website,
          street: scannedData.street || prev.street,
          city: scannedData.city || prev.city,
          pinCode: scannedData.pinCode || prev.pinCode,
          country: scannedData.country || prev.country,
          notes: scannedData.notes ? `${prev.notes}\n\nScanned Info: ${scannedData.notes}`.trim() : prev.notes,
          phones: scannedData.phone ? [scannedData.phone] : prev.phones,
          emails: scannedData.email ? [scannedData.email] : prev.emails
        }));

        // Fill company name in lead search and look for it on map
        if (scannedData.accountName && searchInputRef.current) {
          searchInputRef.current.value = scannedData.accountName;
          
          // Trigger a search on the map for the company
          if (isLoaded && window.google) {
            const service = new google.maps.places.PlacesService(document.createElement('div'));
            service.findPlaceFromQuery({
              query: scannedData.accountName,
              fields: ['geometry', 'name', 'formatted_address', 'place_id', 'plus_code']
            }, (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0] && results[0].geometry?.location) {
                const place = results[0];
                const lat = place.geometry!.location!.lat();
                const lng = place.geometry!.location!.lng();
                
                setFormData(prev => ({
                  ...prev,
                  lat,
                  lng
                }));
                
                if (onToast) {
                  onToast(`Located "${place.name}" on map`, 'info');
                }
              }
            });
          }
        }

      // Proactive duplicate check after scan
      const uid = auth.currentUser?.uid;
      if (uid && (scannedData.email || scannedData.phone)) {
        const duplicate = await crmService.checkGlobalDuplicate(
          scannedData.email ? [scannedData.email] : [],
          scannedData.phone ? [scannedData.phone] : [],
          uid
        );
        if (duplicate && duplicate.found) {
          const msg = `Warning: This contact info is already used in ${duplicate.type}: ${duplicate.name}`;
          if (onToast) {
            onToast(msg, 'warning');
          } else {
            alert(msg);
          }
        }
      }
    } catch (err: any) {
      console.error('Scan failed:', err);
      let message = err.message || 'Scanning failed. This could be due to poor lighting, an unclear image, or an issue with the AI service. Please try again or enter details manually.';
      
      if (err.message?.includes('API Key is not configured')) {
        message = 'Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your Secrets in the AI Studio Settings menu and restart the app.';
      } else if (err.message?.includes('API key not valid')) {
        message = 'The Gemini API Key provided is invalid. Please check your Secrets and ensure you have a valid key from Google AI Studio.';
      } else if (err.message?.includes('Failed to parse')) {
        message = 'The scanner couldn\'t read the card clearly. Please ensure the card is well-lit and the text is sharp.';
      }
      
      if (onToast) {
      onToast(message, 'warning');
    } else {
      alert(message);
    }
    } finally {
      setIsScanning(false);
      setScanTimer(0);
    }
  };

  const handleGeocode = async () => {
    setIsGeocoding(true);
    const fullAddress = `${formData.street} ${formData.city} ${formData.country}`.trim();
    const location = await crmService.geocode(fullAddress);
    if (location) {
      setFormData(prev => ({ ...prev, lat: location.lat, lng: location.lng }));
    }
    setIsGeocoding(false);
  };

  const handleAccountSelect = (account: Account) => {
    setFormData(prev => ({
      ...prev,
      accountName: account.name,
      website: account.website || prev.website,
      street: account.address.street || prev.street,
      city: account.address.city || prev.city,
      pinCode: account.address.pinCode || prev.pinCode,
      country: account.address.country || prev.country,
      lat: account.lat || prev.lat,
      lng: account.lng || prev.lng,
      industries: account.industries || (account.industry ? [account.industry] : prev.industries)
    }));
    setShowAccountDropdown(false);
  };

  const handleAddIndustry = async () => {
    if (!newIndustry.trim()) return;
    
    const industryToAdd = newIndustry.trim();
    
    // Check for duplicates in the global list first
    if (availableIndustries.some(ind => ind.toLowerCase() === industryToAdd.toLowerCase())) {
      onToast?.(`The industry "${industryToAdd}" already exists in the system.`, 'warning');
      setNewIndustry('');
      return;
    }
    
    // Add to global list
    await crmService.addIndustry(industryToAdd);
    setAvailableIndustries(prev => [...prev, industryToAdd]);
    
    // Add to the lead's selected industries if not already there
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

  const handleAccountInputChange = (value: string) => {
    setFormData({ ...formData, accountName: value });
    if (value.trim()) {
      const filtered = accounts.filter(acc => 
        acc.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAccounts(filtered);
      setShowAccountDropdown(true);
    } else {
      setFilteredAccounts([]);
      setShowAccountDropdown(false);
    }
  };

  const [formData, setFormData] = useState({
    salutation: 'Mr.',
    firstName: '',
    lastName: '',
    designation: '',
    department: 'Others' as Department,
    accountName: '',
    email: '',
    secondaryEmail: '',
    phone: '+971',
    telephone: '',
    street: '',
    city: 'Dubai',
    pinCode: '',
    country: 'United Arab Emirates',
    website: '',
    notes: '',
    lat: 25.2048,
    lng: 55.2708,
    emails: [''],
    phones: ['+971'],
    industries: [] as string[],
    additionalContacts: [] as ContactPerson[]
  });

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

  const addAdditionalContact = () => {
    setFormData(prev => ({
      ...prev,
      additionalContacts: [
        ...(prev.additionalContacts || []),
        {
          salutation: 'Mr.',
          firstName: '',
          lastName: '',
          designation: '',
          department: 'Others',
          email: '',
          phone: ''
        }
      ]
    }));
  };

  const removeAdditionalContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalContacts: (prev.additionalContacts || []).filter((_, i) => i !== index)
    }));
  };

  const updateAdditionalContact = (index: number, field: keyof ContactPerson, value: any) => {
    const newContacts = [...(formData.additionalContacts || [])];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, additionalContacts: newContacts }));
  };

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  const onPlaceChanged = (place: google.maps.places.PlaceResult) => {
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      let street = '';
      let city = '';
      let country = formData.country;
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
        accountName: place.name || prev.accountName,
        phone: place.international_phone_number || prev.phone,
        website: place.website || prev.website,
        street: street || prev.street,
        city: city || prev.city,
        country: country || prev.country,
        pinCode: pinCode || prev.pinCode,
        lat,
        lng
      }));
    }
  };

  // Initialize Autocomplete
  useEffect(() => {
    if (!isLoaded || !searchInputRef.current || !isOpen) return;

    const options = {
      fields: ["address_components", "geometry", "name", "formatted_address", "international_phone_number", "website"],
      componentRestrictions: getCountryCode(formData.country) ? { country: getCountryCode(formData.country) as string } : undefined
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
      const countryCode = getCountryCode(formData.country);
      if (countryCode) {
        autocompleteRef.current.setComponentRestrictions({ country: countryCode as string });
      } else {
        autocompleteRef.current.setComponentRestrictions(null as any);
      }
    }
  }, [formData.country]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        salutation: initialData.salutation || 'Mr.',
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        designation: initialData.designation || '',
        department: initialData.department || 'Others',
        accountName: initialData.accountName || '',
        email: initialData.email || '',
        secondaryEmail: initialData.secondaryEmail || '',
        phone: initialData.phone || '',
        telephone: initialData.telephone || '',
        street: initialData.street || '',
        city: initialData.city || '',
        pinCode: initialData.pinCode || '',
        country: initialData.country || '',
        website: initialData.website || '',
        notes: initialData.notes || '',
        lat: initialData.lat || 0,
        lng: initialData.lng || 0,
        emails: initialData.emails && initialData.emails.length > 0 ? initialData.emails : [initialData.email || ''],
        phones: initialData.phones && initialData.phones.length > 0 ? initialData.phones : [initialData.phone || ''],
        industries: initialData.industries || (initialData.industry ? [initialData.industry] : []),
        additionalContacts: initialData.additionalContacts || []
      });
    } else if (convertFromInsight) {
      setFormData({
        salutation: 'Mr.',
        firstName: convertFromInsight.contactPerson?.split(' ')[0] || '',
        lastName: convertFromInsight.contactPerson?.split(' ').slice(1).join(' ') || '',
        designation: '',
        department: 'Others',
        accountName: convertFromInsight.projectName || '',
        email: convertFromInsight.contactEmail || '',
        secondaryEmail: '',
        phone: convertFromInsight.contactPhone || '',
        telephone: '',
        street: '',
        city: convertFromInsight.location.split(',')[0].trim() || '',
        pinCode: '',
        country: 'United Arab Emirates',
        website: convertFromInsight.website || '',
        notes: `Source: AI Market Insight (${convertFromInsight.category})\nScope: ${convertFromInsight.scope}\nDescription: ${convertFromInsight.description}`,
        lat: convertFromInsight.lat || 25.2048,
        lng: convertFromInsight.lng || 55.2708,
        emails: [convertFromInsight.contactEmail || ''],
        phones: [convertFromInsight.contactPhone || ''],
        industries: [],
        additionalContacts: []
      });
    } else if (convertFromExternal) {
      setFormData({
        salutation: 'Mr.',
        firstName: convertFromExternal.name?.split(' ')[0] || '',
        lastName: convertFromExternal.name?.split(' ').slice(1).join(' ') || '',
        designation: '',
        department: 'Others',
        accountName: convertFromExternal.name || '',
        email: '',
        secondaryEmail: '',
        phone: '',
        telephone: '',
        street: convertFromExternal.address || '',
        city: convertFromExternal.city || '',
        pinCode: '',
        country: convertFromExternal.country || 'United Arab Emirates',
        website: '',
        notes: `Source: External Customer (Nearby)\nTypes: ${convertFromExternal.types?.join(', ')}`,
        lat: convertFromExternal.lat || 25.2048,
        lng: convertFromExternal.lng || 55.2708,
        emails: [''],
        phones: [''],
        industries: convertFromExternal.types || [],
        additionalContacts: []
      });
    } else {
      setFormData({
        salutation: 'Mr.',
        firstName: '',
        lastName: '',
        designation: '',
        department: 'Others' as Department,
        accountName: '',
        email: '',
        secondaryEmail: '',
        phone: '',
        telephone: '',
        street: '',
        city: '',
        pinCode: '',
        country: 'United Arab Emirates',
        website: '',
        notes: '',
        lat: 25.2048,
        lng: 55.2708,
        emails: [''],
        phones: [''],
        industries: [],
        additionalContacts: []
      });
    }
  }, [initialData, convertFromInsight, convertFromExternal, isOpen]);

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
      
      const updatedContacts = formData.additionalContacts.map(c => {
        const p = c.phone || '';
        if (!p || p === '+' || Object.values(PHONE_CODES).includes(p)) {
          return { ...c, phone: code };
        }
        return c;
      });
      
      const updates: any = {};
      
      // Update main phone if it's empty or doesn't have a code
      if (!formData.phone || formData.phone === '+' || Object.values(PHONE_CODES).includes(formData.phone)) {
        updates.phone = code;
      }
      
      if (JSON.stringify(updatedPhones) !== JSON.stringify(formData.phones)) {
        updates.phones = updatedPhones;
      }

      if (JSON.stringify(updatedContacts) !== JSON.stringify(formData.additionalContacts)) {
        updates.additionalContacts = updatedContacts;
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [formData.country]);

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    if (!formData.firstName || !formData.accountName) {
      if (onToast) {
        onToast('First Name and Account Name are mandatory', 'warning');
      } else {
        alert('First Name and Account Name are mandatory');
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        onToast?.('User not authenticated', 'error');
        setIsSubmitting(false);
        return;
      }

      // 1. Enhanced Duplicate Check
      const emailsToCheck = [...formData.emails, ...(formData.additionalContacts?.map(c => c.email) || [])].filter(Boolean) as string[];
      const phonesToCheck = [...formData.phones, ...(formData.additionalContacts?.map(c => c.phone) || [])].filter(Boolean) as string[];
      
      const duplicate = await crmService.checkDuplicateLead(
        emailsToCheck,
        phonesToCheck,
        formData.accountName,
        uid,
        initialData?.id
      );

      if (duplicate && duplicate.found) {
        const fieldName = duplicate.field === 'email' ? 'Email' : duplicate.field === 'phone' ? 'Phone Number' : 'Company Name';
        const msg = `Duplicate Found! The ${fieldName} "${duplicate.value || duplicate.name}" is already associated with a ${duplicate.type}: "${duplicate.name}". Please use a unique ${fieldName} to save this lead.`;
        setFormError(msg);
        formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        setIsSubmitting(false);
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
        secondaryEmail: filteredEmails[1] || formData.secondaryEmail || '',
        industry: formData.industries[0] || '',
        leadSource: initialData?.leadSource || (convertFromExternal ? 'External Customer' : convertFromInsight ? 'Prospect' : 'Created')
      };

      if (initialData) {
        await crmService.updateLead(initialData.id, submitData);
        onToast?.('Lead updated successfully', 'success');
      } else {
        await crmService.addLead({
          ...submitData,
          status: 'New'
        });
        onToast?.('Lead created successfully', 'success');
      }
      onSuccess();
      setShowDuplicateWarning(false);
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
      if (onToast) {
        onToast('Failed to save lead. Please try again.', 'error');
      } else {
        alert('Failed to save lead. Please try again.');
      }
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
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] w-full max-w-5xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row h-[90vh]"
      >
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-100 dark:border-slate-800/50">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
              <Tag className="w-5 h-5 text-blue-600" />
              {initialData ? 'Edit Lead' : 'Add New Lead'}
            </h2>
            <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors md:hidden text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {formError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-rose-900 dark:text-rose-100">Validation Error</p>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{formError}</p>
                </div>
                <button onClick={() => setFormError(null)} className="text-rose-400 hover:text-rose-600">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          {showDuplicateWarning && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Potential Duplicate Lead</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">A lead with the same email or phone already exists. Do you want to create it anyway?</p>
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
          {/* Business Card Scanner Button */}
          <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-800/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Business Card Scanner</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Tip: Ensure good lighting and hold the card steady</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              disabled={isScanning}
              className="px-6 py-2.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800/50 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2"
            >
              {isScanning ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{scanTimer}s</span>
                  </div>
                  <span className="text-[8px] text-blue-400 font-bold animate-pulse">Est. 5-10s</span>
                </div>
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              {isScanning ? 'Scanning...' : 'Scan Now'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Lead Source (Read-only) */}
            {initialData?.leadSource && (
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Lead Source</label>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
                  {initialData.leadSource}
                </div>
              </div>
            )}

            {/* Google Maps Search Bar */}
            {isLoaded && (
              <div className="col-span-2 space-y-4 pb-6 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                      <Search className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Lead Search</label>
                      <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-medium">Search by name to auto-fill details</p>
                    </div>
                  </div>
                </div>
                <div className="relative group">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for a company or place..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm pr-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <Search className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <style>{`
                  .pac-container {
                    border-radius: 1.5rem;
                    margin-top: 0.5rem;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    font-family: inherit;
                    z-index: 9999 !important;
                    padding: 0.5rem;
                  }
                  .dark .pac-container {
                    background-color: #1e293b;
                    border-color: #334155;
                    color: white;
                  }
                  .pac-item {
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    border-top: none;
                    display: flex;
                    align-items: center;
                    border-radius: 1rem;
                    margin-bottom: 2px;
                    transition: all 0.2s;
                  }
                  .dark .pac-item {
                    color: #94a3b8;
                  }
                  .pac-item:hover {
                    background-color: #f8fafc;
                  }
                  .dark .pac-item:hover {
                    background-color: #334155;
                  }
                  .pac-item-query {
                    font-size: 0.875rem;
                    color: #0f172a;
                    font-weight: 600;
                  }
                  .dark .pac-item-query {
                    color: #f1f5f9;
                  }
                  .pac-matched {
                    color: #3b82f6;
                  }
                `}</style>
              </div>
            )}

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
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                  value={formData.accountName}
                  onChange={e => handleAccountInputChange(e.target.value)}
                  onFocus={() => {
                    if (formData.accountName.trim()) setShowAccountDropdown(true);
                  }}
                  onBlur={() => {
                    // Delay to allow clicking on dropdown items
                    setTimeout(() => setShowAccountDropdown(false), 200);
                  }}
                />
                <AnimatePresence>
                  {showAccountDropdown && filteredAccounts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                    >
                      {filteredAccounts.map(acc => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => handleAccountSelect(acc)}
                          className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                              <Briefcase className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{acc.name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{acc.industry}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Industries</label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl min-h-[50px]">
                  {formData.industries.map(ind => (
                    <span key={ind} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                      {ind}
                      <button type="button" onClick={() => toggleIndustry(ind)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formData.industries.length === 0 && (
                    <span className="text-slate-400 dark:text-slate-500 text-xs italic">No industries selected</span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to add a new industry..."
                      className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
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
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Select from existing list</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsIndustryDropdownOpen(!isIndustryDropdownOpen)}
                        className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-600 dark:text-slate-300 text-xs md:text-sm font-medium"
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
                            className="absolute z-50 left-0 right-0 mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col gap-2"
                          >
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                              </div>
                              <input
                                type="text"
                                placeholder="Search industries..."
                                className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white text-xs font-medium"
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
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {ind}
                                  </button>
                                ))}
                              {availableIndustries.filter(ind => ind.toLowerCase().includes(industrySearch.toLowerCase())).length === 0 && (
                                <p className="text-[10px] text-slate-400 text-center py-2">No industries found</p>
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
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Additional Contacts Section */}
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Additional Contacts</label>
                </div>
                <button
                  type="button"
                  onClick={addAdditionalContact}
                  className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3" />
                  Add Contact
                </button>
              </div>

              {formData.additionalContacts && formData.additionalContacts.length > 0 ? (
                <div className="space-y-4">
                  {formData.additionalContacts.map((contact, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeAdditionalContact(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Salutation</label>
                          <select
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-xs font-medium"
                            value={contact.salutation}
                            onChange={e => updateAdditionalContact(index, 'salutation', e.target.value)}
                          >
                            <option value="Mr.">Mr.</option>
                            <option value="Ms.">Ms.</option>
                            <option value="Mrs.">Mrs.</option>
                            <option value="Dr.">Dr.</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">First Name</label>
                          <input
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-xs font-medium"
                            value={contact.firstName}
                            onChange={e => updateAdditionalContact(index, 'firstName', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Last Name</label>
                          <input
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-xs font-medium"
                            value={contact.lastName}
                            onChange={e => updateAdditionalContact(index, 'lastName', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Designation</label>
                          <input
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-xs font-medium"
                            value={contact.designation}
                            onChange={e => updateAdditionalContact(index, 'designation', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Email</label>
                          <input
                            type="email"
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-xs font-medium"
                            value={contact.email}
                            onChange={e => updateAdditionalContact(index, 'email', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Phone</label>
                          <div className="flex gap-2">
                             <input
                              className="w-16 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-center"
                              placeholder="+00"
                              value={splitPhone(contact.phone || '').code}
                              onChange={e => {
                                const { number } = splitPhone(contact.phone || '');
                                let val = e.target.value;
                                if (val && !val.startsWith('+')) val = '+' + val;
                                updateAdditionalContact(index, 'phone', val + number);
                              }}
                            />
                            <input
                              className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-xs font-medium"
                              value={splitPhone(contact.phone || '').number}
                              onChange={e => {
                                const { code } = splitPhone(contact.phone || '');
                                updateAdditionalContact(index, 'phone', code + e.target.value);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider italic">No additional contacts added</p>
                </div>
              )}
            </div>

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

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Website</label>
              <input
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                placeholder="www.example.com"
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Street</label>
              <input
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.street}
                onChange={e => setFormData({ ...formData, street: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Country</label>
              <select
                required
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.country}
                onChange={e => {
                  const newCountry = e.target.value;
                  const newCode = PHONE_CODES[newCountry] || '';
                  
                  // Update main phone
                  const { number: mainNum } = splitPhone(formData.phone);
                  const updatedMainPhone = newCode + mainNum;

                  // Update multiple phones array
                  const updatedPhones = formData.phones.map(p => {
                    const { number } = splitPhone(p);
                    return newCode + number;
                  });

                  // Update additional contacts
                  const updatedContacts = formData.additionalContacts.map(c => {
                    const { number } = splitPhone(c.phone || '');
                    return { ...c, phone: newCode + number };
                  });

                  setFormData({ 
                    ...formData, 
                    country: newCountry, 
                    city: '',
                    phone: updatedMainPhone,
                    phones: updatedPhones,
                    additionalContacts: updatedContacts
                  });
                }}
              >
                <option value="">Select Country...</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country} className="dark:bg-slate-900">{country}</option>
                ))}
                <option value="Other" className="dark:bg-slate-900">Other...</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">City</label>
              {COUNTRIES_DATA[formData.country] ? (
                <select
                  required
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                >
                  <option value="">Select City...</option>
                  {COUNTRIES_DATA[formData.country].map(city => (
                    <option key={city} value={city} className="dark:bg-slate-900">{city}</option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                  placeholder="Enter city name"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Pin Code</label>
              <input
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.pinCode}
                onChange={e => setFormData({ ...formData, pinCode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Notes</label>
            <textarea
              rows={4}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium resize-none"
              placeholder="Add any additional information..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 flex justify-between items-center px-1">
              <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Location Details</h3>
              <button 
                type="button"
                onClick={handleGeocode}
                disabled={isGeocoding}
                className="text-[11px] font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2 uppercase tracking-widest"
              >
                <MapPin className={`w-3.5 h-3.5 ${isGeocoding ? 'animate-spin' : ''}`} />
                Geocode Address
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Latitude</label>
              <input
                type="number"
                step="any"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.lat}
                onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Longitude</label>
              <input
                type="number"
                step="any"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white text-xs md:text-sm font-medium"
                value={formData.lng}
                onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* History Section */}
          {initialData && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <HistoryViewer 
                history={initialData.history} 
                createdAt={initialData.createdAt}
                title="Lead History" 
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
              {isSubmitting ? 'Saving...' : (initialData ? 'Update Lead' : 'Create Lead')}
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
            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider text-sm">
              <MapPin className="w-4 h-4 text-blue-600" />
              Lead Location
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Interactive map preview of the lead location.</p>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-100 dark:bg-slate-900">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white">Map Preview Unavailable</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Please configure your Google Maps API key to see the live view.</p>
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

export default LeadModal;
