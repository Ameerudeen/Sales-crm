import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Users, UserPlus, LayoutDashboard, Search, Bell, Settings, LogIn, LogOut, Plus, Upload, Calendar, History, ChevronRight, Navigation, Phone, Mail, User, Briefcase, Zap, Tag, Target, GitMerge, Clock, X, Trash2, Pencil, FileSpreadsheet, StickyNote, RefreshCw, ShieldCheck, Shield, ExternalLink, ArrowRight, ArrowUp, Check, Lock, Menu, Heart, Globe, Wifi, WifiOff, Filter, LayoutGrid, ChevronUp, Key, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { format, isSameDay } from 'date-fns';
import { Lead, Contact, Account, UserLocation, Department, Industry, Reminder, Note, UserProfile, StorageStats, MarketInsight, Visit, Activity } from './types';
import { crmService, getDistance, OperationType, handleFirestoreError } from './services/crmService';
import LeadDetailModal from './components/LeadDetailModal';
import { COUNTRIES_DATA, COUNTRIES, PHONE_CODES } from './constants';
import { auth, loginWithGoogle, logout, onAuthStateChanged, User as FirebaseUser, db } from './firebase';
import { onSnapshotsInSync, onSnapshot, query, collection, where, doc } from 'firebase/firestore';
import ImportModal from './components/ImportModal';
import LeadModal from './components/LeadModal';
import ContactModal from './components/ContactModal';
import AccountModal from './components/AccountModal';
import ConvertLeadModal from './components/ConvertLeadModal';
import ReminderModal from './components/ReminderModal';
import MergeModal from './components/MergeModal';
import MergeAccountModal from './components/MergeAccountModal';
import NoteModal from './components/NoteModal';
import ProfileSetupModal from './components/ProfileSetupModal';
import AccountDetailModal from './components/AccountDetailModal';
import ContactDetailModal from './components/ContactDetailModal';
import OnboardingGuide from './components/OnboardingGuide';
import HelpGuide from './components/HelpGuide';
import { DuplicateAlert } from './components/DuplicateAlert';
import Map from './components/Map';
import { InsightDetailModal } from './components/InsightDetailModal';
import UpdateModal from './components/UpdateModal';
import DuplicateDetailsModal from './components/DuplicateDetailsModal';
import VisitModal from './components/VisitModal';
import OutlookCalendar from './components/OutlookCalendar';
import Toast, { ToastMessage } from './components/Toast';
import ConfirmationModal from './components/ConfirmationModal';
import NotificationBar from './components/NotificationBar';
import ActivityDetailModal from './components/ActivityDetailModal';
import AdminUserModal from './components/AdminUserModal';
import InviteUserModal from './components/InviteUserModal';
import SystemAuditLogModal from './components/SystemAuditLogModal';
import { APP_VERSION } from './constants/version';
import { Download, Database, CheckCircle2, AlertCircle, TrendingUp, PieChart, Activity as ActivityIcon, Info, Sparkles, CreditCard } from 'lucide-react';
import MiniCalendar from './components/MiniCalendar';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Default center (Dubai)
const DEFAULT_LOCATION: UserLocation = { lat: 25.2048, lng: 55.2708 };
const libraries: ("places")[] = ["places"];

const ResizableHeader = ({ 
  label, 
  width, 
  onResize, 
  column, 
  table,
  filterValue,
  onFilterChange,
  uniqueValues = [],
  className = ""
}: { 
  label: string, 
  width: number, 
  onResize: (w: number) => void,
  column: string,
  table: 'leads' | 'contacts' | 'accounts',
  filterValue?: string[],
  onFilterChange?: (val: string[]) => void,
  uniqueValues?: string[],
  className?: string
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const lastXRef = React.useRef<number | null>(null);

  const filteredUniqueValues = uniqueValues.filter(val => 
    String(val).toLowerCase().includes(searchValue.toLowerCase())
  );

  const toggleValue = (val: string) => {
    if (!onFilterChange || !filterValue) return;
    if (filterValue.includes(val)) {
      onFilterChange(filterValue.filter(v => v !== val));
    } else {
      onFilterChange([...filterValue, val]);
    }
  };

  const toggleAll = () => {
    if (!onFilterChange) return;
    if (filterValue && filterValue.length === uniqueValues.length) {
      onFilterChange([]);
    } else {
      onFilterChange([...uniqueValues]);
    }
  };

  useEffect(() => {
    if (!isResizing) {
      lastXRef.current = null;
      return;
    }
    
    const handleMove = (clientX: number) => {
      if (lastXRef.current !== null) {
        const movementX = clientX - lastXRef.current;
        if (movementX !== 0) {
          const newWidth = Math.max(30, width + movementX);
          onResize(newWidth);
        }
      }
      lastXRef.current = clientX;
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        if (isResizing) {
          e.preventDefault();
        }
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsResizing(false);
      lastXRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, width, onResize]);

  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePos = () => {
      if (showFilterOptions && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + 4,
          left: rect.right - 200
        });
      }
    };
    
    updatePos();
    
    if (showFilterOptions) {
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);
      return () => {
        window.removeEventListener('scroll', updatePos, true);
        window.removeEventListener('resize', updatePos);
      };
    }
  }, [showFilterOptions]);

  return (
    <th 
      className={`sticky top-[155px] md:top-[88px] z-10 bg-slate-900 dark:bg-slate-950 px-2 py-3 text-[9px] md:text-[10px] font-bold text-slate-100 dark:text-slate-200 uppercase tracking-wider relative group border-r border-slate-800 dark:border-slate-900 last:border-r-0 ${className}`}
      style={{ width }}
    >
      <div className="flex items-center justify-between">
        <span className="truncate">{label}</span>
        {onFilterChange && (
          <div className="relative">
            <button 
              ref={buttonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowFilterOptions(!showFilterOptions);
              }}
              className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ${
                filterValue && filterValue.length < uniqueValues.length ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Filter className="w-3 h-3" />
            </button>
            {showFilterOptions && createPortal(
              <div 
                className="fixed bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 rounded-2xl z-[15000] py-4 min-w-[200px] max-w-[250px]"
                style={{ 
                  top: dropdownPos.top, 
                  left: Math.min(window.innerWidth - 210, Math.max(10, dropdownPos.left)) 
                }}
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="px-4 mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-[200px] overflow-y-auto px-2 custom-scrollbar">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAll();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className={`w-4 h-4 aspect-square flex-none rounded border flex items-center justify-center transition-all shrink-0 ${
                        filterValue && filterValue.length === uniqueValues.length 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {filterValue && filterValue.length === uniqueValues.length && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">(Select All)</span>
                    </div>
                    
                    {filteredUniqueValues.map(val => (
                      <div
                        key={val}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleValue(val);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <div className={`w-4 h-4 aspect-square flex-none rounded border flex items-center justify-center transition-all shrink-0 ${
                          filterValue?.includes(val)
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {filterValue?.includes(val) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">{val || '(Empty)'}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-4 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFilterOptions(false);
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      OK
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
      <div 
        className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-blue-400/30 transition-colors z-10 -mr-1.5"
        onMouseDown={() => setIsResizing(true)}
        onTouchStart={() => setIsResizing(true)}
      />
    </th>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Use a stable API key to prevent "Loader must not be called again with different options" error.
  // We use a state that only initializes once per session to ensure stability.
  // We also cache the key in localStorage to ensure it's available immediately on next load.
  const [googleMapsApiKey] = useState(() => {
    const cachedKey = localStorage.getItem('google_maps_api_key');
    if (cachedKey) return cachedKey;
    // Fallback to env key for the very first load ever
    return (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  });

  // Sync the profile key to localStorage for the next session
  useEffect(() => {
    if (userProfile?.googleMapsApiKey) {
      const currentCached = localStorage.getItem('google_maps_api_key');
      if (userProfile.googleMapsApiKey !== currentCached) {
        localStorage.setItem('google_maps_api_key', userProfile.googleMapsApiKey);
        // If the key changed and it's different from what we are currently using,
        // we might want to notify the user, but we MUST NOT update the state
        // that is passed to useJsApiLoader to avoid the error.
      }
    } else if (userProfile && !userProfile.googleMapsApiKey) {
      // If user cleared their key, remove from cache to fallback to env next time
      localStorage.removeItem('google_maps_api_key');
    }
  }, [userProfile?.googleMapsApiKey]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
    libraries
  });

  // Handle Google Maps load error
  useEffect(() => {
    if (loadError) {
      console.error('Google Maps Load Error:', loadError);
      setError(`Google Maps failed to load: ${loadError.message}. Please check your API key.`);
    }
  }, [loadError]);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'contacts' | 'accounts' | 'calendar' | 'nearby-customers' | 'notes' | 'settings' | 'admin' | 'map' | 'help'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'profile' | 'customize' | 'security'>('profile');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [pinnedLocation, setPinnedLocation] = useState<UserLocation | null>(null);
  const [searchMode, setSearchMode] = useState<'current' | 'pinned'>('current');
  const [pinnedAddress, setPinnedAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [systemStats, setSystemStats] = useState<{ totalUsers: number, totalAccounts: number, totalLeads: number, totalContacts: number } | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [filterKey, setFilterKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLeadDetailModalOpen, setIsLeadDetailModalOpen] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [nearbySearchQuery, setNearbySearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [industryFilter, setIndustryFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');

  // Reset city filter when country changes
  useEffect(() => {
    setCityFilter('All');
  }, [countryFilter]);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [nearbyRange, setNearbyRange] = useState(5);
  const [nearbyTypeFilter, setNearbyTypeFilter] = useState<'All' | 'Accounts' | 'Prospects' | 'External'>('All');
  const [nearbyIndustryFilter, setNearbyIndustryFilter] = useState<string>('All');
  const [selectedDashboardDate, setSelectedDashboardDate] = useState<Date | null>(null);
  const [nearbyExternalCustomers, setNearbyExternalCustomers] = useState<any[]>([]);
  const [isFetchingNearby, setIsFetchingNearby] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>(() => {
    try {
      const saved = localStorage.getItem('market_insights');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error parsing market_insights:', e);
      return [];
    }
  });
  const [isFetchingInsights, setIsFetchingInsights] = useState(false);
  const [isFetchingMoreInsights, setIsFetchingMoreInsights] = useState(false);
  const [prospects, setProspects] = useState<MarketInsight[]>(() => {
    try {
      const saved = localStorage.getItem('prospect_insights');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error parsing prospect_insights:', e);
      return [];
    }
  });
  const [isFetchingProspects, setIsFetchingProspects] = useState(false);
  const [isFetchingMoreProspects, setIsFetchingMoreProspects] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [favoriteInsights, setFavoriteInsights] = useState<MarketInsight[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<MarketInsight | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [initialVisitTarget, setInitialVisitTarget] = useState<{ id: string, type: 'account' | 'lead' | 'prospect' | 'external', name: string } | undefined>(undefined);
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('last_market_refresh');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  });
  const [calendarSubTab, setCalendarSubTab] = useState<'reminders' | 'visits'>('reminders');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isNotificationBarOpen, setIsNotificationBarOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isActivityDetailModalOpen, setIsActivityDetailModalOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ignoredDuplicateCounts, setIgnoredDuplicateCounts] = useState<{ [key: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('ignored_duplicate_counts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState('');
  const [isDeletingIndustry, setIsDeletingIndustry] = useState<string | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading' | 'installing' | 'complete'>('idle');
  const [serverHealth, setServerHealth] = useState<{ apiKeyConfigured: boolean; reason?: string } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Remove the system theme listener that was overriding user preference
  useEffect(() => {
    // We only want to set the theme from the profile or default to light
    // The profile listener already handles setTheme(profile.theme)
  }, []);

  // Version check for update notification
  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('app_version');
    if (lastSeenVersion !== APP_VERSION) {
      setIsUpdateModalOpen(true);
      localStorage.setItem('app_version', APP_VERSION);
    }
  }, []);
  
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAccountDetailModalOpen, setIsAccountDetailModalOpen] = useState(false);
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<Account | null>(null);
  const [isContactDetailModalOpen, setIsContactDetailModalOpen] = useState(false);
  const [selectedContactForDetail, setSelectedContactForDetail] = useState<Contact | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [syncLocation, setSyncLocation] = useState(true);
  const [syncDateTime, setSyncDateTime] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Security PIN states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });
  const [lastDeletedItem, setLastDeletedItem] = useState<{ type: string, data: any } | null>(null);
  const [lastRestoredItem, setLastRestoredItem] = useState<{ type: string, data: any } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showRedoToast, setShowRedoToast] = useState(false);

  // Direct Gemini API Key state for Settings & Profile
  const [directGeminiKey, setDirectGeminiKey] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '') || '';
  });
  const [showDirectKey, setShowDirectKey] = useState(false);
  const [isSavingDirectKey, setIsSavingDirectKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [directKeyStatus, setDirectKeyStatus] = useState<string>('');

  // Sync Gemini API Key from user profile & localStorage
  useEffect(() => {
    const key = userProfile?.geminiApiKey || (typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || localStorage.getItem('geminiApiKey')) : '') || '';
    if (key) {
      setDirectGeminiKey(key);
      localStorage.setItem('gemini_api_key', key);
      localStorage.setItem('geminiApiKey', key);
      import('./services/geminiService').then(({ geminiService }) => {
        geminiService.setApiKey(key);
      });
    }
  }, [userProfile?.geminiApiKey]);

  const handleTestGeminiKey = async () => {
    const key = directGeminiKey.trim();
    if (!key || key.length < 10) {
      addToast('Please enter a valid Gemini API key (at least 10 characters)', 'warning');
      setDirectKeyStatus('Key too short');
      return;
    }
    setIsTestingKey(true);
    setDirectKeyStatus('Testing key with Google AI Studio...');
    try {
      const { geminiService } = await import('./services/geminiService');
      const res = await geminiService.verifyApiKey(key);
      if (res.valid) {
        setDirectKeyStatus('✓ Key active & working with Google AI Studio!');
        addToast('✓ Gemini API Key successfully verified with Google AI Studio!', 'success');
      } else {
        const errorText = res.error || 'Failed to authenticate key';
        setDirectKeyStatus(`✕ Key error: ${errorText.substring(0, 45)}...`);
        addToast(`API Key Error: ${errorText}`, 'error');
      }
    } catch (e: any) {
      setDirectKeyStatus('✕ Verification network error');
      addToast(e?.message || 'Verification network error', 'error');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveDirectGeminiKey = async () => {
    if (!user) return;
    setIsSavingDirectKey(true);
    setDirectKeyStatus('');
    try {
      const trimmed = directGeminiKey.trim();
      const { geminiService } = await import('./services/geminiService');
      geminiService.setApiKey(trimmed);
      localStorage.setItem('gemini_api_key', trimmed);
      localStorage.setItem('geminiApiKey', trimmed);

      await crmService.updateUserProfile(user.uid, {
        geminiApiKey: trimmed
      });
      setUserProfile(prev => prev ? ({ ...prev, geminiApiKey: trimmed }) : null);

      addToast('Gemini API key saved! Loading live UAE market data...', 'info');

      // Clear any cached mock insights from Firestore & cache
      await crmService.clearMarketInsightsFromFirestore();
      localStorage.removeItem('market_insights');
      localStorage.removeItem('prospect_insights');

      // Fetch live data with the newly provided key
      await Promise.all([
        fetchMarketInsights(false),
        fetchProspects(false)
      ]);

      setDirectKeyStatus('✓ Saved & live UAE insights loaded!');
      addToast('Real UAE projects and prospects loaded successfully!', 'success');
    } catch (err: any) {
      console.warn('Error saving direct Gemini key:', err);
      addToast(err?.message || 'Error saving API key', 'error');
      setDirectKeyStatus('Error saving key');
    } finally {
      setIsSavingDirectKey(false);
    }
  };

  const handleClearDirectGeminiKey = async () => {
    if (!user) return;
    setDirectGeminiKey('');
    const { geminiService } = await import('./services/geminiService');
    geminiService.setApiKey('');
    await crmService.updateUserProfile(user.uid, {
      geminiApiKey: ''
    });
    setUserProfile(prev => prev ? ({ ...prev, geminiApiKey: '' }) : null);
    addToast('Custom API key cleared. Using system default.', 'info');
    setDirectKeyStatus('Custom key cleared');
  };

  const handleForceRefreshLiveInsights = async () => {
    setIsFetchingInsights(true);
    setIsFetchingProspects(true);
    try {
      addToast('Searching live UAE projects and active leads...', 'info');
      await crmService.clearMarketInsightsFromFirestore();
      localStorage.removeItem('market_insights');
      localStorage.removeItem('prospect_insights');
      await Promise.all([
        fetchMarketInsights(false),
        fetchProspects(false)
      ]);
      addToast('Live UAE projects and leads updated!', 'success');
    } catch (err: any) {
      console.warn('Error refreshing live insights:', err);
      addToast('Error refreshing live insights', 'error');
    } finally {
      setIsFetchingInsights(false);
      setIsFetchingProspects(false);
    }
  };

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const list = await crmService.getIndustries();
        setAvailableIndustries(list);
      } catch (err) {
        console.error('Failed to fetch industries:', err);
      }
    };
    fetchIndustries();
  }, []);

  const isAdmin = user?.email === 'udeen3197@gmail.com';
  const isInsightsUser = userProfile?.accountType === 'pro' || user?.email === 'udeen3197@gmail.com' || user?.email === 'ameerudeen1123@gmail.com';
  
  // Column-specific filters
  const [leadFilters, setLeadFilters] = useState<Record<string, string[]>>({});
  const [contactFilters, setContactFilters] = useState<Record<string, string[]>>({});
  const [accountFilters, setAccountFilters] = useState<Record<string, string[]>>({});

  // Column widths for resizable columns
  const [accountColWidths, setAccountColWidths] = useState<Record<string, number>>({
    index: 40,
    name: 200,
    industry: 140,
    email: 200,
    phone: 130,
    location: 200,
    map: 60,
    actions: 100
  });
  const [contactColWidths, setContactColWidths] = useState<Record<string, number>>({
    index: 40,
    name: 180,
    account: 180,
    designation: 140,
    email: 200,
    phone: 130,
    location: 180,
    actions: 100
  });
  const [leadColWidths, setLeadColWidths] = useState<Record<string, number>>({
    index: 40,
    name: 180,
    account: 180,
    status: 120,
    department: 140,
    email: 200,
    phone: 130,
    location: 180,
    actions: 100
  });

  // Modal states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [duplicateAccounts, setDuplicateAccounts] = useState<{ [key: string]: any[] }>({});
  const [duplicateContacts, setDuplicateContacts] = useState<{ [key: string]: any[] }>({});
  const [duplicateLeads, setDuplicateLeads] = useState<{ [key: string]: any[] }>({});
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDuplicateDetailsOpen, setIsDuplicateDetailsOpen] = useState(false);
  const [ignoredItemIds, setIgnoredItemIds] = useState<string[]>([]);
  const [itemsToMerge, setItemsToMerge] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<{ [name: string]: any[] }>({});
  const [duplicateType, setDuplicateType] = useState<'accounts' | 'contacts' | 'leads' | null>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<{ [key: string]: { value: string; type: 'contains' | 'starts' | 'ends' } }>({});
  const [debouncedFilterOptions, setDebouncedFilterOptions] = useState<{ [key: string]: { value: string; type: 'contains' | 'starts' | 'ends' } }>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterOptions(filterOptions);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterOptions]);

  const applyFilter = (item: any, column: string, table: 'leads' | 'contacts' | 'accounts' = 'leads') => {
    if (table === 'accounts' || table === 'contacts' || table === 'leads') {
      const filters = table === 'accounts' ? accountFilters : table === 'contacts' ? contactFilters : leadFilters;
      const selectedValues = filters[column];
      if (!selectedValues || selectedValues.length === 0) return true;
      
      if (table === 'accounts' && column === 'industry') {
        const industries = item.industries || (item.industry ? [item.industry] : []);
        return selectedValues.some(v => industries.includes(v));
      }
      
      let val = '';
      if (table === 'contacts') {
        if (column === 'name') val = `${item.firstName} ${item.lastName}`;
        else if (column === 'account') {
          const acc = accounts.find(a => a.id === item.accountId);
          val = acc?.name || '';
        }
        else if (column === 'city') {
          const acc = accounts.find(a => a.id === item.accountId);
          val = acc?.address.city || '';
        }
        else if (column === 'country') {
          const acc = accounts.find(a => a.id === item.accountId);
          val = acc?.address.country || '';
        }
        else val = String(item[column as keyof typeof item] || '');
      } else if (table === 'leads') {
        if (column === 'name') val = `${item.firstName} ${item.lastName}`;
        else if (column === 'city') val = item.city || '';
        else if (column === 'country') val = item.country || '';
        else val = String(item[column as keyof typeof item] || '');
      } else {
        val = String(column.includes('.') ? column.split('.').reduce((o, i) => o?.[i], item) : item[column]);
      }
      
      return selectedValues.includes(val);
    }
    
    const filter = debouncedFilterOptions[column];
    if (!filter || !filter.value) return true;
    
    const val = String(column.includes('.') ? column.split('.').reduce((o, i) => o?.[i], item) : item[column]).toLowerCase();
    const search = filter.value.toLowerCase();

    if (filter.type === 'starts') return val.startsWith(search);
    if (filter.type === 'ends') return val.endsWith(search);
    return val.includes(search);
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitViewMode, setVisitViewMode] = useState<'list' | 'calendar'>('calendar');
  const [mergeType, setMergeType] = useState<'leads' | 'contacts' | 'accounts'>('leads');

  // Toast and Confirmation State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info', onUndo?: () => void, details?: any) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type, onUndo }]);
    
    // Also log to activity bar if it's an error or warning (per user request)
    if (type === 'error' || type === 'warning') {
      crmService.logSystemMessage(message, type === 'error' ? 'error' : 'alert', details);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const confirmAction = useCallback((title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmation({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
  }, []);
  
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [leadToConvertFromInsight, setLeadToConvertFromInsight] = useState<MarketInsight | null>(null);
  const [leadToConvertFromExternal, setLeadToConvertFromExternal] = useState<any | null>(null);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);

  const fetchMarketInsights = useCallback(async (isLoadMore = false) => {
    if (!user || !isInsightsUser) return;
    if (isLoadMore) setIsFetchingMoreInsights(true);
    else setIsFetchingInsights(true);
    
    try {
      setError(null);
      const role = "Sales Engineer for automation, motor controls, power quality and industries electrical solutions";
      const dismissedNames = await crmService.getDismissedInsightNames();
      const excludeNames = [...(isLoadMore ? marketInsights.map(i => i.projectName) : []), ...dismissedNames];
      
      // Extract unique industries from existing accounts to focus AI search
      const userIndustries = Array.from(new Set(accounts.flatMap(a => a.industries || (a.industry ? [a.industry] : []))));
      
      // Determine user's configured Gemini API key from all available sources
      const activeUserKey = directGeminiKey || userProfile?.geminiApiKey || (typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || localStorage.getItem('geminiApiKey')) : '') || '';
      if (activeUserKey) {
        const { geminiService } = await import('./services/geminiService');
        geminiService.setApiKey(activeUserKey);
      }

      const insights = await crmService.fetchMarketInsightsFromAI(role, excludeNames, userIndustries, 50, activeUserKey);
      
      let updatedInsights: MarketInsight[];
      if (isLoadMore) {
        updatedInsights = [...marketInsights, ...insights];
      } else {
        await crmService.clearMarketInsightsFromFirestore();
        updatedInsights = insights;
      }
      
      setMarketInsights(updatedInsights);
      localStorage.setItem('market_insights', JSON.stringify(updatedInsights));
      
      // Save to Firestore for persistence across devices
      if (insights.length > 0) {
        await crmService.saveMarketInsightsBulk(insights);
      }
      
      if (!isLoadMore) {
        const now = Date.now();
        setLastRefreshTime(now);
        localStorage.setItem('last_market_refresh', now.toString());
      }
    } catch (error: any) {
      console.warn('Market insights note:', error?.message || error);
      const errorMsg = (error?.message || '').toLowerCase();
      const isQuotaOrCredits = errorMsg.includes('resource_exhausted') || 
                               errorMsg.includes('429') || 
                               errorMsg.includes('402') || 
                               errorMsg.includes('depleted') || 
                               errorMsg.includes('prepayment') || 
                               errorMsg.includes('quota') ||
                               errorMsg.includes('spending cap');
      if (isQuotaOrCredits) {
        const isSpendingCap = errorMsg.includes('spending cap') || errorMsg.includes('prepayment') || errorMsg.includes('depleted') || errorMsg.includes('credits');
        if (isSpendingCap) {
          setError('Gemini API Spending Cap or Credit Limit Reached. Using offline data.');
          addToast('Gemini API Spending Cap or Credit Limit Reached. Using offline data.', 'warning');
        } else {
          setError('Gemini API Quota Limit Reached. Using offline data.');
          addToast('Gemini API Quota Limit Reached. Using offline data.', 'warning');
        }
      } else {
        setError(error.message || 'Failed to fetch market insights. Please check your connection.');
      }
    } finally {
      setIsFetchingInsights(false);
      setIsFetchingMoreInsights(false);
    }
  }, [user, isInsightsUser, marketInsights, directGeminiKey, userProfile?.geminiApiKey]);

  const fetchProspects = useCallback(async (isLoadMore = false) => {
    if (!user || !isInsightsUser) return;
    if (isLoadMore) setIsFetchingMoreProspects(true);
    else setIsFetchingProspects(true);
    
    try {
      setError(null);
      const role = "Sales Engineer for automation, motor controls, power quality and industries electrical solutions";
      const dismissedNames = await crmService.getDismissedInsightNames();
      const excludeNames = [...(isLoadMore ? prospects.map(p => p.projectName) : []), ...dismissedNames];
      
      // Extract unique industries from existing accounts to focus AI search
      const userIndustries = Array.from(new Set(accounts.flatMap(a => a.industries || (a.industry ? [a.industry] : []))));
      
      const activeUserKey = directGeminiKey || userProfile?.geminiApiKey || (typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || localStorage.getItem('geminiApiKey')) : '') || '';
      if (activeUserKey) {
        const { geminiService } = await import('./services/geminiService');
        geminiService.setApiKey(activeUserKey);
      }

      const data = await crmService.getProspects(role, excludeNames, userIndustries, 50, activeUserKey);
      
      let updatedProspects: MarketInsight[];
      if (isLoadMore) {
        updatedProspects = [...prospects, ...data];
      } else {
        updatedProspects = data;
      }
      
      setProspects(updatedProspects);
      localStorage.setItem('prospect_insights', JSON.stringify(updatedProspects));

      // Save to Firestore for persistence across devices
      if (data.length > 0) {
        await crmService.saveMarketInsightsBulk(data);
      }
    } catch (error: any) {
      console.warn('Prospects note:', error?.message || error);
      const errorMsg = (error?.message || '').toLowerCase();
      const isQuotaOrCredits = errorMsg.includes('resource_exhausted') || 
                               errorMsg.includes('429') || 
                               errorMsg.includes('402') || 
                               errorMsg.includes('depleted') || 
                               errorMsg.includes('prepayment') || 
                               errorMsg.includes('quota') ||
                               errorMsg.includes('spending cap');
      if (isQuotaOrCredits) {
        const isSpendingCap = errorMsg.includes('spending cap') || errorMsg.includes('prepayment') || errorMsg.includes('depleted') || errorMsg.includes('credits');
        if (isSpendingCap) {
          setError('Gemini API Spending Cap or Credit Limit Reached. Using offline data.');
          addToast('Gemini API Spending Cap or Credit Limit Reached. Using offline data.', 'warning');
        } else {
          setError('Gemini API Quota Limit Reached. Using offline data.');
          addToast('Gemini API Quota Limit Reached. Using offline data.', 'warning');
        }
      } else {
        setError(error.message || 'Failed to identify prospects. Please check your connection.');
      }
    } finally {
      setIsFetchingProspects(false);
      setIsFetchingMoreProspects(false);
    }
  }, [user, isInsightsUser, prospects]);

  const projectsEndRef = useRef(null);
  const prospectsEndRef = useRef(null);
  const isProjectsInView = useInView(projectsEndRef);
  const isProspectsInView = useInView(prospectsEndRef);

  useEffect(() => {
    if (isProjectsInView && !isFetchingMoreInsights && !isFetchingInsights && !showFavoritesOnly && marketInsights.length > 0 && activeTab === 'dashboard') {
      fetchMarketInsights(true);
    }
  }, [isProjectsInView, isFetchingMoreInsights, isFetchingInsights, showFavoritesOnly, marketInsights.length, fetchMarketInsights, activeTab]);

  useEffect(() => {
    if (isProspectsInView && !isFetchingMoreProspects && !isFetchingProspects && !showFavoritesOnly && prospects.length > 0 && activeTab === 'dashboard') {
      fetchProspects(true);
    }
  }, [isProspectsInView, isFetchingMoreProspects, isFetchingProspects, showFavoritesOnly, prospects.length, fetchProspects, activeTab]);

  // Load Market Insights from Firestore on mount
  useEffect(() => {
    if (!user || !isInsightsUser) return;

    const loadInsights = async () => {
      try {
        const insights = await crmService.getMarketInsightsFromFirestore();
        if (insights.length > 0) {
          const projects = insights.filter(i => i.type === 'project');
          const prospectsList = insights.filter(i => i.type === 'prospect');
          setMarketInsights(projects);
          setProspects(prospectsList);
        } else {
          // If no insights in Firestore, fetch new ones
          fetchMarketInsights(false);
          fetchProspects(false);
        }
      } catch (error) {
        console.error('Error loading insights from Firestore:', error);
      }
    };

    loadInsights();
  }, [user, isInsightsUser]);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await crmService.getRecentActivities();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  }, []);

  const fetchSystemActivities = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await crmService.getSystemActivities(200);
      setAllActivities(data);
    } catch (error) {
      console.error('Error fetching system activities:', error);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      fetchActivities();
      const interval = setInterval(fetchActivities, 60000);
      return () => clearInterval(interval);
    }
  }, [user, fetchActivities]);

  useEffect(() => {
    const handleAction = () => fetchActivities();
    window.addEventListener('crm-action', handleAction);
    return () => window.removeEventListener('crm-action', handleAction);
  }, [fetchActivities]);

  // UAE Time Scheduling (8 AM and 2 PM)
  useEffect(() => {
    if (!user || !isInsightsUser) return;

    const checkAndRefresh = () => {
      const now = new Date();
      // UAE is UTC+4
      const uaeHour = (now.getUTCHours() + 4) % 24;
      const uaeMinute = now.getUTCMinutes();
      
      // Check if it's 8:00 AM or 2:00 PM UAE time
      const isMorningFetchTime = uaeHour === 8 && uaeMinute < 5;
      const isAfternoonFetchTime = uaeHour === 14 && uaeMinute < 5;
      
      const lastScheduledRefresh = localStorage.getItem('last_scheduled_refresh_date');
      const todayStr = now.toISOString().split('T')[0] + '-' + (uaeHour < 12 ? 'morning' : 'afternoon');

      if ((isMorningFetchTime || isAfternoonFetchTime) && lastScheduledRefresh !== todayStr) {
        console.log(`Scheduled fetch at ${uaeHour}:${uaeMinute} UAE time...`);
        fetchMarketInsights(false);
        fetchProspects(false);
        localStorage.setItem('last_scheduled_refresh_date', todayStr);
      }
    };

    const interval = setInterval(checkAndRefresh, 60000); // Check every minute
    checkAndRefresh(); // Initial check
    
    return () => clearInterval(interval);
  }, [user, isInsightsUser, fetchMarketInsights, fetchProspects]);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const favorites = await crmService.getFavoriteInsights();
      setFavoriteInsights(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, [user]);

  const toggleFavorite = async (insight: MarketInsight) => {
    const isFav = favoriteInsights.some(f => f.id === insight.id);
    try {
      if (isFav) {
        await crmService.unsaveMarketInsight(insight.id);
        setFavoriteInsights(prev => prev.filter(f => f.id !== insight.id));
      } else {
        await crmService.saveFavoriteInsight(insight);
        setFavoriteInsights(prev => [...prev, { ...insight, isFavorite: true }]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDismissInsight = async (insightId: string, type: 'project' | 'prospect') => {
    try {
      await crmService.dismissMarketInsight(insightId);
      if (type === 'project') {
        setMarketInsights(prev => prev.filter(i => i.id !== insightId));
      } else {
        setProspects(prev => prev.filter(p => p.id !== insightId));
      }
    } catch (error) {
      console.error('Error dismissing insight:', error);
    }
  };

  const handleConvertInsightToLead = (insight: MarketInsight) => {
    setLeadToConvertFromInsight(insight);
    setIsLeadModalOpen(true);
  };

  const handleConvertExternalToLead = (customer: any) => {
    setLeadToConvertFromExternal(customer);
    setIsLeadModalOpen(true);
  };

  const nearbyCustomers = React.useMemo(() => {
    const referenceLocation = searchMode === 'current' ? userLocation : pinnedLocation;
    if (!referenceLocation) return [];
    
    const effectiveRange = nearbyRange > 200 ? Infinity : nearbyRange;
    let nearbyAccs = accounts.filter(a => getDistance(referenceLocation, { lat: a.lat, lng: a.lng }) <= effectiveRange);
    let nearbyPros = prospects.filter(p => p.lat && p.lng && getDistance(referenceLocation, { lat: p.lat, lng: p.lng }) <= effectiveRange);
    let nearbyExts = (nearbyExternalCustomers || []).filter(e => e.lat && e.lng && getDistance(referenceLocation, { lat: e.lat, lng: e.lng }) <= effectiveRange);
    
    if (nearbyTypeFilter === 'Accounts') { nearbyPros = []; nearbyExts = []; }
    if (nearbyTypeFilter === 'Prospects') { nearbyAccs = []; nearbyExts = []; }
    if (nearbyTypeFilter === 'External') { nearbyAccs = []; nearbyPros = []; }

    return [
      ...nearbyAccs.map(a => ({ ...a, type: 'account' as const })),
      ...nearbyPros.map(p => ({ ...p, type: 'prospect' as const })),
      ...nearbyExts.map(e => ({ ...e, type: 'external' as const }))
    ].sort((a, b) => {
      const distA = getDistance(referenceLocation, { lat: a.lat!, lng: a.lng! });
      const distB = getDistance(referenceLocation, { lat: b.lat!, lng: b.lng! });
      return distA - distB;
    });
  }, [userLocation, pinnedLocation, searchMode, nearbyRange, accounts, prospects, nearbyExternalCustomers, nearbyTypeFilter]);

  const fetchNearbyExternalCustomers = useCallback(async () => {
    const referenceLocation = searchMode === 'current' ? userLocation : pinnedLocation;
    if (!isLoaded || !referenceLocation || isFetchingNearby) return;
    
    // Safety check for google object
    const google = (window as any).google;
    if (!google || !google.maps || !google.maps.places) {
      console.warn('Google Maps Places library not yet fully loaded');
      return;
    }
    
    setIsFetchingNearby(true);
    try {
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      const industries = userProfile?.industries || [];
      
      // If no industries selected, use some defaults
      const searchKeywords = industries.length > 0 ? industries : ['Industrial Automation', 'Electrical Engineering', 'Construction'];
      
      const allResults: any[] = [];
      
      // Search for each industry keyword
      for (const keyword of searchKeywords.slice(0, 5)) { // Limit to 5 keywords to avoid rate limits
        await new Promise((resolve) => {
          service.nearbySearch({
            location: referenceLocation,
            radius: nearbyRange * 1000,
            keyword: keyword,
          }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              results.forEach(place => {
                if (!allResults.find(r => r.place_id === place.place_id)) {
                  allResults.push({
                    id: place.place_id,
                    name: place.name,
                    address: place.vicinity,
                    lat: place.geometry?.location?.lat(),
                    lng: place.geometry?.location?.lng(),
                    rating: place.rating,
                    types: place.types,
                    industry: keyword,
                    type: 'external'
                  });
                }
              });
            }
            resolve(null);
          });
        });
      }
      
      setNearbyExternalCustomers(allResults);
    } catch (error) {
      console.error('Error fetching nearby external customers:', error);
    } finally {
      setIsFetchingNearby(false);
    }
  }, [isLoaded, userLocation, pinnedLocation, searchMode, nearbyRange, userProfile, isFetchingNearby]);

  useEffect(() => {
    if (activeTab === 'nearby-customers' && nearbyExternalCustomers.length === 0) {
      fetchNearbyExternalCustomers();
    }
  }, [activeTab, nearbyExternalCustomers.length, fetchNearbyExternalCustomers]);

  // Re-fetch when location changes significantly or manually
  const handleRefreshNearby = () => {
    setNearbyExternalCustomers([]);
  };

  const handleConvertExternalToProspect = async (customer: any) => {
    try {
      const newProspect: MarketInsight = {
        id: `external-${customer.id}`,
        projectName: customer.name,
        location: customer.address,
        status: 'New Prospect',
        category: customer.industry as any,
        description: `Discovered nearby: ${customer.name}. Types: ${customer.types?.join(', ')}`,
        relevance: 'High (Nearby)',
        scope: 'General Inquiry',
        lat: customer.lat,
        lng: customer.lng,
        dateFound: new Date().toISOString(),
        type: 'prospect',
        createdAt: new Date().toISOString()
      };
      
      await crmService.saveMarketInsightToFirestore(newProspect);
      setProspects(prev => [newProspect, ...prev]);
      addToast(`Converted ${customer.name} to prospect`, 'success');
      
      // Remove from external list
      setNearbyExternalCustomers(prev => prev.filter(c => c.id !== customer.id));
    } catch (error) {
      console.error('Error converting to prospect:', error);
      addToast('Failed to convert to prospect', 'error');
    }
  };

  // Load data
  const loadData = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const [accs, cons, lds, rems, nts, profile, stats, favorites, vsts] = await Promise.all([
        crmService.getAccounts(),
        crmService.getContacts(),
        crmService.getLeads(),
        crmService.getReminders(),
        crmService.getNotes(),
        crmService.getUserProfile(user.uid),
        crmService.getStorageStats(),
        crmService.getFavoriteInsights(),
        crmService.getVisits()
      ]);
      
      setAccounts(accs);
      setContacts(cons);
      setLeads(lds);
      setReminders(rems);
      setNotes(nts);
      setUserProfile(profile);
      setStorageStats(stats);
      setFavoriteInsights(favorites);
      setVisits(vsts);

      if (user.email === 'udeen3197@gmail.com') {
        const [users, sysStats] = await Promise.all([
          crmService.getAllUsers(),
          crmService.getSystemStats()
        ]);
        setAllUsers(users);
        setSystemStats(sysStats);
      }

      if (profile) {
        setTheme(profile.theme || 'light');
      }
    } catch (err) {
      console.error('CRITICAL: loadData failed:', err);
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}. Please refresh the page.`);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  const handleRestoreItem = async () => {
    if (!lastDeletedItem) return;
    try {
      if (lastDeletedItem.type === 'leads') await crmService.addLead(lastDeletedItem.data);
      if (lastDeletedItem.type === 'contacts') await crmService.addContact(lastDeletedItem.data);
      if (lastDeletedItem.type === 'accounts') await crmService.addAccount(lastDeletedItem.data);
      if (lastDeletedItem.type === 'reminders') await crmService.addReminder(lastDeletedItem.data);
      if (lastDeletedItem.type === 'notes') await crmService.addNote(lastDeletedItem.data);
      
      setLastRestoredItem(lastDeletedItem);
      setLastDeletedItem(null);
      setShowUndoToast(false);
      setShowRedoToast(true);
      setTimeout(() => setShowRedoToast(false), 5000);
    } catch (error) {
      console.error('Failed to restore item:', error);
    }
  };

  const handleRedoDelete = async () => {
    if (!lastRestoredItem) return;
    try {
      if (lastRestoredItem.type === 'leads') await crmService.deleteLead(lastRestoredItem.data.id);
      if (lastRestoredItem.type === 'contacts') await crmService.deleteContact(lastRestoredItem.data.id);
      if (lastRestoredItem.type === 'accounts') await crmService.deleteAccount(lastRestoredItem.data.id);
      if (lastRestoredItem.type === 'reminders') await crmService.deleteReminder(lastRestoredItem.data.id);
      if (lastRestoredItem.type === 'notes') await crmService.deleteNote(lastRestoredItem.data.id);
      
      setLastDeletedItem(lastRestoredItem);
      setLastRestoredItem(null);
      setShowRedoToast(false);
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 5000);
    } catch (error) {
      console.error('Redo delete error:', error);
    }
  };

  const handleUserStatusToggle = async (uid: string, currentStatus: string | undefined, userEmail: string) => {
    const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    
    if (userEmail === 'udeen3197@gmail.com') {
      addToast('Sole admin account cannot be deactivated', 'warning');
      return;
    }

    confirmAction(
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} user account for ${userEmail}?`,
      async () => {
        try {
          await crmService.updateUserStatus(uid, newStatus);
          addToast(`User account ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
        } catch (error) {
          addToast('Failed to update user status', 'error');
        }
      }
    );
  };

  const handleResetPassword = async (email: string) => {
    confirmAction(
      'Reset Password',
      `Are you sure you want to send a password reset email to ${email}?`,
      async () => {
        try {
          // 1. Trigger Firebase standard reset email (for security)
          await crmService.resetUserPassword(email);
          
          // 2. Send automated notification from Gmail account
          try {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: email,
                subject: 'Password Reset Requested - CRM System',
                text: `Hello, a password reset has been requested for your account. You will receive a separate email from our security service with the actual reset link. If you did not request this, please contact support.`,
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                    <h1 style="color: #ea580c;">Password Reset Notification</h1>
                    <p>Hello,</p>
                    <p>A password reset has been initiated for your account (${email}).</p>
                    <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; color: #9a3412; font-size: 14px;">
                        <strong>Important:</strong> You will receive a separate system email containing the secure reset link shortly.
                      </p>
                    </div>
                    <p>If you did not request this, you can safely ignore this email or contact your administrator.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    <p style="font-size: 12px; color: #94a3b8;">CRM Security Team</p>
                  </div>
                `
              }),
            });
          } catch (mailError) {
            console.warn('Gmail notification failed, but Firebase reset was sent:', mailError);
          }

          addToast('Password reset email sent successfully', 'success');
        } catch (error) {
          addToast('Failed to send password reset email', 'error');
        }
      }
    );
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    confirmAction(
      'Delete User',
      `Are you sure you want to permanently delete user ${name}? This action can be undone from the Audit Logs, but will remove their access immediately.`,
      async () => {
        try {
          await crmService.deleteUserAccount(uid);
          addToast('User deleted successfully', 'success');
        } catch (error: any) {
          addToast(error.message || 'Failed to delete user', 'error');
        }
      }
    );
  };

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return;
    
    setIsCheckingUpdate(true);
    setUpdateStatus('checking');
    setUpdateProgress(0);

    // Simulate checking for updates
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate finding an update
    setUpdateStatus('downloading');
    for (let i = 0; i <= 100; i += 10) {
      setUpdateProgress(i);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Simulate installing
    setUpdateStatus('installing');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Complete
    setUpdateStatus('complete');
    setIsCheckingUpdate(false);
    
    // Show the update modal with new information
    setIsUpdateModalOpen(true);
    
    // Reset status after a delay
    setTimeout(() => {
      setUpdateStatus('idle');
      setUpdateProgress(0);
    }, 5000);
  };

  const handleAddIndustry = async () => {
    if (!newIndustry.trim()) return;
    const industryToAdd = newIndustry.trim();
    
    if (availableIndustries.some(ind => ind.toLowerCase() === industryToAdd.toLowerCase())) {
      alert(`The industry "${industryToAdd}" already exists.`);
      return;
    }

    try {
      await crmService.addIndustry(industryToAdd);
      setAvailableIndustries(prev => [...prev, industryToAdd].sort());
      setNewIndustry('');
      setSuccess(`Industry "${industryToAdd}" added successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error adding industry:', error);
    }
  };

  const handleDeleteIndustry = async (industry: string) => {
    if (!confirm(`Are you sure you want to delete "${industry}"? This will remove it from the global list.`)) return;
    
    setIsDeletingIndustry(industry);
    try {
      await crmService.deleteIndustry(industry);
      setAvailableIndustries(prev => prev.filter(i => i !== industry));
      setSuccess(`Industry "${industry}" deleted successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting industry:', error);
    } finally {
      setIsDeletingIndustry(null);
    }
  };

  const onLogout = async () => {
    await logout();
    setIsPinVerified(false);
    setUser(null);
    setUserProfile(null);
  };

  const handleLogout = async () => {
    confirmAction(
      'Logout Confirmation',
      'Are you sure you want to logout? Any unsaved changes may be lost.',
      onLogout,
      'warning'
    );
  };

  const handleVerifyPin = () => {
    if (pinInput === userProfile?.securityPin) {
      setIsPinVerified(true);
      setIsPinModalOpen(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Invalid PIN. Please try again.');
      setPinInput('');
    }
  };

  const handleSetPin = async (newPin: string | null) => {
    try {
      await crmService.updateSecurityPin(newPin);
      setIsSettingPin(false);
      setPinInput('');
      // Profile will update via snapshot
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportAll = async () => {
    setIsExportingAll(true);
    try {
      await crmService.exportAllData();
    } catch (error) {
      console.error(error);
      setError('Failed to export data. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsExportingAll(false);
    }
  };

  useEffect(() => {
    if (userProfile?.securityPin && !isPinVerified) {
      setIsPinModalOpen(true);
    }
  }, [userProfile, isPinVerified]);

  // Real-time Data Sync
  useEffect(() => {
    if (!user) return;

    const handleListenerError = (error: any, op: OperationType, path: string) => {
      console.error(`Listener error on ${path}:`, error);
      try {
        handleFirestoreError(error, op, path);
      } catch (e: any) {
        setError(e.message);
      }
    };

    const unsubAccounts = onSnapshot(
      query(collection(db, 'accounts'), where('uid', '==', user.uid)),
      (snapshot) => {
        const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAccounts(accs);
        setDuplicateAccounts(crmService.detectDuplicates(accs, 'accounts'));
      },
      (error) => handleListenerError(error, OperationType.LIST, 'accounts')
    );

    const unsubContacts = onSnapshot(
      query(collection(db, 'contacts'), where('uid', '==', user.uid)),
      (snapshot) => {
        const cons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact))
          .sort((a, b) => a.firstName.localeCompare(b.firstName));
        setContacts(cons);
        setDuplicateContacts(crmService.detectDuplicates(cons, 'contacts'));
      },
      (error) => handleListenerError(error, OperationType.LIST, 'contacts')
    );

    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), where('uid', '==', user.uid)),
      (snapshot) => {
        const lds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLeads(lds);
        setDuplicateLeads(crmService.detectDuplicates(lds, 'leads'));
      },
      (error) => handleListenerError(error, OperationType.LIST, 'leads')
    );

    const unsubReminders = onSnapshot(
      query(collection(db, 'reminders'), where('uid', '==', user.uid)),
      (snapshot) => {
        const rems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setReminders(rems);
      },
      (error) => handleListenerError(error, OperationType.LIST, 'reminders')
    );

    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('uid', '==', user.uid)),
      (snapshot) => {
        const nts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotes(nts);
      },
      (error) => handleListenerError(error, OperationType.LIST, 'notes')
    );

    const unsubFavs = onSnapshot(
      query(collection(db, 'favoriteInsights'), where('uid', '==', user.uid)),
      (snapshot) => {
        setFavoriteInsights(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketInsight)));
      },
      (error) => handleListenerError(error, OperationType.LIST, 'favoriteInsights')
    );

    const unsubVisits = onSnapshot(
      query(collection(db, 'visits'), where('uid', '==', user.uid)),
      (snapshot) => {
        setVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit)));
      },
      (error) => handleListenerError(error, OperationType.LIST, 'visits')
    );

    const unsubIgnored = onSnapshot(
      query(collection(db, 'ignored_duplicates'), where('uid', '==', user.uid)),
      (snapshot) => {
        setIgnoredItemIds(snapshot.docs.map(doc => doc.data().itemId));
      },
      (error) => handleListenerError(error, OperationType.LIST, 'ignored_duplicates')
    );

    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid), 
      (snapshot) => {
        if (snapshot.exists()) {
          const profile = snapshot.data() as UserProfile;
          setUserProfile(profile);
          if (profile.theme) {
            setTheme(prev => {
              if (profile.theme !== prev) return profile.theme as 'light' | 'dark';
              return prev;
            });
          }
        } else {
          setIsProfileModalOpen(true);
        }
      },
      (error) => handleListenerError(error, OperationType.GET, `users/${user.uid}`)
    );

    // Real-time System Stats for Admins
    let unsubAdminUsers = () => {};
    let unsubAdminAccounts = () => {};
    let unsubAdminLeads = () => {};
    let unsubAdminContacts = () => {};

    if (userProfile?.role === 'admin' || user.email === 'udeen3197@gmail.com') {
      unsubAdminUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllUsers(users);
        setSystemStats(prev => ({ ...prev, totalUsers: snapshot.size }));
      }, (error) => handleListenerError(error, OperationType.LIST, 'users'));

      unsubAdminAccounts = onSnapshot(collection(db, 'accounts'), (snapshot) => {
        setSystemStats(prev => ({ ...prev, totalAccounts: snapshot.size }));
      }, (error) => handleListenerError(error, OperationType.LIST, 'accounts'));

      unsubAdminLeads = onSnapshot(collection(db, 'leads'), (snapshot) => {
        setSystemStats(prev => ({ ...prev, totalLeads: snapshot.size }));
      }, (error) => handleListenerError(error, OperationType.LIST, 'leads'));

      unsubAdminContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
        setSystemStats(prev => ({ ...prev, totalContacts: snapshot.size }));
      }, (error) => handleListenerError(error, OperationType.LIST, 'contacts'));
    }

    return () => {
      unsubAccounts();
      unsubContacts();
      unsubLeads();
      unsubReminders();
      unsubNotes();
      unsubProfile();
      unsubFavs();
      unsubVisits();
      unsubIgnored();
      unsubAdminUsers();
      unsubAdminAccounts();
      unsubAdminLeads();
      unsubAdminContacts();
    };
  }, [user, userProfile?.role]);

  // Sync Location Effect
  useEffect(() => {
    if (syncLocation && navigator.geolocation && isLoaded) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(newLoc);
          crmService.reverseGeocode(newLoc.lat, newLoc.lng).then(addr => {
            if (addr) setCurrentAddress(addr);
          });
        },
        (error) => {
          console.error('Location sync error:', error);
          if (error.code === 1 && error.message.includes('permissions policy')) {
            console.warn('Geolocation is blocked by permissions policy. This is likely due to iframe restrictions in the preview environment.');
          }
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [syncLocation, isLoaded]);

  // Sync Date & Time Effect
  useEffect(() => {
    if (syncDateTime) {
      const interval = setInterval(() => {
        // System time is automatically synced by the browser/OS
        // This effect just ensures we are "aware" of the sync
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [syncDateTime]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const unsubscribeSync = onSnapshotsInSync(db, () => {
      setIsSyncing(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleCrmAction = () => {
      console.log('CRM Action detected, refreshing data...');
      loadData();
    };
    window.addEventListener('crm-action', handleCrmAction);
    return () => window.removeEventListener('crm-action', handleCrmAction);
  }, [loadData]);

  useEffect(() => {
    if (isAuthReady && user) {
      loadData();
      crmService.migrateExistingAccounts();
    }
  }, [isAuthReady, user, loadData]);

  // Get user location
  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        setIsLocating(false);
        
        // Get address if SDK is loaded
        if (isLoaded) {
          const address = await crmService.reverseGeocode(loc.lat, loc.lng);
          if (address) setCurrentAddress(address);
        }
      },
      (error) => {
        console.error('Error getting location:', error.message, '(Code:', error.code, ')');
        if (error.code === 1) {
          const msg = error.message.includes('permissions policy') 
            ? 'Location access is restricted by your browser security policy. Try opening the app in a new tab for full functionality.'
            : 'Location permission denied. Please allow location access in your browser settings.';
          addToast(msg, 'warning');
        } else {
          addToast(`Location error: ${error.message}`, 'error');
        }
        setIsLocating(false);
      }
    );
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && userLocation && !currentAddress) {
      crmService.reverseGeocode(userLocation.lat, userLocation.lng).then(addr => {
        if (addr) setCurrentAddress(addr);
      });
    }
  }, [isLoaded, userLocation, currentAddress]);

  useEffect(() => {
    if (syncLocation) {
      getPosition();
    }
  }, [getPosition, syncLocation]);

  const isAnyFilterActive = searchQuery !== '' || 
    statusFilter !== 'All' || 
    industryFilter !== 'All' || 
    departmentFilter !== 'All' || 
    cityFilter !== 'All' || 
    countryFilter !== 'All' || 
    showNearbyOnly || 
    viewingAccountId !== null || 
    Object.values(leadFilters).some(v => v.length > 0) || 
    Object.values(contactFilters).some(v => v.length > 0) || 
    Object.values(accountFilters).some(v => v.length > 0);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setIndustryFilter('All');
    setDepartmentFilter('All');
    setCityFilter('All');
    setCountryFilter('All');
    setShowNearbyOnly(false);
    setViewingAccountId(null);
    setLeadFilters({});
    setContactFilters({});
    setAccountFilters({});
    setFilterKey(prev => prev + 1);
  };

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.address.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = industryFilter === 'All' || 
      (a.industries && a.industries.includes(industryFilter)) || 
      a.industry === industryFilter;
    const matchesCity = cityFilter === 'All' || a.address.city === cityFilter;
    const matchesCountry = countryFilter === 'All' || a.address.country === countryFilter;
    
    // Column filters
    const matchesColName = applyFilter(a, 'name', 'accounts');
    const matchesColIndustry = applyFilter(a, 'industry', 'accounts');
    const matchesColCity = applyFilter(a, 'address.city', 'accounts');
    const matchesColCountry = applyFilter(a, 'address.country', 'accounts');

    let matchesNearby = true;
    if (showNearbyOnly && userLocation) {
      const dist = getDistance(userLocation, { lat: a.lat, lng: a.lng });
      matchesNearby = dist <= nearbyRange;
    }

    return matchesSearch && matchesIndustry && matchesCity && matchesCountry && matchesNearby &&
           matchesColName && matchesColIndustry && matchesColCity && matchesColCountry;
  });

  const filteredContacts = contacts.filter(c => {
    const account = accounts.find(a => a.id === c.accountId);
    const matchesSearch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === 'All' || c.department === departmentFilter;
    const matchesCity = cityFilter === 'All' || account?.address.city === cityFilter;
    const matchesCountry = countryFilter === 'All' || account?.address.country === countryFilter;
    const matchesAccount = !viewingAccountId || c.accountId === viewingAccountId;

    // Column filters
    const matchesColName = applyFilter(c, 'name', 'contacts');
    const matchesColAccount = applyFilter(c, 'account', 'contacts');
    const matchesColDesignation = applyFilter(c, 'designation', 'contacts');
    const matchesColCity = applyFilter(c, 'city', 'contacts');
    const matchesColCountry = applyFilter(c, 'country', 'contacts');
    const matchesColEmail = applyFilter(c, 'email', 'contacts');
    const matchesColPhone = applyFilter(c, 'phone', 'contacts');

    return matchesSearch && matchesDepartment && matchesCity && matchesCountry && matchesAccount &&
           matchesColName && matchesColAccount && matchesColDesignation && matchesColCity && matchesColCountry &&
           matchesColEmail && matchesColPhone;
  });

  const activeLeads = leads.filter(l => l.status !== 'Converted');

  const filteredLeads = leads.filter(l => {
    const matchesSearch = `${l.firstName} ${l.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchesDepartment = departmentFilter === 'All' || l.department === departmentFilter;
    const matchesCity = cityFilter === 'All' || l.city === cityFilter;
    const matchesCountry = countryFilter === 'All' || l.country === countryFilter;
    
    // Remove converted leads
    const isNotConverted = l.status !== 'Converted';

    const matchesColName = applyFilter(l, 'name');
    const matchesColAccount = applyFilter(l, 'accountName');
    const matchesColSource = applyFilter(l, 'leadSource');
    const matchesColEmail = applyFilter(l, 'email');
    const matchesColPhone = applyFilter(l, 'phone');
    const matchesColCity = applyFilter(l, 'city');
    const matchesColCountry = applyFilter(l, 'country');

    return matchesSearch && matchesStatus && matchesDepartment && matchesCity && matchesCountry && isNotConverted &&
           matchesColName && matchesColAccount && matchesColSource && matchesColEmail && matchesColPhone && matchesColCity && matchesColCountry;
  });

  const handleProfileSave = async (profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'theme'>) => {
    if (!user) return;
    try {
      // Check for invitation if it's a new profile
      let finalAccountType = userProfile?.accountType || 'classic';
      if (!userProfile && user.email) {
        const invite = await crmService.checkInvitation(user.email);
        if (invite) {
          finalAccountType = invite.accountType;
          await crmService.consumeInvitation(user.email);
        }
      }

      const newProfile: UserProfile = {
        ...profileData,
        uid: user.uid,
        accountType: finalAccountType,
        createdAt: userProfile?.createdAt || new Date().toISOString(),
        theme: theme,
        phoneVerified: false,
        emailVerified: user.emailVerified || false,
        role: user.email === 'udeen3197@gmail.com' ? 'admin' : (userProfile?.role || 'user'),
        status: userProfile?.status || 'active',
        about: (profileData as any).about || ''
      };
      await crmService.updateUserProfile(user.uid, newProfile);
      
      // Check if Google Maps API key changed - if so, we need a reload
      const mapsKeyChanged = profileData.googleMapsApiKey !== userProfile?.googleMapsApiKey;
      
      setUserProfile(newProfile);

      if (profileData.geminiApiKey) {
        const trimmed = profileData.geminiApiKey.trim();
        setDirectGeminiKey(trimmed);
        localStorage.setItem('gemini_api_key', trimmed);
        localStorage.setItem('geminiApiKey', trimmed);
        import('./services/geminiService').then(({ geminiService }) => {
          geminiService.setApiKey(trimmed);
        });
      }

      setIsProfileModalOpen(false);
      setShowOnboarding(true);
      
      if (mapsKeyChanged) {
        setSuccess("Profile saved. Reloading to apply new Google Maps configuration...");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSuccess("Profile updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }

      // Ensure modal is closed
      setTimeout(() => setIsProfileModalOpen(false), 100);
      // loadData is no longer needed if we use onSnapshot
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleResize = (table: 'leads' | 'contacts' | 'accounts', column: string, width: number) => {
    if (table === 'accounts') setAccountColWidths(prev => ({ ...prev, [column]: width }));
    if (table === 'contacts') setContactColWidths(prev => ({ ...prev, [column]: width }));
    if (table === 'leads') setLeadColWidths(prev => ({ ...prev, [column]: width }));
  };



  const handleConvertLead = (lead: Lead) => {
    setLeadToConvert(lead);
    setIsConvertModalOpen(true);
  };

  const checkDuplicates = useCallback((type: 'accounts' | 'contacts' | 'leads') => {
    const items = type === 'accounts' ? accounts : type === 'contacts' ? contacts : leads;
    const found = crmService.detectDuplicates(items, type);
    if (Object.keys(found).length > 0) {
      setDuplicates(found);
      setDuplicateType(type);
    } else {
      setSuccess('No duplicates found');
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [accounts, contacts, leads]);

  const handleBulkConvertToContact = async () => {
    if (!selectedLeads.length) return;
    
    confirmAction(
      'Bulk Convert',
      `Are you sure you want to convert ${selectedLeads.length} leads to contacts? This will create accounts and contacts for each selected lead.`,
      async () => {
        try {
          await crmService.bulkConvertLeads(selectedLeads);
          // Refresh leads
          const updatedLeads = await crmService.getLeads();
          setLeads(updatedLeads);
          setSelectedLeads([]);
          addToast(`${selectedLeads.length} leads converted successfully`, 'success');
        } catch (error) {
          console.error('Bulk convert error:', error);
          addToast('Failed to perform bulk conversion', 'error');
        }
      }
    );
  };

  const handleBulkDelete = async (type: 'accounts' | 'contacts' | 'leads') => {
    const ids = type === 'accounts' ? selectedAccounts : type === 'contacts' ? selectedContacts : selectedLeads;
    if (!ids.length) return;
    
    confirmAction(
      'Bulk Delete',
      `Are you sure you want to delete ${ids.length} ${type}? This action cannot be undone for multiple items at once.`,
      async () => {
        try {
          await crmService.bulkDelete(ids, type);
          if (type === 'accounts') {
            setAccounts(prev => prev.filter(a => !ids.includes(a.id)));
            setSelectedAccounts([]);
          } else if (type === 'contacts') {
            setContacts(prev => prev.filter(c => !ids.includes(c.id)));
            setSelectedContacts([]);
          } else {
            setLeads(prev => prev.filter(l => !ids.includes(l.id)));
            setSelectedLeads([]);
          }
          addToast(`${ids.length} ${type} deleted`, 'success');
        } catch (error) {
          console.error('Bulk delete error:', error);
          addToast('Failed to perform bulk delete', 'error');
        }
      }
    );
  };

  const handleMerge = useCallback(async (primaryId: string, secondaryIds: string | string[], mergedData?: any, contactMerges?: { sourceId: string, targetId: string }[], contactIdsToKeep?: string[]) => {
    console.log('[MERGE_DEBUG] handleMerge called with:', { primaryId, secondaryIds, mergedData, contactMerges, contactIdsToKeep });
    
    // Close modal immediately for responsiveness
    setIsMergeModalOpen(false);
    
    try {
      const secondaryIdsArray = Array.isArray(secondaryIds) ? secondaryIds : [secondaryIds];
      
      // Optimistic update for immediate feedback
      if (mergeType === 'accounts') {
        setAccounts(prev => {
          const filtered = prev.filter(a => !secondaryIdsArray.includes(a.id));
          if (mergedData) {
            return filtered.map(a => a.id === primaryId ? { ...a, ...mergedData } : a);
          }
          return filtered;
        });

        // Move contacts to primary account
        setContacts(prev => {
          const filtered = prev.filter(c => {
            // Remove contacts that were merged (sourceId)
            if (contactMerges?.some(m => m.sourceId === c.id)) return false;
            
            // If it's from one of the accounts involved in the merge
            if (secondaryIdsArray.includes(c.accountId) || c.accountId === primaryId) {
              // If it's not in the keep list, remove it
              if (contactIdsToKeep && !contactIdsToKeep.includes(c.id)) return false;
            }
            return true;
          });
          
          return filtered.map(c => {
            if (secondaryIdsArray.includes(c.accountId)) {
              return { ...c, accountId: primaryId };
            }
            return c;
          });
        });

        // Move leads, notes, reminders
        setLeads(prev => prev.map(l => secondaryIdsArray.includes(l.accountId) ? { ...l, accountId: primaryId } : l));
        setNotes(prev => prev.map(n => secondaryIdsArray.includes(n.accountId) ? { ...n, accountId: primaryId } : n));
        setReminders(prev => prev.map(r => secondaryIdsArray.includes(r.accountId) ? { ...r, accountId: primaryId } : r));
      } else if (mergeType === 'leads') {
        setLeads(prev => prev.filter(l => !secondaryIdsArray.includes(l.id)));
      } else if (mergeType === 'contacts') {
        setContacts(prev => prev.filter(c => !secondaryIdsArray.includes(c.id)));
      }

      setSelectedAccounts([]);
      setSelectedContacts([]);
      setSelectedLeads([]);

      switch (mergeType) {
        case 'leads':
          for (const sId of secondaryIdsArray) {
            await crmService.mergeLeads(primaryId, sId);
          }
          break;
        case 'contacts':
          for (const sId of secondaryIdsArray) {
            await crmService.mergeContacts(primaryId, sId);
          }
          break;
        case 'accounts':
          await crmService.mergeAccounts(primaryId, secondaryIdsArray, mergedData, contactMerges, contactIdsToKeep);
          break;
      }
      
      await loadData();
      setSuccess(`${mergeType.charAt(0).toUpperCase() + mergeType.slice(1)} merged successfully!`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('[MERGE_DEBUG] Error merging items:', error);
      let errorMessage = 'Failed to merge items. Please check the console for details.';
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error) errorMessage = parsedError.error;
      } catch (e) {}
      setError(errorMessage);
      await loadData(); // Revert on error
      throw error; // Re-throw so modal knows it failed
    }
  }, [mergeType, loadData, accounts]);

  const handleDeleteLead = async (id: string) => {
    const leadToDelete = leads.find(l => l.id === id);
    if (!leadToDelete) return;
    
    confirmAction(
      'Delete Lead',
      `Are you sure you want to delete lead ${leadToDelete.firstName} ${leadToDelete.lastName}?`,
      async () => {
        // Optimistic update
        setLeads(prev => prev.filter(l => l.id !== id));
        
        try {
          await crmService.deleteLead(id);
          addToast('Lead deleted', 'success', async () => {
            await crmService.addLead(leadToDelete);
            addToast('Lead restored', 'success');
          });
          handleRefresh();
        } catch (error) {
          console.error('Error deleting lead:', error);
          addToast('Failed to delete lead', 'error');
          // Revert optimistic update
          setLeads(prev => [leadToDelete, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }
    );
  };

  const handleDeleteContact = async (id: string) => {
    const contactToDelete = contacts.find(c => c.id === id);
    if (!contactToDelete) return;

    confirmAction(
      'Delete Contact',
      `Are you sure you want to delete contact ${contactToDelete.firstName} ${contactToDelete.lastName}?`,
      async () => {
        // Optimistic update
        setContacts(prev => prev.filter(c => c.id !== id));
        
        try {
          await crmService.deleteContact(id);
          addToast('Contact deleted', 'success', async () => {
            await crmService.addContact(contactToDelete);
            addToast('Contact restored', 'success');
          });
          handleRefresh();
        } catch (error) {
          console.error('Error deleting contact:', error);
          addToast('Failed to delete contact', 'error');
          // Revert optimistic update
          setContacts(prev => [contactToDelete, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }
    );
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadData(),
        fetchActivities(),
        fetchMarketInsights(false),
        fetchProspects(false),
        fetchFavorites()
      ]);
      
      // Scroll to top of the main content area
      const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      addToast('Application refreshed', 'success');
    } catch (error) {
      console.error('Error refreshing application:', error);
      addToast('Failed to refresh application', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const accountToDelete = accounts.find(a => a.id === id);
    if (!accountToDelete) return;

    confirmAction(
      'Delete Account',
      `Are you sure you want to delete account ${accountToDelete.name}? This will also delete all associated contacts and leads.`,
      async () => {
        // Optimistic update
        setAccounts(prev => prev.filter(a => a.id !== id));
        
        try {
          await crmService.deleteAccount(id);
          addToast('Account deleted', 'success', async () => {
            await crmService.addAccount(accountToDelete);
            addToast('Account restored', 'success');
          });
          handleRefresh();
        } catch (error) {
          console.error('Error deleting account:', error);
          addToast('Failed to delete account', 'error');
          // Revert optimistic update
          setAccounts(prev => [accountToDelete, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
    );
  };

  const handleExport = (type: 'leads' | 'contacts' | 'accounts') => {
    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];
    
    switch (type) {
      case 'leads':
        data = leads;
        filename = 'leads_export';
        headers = ['id', 'salutation', 'firstName', 'lastName', 'accountName', 'designation', 'department', 'email', 'secondaryEmail', 'phone', 'telephone', 'city', 'country', 'status', 'createdAt'];
        break;
      case 'contacts':
        data = contacts;
        filename = 'contacts_export';
        headers = ['id', 'accountId', 'salutation', 'firstName', 'lastName', 'designation', 'department', 'email', 'secondaryEmail', 'phone', 'telephone', 'createdAt'];
        break;
      case 'accounts':
        data = accounts.map(a => ({
          ...a,
          address: `${a.address.flatHouseNo}, ${a.address.street}, ${a.address.city}, ${a.address.pinCode}, ${a.address.country}`
        }));
        filename = 'accounts_export';
        headers = ['id', 'name', 'industry', 'address', 'phone', 'telephone', 'email', 'website', 'lat', 'lng', 'createdAt'];
        break;
    }
    
    crmService.exportToExcel(data, filename, headers);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse shadow-lg shadow-blue-100 dark:shadow-none">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Initializing Sales Perks CRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-12 rounded-[40px] shadow-2xl shadow-blue-100 dark:shadow-none max-w-md w-full text-center space-y-8 border border-slate-100 dark:border-slate-800"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-200 dark:shadow-none rotate-3">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Sales Perks CRM</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Your complete customer relationship management solution.</p>
          </div>
          <div className="space-y-4 pt-4">
            <button 
              onClick={() => loginWithGoogle()}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <LogIn className="w-5 h-5" />
              Login with Google
            </button>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Secure Cloud Database Integration</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (userProfile?.status === 'inactive') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-12 rounded-[40px] shadow-2xl max-w-md w-full text-center space-y-8 border border-slate-100 dark:border-slate-800"
        >
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center mx-auto text-rose-600">
            <X className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Account Inactive</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Your account has been deactivated by the administrator. Please contact support or your admin for more information.</p>
          </div>
          <button 
            onClick={() => handleLogout()}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all active:scale-95"
          >
            Logout
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-crm-bg-light dark:bg-crm-bg-dark font-sans text-crm-text-light dark:text-crm-text-dark overflow-hidden text-sm md:text-base">
      {/* Sidebar - Desktop */}
      <aside 
        className={`hidden md:flex z-30 h-full bg-crm-card-light dark:bg-crm-card-dark border-r border-slate-200 dark:border-slate-800 flex-col transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'w-56' : 'w-16'
        }`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex flex-col items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 dark:shadow-none shrink-0">
            <Briefcase className="text-white w-6 h-6" />
          </div>
          <div className={`mt-3 text-center transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}>
            <h1 className="font-extrabold text-lg leading-tight whitespace-nowrap text-slate-900 dark:text-white tracking-tight">Sales Perks</h1>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">CRM System</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'leads', label: 'Leads', icon: Tag },
            { id: 'contacts', label: 'Contacts', icon: Users },
            { id: 'accounts', label: 'Accounts', icon: Target },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'notes', label: 'Meeting Notes', icon: StickyNote },
            ...(isInsightsUser ? [{ id: 'nearby-customers', label: 'Nearby Customers', icon: Navigation }] : []),
            ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center rounded-2xl transition-colors duration-200 ${
                isSidebarExpanded ? 'px-4 py-3.5 gap-3' : 'justify-center py-3.5'
              } ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-white' : ''}`} />
              <span className={`transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'} whitespace-nowrap text-sm font-medium`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 space-y-4">
          <div className={`flex flex-col items-center transition-all duration-300 ${isSidebarExpanded ? 'px-2' : ''}`}>
            <div className="relative shrink-0">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.firstName || user.displayName || 'User'}&background=random`} 
                alt="Profile" 
                className="w-9 h-9 rounded-2xl border-2 border-white dark:border-slate-800 shadow-sm object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            </div>
            <div className={`mt-2 text-center transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}>
              <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">{userProfile?.firstName || user.displayName || 'User'}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{user.email}</p>
            </div>
          </div>

          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center rounded-xl font-bold text-[11px] transition-colors duration-200 ${
                isSidebarExpanded ? 'px-4 py-2.5 gap-3' : 'justify-center py-2.5'
              } ${
                activeTab === 'settings' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Settings</span>
            </button>
            <button 
              onClick={handleLogout}
              className={`w-full flex items-center rounded-xl font-bold text-[11px] transition-colors duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 ${
                isSidebarExpanded ? 'px-4 py-2.5 gap-3' : 'justify-center py-2.5'
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 z-40 px-2 pb-safe">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'leads', icon: Tag },
          { id: 'contacts', icon: Users },
          { id: 'accounts', icon: Target },
          { id: 'calendar', icon: Calendar },
          { id: 'notes', icon: StickyNote },
          { id: 'nearby-customers', icon: Navigation },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`p-2.5 rounded-2xl transition-all duration-300 ${
              activeTab === item.id ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 scale-110' : 'text-slate-400'
            }`}
          >
            <item.icon className="w-6 h-6" />
          </button>
        ))}
      </nav>

      {/* Mobile Sidebar Overlay */}
      {/* Success Notification */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-[24px] shadow-2xl flex items-start gap-4 ring-1 ring-black/5">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">Action Successful</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{success}</p>
              </div>
              <button 
                onClick={() => setSuccess(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Notification */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-red-100 dark:border-red-900/50 p-4 rounded-[24px] shadow-2xl flex items-start gap-4 ring-1 ring-black/5">
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600">
                <X className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">Action Failed</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-crm-card-light dark:bg-crm-card-dark z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 dark:shadow-none">
                    <Briefcase className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">Sales Perks</h1>
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">CRM System</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto min-h-0 custom-scrollbar">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'leads', label: 'Leads', icon: Tag },
                  { id: 'contacts', label: 'Contacts', icon: Users },
                  { id: 'accounts', label: 'Accounts', icon: Target },
                  { id: 'calendar', label: 'Calendar', icon: Calendar },
                  { id: 'notes', label: 'Meeting Notes', icon: StickyNote },
                  ...(isInsightsUser ? [{ id: 'nearby-customers', label: 'Nearby Customers', icon: Navigation }] : []),
                  ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                      activeTab === item.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 space-y-4 shrink-0">
                <div className="flex items-center gap-3 px-2">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.firstName || user.displayName || 'User'}&background=random`} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-2xl border-2 border-white dark:border-slate-800 shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{userProfile?.firstName || user.displayName || 'User'}</p>
                    <p className="text-xs text-slate-400 font-medium truncate">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <button 
                    onClick={() => {
                      setActiveTab('settings');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                      activeTab === 'settings' 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Settings className="w-5 h-5 shrink-0" />
                    <span>Settings</span>
                  </button>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl font-bold text-sm transition-all"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-crm-bg-light dark:bg-crm-bg-dark min-w-0">
        {/* Header */}
        <header className="sticky top-0 md:top-[-33px] h-[55px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b-0 flex items-center justify-between px-4 md:px-8 py-2 z-30 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="flex items-center gap-3 mr-4">
              {!isOnline && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100 animate-pulse">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </div>
              )}
              {isOnline && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    <Wifi className="w-3 h-3" />
                    Online
                  </div>
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                    <ShieldCheck className="w-3 h-3" />
                    Secure
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 max-w-md">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search leads, accounts, contacts..."
                  className="w-full pl-11 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl transition-all outline-none text-xs dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 transition-all active:scale-90 disabled:opacity-50"
              title="Refresh Application"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {['leads', 'contacts', 'accounts'].includes(activeTab) && isAnyFilterActive && (
              <button 
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Filters</span>
              </button>
            )}
            
            <button 
              onClick={() => setIsNotificationBarOpen(true)}
              className="relative p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 transition-all active:scale-90"
            >
              <Bell className="w-5 h-5" />
              {activities.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white dark:border-slate-900"></span>
              )}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div ref={mainScrollRef} className="flex-1 overflow-auto px-2 md:px-4 pb-20 md:pb-4 scroll-smooth">
            <DuplicateAlert 
              duplicates={
                activeTab === 'accounts' ? (Object.keys(duplicateAccounts).length > 0 ? Object.fromEntries(Object.entries(duplicateAccounts).filter(([_, items]) => !items.every(i => ignoredItemIds.includes(i.id)))) : {}) : 
                activeTab === 'contacts' ? (Object.keys(duplicateContacts).length > 0 ? Object.fromEntries(Object.entries(duplicateContacts).filter(([_, items]) => !items.every(i => ignoredItemIds.includes(i.id)))) : {}) : 
                activeTab === 'leads' ? (Object.keys(duplicateLeads).length > 0 ? Object.fromEntries(Object.entries(duplicateLeads).filter(([_, items]) => !items.every(i => ignoredItemIds.includes(i.id)))) : {}) : 
                {}
              }
              type={activeTab as any}
              onMerge={(items) => {
                setMergeType(activeTab as any);
                setItemsToMerge(items);
                setIsMergeModalOpen(true);
              }}
              onOpenDetails={() => setIsDuplicateDetailsOpen(true)}
              onDismiss={() => {
                const groupKeys = activeTab === 'accounts' ? Object.keys(duplicateAccounts) : 
                                 activeTab === 'contacts' ? Object.keys(duplicateContacts) : 
                                 Object.keys(duplicateLeads);
                const allIds = Array.from(new Set(
                  groupKeys.flatMap(k => {
                    const group = activeTab === 'accounts' ? duplicateAccounts[k] : 
                                  activeTab === 'contacts' ? duplicateContacts[k] : 
                                  duplicateLeads[k];
                    return group.map(i => i.id);
                  })
                ));
                crmService.ignoreDuplicates(allIds, activeTab as string);
                addToast(`Dismissed all ${activeTab} duplicates.`, 'info');
              }}
            />
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 pt-8"
                >
                  {/* Quick Jump Navigation - Fixed Bottom Right */}
                  <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-1.5 p-1.5 bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-800/50 dark:border-slate-200 shadow-2xl">
                    <button 
                      onClick={scrollToTop}
                      className="w-10 h-10 bg-blue-600 rounded-xl flex flex-col items-center justify-center gap-0.5 group shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-90"
                      title="Scroll to Top"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-white group-hover:-translate-y-0.5 transition-transform" />
                      <span className="text-[6px] font-black text-white uppercase tracking-tighter">Top</span>
                    </button>
                    <button 
                      onClick={() => document.getElementById('market-insights-projects')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-10 h-10 bg-indigo-600 rounded-xl flex flex-col items-center justify-center gap-0.5 group shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-90"
                      title="Jump to Projects"
                    >
                      <Zap className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
                      <span className="text-[6px] font-black text-white uppercase tracking-tighter">Projects</span>
                    </button>
                    <button 
                      onClick={() => document.getElementById('market-insights-prospects')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-10 h-10 bg-emerald-600 rounded-xl flex flex-col items-center justify-center gap-0.5 group shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-90"
                      title="Jump to Prospects"
                    >
                      <Navigation className="w-3.5 h-3.5 text-white group-hover:rotate-12 transition-transform" />
                      <span className="text-[6px] font-black text-white uppercase tracking-tighter">Prospects</span>
                    </button>
                  </div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        Welcome back, <span className="text-blue-600">{userProfile?.firstName || user.displayName?.split(' ')[0] || 'Ameerudeen'}</span>
                      </h2>
                      {userProfile?.organizationName && (
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">
                          {userProfile.organizationName}
                        </p>
                      )}
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        {currentAddress || 'Locating current position...'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {serverHealth && !serverHealth.apiKeyConfigured && (
                        <div 
                          title={serverHealth.reason}
                          className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 px-4 py-2 rounded-xl flex items-center gap-2 animate-pulse cursor-help"
                        >
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">AI Key Missing</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 bg-crm-card-light dark:bg-crm-card-dark p-2 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                      <div className={`w-10 h-10 ${isOnline ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'} rounded-xl flex items-center justify-center`}>
                        {isOnline ? (
                          isSyncing ? <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" /> : <ActivityIcon className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</p>
                        <p className={`text-xs font-bold ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isOnline ? (isSyncing ? 'Syncing...' : 'Synced') : 'Offline'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Leads', value: leads.filter(l => l.status !== 'Converted').length, icon: Tag, color: 'blue' },
                      { label: 'Active Contacts', value: contacts.length, icon: Users, color: 'indigo' },
                      { label: 'Key Accounts', value: accounts.length, icon: Target, color: 'violet' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-crm-card-light dark:bg-crm-card-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/50 shadow-sm group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700`} />
                        <div className="relative z-10 space-y-4">
                          <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 flex items-center justify-center`}>
                            <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <div className="flex items-end gap-2">
                              <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Reminder List (Calendar View under Dashboard) */}
                      <div className="bg-blue-600 p-8 rounded-[40px] shadow-xl shadow-blue-200 dark:shadow-none flex flex-col text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                        <div className="relative z-10 h-full flex flex-col">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-white" />
                              Upcoming Reminders
                            </h3>
                            <button 
                              onClick={() => setActiveTab('calendar')}
                              className="text-[10px] font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
                            >
                              View All
                            </button>
                          </div>
                          <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {reminders.filter(r => !r.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5).map((reminder) => (
                              <div key={reminder.id} className="bg-white/10 p-4 rounded-2xl border border-white/10 hover:bg-white/20 transition-all">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-sm font-bold truncate">{reminder.title}</p>
                                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                                    {new Date(reminder.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-white/70 line-clamp-1">{reminder.notes}</p>
                              </div>
                            ))}
                            {reminders.filter(r => !r.completed).length === 0 && (
                              <div className="text-center py-8 opacity-60">
                                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p className="text-sm font-medium">No pending reminders</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Upcoming Visits Card */}
                      <div className="bg-violet-600 p-8 rounded-[40px] shadow-xl shadow-violet-200 dark:shadow-none flex flex-col text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                        <div className="relative z-10 h-full flex flex-col">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                              <Target className="w-5 h-5 text-white" />
                              Upcoming Visits
                            </h3>
                            <button 
                              onClick={() => {
                                setActiveTab('calendar');
                                setCalendarSubTab('visits');
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
                            >
                              View All
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                  {selectedDashboardDate ? `Schedule for ${format(selectedDashboardDate, 'MMM d, yyyy')}` : 'Upcoming Visits'}
                                </p>
                                {selectedDashboardDate && (
                                  <button 
                                    onClick={() => setSelectedDashboardDate(null)}
                                    className="text-[10px] font-bold text-white/40 hover:text-white transition-colors"
                                  >
                                    Clear Selection
                                  </button>
                                )}
                              </div>
                              {visits
                                .filter(v => {
                                  if (v.status !== 'Planned') return false;
                                  if (selectedDashboardDate) {
                                    return isSameDay(new Date(v.date), selectedDashboardDate);
                                  }
                                  return true;
                                })
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .slice(0, 6)
                                .map((visit) => (
                                <div key={visit.id} className="bg-white/10 p-4 rounded-2xl border border-white/10 hover:bg-white/20 transition-all">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-sm font-bold truncate">{visit.targetName}</p>
                                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                                      {new Date(visit.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-white/70">
                                    <Clock className="w-3 h-3" />
                                    <span>{visit.time}</span>
                                  </div>
                                </div>
                              ))}
                              {visits.filter(v => {
                                if (v.status !== 'Planned') return false;
                                if (selectedDashboardDate) {
                                  return isSameDay(new Date(v.date), selectedDashboardDate);
                                }
                                return true;
                              }).length === 0 && (
                                <div className="text-center py-8 opacity-60 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                  <p className="text-xs font-medium">
                                    {selectedDashboardDate ? 'No visits scheduled for this date' : 'No upcoming visits'}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="hidden xl:block">
                              <MiniCalendar 
                                events={visits.filter(v => v.status === 'Planned').map(v => ({ date: v.date, title: v.targetName }))}
                                onDateSelect={setSelectedDashboardDate}
                                selectedDate={selectedDashboardDate || undefined}
                                themeColor="violet"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                {/* Market Insights & Prospects Section */}
                  {isInsightsUser && (
                    <div className="space-y-6">
                      {/* Projects Section */}
                      <div className="bg-crm-card-light dark:bg-crm-card-dark p-8 rounded-[40px] border border-slate-100 dark:border-slate-800/50 shadow-sm flex flex-col" id="market-insights-projects">
                        <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Zap className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">Market Insights (Local Projects)</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI-Powered Discovery</p>
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                                <Globe className="w-2.5 h-2.5" />
                                Live UAE Market Search
                              </div>
                              {directGeminiKey ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800" title="Using user-specified API key from Settings">
                                  <Key className="w-2.5 h-2.5" />
                                  User Key Active
                                </span>
                              ) : (
                                <button
                                  onClick={() => { setActiveTab('settings'); setSettingsTab('security'); }}
                                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-colors"
                                  title="Configure your custom Gemini API key in Settings"
                                >
                                  <Key className="w-2.5 h-2.5" />
                                  Set Custom Key
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              showFavoritesOnly 
                                ? 'bg-pink-100 text-pink-600 border border-pink-200' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                            {showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites'}
                          </button>
                          <button
                            onClick={() => fetchMarketInsights(false)}
                            disabled={isFetchingInsights}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              isFetchingInsights 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
                            }`}
                          >
                            {isFetchingInsights ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Refreshing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                Refresh Projects
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {isFetchingInsights && !isFetchingMoreInsights ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-slate-50/30 dark:bg-slate-900/20 rounded-[32px] border border-dashed border-indigo-100 dark:border-indigo-900/30">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 rounded-full animate-spin" />
                            <Zap className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">AI is searching for new projects...</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Scanning tenders and market data</p>
                          </div>
                        </div>
                      ) : (showFavoritesOnly ? favoriteInsights.filter(f => f.type === 'project') : marketInsights).length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(showFavoritesOnly ? favoriteInsights.filter(f => f.type === 'project') : marketInsights).map((insight) => {
                            const isFav = favoriteInsights.some(f => f.id === insight.id);
                            return (
                              <div key={insight.id} className="p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl transition-all duration-300 group">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{insight.projectName}</h4>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {insight.location}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleDismissInsight(insight.id, 'project')}
                                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                      title="Remove Project"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => toggleFavorite(insight)}
                                      className={`p-2 rounded-lg transition-colors ${
                                        isFav 
                                          ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/20' 
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600 dark:hover:text-pink-400'
                                      }`}
                                      title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                    >
                                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                                    </button>
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                      (insight.status || '').toLowerCase().includes('tender') ? 'bg-orange-100 text-orange-600' :
                                      (insight.status || '').toLowerCase().includes('construction') ? 'bg-blue-100 text-blue-600' :
                                      'bg-green-100 text-green-600'
                                    }`}>
                                      {insight.status}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold border border-indigo-100 dark:border-indigo-800">
                                      {insight.category}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Contact Person</p>
                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{insight.contactPerson || 'N/A'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Contact Details</p>
                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{insight.contactPhone || insight.contactEmail || 'N/A'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">Expected Scope</p>
                                    <p className="text-[10px] text-slate-700 dark:text-slate-300 line-clamp-2">{insight.scope}</p>
                                  </div>

                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed italic">
                                    "{insight.description}"
                                  </p>
                                  
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div className="flex-1 pr-4">
                                      <p className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Relevance</p>
                                      <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1">{insight.relevance}</p>
                                      <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-1">
                                        Published: {insight.publishedDate || new Date(insight.dateFound).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedInsight(insight);
                                          setIsInsightModalOpen(true);
                                        }}
                                        className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                                        title="View Full Details"
                                      >
                                        <Info className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleConvertInsightToLead(insight)}
                                        className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors"
                                        title="Convert to Lead"
                                      >
                                        <GitMerge className="w-4 h-4" />
                                      </button>
                                      <a 
                                        href={`https://www.google.com/search?q=${encodeURIComponent(`${insight.projectName} ${insight.location} tender project news`)}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        title="Search on Google"
                                      >
                                        <Search className="w-4 h-4" />
                                      </a>
                                      {insight.website && (
                                        <a 
                                          href={insight.website.startsWith('http') ? insight.website : `https://${insight.website}`}
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                                          title="Visit Website"
                                        >
                                          <Globe className="w-4 h-4" />
                                        </a>
                                      )}
                                      {insight.tenderLink && (
                                        <a 
                                          href={insight.tenderLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                                          title="Visit Project Link"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {!showFavoritesOnly && marketInsights.length > 0 && (
                          <div className="mt-8 flex justify-center" ref={projectsEndRef}>
                            <button
                              onClick={() => fetchMarketInsights(true)}
                              disabled={isFetchingMoreInsights || isFetchingInsights}
                              className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all ${
                                isFetchingMoreInsights || isFetchingInsights
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                  : 'bg-white dark:bg-black text-indigo-600 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-50 shadow-sm active:scale-95'
                              }`}
                            >
                              {isFetchingMoreInsights ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Loading More...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  Load More Projects
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/30 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                          <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                            <Zap className="w-8 h-8 text-indigo-200" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                            {showFavoritesOnly ? 'No Favorited Projects' : 'No Project Insights Loaded'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            {showFavoritesOnly 
                              ? 'You haven\'t added any projects to your favorites yet.' 
                              : 'Click "Find New Projects" to discover categorized opportunities.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actionable Prospects Section */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col" id="market-insights-prospects">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Navigation className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Actionable Prospects (Visit Today)</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Target Customers & OEMs</p>
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                                <Globe className="w-2.5 h-2.5" />
                                Live UAE Market Search
                              </div>
                              {directGeminiKey ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800" title="Using user-specified API key from Settings">
                                  <Key className="w-2.5 h-2.5" />
                                  User Key Active
                                </span>
                              ) : (
                                <button
                                  onClick={() => { setActiveTab('settings'); setSettingsTab('security'); }}
                                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-colors"
                                  title="Configure your custom Gemini API key in Settings"
                                >
                                  <Key className="w-2.5 h-2.5" />
                                  Set Custom Key
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              showFavoritesOnly 
                                ? 'bg-pink-100 text-pink-600 border border-pink-200' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                            {showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites'}
                          </button>
                          <button
                            onClick={() => fetchProspects(false)}
                            disabled={isFetchingProspects}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              isFetchingProspects 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95'
                            }`}
                          >
                            {isFetchingProspects ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Refreshing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                Refresh Prospects
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {isFetchingProspects && !isFetchingMoreProspects ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-slate-50/30 dark:bg-slate-900/20 rounded-[32px] border border-dashed border-emerald-100 dark:border-emerald-900/30">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-emerald-100 dark:border-emerald-900/20 border-t-emerald-600 rounded-full animate-spin" />
                            <Navigation className="w-6 h-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">AI is identifying prospects...</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Analyzing companies and OEMs</p>
                          </div>
                        </div>
                      ) : (showFavoritesOnly ? favoriteInsights.filter(f => f.type === 'prospect') : prospects).length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(showFavoritesOnly ? favoriteInsights.filter(f => f.type === 'prospect') : prospects).map((prospect) => {
                            const isFav = favoriteInsights.some(f => f.id === prospect.id);
                            return (
                              <div key={prospect.id} className="p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl transition-all duration-300 group">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{prospect.projectName}</h4>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {prospect.location}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleDismissInsight(prospect.id, 'prospect')}
                                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                      title="Remove Prospect"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => toggleFavorite(prospect)}
                                      className={`p-2 rounded-lg transition-colors ${
                                        isFav 
                                          ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/20' 
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600 dark:hover:text-pink-400'
                                      }`}
                                      title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                    >
                                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                                    </button>
                                    <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600">
                                      {prospect.category}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30">
                                    <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Expected Scope</p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{prospect.scope}</p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Key Contact</p>
                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{prospect.contactPerson || 'N/A'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Details</p>
                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{prospect.contactPhone || prospect.contactEmail || 'N/A'}</p>
                                    </div>
                                  </div>
                                  
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Why approach:</span> {prospect.description}
                                  </p>
                                  
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div className="flex-1 pr-4">
                                      <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                                        Published: {prospect.publishedDate || new Date(prospect.dateFound).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {prospect.lat && prospect.lng && (
                                        <a 
                                          href={`https://www.google.com/maps/dir/?api=1&destination=${prospect.lat},${prospect.lng}`}
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 transition-colors"
                                        >
                                          <Navigation className="w-3 h-3" />
                                          Navigate
                                        </a>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedInsight(prospect);
                                          setIsInsightModalOpen(true);
                                        }}
                                        className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                                        title="View Full Details"
                                      >
                                        <Info className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleConvertInsightToLead(prospect)}
                                        className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors"
                                        title="Convert to Lead"
                                      >
                                        <GitMerge className="w-4 h-4" />
                                      </button>
                                      <a 
                                        href={`https://www.google.com/search?q=${encodeURIComponent(`${prospect.projectName} electrical automation`)}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        title="Search on Google"
                                      >
                                        <Search className="w-4 h-4" />
                                      </a>
                                      {prospect.website && (
                                        <a 
                                          href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                                          title="Visit Website"
                                        >
                                          <Globe className="w-4 h-4" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {!showFavoritesOnly && prospects.length > 0 && (
                          <div className="mt-8 flex justify-center" ref={prospectsEndRef}>
                            <button
                              onClick={() => fetchProspects(true)}
                              disabled={isFetchingMoreProspects || isFetchingProspects}
                              className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all ${
                                isFetchingMoreProspects || isFetchingProspects
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                  : 'bg-white dark:bg-black text-emerald-600 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-50 shadow-sm active:scale-95'
                              }`}
                            >
                              {isFetchingMoreProspects ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Loading More...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  Load More Prospects
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/30 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                          <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                            <Navigation className="w-8 h-8 text-emerald-200" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                            {showFavoritesOnly ? 'No Favorited Prospects' : 'No Prospects Identified'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            {showFavoritesOnly 
                              ? 'You haven\'t added any prospects to your favorites yet.' 
                              : 'Click "Identify Prospects" to find specific companies and OEMs to approach today.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </motion.div>
              )}

              {activeTab === 'leads' && (
                <motion.div
                  key="leads"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="sticky top-[55px] md:top-[22px] z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md py-2 md:py-[15px] -mx-4 px-4 md:-mx-8 md:px-8">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4">
                      <div>
                        <h2 className="text-[10px] sm:text-xs md:text-2xl font-bold tracking-tight">Leads</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                      <select 
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-medium"
                      >
                        <option value="All">All Departments</option>
                        <option value="Administration">Administration</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Finance">Finance</option>
                        <option value="IT">IT</option>
                        <option value="Others">Others</option>
                        <option value="Purchase">Purchase</option>
                        <option value="Reception">Reception</option>
                        <option value="Sales">Sales</option>
                        <option value="Owner/CEO">Owner/CEO</option>
                      </select>
                      <div className="flex items-center gap-3">
                        {selectedLeads.length > 0 && (
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-blue-100 dark:border-blue-800">
                            <span className="text-[10px] md:text-xs font-bold text-blue-700 dark:text-blue-400">{selectedLeads.length} selected</span>
                            <button 
                              onClick={handleBulkConvertToContact}
                              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded text-emerald-600 transition-colors"
                              title="Convert to Contact"
                            >
                              <UserPlus className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                            <button 
                              onClick={() => handleBulkDelete('leads')}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-600 transition-colors"
                              title="Delete Selected"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setMergeType('leads');
                                setIsMergeModalOpen(true);
                              }}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-blue-600 transition-colors"
                              title="Merge Selected"
                            >
                              <GitMerge className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                          </div>
                        )}
                        <button 
                          onClick={() => handleExport('leads')}
                          className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                        >
                          <Download className="w-3 h-3 md:w-4 md:h-4" />
                          Export
                        </button>
                      </div>
                      <button 
                        onClick={() => {
                          setLeadToEdit(null);
                          setIsLeadModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition-all active:scale-95"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4" />
                        Add Lead
                      </button>
                    </div>
                  </div>
                </div>

                  <div className="bg-crm-card-light dark:bg-crm-card-dark rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                    <div className="">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead className="sticky top-[155px] md:top-[88px] z-10 bg-slate-900 dark:bg-slate-950 shadow-sm">
                          <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
                            <ResizableHeader 
                              key={`${filterKey}-index`}
                              label="#" 
                              width={leadColWidths.index} 
                              onResize={(w) => handleResize('leads', 'index', w)} 
                              column="index" 
                              table="leads" 
                              className="hidden md:table-cell"
                            />
                            <th className="sticky top-[155px] md:top-[88px] z-10 bg-slate-900 dark:bg-slate-950 px-4 py-3 w-10">
                              <input 
                                type="checkbox" 
                                checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedLeads(filteredLeads.map(l => l.id));
                                  else setSelectedLeads([]);
                                }}
                                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                              />
                            </th>
                            <ResizableHeader 
                              key={`${filterKey}-name`}
                              label="Name" 
                              width={leadColWidths.name} 
                              onResize={(w) => handleResize('leads', 'name', w)} 
                              column="name" 
                              table="leads"
                              filterValue={leadFilters.name || [...new Set(activeLeads.map(l => `${l.firstName} ${l.lastName}`))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setLeadFilters(prev => ({ ...prev, name: val }))}
                              uniqueValues={[...new Set(activeLeads.map(l => `${l.firstName} ${l.lastName}`))].filter(Boolean) as string[]}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-account`}
                              label="Account" 
                              width={leadColWidths.account} 
                              onResize={(w) => handleResize('leads', 'account', w)} 
                              column="accountName" 
                              table="leads"
                              filterValue={leadFilters.accountName || [...new Set(activeLeads.map(l => l.accountName))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setLeadFilters(prev => ({ ...prev, accountName: val }))}
                              uniqueValues={[...new Set(activeLeads.map(l => l.accountName))].filter(Boolean) as string[]}
                              className="hidden md:table-cell"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-email`}
                              label="Email" 
                              width={leadColWidths.email} 
                              onResize={(w) => handleResize('leads', 'email', w)} 
                              column="email" 
                              table="leads"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-phone`}
                              label="Phone" 
                              width={leadColWidths.phone} 
                              onResize={(w) => handleResize('leads', 'phone', w)} 
                              column="phone" 
                              table="leads"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-city`}
                              label="City" 
                              width={leadColWidths.location / 2} 
                              onResize={(w) => handleResize('leads', 'location', w * 2)} 
                              column="city" 
                              table="leads"
                              filterValue={leadFilters.city || [...new Set(activeLeads.map(l => l.city))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setLeadFilters(prev => ({ ...prev, city: val }))}
                              uniqueValues={[...new Set(activeLeads.map(l => l.city))].filter(Boolean) as string[]}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-country`}
                              label="Country" 
                              width={leadColWidths.location / 2} 
                              onResize={(w) => handleResize('leads', 'location', w * 2)} 
                              column="country" 
                              table="leads"
                              filterValue={leadFilters.country || [...new Set(activeLeads.map(l => l.country))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setLeadFilters(prev => ({ ...prev, country: val }))}
                              uniqueValues={[...new Set(activeLeads.map(l => l.country))].filter(Boolean) as string[]}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-actions`}
                              label="Actions" 
                              width={leadColWidths.actions} 
                              onResize={(w) => handleResize('leads', 'actions', w)} 
                              column="actions" 
                              table="leads" 
                              className="hidden md:table-cell"
                            />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {filteredLeads.map((lead, index) => (
                            <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-black/50 transition-colors group">
                              <td className="px-2 py-2 text-[10px] font-medium text-slate-400 truncate hidden md:table-cell">{index + 1}</td>
                              <td className="px-2 py-2 w-10">
                                <input 
                                  type="checkbox" 
                                  checked={selectedLeads.includes(lead.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedLeads(prev => [...prev, lead.id]);
                                    else setSelectedLeads(prev => prev.filter(id => id !== lead.id));
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700"
                                />
                              </td>
                  <td className="px-2 py-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                    {lead.firstName.charAt(0)}
                                  </div>
                                  <div className="truncate cursor-pointer" onClick={() => {
                                    setSelectedLeadForDetail(lead);
                                    setIsLeadDetailModalOpen(true);
                                  }}>
                                    <div className="flex items-center gap-1.5">
                                      <div className="font-bold text-[11px] md:text-xs text-slate-900 dark:text-white truncate hover:text-blue-600 transition-colors uppercase tracking-tight">{lead.salutation} {lead.firstName} {lead.lastName && lead.lastName.toLowerCase() !== 'unknown' ? lead.lastName : ''}</div>
                                    </div>
                                    <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate hidden md:block font-medium">{lead.designation}</div>
                                    <div className="text-[9px] md:text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate md:hidden uppercase tracking-widest">{lead.accountName}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate hidden md:table-cell font-medium cursor-pointer hover:text-blue-600 transition-colors" onClick={() => {
                                setSelectedLeadForDetail(lead);
                                setIsLeadDetailModalOpen(true);
                              }}>{lead.accountName}</td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate">
                                <div className="flex flex-col gap-0.5">
                                  {(lead.emails && lead.emails.length > 0 ? lead.emails : [lead.email]).map((email, i) => (
                                    <a key={i} href={`mailto:${email}`} className="hover:text-blue-600 hover:underline truncate font-medium">{email}</a>
                                  ))}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate">
                                <div className="flex flex-col gap-0.5">
                                  {(lead.phones && lead.phones.length > 0 ? lead.phones : [lead.phone]).map((phone, i) => (
                                    <a key={i} href={`tel:${phone}`} className="hover:text-blue-600 hover:underline truncate font-medium">{phone}</a>
                                  ))}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                                {lead.city || '-'}
                              </td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                                {lead.country || '-'}
                              </td>
                              <td className="px-2 py-2 text-right hidden md:table-cell">
                                <div className="flex justify-end gap-1">
                                  {lead.status === 'New' && (
                                    <button 
                                      onClick={() => handleConvertLead(lead)}
                                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 transition-colors"
                                      title="Convert"
                                    >
                                      <GitMerge className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => {
                                      setLeadToEdit(lead);
                                      setIsLeadModalOpen(true);
                                    }}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteLead(lead.id)}
                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl text-rose-500 dark:text-rose-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'contacts' && (
                <motion.div
                  key="contacts"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="sticky top-[55px] md:top-[22px] z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md py-2 md:py-[15px] -mx-4 px-4 md:-mx-8 md:px-8">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4">
                      <div className="flex items-center gap-4">
                        {viewingAccountId && (
                          <button 
                            onClick={() => {
                              setViewingAccountId(null);
                              setActiveTab('accounts');
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                            title="Back to Accounts"
                          >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                          </button>
                        )}
                        <div>
                          <h2 className="text-[10px] sm:text-xs md:text-2xl font-bold tracking-tight">Contacts</h2>
                          {viewingAccountId && (
                            <div className="mt-1 flex items-center gap-2 text-blue-600 text-xs font-semibold">
                              <span>Showing contacts for: {accounts.find(a => a.id === viewingAccountId)?.name}</span>
                              <button 
                                onClick={() => setViewingAccountId(null)}
                                className="p-0.5 hover:bg-blue-50 rounded transition-colors"
                                title="Clear Filter"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    <div className="flex flex-wrap gap-2">
                      <select 
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-medium"
                      >
                        <option value="All">All Departments</option>
                        <option value="Administration">Administration</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Finance">Finance</option>
                        <option value="IT">IT</option>
                        <option value="Others">Others</option>
                        <option value="Purchase">Purchase</option>
                        <option value="Reception">Reception</option>
                        <option value="Sales">Sales</option>
                        <option value="Owner/CEO">Owner/CEO</option>
                      </select>
                      <div className="flex items-center gap-3">
                        {selectedContacts.length > 0 && (
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-blue-100 dark:border-blue-800">
                            <span className="text-[10px] md:text-xs font-bold text-blue-700 dark:text-blue-400">{selectedContacts.length} selected</span>
                            <button 
                              onClick={() => handleBulkDelete('contacts')}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-600 transition-colors"
                              title="Delete Selected"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setMergeType('contacts');
                                setItemsToMerge(contacts.filter(c => selectedContacts.includes(c.id)));
                                setIsMergeModalOpen(true);
                              }}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-blue-600 transition-colors"
                              title="Merge Selected"
                            >
                              <GitMerge className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                          </div>
                        )}
                        <button 
                          onClick={() => handleExport('contacts')}
                        className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                      >
                        <Download className="w-3 h-3 md:w-4 md:h-4" />
                        Export
                      </button>
                      <button 
                        onClick={() => {
                          setContactToEdit(null);
                          setIsContactModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition-all active:scale-95"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4" />
                        Add Contact
                      </button>
                    </div>
                  </div>
                </div>
              </div>

                  <div className="bg-crm-card-light dark:bg-crm-card-dark rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                    <div className="">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead className="sticky top-[155px] md:top-[88px] z-10 bg-slate-900 dark:bg-slate-950 shadow-sm">
                          <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
                            <ResizableHeader 
                              key={`${filterKey}-index`}
                              label="#" 
                              width={contactColWidths.index} 
                              onResize={(w) => handleResize('contacts', 'index', w)} 
                              column="index" 
                              table="contacts" 
                              className="hidden md:table-cell"
                            />
                          <th className="sticky top-[155px] md:top-[88px] z-10 bg-slate-900 dark:bg-slate-950 px-4 py-3 w-10">
                              <input 
                                type="checkbox" 
                                checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedContacts(filteredContacts.map(c => c.id));
                                  else setSelectedContacts([]);
                                }}
                                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                              />
                            </th>
                            <ResizableHeader 
                              key={`${filterKey}-name`}
                              label="Name" 
                              width={contactColWidths.name} 
                              onResize={(w) => handleResize('contacts', 'name', w)} 
                              column="name" 
                              table="contacts"
                              filterValue={contactFilters.name || [...new Set(contacts.map(c => `${c.firstName} ${c.lastName}`))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setContactFilters(prev => ({ ...prev, name: val }))}
                              uniqueValues={[...new Set(contacts.map(c => `${c.firstName} ${c.lastName}`))].filter(Boolean) as string[]}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-account`}
                              label="Account Name" 
                              width={contactColWidths.account} 
                              onResize={(w) => handleResize('contacts', 'account', w)} 
                              column="account" 
                              table="contacts"
                              filterValue={contactFilters.account || [...new Set(contacts.map(c => accounts.find(a => a.id === c.accountId)?.name))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setContactFilters(prev => ({ ...prev, account: val }))}
                              uniqueValues={[...new Set(contacts.map(c => accounts.find(a => a.id === c.accountId)?.name))].filter(Boolean) as string[]}
                              className="hidden md:table-cell"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-designation`}
                              label="Designation" 
                              width={contactColWidths.designation} 
                              onResize={(w) => handleResize('contacts', 'designation', w)} 
                              column="designation" 
                              table="contacts"
                              filterValue={contactFilters.designation || [...new Set(contacts.map(c => c.designation))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setContactFilters(prev => ({ ...prev, designation: val }))}
                              uniqueValues={[...new Set(contacts.map(c => c.designation))].filter(Boolean) as string[]}
                              className="hidden md:table-cell"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-email`}
                              label="Email" 
                              width={contactColWidths.email} 
                              onResize={(w) => handleResize('contacts', 'email', w)} 
                              column="email" 
                              table="contacts"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-phone`}
                              label="Phone" 
                              width={contactColWidths.phone} 
                              onResize={(w) => handleResize('contacts', 'phone', w)} 
                              column="phone" 
                              table="contacts"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-city`}
                              label="City" 
                              width={contactColWidths.location / 2} 
                              onResize={(w) => handleResize('contacts', 'location', w * 2)} 
                              column="city" 
                              table="contacts"
                              filterValue={contactFilters.city || [...new Set(contacts.map(c => accounts.find(a => a.id === c.accountId)?.address.city))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setContactFilters(prev => ({ ...prev, city: val }))}
                              uniqueValues={[...new Set(contacts.map(c => accounts.find(a => a.id === c.accountId)?.address.city))].filter(Boolean) as string[]}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-country`}
                              label="Country" 
                              width={contactColWidths.location / 2} 
                              onResize={(w) => handleResize('contacts', 'location', w * 2)} 
                              column="country" 
                              table="contacts"
                              filterValue={contactFilters.country || [...new Set(contacts.map(c => accounts.find(a => a.id === c.accountId)?.address.country))].filter(Boolean) as string[]}
                              onFilterChange={(val) => setContactFilters(prev => ({ ...prev, country: val }))}
                              uniqueValues={[...new Set(contacts.map(c => accounts.find(a => a.id === c.accountId)?.address.country))].filter(Boolean) as string[]}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-actions`}
                              label="Actions" 
                              width={contactColWidths.actions} 
                              onResize={(w) => handleResize('contacts', 'actions', w)} 
                              column="actions" 
                              table="contacts" 
                              className="hidden md:table-cell"
                            />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {filteredContacts.map((contact, index) => {
                            const account = accounts.find(a => a.id === contact.accountId);
                            return (
                              <tr key={contact.id} className="hover:bg-slate-50/50 dark:hover:bg-black/50 transition-colors group">
                                <td className="px-2 py-2 text-[10px] font-medium text-slate-400 truncate hidden md:table-cell">{index + 1}</td>
                                <td className="px-2 py-2 w-10">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedContacts.includes(contact.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedContacts(prev => [...prev, contact.id]);
                                      else setSelectedContacts(prev => prev.filter(id => id !== contact.id));
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                      {contact.firstName.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                      <button 
                                        onClick={() => {
                                          setSelectedContactForDetail(contact);
                                          setIsContactDetailModalOpen(true);
                                        }}
                                        className="font-bold text-[11px] md:text-xs text-slate-900 dark:text-white hover:text-blue-600 transition-colors text-left truncate flex items-center gap-1.5 group"
                                      >
                                        <span className="uppercase tracking-tight">{contact.salutation} {contact.firstName} {contact.lastName && contact.lastName.toLowerCase() !== 'unknown' ? contact.lastName : ''}</span>
                                      </button>
                                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate md:hidden uppercase tracking-widest">{account?.name || 'Unknown'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-200 truncate hidden md:table-cell font-medium">
                                  <button 
                                    onClick={() => {
                                      if (account) {
                                        setSelectedAccountForDetail(account);
                                        setIsAccountDetailModalOpen(true);
                                      }
                                    }}
                                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                                  >
                                    {account?.name || 'Unknown'}
                                  </button>
                                </td>
                                <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate hidden md:table-cell font-medium">{contact.designation}</td>
                                <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate">
                                  <div className="flex flex-col gap-0.5">
                                    {(contact.emails && contact.emails.length > 0 ? contact.emails : [contact.email]).map((email, i) => (
                                      <a key={i} href={`mailto:${email}`} className="hover:text-blue-600 hover:underline truncate font-medium text-[10px] md:text-xs">{email}</a>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate">
                                  <div className="flex flex-col gap-0.5">
                                    {(contact.phones && contact.phones.length > 0 ? contact.phones : [contact.phone]).map((phone, i) => (
                                      <a key={i} href={`tel:${phone}`} className="hover:text-blue-600 hover:underline truncate font-medium text-[10px] md:text-xs">{phone}</a>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                                  {account?.address.city || '-'}
                                </td>
                                <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                                  {account?.address.country || '-'}
                                </td>
                                <td className="px-2 py-2 text-right hidden md:table-cell">
                                  <div className="flex justify-end gap-1">
                                    <button 
                                      onClick={() => {
                                        setContactToEdit(contact);
                                        setIsContactModalOpen(true);
                                      }}
                                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteContact(contact.id)}
                                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl text-rose-500 dark:text-rose-400 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'accounts' && (
                <motion.div
                  key="accounts"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="sticky top-[55px] md:top-[22px] z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md py-2 md:py-[15px] -mx-4 px-4 md:-mx-8 md:px-8">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4">
                      <div>
                        <h2 className="text-[10px] sm:text-xs md:text-2xl font-bold tracking-tight">Accounts</h2>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                      <button 
                        onClick={() => {
                          setIsSelectionMode(!isSelectionMode);
                          if (isSelectionMode) setSelectedAccounts([]);
                        }}
                        className={`px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 transition-all ${
                          isSelectionMode 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                        title="Toggle multi-account selection"
                      >
                        <CheckCircle2 className={`w-3 h-3 md:w-4 md:h-4 ${isSelectionMode ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                        {isSelectionMode ? 'Selection On' : 'Select'}
                      </button>
                      <div className="flex items-center gap-3">
                        {selectedAccounts.length > 0 && (
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-blue-100 dark:border-blue-800">
                            <span className="text-[10px] md:text-xs font-bold text-blue-700 dark:text-blue-400">{selectedAccounts.length} selected</span>
                            <button 
                              onClick={() => handleBulkDelete('accounts')}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-600 transition-colors"
                              title="Delete Selected"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setMergeType('accounts');
                                setItemsToMerge(accounts.filter(a => selectedAccounts.includes(a.id)));
                                setIsMergeModalOpen(true);
                              }}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-blue-600 transition-colors"
                              title="Merge Selected"
                            >
                              <GitMerge className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                          </div>
                        )}
                        <button 
                          onClick={() => handleExport('accounts')}
                        className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                      >
                        <Download className="w-3 h-3 md:w-4 md:h-4" />
                        Export
                      </button>
                      <button 
                        onClick={() => {
                          setAccountToEdit(null);
                          setIsAccountModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition-all active:scale-95"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4" />
                        Add Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>

                  <div className="bg-crm-card-light dark:bg-crm-card-dark rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                    <div className="">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead className="sticky top-[155px] md:top-[88px] z-10 bg-slate-900 dark:bg-slate-950 shadow-sm">
                          <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
                            <ResizableHeader 
                              key={`${filterKey}-index`}
                              label="#" 
                              width={accountColWidths.index} 
                              onResize={(w) => handleResize('accounts', 'index', w)} 
                              column="index" 
                              table="accounts" 
                              className="hidden md:table-cell"
                            />
                            {isSelectionMode && (
                              <th className="sticky top-[155px] md:top-[88px] z-10 bg-slate-900 dark:bg-slate-950 px-4 py-3 w-10">
                                <input 
                                  type="checkbox" 
                                  checked={selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedAccounts(filteredAccounts.map(a => a.id));
                                    else setSelectedAccounts([]);
                                  }}
                                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 dark:bg-slate-800"
                                />
                              </th>
                            )}
                            <ResizableHeader 
                              key={`${filterKey}-name`}
                              label="Account Name" 
                              width={accountColWidths.name} 
                              onResize={(w) => handleResize('accounts', 'name', w)} 
                              column="name" 
                              table="accounts"
                              filterValue={accountFilters.name || [...new Set(accounts.map(a => a.name))].filter((v): v is string => typeof v === 'string')}
                              onFilterChange={(val) => setAccountFilters(prev => ({ ...prev, name: val }))}
                              uniqueValues={[...new Set(accounts.map(a => a.name))].filter((v): v is string => typeof v === 'string').sort()}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-industry`}
                              label="Industry" 
                              width={accountColWidths.industry} 
                              onResize={(w) => handleResize('accounts', 'industry', w)} 
                              column="industry" 
                              table="accounts"
                              filterValue={accountFilters.industry || [...new Set(accounts.flatMap(a => a.industries || (a.industry ? [a.industry] : [])))].filter((v): v is string => typeof v === 'string')}
                              onFilterChange={(val) => setAccountFilters(prev => ({ ...prev, industry: val }))}
                              uniqueValues={[...new Set(accounts.flatMap(a => a.industries || (a.industry ? [a.industry] : [])))].filter((v): v is string => typeof v === 'string').sort()}
                              className="hidden md:table-cell"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-email`}
                              label="Email" 
                              width={accountColWidths.email} 
                              onResize={(w) => handleResize('accounts', 'email', w)} 
                              column="email" 
                              table="accounts"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-phone`}
                              label="Phone" 
                              width={accountColWidths.phone} 
                              onResize={(w) => handleResize('accounts', 'phone', w)} 
                              column="phone" 
                              table="accounts"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-city`}
                              label="City" 
                              width={accountColWidths.location / 2} 
                              onResize={(w) => handleResize('accounts', 'location', w * 2)} 
                              column="address.city" 
                              table="accounts"
                              filterValue={accountFilters['address.city'] || [...new Set(accounts.map(a => a.address.city))].filter((v): v is string => typeof v === 'string')}
                              onFilterChange={(val) => setAccountFilters(prev => ({ ...prev, 'address.city': val }))}
                              uniqueValues={[...new Set(accounts.map(a => a.address.city))].filter((v): v is string => typeof v === 'string').sort()}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-country`}
                              label="Country" 
                              width={accountColWidths.location / 2} 
                              onResize={(w) => handleResize('accounts', 'location', w * 2)} 
                              column="address.country" 
                              table="accounts"
                              filterValue={accountFilters['address.country'] || [...new Set(accounts.map(a => a.address.country))].filter((v): v is string => typeof v === 'string')}
                              onFilterChange={(val) => setAccountFilters(prev => ({ ...prev, 'address.country': val }))}
                              uniqueValues={[...new Set(accounts.map(a => a.address.country))].filter((v): v is string => typeof v === 'string').sort()}
                            />
                            <ResizableHeader 
                              key={`${filterKey}-map`}
                              label="Map" 
                              width={accountColWidths.map} 
                              onResize={(w) => handleResize('accounts', 'map', w)} 
                              column="map" 
                              table="accounts" 
                              className="hidden md:table-cell"
                            />
                            <ResizableHeader 
                              key={`${filterKey}-actions`}
                              label="Actions" 
                              width={accountColWidths.actions} 
                              onResize={(w) => handleResize('accounts', 'actions', w)} 
                              column="actions" 
                              table="accounts" 
                              className="hidden md:table-cell"
                            />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {filteredAccounts.map((account, index) => (
                            <tr key={account.id} className="hover:bg-slate-50/50 dark:hover:bg-black/50 transition-colors group">
                              <td className="px-2 py-2 text-[10px] font-medium text-slate-400 truncate hidden md:table-cell">{index + 1}</td>
                              {isSelectionMode && (
                                <td className="px-2 py-2 w-10">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedAccounts.includes(account.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedAccounts(prev => [...prev, account.id]);
                                      else setSelectedAccounts(prev => prev.filter(id => id !== account.id));
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700"
                                  />
                                </td>
                              )}
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0">
                                    {account.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <button 
                                      onClick={() => {
                                        setSelectedAccountForDetail(account);
                                        setIsAccountDetailModalOpen(true);
                                      }}
                                      className="font-bold text-[11px] md:text-xs text-slate-900 dark:text-white hover:text-blue-600 transition-colors text-left truncate group flex items-center gap-1.5"
                                      title="View Account Details"
                                    >
                                      <span>{account.name}</span>
                                    </button>
                                    {account.accountId && (
                                      <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">ID: {account.accountId}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate hidden md:table-cell font-medium">
                                {account.industries && account.industries.length > 0 
                                  ? account.industries.join(', ') 
                                  : account.industry}
                              </td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate">
                                <div className="flex flex-col gap-0.5">
                                  {(account.emails && account.emails.length > 0 ? account.emails : [account.email]).map((email, i) => (
                                    <a key={i} href={`mailto:${email}`} className="hover:text-blue-600 hover:underline truncate font-medium text-[10px] md:text-xs">{email}</a>
                                  ))}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate">
                                <div className="flex flex-col gap-0.5">
                                  {(account.phones && account.phones.length > 0 ? account.phones : [account.phone]).map((phone, i) => (
                                    <a key={i} href={`tel:${phone}`} className="hover:text-blue-600 hover:underline truncate font-medium text-[10px] md:text-xs">{phone}</a>
                                  ))}
                                </div>
                              </td>
                               <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                                {account.address.city || '-'}
                              </td>
                              <td className="px-2 py-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                                {account.address.country || '-'}
                              </td>
                              <td className="px-2 py-2 text-[9px] font-mono text-blue-600 truncate hidden md:table-cell">
                                <div className="flex flex-col gap-1">
                                  <div className="flex gap-2">
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${account.lat},${account.lng}${account.placeId ? `&query_place_id=${account.placeId}` : ''}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-blue-600 flex items-center gap-0.5 font-bold"
                                      title="Google Maps"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      G-Maps
                                    </a>
                                    <a
                                      href={`https://waze.com/ul?q=${account.lat},${account.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-orange-600 flex items-center gap-0.5 font-bold"
                                      title="Waze"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      Waze
                                    </a>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-right hidden md:table-cell">
                                <div className="flex justify-end gap-1">
                                  <button 
                                    onClick={() => {
                                      setSelectedAccountForDetail(account);
                                      setIsAccountDetailModalOpen(true);
                                    }}
                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 transition-colors"
                                    title="View Contacts"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setInitialVisitTarget({
                                        id: account.id,
                                        type: 'account',
                                        name: account.name
                                      });
                                      setIsVisitModalOpen(true);
                                    }}
                                    className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400 transition-colors"
                                    title="Schedule Visit"
                                  >
                                    <Calendar className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setAccountToEdit(account);
                                      setIsAccountModalOpen(true);
                                    }}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteAccount(account.id)}
                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl text-rose-500 dark:text-rose-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'nearby-customers' && (
                <motion.div
                  key="nearby-customers"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 pt-[25px]"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight dark:text-white">Nearby Customers Tracker</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs font-medium">Discover accounts near your current or pinned location.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                        <button
                          onClick={() => setSearchMode('current')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${searchMode === 'current' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                          My Location
                        </button>
                        <button
                          onClick={() => setSearchMode('pinned')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${searchMode === 'pinned' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                          Pinned Location
                        </button>
                      </div>
                      <button 
                        onClick={getPosition}
                        disabled={isLocating}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                        {isLocating ? 'Locating...' : 'Refresh Location'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-bold flex items-center gap-2 dark:text-white">
                            <MapPin className={`w-4 h-4 ${searchMode === 'current' ? 'text-blue-600' : 'text-red-600'}`} />
                            {searchMode === 'current' ? 'Current Position' : 'Pinned Position'}
                          </h3>
                          <div className="flex gap-2">
                            {searchMode === 'pinned' && pinnedLocation && (
                              <>
                                <button
                                  onClick={() => {
                                    setPinnedLocation(null);
                                    setPinnedAddress(null);
                                  }}
                                  className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1 text-xs font-bold"
                                  title="Clear Pin"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Clear
                                </button>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${pinnedLocation?.lat},${pinnedLocation?.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-bold"
                                  title="Open in Google Maps"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  G-Maps
                                </a>
                                <a
                                  href={`https://waze.com/ul?ll=${pinnedLocation?.lat},${pinnedLocation?.lng}&navigate=yes`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-100 transition-colors flex items-center gap-1 text-xs font-bold"
                                  title="Open in Waze"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Waze
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Address</p>
                            <p className="font-medium text-xs text-slate-900 dark:text-slate-200">
                              {searchMode === 'current' 
                                ? (currentAddress || 'Locating...') 
                                : (pinnedAddress || 'Click on the map to pin a location')}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Latitude</p>
                              <p className="font-mono font-bold text-xs text-slate-900 dark:text-slate-200">
                                {searchMode === 'current' 
                                  ? (userLocation?.lat.toFixed(6) || '--') 
                                  : (pinnedLocation?.lat.toFixed(6) || '--')}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Longitude</p>
                              <p className="font-mono font-bold text-xs text-slate-900 dark:text-slate-200">
                                {searchMode === 'current' 
                                  ? (userLocation?.lng.toFixed(6) || '--') 
                                  : (pinnedLocation?.lng.toFixed(6) || '--')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-500/20 dark:shadow-none">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-base font-bold">Proximity Search</h3>
                          <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                            {nearbyRange > 200 ? 'Show All' : `${nearbyRange} km`}
                          </span>
                        </div>
                        <p className="text-blue-100 text-xs mb-4">Adjust the range to find accounts within your preferred radius.</p>
                        
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <input 
                              type="range" 
                              min="1" 
                              max="201" 
                              value={nearbyRange} 
                              onChange={(e) => setNearbyRange(parseInt(e.target.value))}
                              className="w-full h-2 bg-blue-400 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                            <div className="flex justify-between text-[10px] text-blue-200 font-bold uppercase">
                              <span>1 km</span>
                              <span>100 km</span>
                              <span>Show All</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                                <Target className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">Nearby</p>
                                <p className="text-lg font-bold">{nearbyCustomers.length} Customers</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-crm-card-light dark:bg-crm-card-dark rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden h-[400px]">
                        <Map 
                          userLocation={userLocation} 
                          pinnedLocation={pinnedLocation}
                          onPinLocation={async (loc) => {
                            setPinnedLocation(loc);
                            setSearchMode('pinned');
                            const addr = await crmService.reverseGeocode(loc.lat, loc.lng);
                            if (addr) setPinnedAddress(addr);
                          }}
                          accounts={accounts} 
                          prospects={prospects}
                          onEditAccount={(account) => {
                            setAccountToEdit(account);
                            setIsAccountModalOpen(true);
                          }}
                          isLoaded={isLoaded} 
                          theme={theme}
                          nearbyTypeFilter={nearbyTypeFilter}
                          nearbyIndustryFilter={nearbyIndustryFilter}
                        />
                      </div>

                      <div className="bg-crm-card-light dark:bg-crm-card-dark rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden" id="nearby-accounts">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col lg:flex-row justify-between items-center gap-4">
                          <div className="flex flex-col gap-1 w-full lg:w-auto">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Nearby Customers & Prospects</h3>
                            <div className="flex items-center gap-2 flex-1 max-w-md relative">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input 
                                type="text"
                                placeholder="Search by name, industry or city..."
                                value={nearbySearchQuery}
                                onChange={(e) => setNearbySearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
                              {(['All', 'Accounts', 'Prospects', 'External'] as const).map(type => (
                                <button
                                  key={type}
                                  onClick={() => setNearbyTypeFilter(type)}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    nearbyTypeFilter === type 
                                      ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' 
                                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                  }`}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                            <select
                              value={nearbyIndustryFilter}
                              onChange={(e) => setNearbyIndustryFilter(e.target.value)}
                              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                            >
                              <option value="All">All Industries</option>
                              {availableIndustries.map(industry => (
                                <option key={industry} value={industry}>{industry}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                            <button
                              onClick={handleRefreshNearby}
                              disabled={isFetchingNearby}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingNearby ? 'animate-spin' : ''}`} />
                              Refresh External Data
                            </button>
                        </div>
                      </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                          {(() => {
                            const filtered = nearbyCustomers.filter(item => {
                              const name = item.type === 'account' ? (item as Account).name : item.type === 'prospect' ? (item as MarketInsight).projectName : (item as any).name;
                              const industry = item.type === 'account' ? (item as Account).industry : item.type === 'prospect' ? (item as MarketInsight).category : (item as any).industry;
                              const city = item.type === 'account' ? (item as Account).address.city : item.type === 'prospect' ? (item as MarketInsight).location : (item as any).address;
                              
                              const matchesSearch = name.toLowerCase().includes(nearbySearchQuery.toLowerCase()) ||
                                     (industry?.toLowerCase().includes(nearbySearchQuery.toLowerCase())) ||
                                     (city?.toLowerCase().includes(nearbySearchQuery.toLowerCase()));
                              
                              const matchesIndustry = nearbyIndustryFilter === 'All' || industry === nearbyIndustryFilter;
                              
                              return matchesSearch && matchesIndustry;
                            });
                            
                            if (filtered.length > 0) {
                              return filtered.map(item => {
                                const referenceLoc = searchMode === 'current' ? userLocation : pinnedLocation;
                                const distance = referenceLoc ? getDistance(referenceLoc, { lat: item.lat!, lng: item.lng! }) : 0;
                                const isAccount = item.type === 'account';
                                const isProspect = item.type === 'prospect';
                                const isExternal = item.type === 'external';
                                
                                const name = isAccount ? (item as Account).name : isProspect ? (item as MarketInsight).projectName : (item as any).name;
                                const industry = isAccount ? (item as Account).industry : isProspect ? (item as MarketInsight).category : (item as any).industry;
                                const location = isAccount ? `${(item as Account).address.street}, ${(item as Account).address.city}` : isProspect ? (item as MarketInsight).location : (item as any).address;
                                const city = isAccount ? (item as Account).address.city : (item as MarketInsight).location;
                                
                                return (
                                  <div 
                                    key={item.id} 
                                    onClick={async () => {
                                      if (item.lat && item.lng) {
                                        setPinnedLocation({ lat: item.lat, lng: item.lng });
                                        setSearchMode('pinned');
                                        const addr = await crmService.reverseGeocode(item.lat, item.lng);
                                        if (addr) setPinnedAddress(addr);
                                        // Scroll map into view on mobile
                                        if (window.innerWidth < 1024) {
                                          document.querySelector('.lg\\:col-span-2')?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                      }
                                    }}
                                    className="p-3 md:p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 border ${
                                          isAccount 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/50' 
                                            : isProspect
                                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'
                                              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50'
                                        }`}>
                                          {name.charAt(0)}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h4 className={`font-bold transition-colors text-[13px] md:text-sm ${
                                              isAccount ? 'text-slate-900 dark:text-white group-hover:text-blue-600' : isProspect ? 'text-slate-900 dark:text-white group-hover:text-emerald-600' : 'text-slate-900 dark:text-white group-hover:text-amber-600'
                                            }`}>{name}</h4>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                              isAccount ? 'bg-blue-100 text-blue-600' : isProspect ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                              {isAccount ? 'Account' : isProspect ? 'Prospect' : 'Nearby Customer'}
                                            </span>
                                          </div>
                                          <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {city || location}
                                          </p>
                                          <div className="mt-2 flex flex-wrap gap-1.5">
                                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                              {industry}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                                              isAccount 
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/50' 
                                                : isProspect
                                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'
                                                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50'
                                            }`}>
                                              <Navigation className="w-2 h-2" />
                                              {distance.toFixed(2)} km away
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        {(item as any).lat && (item as any).lng && (
                                          <>
                                            <a 
                                              href={`https://www.google.com/maps/dir/?api=1&destination=${(item as any).lat},${(item as any).lng}`}
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                              title="Google Maps Directions"
                                            >
                                              <Navigation className="w-4 h-4" />
                                            </a>
                                            <a 
                                              href={`https://waze.com/ul?ll=${(item as any).lat},${(item as any).lng}&navigate=yes`}
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                              title="Waze Directions"
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                          </>
                                        )}
                                        {isExternal && (
                                          <button
                                            onClick={() => handleConvertExternalToLead(item)}
                                            className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                                            title="Convert to Lead"
                                          >
                                            <GitMerge className="w-4 h-4" />
                                          </button>
                                        )}
                                        {isProspect && (
                                          <button
                                            onClick={() => handleConvertInsightToLead(item as MarketInsight)}
                                            className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                            title="Convert to Lead"
                                          >
                                            <GitMerge className="w-4 h-4" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            setInitialVisitTarget({
                                              id: item.id,
                                              type: isAccount ? 'account' : isProspect ? 'prospect' : 'external',
                                              name: name
                                            });
                                            setIsVisitModalOpen(true);
                                          }}
                                          className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                          title="Schedule Visit"
                                        >
                                          <Calendar className="w-4 h-4" />
                                        </button>
                                        <a
                                          href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                          title="Open in Google Maps"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                        {isAccount && (
                                          <button 
                                            onClick={() => {
                                              setAccountToEdit(item as Account);
                                              setIsAccountModalOpen(true);
                                            }}
                                            className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                            title="Edit Account"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                        )}
                                        {isAccount && (
                                          <button 
                                            onClick={() => {
                                              setSelectedAccountForDetail(item as Account);
                                              setIsAccountDetailModalOpen(true);
                                            }}
                                            className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm"
                                            title="Manage Contacts"
                                          >
                                            <Users className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            }
                            
                            return (
                              <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">No accounts found</h4>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto font-medium">
                                  {nearbySearchQuery ? `No accounts matching "${nearbySearchQuery}" within range.` : `We couldn't find any accounts within a ${nearbyRange}km radius.`}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'calendar' && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 pt-[25px]"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight dark:text-white">Calendar & Planning</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your visits and follow-ups.</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          setSelectedVisit(null);
                          setInitialVisitTarget(undefined);
                          setIsVisitModalOpen(true);
                        }}
                        className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 dark:shadow-none hover:bg-orange-700 transition-all active:scale-95"
                      >
                        <Plus className="w-5 h-5" />
                        Schedule Visit
                      </button>
                      <button 
                        onClick={() => setIsReminderModalOpen(true)}
                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                      >
                        <Plus className="w-5 h-5" />
                        Add Reminder
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
                    <button
                      onClick={() => setCalendarSubTab('reminders')}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        calendarSubTab === 'reminders' 
                          ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Reminders
                    </button>
                    <button
                      onClick={() => setCalendarSubTab('visits')}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        calendarSubTab === 'visits' 
                          ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Visit Summary
                    </button>
                  </div>

                  {calendarSubTab === 'reminders' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-2 space-y-8">
                        <div className="bg-crm-card-light dark:bg-crm-card-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                            <Calendar className="w-5 h-5 text-orange-600" />
                            Active Reminders
                          </h3>
                          <div className="space-y-4">
                            {reminders.filter(r => !r.completed).length > 0 ? (
                              reminders.filter(r => !r.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(reminder => (
                                <div key={reminder.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all group">
                                  <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                      <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                                        <Bell className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">{reminder.title}</h4>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                          <span className="flex items-center gap-1 font-medium">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(reminder.date).toLocaleDateString()}
                                          </span>
                                          <span className="flex items-center gap-1 font-medium">
                                            <Clock className="w-3 h-3" />
                                            {reminder.time}
                                          </span>
                                        </div>
                                        {reminder.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-medium">{reminder.notes}</p>}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={async () => {
                                          try {
                                            await crmService.updateReminder(reminder.id, { completed: true });
                                          } catch (error) {
                                            console.error('Error updating reminder:', error);
                                          }
                                        }}
                                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                                        title="Mark as Cleared"
                                      >
                                        <CheckCircle2 className="w-5 h-5" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          confirmAction(
                                            'Delete Reminder',
                                            `Are you sure you want to delete "${reminder.title}"?`,
                                            async () => {
                                              try {
                                                await crmService.deleteReminder(reminder.id);
                                                addToast('Reminder deleted', 'success', async () => {
                                                  await crmService.addReminder(reminder);
                                                  addToast('Reminder restored', 'success');
                                                });
                                              } catch (error) {
                                                addToast('Failed to delete reminder', 'error');
                                              }
                                            }
                                          );
                                        }}
                                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">No active reminders</h4>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">You're all caught up! Add a new reminder to get started.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <History className="w-5 h-5 text-slate-500" />
                            Cleared History
                          </h3>
                          <div className="space-y-4">
                            {reminders.filter(r => r.completed).length > 0 ? (
                              reminders.filter(r => r.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(reminder => (
                                <div key={reminder.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 opacity-75">
                                  <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-6 h-6 text-slate-400" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-slate-400 line-through decoration-slate-400">{reminder.title}</h4>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400 font-medium">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(reminder.date).toLocaleDateString()}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {reminder.time}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={async () => {
                                          try {
                                            await crmService.updateReminder(reminder.id, { completed: false });
                                          } catch (error) {
                                            console.error('Error restoring reminder:', error);
                                          }
                                        }}
                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                        title="Restore to Active"
                                      >
                                        <RefreshCw className="w-5 h-5" />
                                      </button>
                                      <button 
                                        onClick={async () => {
                                          try {
                                            await crmService.deleteReminder(reminder.id);
                                          } catch (error) {
                                            console.error('Error deleting reminder:', error);
                                          }
                                        }}
                                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                                        title="Delete Permanently"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-slate-400 dark:text-slate-600 italic font-medium">
                                No history yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                              <Target className="w-6 h-6" />
                            </div>
                            Planned Visits Summary
                          </h3>
                          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                              onClick={() => setVisitViewMode('calendar')}
                              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                visitViewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              Calendar
                            </button>
                            <button
                              onClick={() => setVisitViewMode('list')}
                              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                visitViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              List
                            </button>
                          </div>
                        </div>

                        {visitViewMode === 'calendar' ? (
                          <OutlookCalendar 
                            visits={visits} 
                            onEditVisit={(v) => {
                              setSelectedVisit(v);
                              setIsVisitModalOpen(true);
                            }} 
                            onDeleteVisit={(visit) => {
                              confirmAction(
                                'Delete Visit',
                                `Are you sure you want to delete the visit to ${visit.targetName}?`,
                                async () => {
                                  try {
                                    await crmService.deleteVisit(visit.id);
                                    addToast('Visit deleted', 'success', async () => {
                                      await crmService.createVisit(visit);
                                      addToast('Visit restored', 'success');
                                    });
                                  } catch (error) {
                                    addToast('Failed to delete visit', 'error');
                                  }
                                }
                              );
                            }}
                          />
                        ) : (
                          <div className="space-y-6">
                          {(() => {
                            const groupedVisits = visits.reduce((acc, visit) => {
                              const date = visit.date;
                              if (!acc[date]) acc[date] = [];
                              acc[date].push(visit);
                              return acc;
                            }, {} as Record<string, Visit[]>);

                            const sortedDates = Object.keys(groupedVisits).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                            if (sortedDates.length === 0) {
                              return (
                                <div className="p-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                                  <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">No visits planned</h4>
                                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Schedule your first customer visit to see it here.</p>
                                </div>
                              );
                            }

                            return sortedDates.map(date => (
                              <div key={date} className="space-y-4">
                                <div className="flex items-center gap-4">
                                  <div className="px-4 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-xs font-black uppercase tracking-widest border border-orange-100 dark:border-orange-800">
                                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                  </div>
                                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {groupedVisits[date].sort((a, b) => a.time.localeCompare(b.time)).map(visit => (
                                    <div key={visit.id} className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all group">
                                      <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                            visit.status === 'Visited' ? 'bg-emerald-500 text-white' :
                                            visit.status === 'Postponed' ? 'bg-amber-500 text-white' :
                                            visit.status === 'Cancelled' ? 'bg-rose-500 text-white' :
                                            'bg-blue-500 text-white'
                                          }`}>
                                            {visit.time}
                                          </div>
                                          <div>
                                            <h4 className="font-black text-slate-900 dark:text-white tracking-tight">{visit.targetName}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{visit.targetType}</p>
                                          </div>
                                        </div>
                                        <div className="flex gap-1">
                                          <button 
                                            onClick={() => {
                                              setSelectedVisit(visit);
                                              setIsVisitModalOpen(true);
                                            }}
                                            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => {
                                              confirmAction(
                                                'Delete Visit',
                                                `Are you sure you want to delete the visit to ${visit.targetName}?`,
                                                async () => {
                                                  try {
                                                    await crmService.deleteVisit(visit.id);
                                                    addToast('Visit deleted', 'success', async () => {
                                                      await crmService.createVisit(visit);
                                                      addToast('Visit restored', 'success');
                                                    });
                                                  } catch (error) {
                                                    addToast('Failed to delete visit', 'error');
                                                  }
                                                }
                                              );
                                            }}
                                            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit ${
                                          visit.status === 'Visited' ? 'bg-emerald-100 text-emerald-600' :
                                          visit.status === 'Postponed' ? 'bg-amber-100 text-amber-600' :
                                          visit.status === 'Cancelled' ? 'bg-rose-100 text-rose-600' :
                                          'bg-blue-100 text-blue-600'
                                        }`}>
                                          {visit.status}
                                        </div>
                                        
                                        {visit.notes && (
                                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2">
                                            {visit.notes}
                                          </p>
                                        )}

                                        {visit.status === 'Visited' && visit.meetingNotes && (
                                          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30">
                                            <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Meeting Notes</p>
                                            <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 line-clamp-3">{visit.meetingNotes}</p>
                                          </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                          {visit.status === 'Planned' && (
                                            <>
                                              <button
                                                onClick={() => crmService.updateVisit(visit.id, { status: 'Visited' })}
                                                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                                              >
                                                Mark Visited
                                              </button>
                                              <button
                                                onClick={() => crmService.updateVisit(visit.id, { status: 'Postponed' })}
                                                className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all"
                                              >
                                                Postpone
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'notes' && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 pt-[25px]"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight dark:text-white">Meeting Notes</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Record and manage your customer interactions.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setNoteToEdit(null);
                        setIsNoteModalOpen(true);
                      }}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      New Note
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.length > 0 ? (
                      notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(note => {
                        const account = accounts.find(a => a.id === note.accountId);
                        const contact = contacts.find(c => c.id === note.contactId);
                        const lead = leads.find(l => l.id === note.leadId);

                        return (
                          <div key={note.id} className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                  <StickyNote className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-[13px] md:text-sm text-slate-900 dark:text-white line-clamp-1 uppercase tracking-tight">{note.title}</h4>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                    {new Date(note.date || note.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setNoteToEdit(note);
                                    setIsNoteModalOpen(true);
                                  }}
                                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    confirmAction(
                                      'Delete Note',
                                      `Are you sure you want to delete "${note.title}"?`,
                                      async () => {
                                        try {
                                          await crmService.deleteNote(note.id);
                                          addToast('Note deleted', 'success', async () => {
                                            await crmService.addNote(note);
                                            addToast('Note restored', 'success');
                                          });
                                        } catch (error) {
                                          addToast('Failed to delete note', 'error');
                                        }
                                      }
                                    );
                                  }}
                                  className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 min-h-[3rem] font-medium leading-relaxed">
                              {note.content || (note.scribbleData ? "Scribble note available" : "No content")}
                            </p>

                            <div className="space-y-2 pt-4 border-t border-slate-50 dark:border-slate-800">
                              {(account || contact || lead) && (
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  <Users className="w-3 h-3" />
                                  <span className="truncate">
                                    {account?.name || lead?.firstName + ' ' + lead?.lastName || contact?.firstName + ' ' + contact?.lastName}
                                  </span>
                                </div>
                              )}
                              {note.location && (
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{note.location}</span>
                                </div>
                              )}
                              {note.reminderId && (
                                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold">
                                  <Bell className="w-3 h-3" />
                                  <span>Reminder Set</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <StickyNote className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">No meeting notes yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto font-medium">
                          Start recording your customer visits and meetings to keep track of important details.
                        </p>
                        <button 
                          onClick={() => setIsNoteModalOpen(true)}
                          className="mt-6 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                          Create your first note
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'help' && (
                <motion.div
                  key="help"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-4xl mx-auto space-y-8"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight dark:text-white uppercase tracking-tight">Help & User Guide</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Learn how to make the most of Sales Perks CRM.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-crm-card-light dark:bg-crm-card-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                        <Zap className="w-5 h-5 text-indigo-600" />
                        Quick Start Guide
                      </h3>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-bold">1</span>
                          <span>Complete your profile in the onboarding window to set up your organization details.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-bold">2</span>
                          <span>Go to <strong>Accounts</strong> to add your client companies. Use the map search for precise location.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-bold">3</span>
                          <span>Add <strong>Contacts</strong> and link them to your accounts.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-bold">4</span>
                          <span>Track <strong>Leads</strong> and convert them into accounts and contacts when they close.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                        <Navigation className="w-5 h-5 text-indigo-600" />
                        Nearby Customers Features
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        The <strong>Nearby Customers</strong> tab uses your device's GPS to find accounts near you. This is perfect for field sales reps planning their daily visits.
                      </p>
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                        <p className="text-xs font-bold text-indigo-600 mb-1 uppercase tracking-wider">Pro Tip</p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Enable "Sync Location" in Settings to keep your position updated in real-time.</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                        <Database className="w-5 h-5 text-indigo-600" />
                        Data Management & Export
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">Bulk Import</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Use the Import tool in Settings to upload large datasets from Excel.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">Excel Export</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Export any list (Leads, Contacts, Accounts) to Excel for offline reporting.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">Offline Support</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sales Perks CRM works offline. Changes will sync automatically when you're back online.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'admin' && isAdmin && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold tracking-tight dark:text-white uppercase tracking-tight">Admin Dashboard</h2>
                    <div className="flex gap-2">
                       <button onClick={loadData} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                         <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                       </button>
                    </div>
                  </div>

                  {systemStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                      {[
                        { label: 'Total Users', value: systemStats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Active', value: allUsers.filter(u => u.status !== 'inactive').length, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: 'Inactive', value: allUsers.filter(u => u.status === 'inactive').length, icon: X, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                        { label: 'Total Accounts', value: systemStats.totalAccounts, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                        { label: 'Total Leads', value: systemStats.totalLeads, icon: Target, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                        { label: 'Total Contacts', value: systemStats.totalContacts, icon: User, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' }
                      ].map((stat, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                              <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
                              <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight mb-4">
                        <Zap className="w-5 h-5 text-blue-600" />
                        System Controls
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <button 
                          onClick={() => {
                            addToast('Refreshing system data...', 'info');
                            loadData();
                          }}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-blue-600 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Synchronize System Data</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>

                        <button 
                          onClick={() => {
                            fetchSystemActivities();
                            setIsAuditLogOpen(true);
                          }}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <History className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">View System Audit logs</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight mb-4">
                        <Settings className="w-5 h-5 text-blue-600" />
                        Admin Quick Links
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <button 
                          onClick={() => setIsInviteModalOpen(true)}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <UserPlus className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Invite New Team Member</span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group pointer-events-none opacity-50">
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-rose-600" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Role Permissions (Coming Soon)</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] border border-slate-100 dark:border-slate-800/50 shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold dark:text-white">User Management</h3>
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                        {allUsers.length} Users Registered
                      </span>
                    </div>
                    <div className="">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-[155px] md:top-[88px] z-10 bg-slate-50 dark:bg-slate-900 shadow-sm">
                          <tr className="bg-slate-50 dark:bg-slate-900/50">
                            <th className="px-2 py-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                            <th className="px-2 py-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Organization</th>
                            <th className="px-2 py-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Designation</th>
                            <th className="px-2 py-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                            <th className="px-2 py-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account</th>
                            <th className="px-2 py-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-2 py-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                            <th className="px-2 py-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {allUsers.map((u) => (
                            <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                    {u.firstName[0]}{u.lastName[0]}
                                  </div>
                                  <div>
                                    <p className="text-[11px] md:text-xs font-bold text-slate-900 dark:text-white">{u.salutation} {u.firstName} {u.lastName}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 font-medium">{u.organizationName}</p>
                              </td>
                              <td className="px-2 py-2">
                                <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 font-medium">{u.designation}</p>
                              </td>
                              <td className="px-2 py-2">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  u.email === 'udeen3197@gmail.com' 
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                }`}>
                                  {u.role || 'user'}
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  u.accountType === 'pro'
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {u.accountType || 'classic'}
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  u.status === 'inactive'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {u.status || 'active'}
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  {new Date(u.createdAt).toLocaleDateString()}
                                </p>
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  {u.email !== 'udeen3197@gmail.com' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedUserForEdit(u);
                                          setIsUserEditModalOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-all"
                                        title="Edit User"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleResetPassword(u.email)}
                                        className="p-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400 transition-all"
                                        title="Reset Password"
                                      >
                                        <Lock className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleUserStatusToggle(u.uid, u.status, u.email)}
                                        className={`p-1.5 rounded-lg transition-all ${
                                          u.status === 'inactive' 
                                            ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                                            : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                                        }`}
                                        title={u.status === 'inactive' ? 'Activate Account' : 'Deactivate Account'}
                                      >
                                        {u.status === 'inactive' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(u.uid, `${u.firstName} ${u.lastName}`)}
                                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400 transition-all"
                                        title="Delete User"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  {u.email === 'udeen3197@gmail.com' && (
                                    <span className="text-[10px] font-bold text-slate-400 px-2 uppercase italic">Primary Admin</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-5xl mx-auto space-y-8 pt-[25px]"
                >
                  <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                          <Settings className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <div>
                          <h2 className="text-2xl md:text-3xl font-bold tracking-tight dark:text-white uppercase tracking-tight">Settings</h2>
                          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your account preferences and system configuration.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
                      <button
                        onClick={() => setSettingsTab('profile')}
                        className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all ${settingsTab === 'profile' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Profile & Preferences
                      </button>
                      <button
                        onClick={() => setSettingsTab('security')}
                        className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all flex items-center gap-1.5 ${settingsTab === 'security' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        API Keys & Security
                      </button>
                      <button
                        onClick={() => setSettingsTab('customize')}
                        className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all ${settingsTab === 'customize' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Customize Modules
                      </button>
                    </div>
                  </div>

                  {settingsTab === 'profile' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* User Profile Details */}
                    <div className="bg-crm-card-light dark:bg-crm-card-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm md:col-span-2">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                          <User className="w-5 h-5 text-blue-600" />
                          User Profile
                        </h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsProfileModalOpen(true)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-blue-600 dark:text-blue-400 transition-all"
                            title="Edit Profile"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {userProfile ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Full Name</p>
                            <p className="font-bold text-slate-900 dark:text-white text-xs md:text-sm">{userProfile.salutation} {userProfile.firstName} {userProfile.lastName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Email Address</p>
                            <p className="font-bold text-slate-900 dark:text-white text-xs md:text-sm">{userProfile.email}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Phone Number</p>
                            <p className="font-bold text-slate-900 dark:text-white text-xs md:text-sm">{userProfile.phone || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Organization</p>
                            <p className="font-bold text-slate-900 dark:text-white text-xs md:text-sm">{userProfile.organizationName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Designation</p>
                            <p className="font-bold text-slate-900 dark:text-white text-xs md:text-sm">{userProfile.designation}</p>
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">About</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{userProfile.about || 'No description provided.'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-10 text-center text-slate-500 dark:text-slate-400 font-medium">
                          Loading profile details...
                        </div>
                      )}
                    </div>

                    {/* Help & User Guide */}
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Zap className="w-32 h-32" />
                      </div>
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Help & User Guide
                      </h3>
                      <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                        Need help navigating Sales Perks CRM? Our comprehensive guide covers everything from lead management to nearby customers tracking.
                      </p>
                      <button 
                        onClick={() => setIsHelpOpen(true)}
                        className="w-full py-3 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        Open Help Guide
                      </button>
                    </div>

                    {/* System Preferences */}
                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                        <Zap className="w-5 h-5 text-blue-600" />
                        System Preferences
                      </h3>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Sync Location</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Automatically update location from system</p>
                          </div>
                          <button 
                            onClick={() => setSyncLocation(!syncLocation)}
                            className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-300 ${syncLocation ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${syncLocation ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Sync Date & Time</p>
                            <p className="text-[11px] text-slate-500">Synchronize with system clock</p>
                          </div>
                          <button 
                            onClick={() => setSyncDateTime(!syncDateTime)}
                            className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-300 ${syncDateTime ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${syncDateTime ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Current Version</p>
                                <p className="text-base font-black text-slate-900 dark:text-white">v{APP_VERSION}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setIsUpdateModalOpen(true)}
                              className="px-3 py-1.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-xl border border-blue-100 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all"
                            >
                              View Changelog
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Storage Usage */}
                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                        <Database className="w-5 h-5 text-blue-600" />
                        Storage Usage
                      </h3>
                      <div className="space-y-6">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                              {((storageStats?.usedBytes || 0) / (1024 * 1024 * 1024)).toFixed(4)} GB
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">of {((storageStats?.totalBytes || 0) / (1024 * 1024 * 1024)).toFixed(1)} GB used</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{((storageStats?.usedBytes || 0) / (storageStats?.totalBytes || 1) * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((storageStats?.usedBytes || 0) / (storageStats?.totalBytes || 1) * 100)}%` }}
                            className="h-full bg-blue-600 rounded-full"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Documents</p>
                            <p className="text-base font-bold text-slate-900 dark:text-white">{storageStats?.documentCount || 0}</p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
                            <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Healthy
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={handleExportAll}
                          disabled={isExportingAll}
                          className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-900/30 text-sm"
                        >
                          {isExportingAll ? (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                          {isExportingAll ? 'Exporting...' : 'Export All Data (Full Backup)'}
                        </button>
                      </div>
                    </div>

                    {/* Account Verification */}
                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm md:col-span-2">
                      <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Account Verification
                      </h3>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${auth.currentUser?.emailVerified ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'}`}>
                            {auth.currentUser?.emailVerified ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {auth.currentUser?.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{auth.currentUser?.email}</p>
                          </div>
                        </div>
                        {!auth.currentUser?.emailVerified && (
                          <button 
                            onClick={async () => {
                              try {
                                // Simulated verification email send
                                setSuccess("Verification email sent to " + auth.currentUser?.email);
                                setTimeout(() => setSuccess(null), 5000);
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 text-sm"
                          >
                            Resend Verification Email
                          </button>
                        )}
                      </div>
                    </div>

                    {/* App Updates */}
                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm md:col-span-2">
                      <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                        <RefreshCw className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                        App Updates
                      </h3>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Check for Updates</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current version: v{APP_VERSION}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                          {updateStatus !== 'idle' && (
                            <div className="w-full md:w-64 space-y-2">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <span>
                                  {updateStatus === 'checking' ? 'Checking for updates...' : 
                                   updateStatus === 'downloading' ? 'Downloading update...' : 
                                   updateStatus === 'installing' ? 'Installing update...' : 
                                   'Update Complete!'}
                                </span>
                                {updateStatus === 'downloading' && <span>{updateProgress}%</span>}
                              </div>
                              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${updateStatus === 'downloading' ? updateProgress : updateStatus === 'installing' || updateStatus === 'complete' ? 100 : 0}%` }}
                                  className={`h-full rounded-full ${updateStatus === 'complete' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                />
                              </div>
                              {updateStatus === 'complete' && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase text-center">Application is now up to date</p>
                              )}
                            </div>
                          )}
                          <button 
                            onClick={handleCheckUpdate}
                            disabled={isCheckingUpdate}
                            className={`w-full md:w-auto px-6 py-2 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm ${updateStatus === 'complete' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 dark:shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 dark:shadow-none'}`}
                          >
                            {isCheckingUpdate ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : updateStatus === 'complete' ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <RefreshCw className="w-5 h-5" />
                            )}
                            {isCheckingUpdate ? 'Checking...' : updateStatus === 'complete' ? 'Update Complete' : 'Check for Updates'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Data Management */}
                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm md:col-span-2">
                      <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                        <Database className="w-5 h-5 text-blue-600" />
                        Data Management
                      </h3>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Import Data</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bulk import contacts and accounts from Excel or CSV files.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsImportModalOpen(true)}
                          className="bg-blue-600 text-white px-6 py-2 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 dark:shadow-none flex items-center gap-2 text-sm"
                        >
                          <Upload className="w-5 h-5" />
                          Import Now
                        </button>
                      </div>
                    </div>

                    </div>
                  ) : settingsTab === 'security' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* API Configuration */}
                      <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm md:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                            <Key className="w-5 h-5 text-blue-600" />
                            API Keys & AI Configuration
                          </h3>
                          <span className="text-xs text-slate-500 font-medium">Used for Market Insights & AI Search</span>
                        </div>
                        
                        {/* Account Version Display */}
                        <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 shadow-sm">
                              <CreditCard className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                  {userProfile?.accountType === 'pro' ? 'Pro Version' : 'Classic Version'}
                                </p>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${userProfile?.accountType === 'pro' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                  Active
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                {userProfile?.accountType === 'pro' 
                                  ? 'You have full access to all AI insights, prospects, and map features.' 
                                  : 'Standard access. AI Market Insights and Nearby Customers are disabled.'}
                              </p>
                            </div>
                          </div>
                          
                          {userProfile?.accountType !== 'pro' && (
                            <button 
                              onClick={() => {
                                const subject = encodeURIComponent('Request for CRM Pro Version Upgrade');
                                const body = encodeURIComponent(`Hi Admin,\n\nI would like to request an upgrade to the Pro Version for my account (${user?.email}).\n\nPlease let me know the process.\n\nBest regards,\n${userProfile?.firstName} ${userProfile?.lastName}`);
                                window.location.href = `mailto:udeen3197@gmail.com?subject=${subject}&body=${body}`;
                                addToast('Opening email to admin...', 'info');
                              }}
                              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Request Pro Upgrade
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Sparkles className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Gemini AI</p>
                                    <p className="font-bold text-slate-900 dark:text-white">Market Insights & Prospects</p>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  directGeminiKey ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {directGeminiKey ? `Custom Key Active (${directGeminiKey.slice(0, 4)}...${directGeminiKey.slice(-4)})` : 'System Default Key'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                                Specify your Gemini API key below. This key is used directly to discover real-world UAE projects, tenders, verified contractor details, and phone numbers.
                              </p>

                              <div className="space-y-2 mb-4">
                                <div className="relative">
                                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input
                                    type={showDirectKey ? 'text' : 'password'}
                                    value={directGeminiKey}
                                    onChange={(e) => setDirectGeminiKey(e.target.value.trim())}
                                    placeholder="Paste your Gemini API Key here (AIzaSy...)"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowDirectKey(!showDirectKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    title={showDirectKey ? 'Hide key' : 'Show key'}
                                  >
                                    {showDirectKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>

                                <div className="flex items-center justify-between text-[10px]">
                                  <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                                  >
                                    Get key from Google AI Studio <ExternalLink className="w-3 h-3" />
                                  </a>
                                  {directKeyStatus && (
                                    <span className={`font-bold ${directKeyStatus.includes('✓') ? 'text-emerald-600 dark:text-emerald-400' : directKeyStatus.includes('✕') ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                      {directKeyStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                              <button
                                onClick={handleSaveDirectGeminiKey}
                                disabled={isSavingDirectKey}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                              >
                                {isSavingDirectKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Save & Load Real Insights
                              </button>
                              <button
                                onClick={handleTestGeminiKey}
                                disabled={isTestingKey}
                                className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
                                title="Test key validity with Google AI Studio"
                              >
                                {isTestingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                                Test Key
                              </button>
                              {directGeminiKey && (
                                <button
                                  onClick={handleClearDirectGeminiKey}
                                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-50 transition-all"
                                >
                                  Clear Key
                                </button>
                              )}
                              <button
                                onClick={handleForceRefreshLiveInsights}
                                disabled={isFetchingInsights || isFetchingProspects}
                                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all ml-auto flex items-center gap-1.5"
                                title="Force Live Web Search for UAE Projects"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${(isFetchingInsights || isFetchingProspects) ? 'animate-spin' : ''}`} />
                                Live Market Search
                              </button>
                            </div>
                          </div>

                          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Globe className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Google Maps</p>
                                <p className="font-bold text-slate-900 dark:text-white">Maps & Geocoding</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {userProfile?.googleMapsApiKey ? 'Using custom API key provided in profile.' : 'Using system default API key.'}
                              </p>
                              <button 
                                onClick={() => setIsProfileModalOpen(true)}
                                className="text-xs font-bold text-emerald-600 hover:underline"
                              >
                                {userProfile?.googleMapsApiKey ? 'Change Key' : 'Add Custom Key'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Security & App Lock */}
                      <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm md:col-span-2">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                          <Lock className="w-5 h-5 text-blue-600" />
                          Security & App Lock
                        </h3>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${userProfile?.securityPin ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">Security PIN</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                {userProfile?.securityPin ? 'App is protected by a 4-digit PIN.' : 'Add an extra layer of security to your app.'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {userProfile?.securityPin && (
                              <button 
                                onClick={() => handleSetPin(null)}
                                className="px-6 py-3 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"
                              >
                                Disable PIN
                              </button>
                            )}
                            <button 
                              onClick={() => setIsSettingPin(true)}
                              className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-500/20 dark:shadow-none"
                            >
                              {userProfile?.securityPin ? 'Change PIN' : 'Enable Security PIN'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Customize Modules / Fields */}
                      <div className="bg-crm-card-light dark:bg-crm-card-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                              <LayoutGrid className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold tracking-tight dark:text-white uppercase tracking-tight">Customize Modules / Fields</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage custom fields and categories for your CRM modules.</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-blue-600" />
                              Industry Categories
                            </h4>
                            
                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  placeholder="Add new industry..."
                                  className="flex-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white text-xs font-bold"
                                  value={newIndustry}
                                  onChange={e => setNewIndustry(e.target.value)}
                                  onKeyPress={e => e.key === 'Enter' && handleAddIndustry()}
                                />
                                <button 
                                  onClick={handleAddIndustry}
                                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-500/20 dark:shadow-none text-xs"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add
                                </button>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                                {availableIndustries.map(industry => (
                                  <div 
                                    key={industry}
                                    className="group flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
                                  >
                                    {industry}
                                    <button 
                                      onClick={() => handleDeleteIndustry(industry)}
                                      disabled={isDeletingIndustry === industry}
                                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                                    >
                                      {isDeletingIndustry === industry ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <X className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                                {availableIndustries.length === 0 && (
                                  <p className="text-xs text-slate-500 italic py-4 w-full text-center font-medium">No industries found.</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Tag className="w-4 h-4 text-blue-600" />
                              Lead Sources (Coming Soon)
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">Custom lead sources will be available in the next update.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Undo/Redo Toasts */}
      <AnimatePresence>
        {showUndoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]"
          >
            <div className="flex-1">
              <p className="text-sm font-bold">Item deleted successfully</p>
              <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">You can undo this action within 5 seconds</p>
            </div>
            <button
              onClick={handleRestoreItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all active:scale-95"
            >
              Undo
            </button>
            <button
              onClick={() => setShowUndoToast(false)}
              className="p-2 hover:bg-white/10 dark:hover:bg-black/10 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {showRedoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]"
          >
            <div className="flex-1">
              <p className="text-sm font-bold">Item restored successfully</p>
              <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">You can redo delete within 5 seconds</p>
            </div>
            <button
              onClick={handleRedoDelete}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all active:scale-95"
            >
              Redo Delete
            </button>
            <button
              onClick={() => setShowRedoToast(false)}
              className="p-2 hover:bg-white/10 dark:hover:bg-black/10 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-24 md:bottom-8 right-8 z-[90] w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-500/40 flex flex-col items-center justify-center hover:bg-blue-700 transition-all active:scale-95 border-4 border-white dark:border-slate-900 group"
          >
            <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-tighter leading-none">Top</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={loadData}
      />
      <LeadModal 
        isOpen={isLeadModalOpen}
        onClose={() => {
          setIsLeadModalOpen(false);
          setLeadToEdit(null);
          setLeadToConvertFromInsight(null);
          setLeadToConvertFromExternal(null);
        }}
        onSuccess={() => {
          setIsLeadModalOpen(false);
          setLeadToEdit(null);
          setLeadToConvertFromInsight(null);
          setLeadToConvertFromExternal(null);
          loadData();
        }}
        initialData={leadToEdit}
        convertFromInsight={leadToConvertFromInsight}
        convertFromExternal={leadToConvertFromExternal}
        onToast={addToast}
        isLoaded={isLoaded}
        userProfile={userProfile}
      />
      <ContactModal 
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setContactToEdit(null);
        }}
        onSuccess={loadData}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onToast={addToast}
        initialData={contactToEdit}
      />
      <AccountModal 
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountToEdit(null);
        }}
        onSuccess={async (account) => {
          await loadData();
          setPinnedLocation({ lat: account.lat, lng: account.lng });
          const addr = await crmService.reverseGeocode(account.lat, account.lng);
          if (addr) setPinnedAddress(addr);
        }}
        onToast={addToast}
        initialData={accountToEdit}
        onViewContacts={(account) => {
          setSelectedAccountForDetail(account);
          setIsAccountDetailModalOpen(true);
        }}
        onShowOnMap={(location) => {
          setIsAccountModalOpen(false);
          setPinnedLocation(location);
          setActiveTab('map');
        }}
        isLoaded={isLoaded}
        userProfile={userProfile}
      />
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setNoteToEdit(null);
        }}
        onSave={() => {
          setIsNoteModalOpen(false);
          setNoteToEdit(null);
          loadData();
        }}
        note={noteToEdit}
        accounts={accounts}
        contacts={contacts}
        leads={leads}
        userLocation={userLocation}
        currentAddress={currentAddress}
        isLoaded={isLoaded}
        onToast={addToast}
      />
      {mergeType === 'accounts' ? (
        <MergeAccountModal
          isOpen={isMergeModalOpen}
          onClose={() => {
            setIsMergeModalOpen(false);
            setItemsToMerge([]);
          }}
          onMerge={handleMerge}
          accounts={accounts}
          contacts={contacts}
          selectedAccountIds={selectedAccounts}
        />
      ) : (
        <MergeModal 
          isOpen={isMergeModalOpen}
          onClose={() => {
            setIsMergeModalOpen(false);
            setItemsToMerge([]);
          }}
          onMerge={handleMerge}
          title={`Merge ${mergeType.charAt(0).toUpperCase() + mergeType.slice(1)}`}
          items={
            itemsToMerge.length > 0
              ? itemsToMerge
              : mergeType === 'leads' 
              ? leads.map(l => ({ id: l.id, name: `${l.firstName} ${l.lastName} (${l.accountName})` }))
              : mergeType === 'contacts'
              ? contacts.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))
              : accounts.map(a => ({ id: a.id, name: a.name }))
          }
          fields={
            mergeType === 'leads'
              ? [
                  { key: 'firstName', label: 'First Name' },
                  { key: 'lastName', label: 'Last Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'accountName', label: 'Company' },
                  { key: 'designation', label: 'Designation' }
                ]
              : mergeType === 'contacts'
              ? [
                  { key: 'firstName', label: 'First Name' },
                  { key: 'lastName', label: 'Last Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'designation', label: 'Designation' }
                ]
              : undefined
          }
        />
      )}
      {leadToConvert && (
        <ConvertLeadModal 
          isOpen={isConvertModalOpen}
          onClose={() => {
            setIsConvertModalOpen(false);
            setLeadToConvert(null);
          }}
          onSuccess={() => {}}
          onToast={addToast}
          lead={leadToConvert}
        />
      )}
      <ReminderModal 
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSuccess={() => {}}
        onToast={addToast}
      />
      <LeadDetailModal 
        isOpen={isLeadDetailModalOpen}
        onClose={() => setIsLeadDetailModalOpen(false)}
        lead={selectedLeadForDetail}
        onEdit={(lead) => {
          setIsLeadDetailModalOpen(false);
          setLeadToEdit(lead);
          setIsLeadModalOpen(true);
        }}
      />
      <AccountDetailModal
        isOpen={isAccountDetailModalOpen}
        onClose={() => {
          setIsAccountDetailModalOpen(false);
          setSelectedAccountForDetail(null);
        }}
        account={selectedAccountForDetail}
        contacts={contacts}
        onEditAccount={(account) => {
          setAccountToEdit(account);
          setIsAccountModalOpen(true);
        }}
        onEditContact={(contact) => {
          setContactToEdit(contact);
          setIsContactModalOpen(true);
        }}
        onAddContact={(accountId) => {
          setContactToEdit({ 
            accountId,
            salutation: 'Mr.',
            firstName: '',
            lastName: '',
            designation: '',
            department: 'Others',
            email: '',
            phone: ''
          } as Contact);
          setIsContactModalOpen(true);
        }}
        onDeleteContact={async (id) => {
          if (confirm('Are you sure you want to delete this contact?')) {
            try {
              await crmService.deleteContact(id);
              addToast('Contact deleted successfully', 'success');
              loadData();
            } catch (error) {
              console.error('Error deleting contact:', error);
              addToast('Error deleting contact', 'error');
            }
          }
        }}
      />

      <ContactDetailModal
        isOpen={isContactDetailModalOpen}
        onClose={() => {
          setIsContactDetailModalOpen(false);
          setSelectedContactForDetail(null);
        }}
        contact={selectedContactForDetail}
        account={selectedContactForDetail ? accounts.find(a => a.id === selectedContactForDetail.accountId) || null : null}
        onEdit={(contact) => {
          setContactToEdit(contact);
          setIsContactModalOpen(true);
        }}
      />

      <VisitModal
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setSelectedVisit(null);
          setInitialVisitTarget(undefined);
        }}
        visit={selectedVisit}
        accounts={accounts}
        leads={leads}
        prospects={prospects}
        onSave={loadData}
        initialTarget={initialVisitTarget}
        onToast={addToast}
      />
      <HelpGuide 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
      <OnboardingGuide 
        isOpen={showOnboarding}
        step={onboardingStep}
        onNext={() => setOnboardingStep(prev => prev + 1)}
        onClose={() => setShowOnboarding(false)}
      />
      <ProfileSetupModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleProfileSave}
        initialEmail={user?.email || ''}
        initialData={userProfile}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
      
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
        type={confirmation.type}
      />

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-[60] w-12 h-12 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90 group"
            title="Back to Top"
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Security PIN Modal */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white mb-2">App Locked</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Please enter your security PIN to continue.</p>
              
              <div className="flex justify-center gap-4 mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                      pinInput.length > i 
                        ? 'bg-blue-600 border-blue-600 scale-110' 
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {pinError && <p className="text-red-500 text-sm font-bold mb-4">{pinError}</p>}

              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => pinInput.length < 4 && setPinInput(prev => prev + num)}
                    className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90 dark:text-white"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setPinInput('')}
                  className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90 text-red-600"
                >
                  Clear
                </button>
                <button
                  onClick={() => pinInput.length < 4 && setPinInput(prev => prev + '0')}
                  className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90 dark:text-white"
                >
                  0
                </button>
                <button
                  onClick={handleVerifyPin}
                  disabled={pinInput.length !== 4}
                  className="h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>

              <button 
                onClick={handleLogout}
                className="mt-8 text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors uppercase tracking-tight"
              >
                Switch Account / Logout
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Set PIN Modal */}
      <AnimatePresence>
        {isSettingPin && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white mb-2">Set Security PIN</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Enter a 4-digit PIN to secure your app.</p>
              
              <div className="flex justify-center gap-4 mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                      pinInput.length > i 
                        ? 'bg-blue-600 border-blue-600 scale-110' 
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => pinInput.length < 4 && setPinInput(prev => prev + num)}
                    className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90 dark:text-white"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setIsSettingPin(false);
                    setPinInput('');
                  }}
                  className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90 text-slate-500 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => pinInput.length < 4 && setPinInput(prev => prev + '0')}
                  className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90 dark:text-white"
                >
                  0
                </button>
                <button
                  onClick={() => handleSetPin(pinInput)}
                  disabled={pinInput.length !== 4}
                  className="h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100"
                >
                  <Check className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InsightDetailModal
        insight={selectedInsight}
        isOpen={isInsightModalOpen}
        onClose={() => {
          setIsInsightModalOpen(false);
          setSelectedInsight(null);
        }}
        onToggleFavorite={toggleFavorite}
        isFavorite={selectedInsight ? favoriteInsights.some(f => f.id === selectedInsight.id) : false}
        onConvertToLead={handleConvertInsightToLead}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />

      <NotificationBar 
        isOpen={isNotificationBarOpen}
        onClose={() => setIsNotificationBarOpen(false)}
        activities={activities}
        onRefresh={fetchActivities}
        onOpenDetail={(activity) => {
          setSelectedActivity(activity);
          setIsActivityDetailModalOpen(true);
        }}
      />

      <DuplicateDetailsModal
        isOpen={isDuplicateDetailsOpen}
        onClose={() => setIsDuplicateDetailsOpen(false)}
        duplicates={
          activeTab === 'accounts' ? Object.fromEntries(Object.entries(duplicateAccounts).filter(([_, items]) => !items.every(i => ignoredItemIds.includes(i.id)))) : 
          activeTab === 'contacts' ? Object.fromEntries(Object.entries(duplicateContacts).filter(([_, items]) => !items.every(i => ignoredItemIds.includes(i.id)))) : 
          Object.fromEntries(Object.entries(duplicateLeads).filter(([_, items]) => !items.every(i => ignoredItemIds.includes(i.id))))
        }
        type={activeTab as any}
        onMerge={(items) => {
          setMergeType(activeTab as any);
          setItemsToMerge(items);
          setIsMergeModalOpen(true);
        }}
        onEdit={(item) => {
          if (activeTab === 'accounts') {
            setAccountToEdit(item);
            setIsAccountModalOpen(true);
          } else if (activeTab === 'contacts') {
            setContactToEdit(item);
            setIsContactModalOpen(true);
          } else if (activeTab === 'leads') {
            setLeadToEdit(item);
            setIsLeadModalOpen(true);
          }
        }}
        onRefresh={fetchActivities}
        addToast={addToast}
        accounts={accounts}
      />

      <ActivityDetailModal
        isOpen={isActivityDetailModalOpen}
        onClose={() => setIsActivityDetailModalOpen(false)}
        activity={selectedActivity}
        onRefresh={fetchActivities}
      />

      <AdminUserModal
        isOpen={isUserEditModalOpen}
        user={selectedUserForEdit}
        onClose={() => {
          setIsUserEditModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        onToast={addToast}
      />

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onToast={addToast}
      />

      <SystemAuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        activities={allActivities}
        onRefresh={fetchSystemActivities}
        onToast={addToast}
      />
    </div>
  );
}
