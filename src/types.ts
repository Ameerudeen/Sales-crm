export type Department = 
  | 'Administration' 
  | 'Engineering' 
  | 'Finance' 
  | 'IT' 
  | 'Others' 
  | 'Owner/CEO' 
  | 'Purchase' 
  | 'Reception' 
  | 'Sales';

export type Industry = 
  | 'Aluminium/Steel Industry'
  | 'Cement Industry'
  | 'Construction'
  | 'Datacenter / IT infrastructure'
  | 'Electro Mechanical Contractor'
  | 'End User'
  | 'Energy Savings Companies (ESCOs)'
  | 'Fan / HVAC'
  | 'OEM'
  | 'Oil & Gas'
  | 'Panel Builder'
  | 'Paper Industry'
  | 'Plastic Industry'
  | 'Printing Press Industry'
  | 'Pumps'
  | 'Sewage Plant'
  | 'System Integrator / Service Provider'
  | 'Trader / Retailer'
  | 'Waste Water / RO Treatment OEM'
  | 'Waste Water / RO Treatment Plant';

export interface Address {
  flatHouseNo: string;
  street: string;
  city: string;
  pinCode: string;
  country: string;
}

export interface HistoryEntry {
  timestamp: string;
  action: string;
  userId: string;
  userName: string;
  details?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface ContactPerson {
  salutation: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: Department;
  email: string;
  phone: string;
}

export interface Account {
  id: string;
  accountId?: string; // Sequential ID like 00001
  name: string;
  industries: string[];
  industry?: string; // Keep for backward compatibility
  address: Address;
  phones: string[];
  phone?: string; // Keep for backward compatibility
  telephone: string;
  emails: string[];
  email?: string; // Keep for backward compatibility
  website: string;
  lat: number;
  lng: number;
  placeId?: string;
  uid: string;
  createdAt: string;
  history?: HistoryEntry[];
}

export interface Contact {
  id: string;
  accountId: string;
  salutation: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: Department;
  emails: string[];
  email?: string; // Keep for backward compatibility
  secondaryEmail?: string;
  phones: string[];
  phone?: string; // Keep for backward compatibility
  telephone?: string;
  uid: string;
  createdAt: string;
  history?: HistoryEntry[];
}

export interface Lead {
  id: string;
  salutation: string;
  firstName: string;
  lastName: string;
  accountName: string; // Temporary account name
  designation: string;
  department: Department;
  industries?: string[];
  industry?: string;
  emails: string[];
  email?: string; // Keep for backward compatibility
  secondaryEmail?: string;
  phones: string[];
  phone?: string; // Keep for backward compatibility
  telephone?: string;
  street?: string;
  city?: string;
  pinCode?: string;
  country?: string;
  website?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  accountId?: string;
  notes?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted';
  leadSource?: string;
  uid: string;
  createdAt: string;
  additionalContacts?: ContactPerson[];
  history?: HistoryEntry[];
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export type MarketInsightCategory = 
  | 'Industrial Automation & PLCs'
  | 'HVAC & Pump Controls'
  | 'Industrial Modernization'
  | 'Building Electrical (MDB/DB/MCC)'
  | 'Power Quality & Harmonics'
  | 'OEM Panel Building'
  | 'General Tender';

export interface MarketInsight {
  id: string;
  projectName: string;
  location: string;
  status: string;
  category: MarketInsightCategory;
  contractor?: string;
  consultant?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  tenderLink?: string;
  description: string;
  relevance: string;
  scope: string;
  website?: string;
  companyDetails?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  dateFound: string;
  publishedDate?: string;
  dismissed?: boolean;
  type: 'project' | 'prospect';
  isFavorite?: boolean;
  uid?: string;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  salutation: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  designation: string;
  phone: string;
  phoneVerified?: boolean;
  email: string;
  emailVerified?: boolean;
  password?: string;
  createdAt: string;
  theme: 'light' | 'dark';
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
  accountType?: 'classic' | 'pro';
  roleName?: string;
  about?: string;
  securityPin?: string;
  geminiApiKey?: string;
  googleMapsApiKey?: string;
  industries?: string[];
}

export interface StorageStats {
  usedBytes: number;
  totalBytes: number;
  documentCount: number;
}

export interface Reminder {
  id: string;
  title: string;
  notes: string;
  date: string;
  time: string;
  completed: boolean;
  accountId?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  scribbleData?: string; // Base64 image data for the scribble pad
  accountId?: string;
  contactId?: string;
  leadId?: string;
  location?: string;
  date: string;
  reminderId?: string;
  createdAt: string;
}

export interface Visit {
  id: string;
  targetId: string; // Account ID, Lead ID, or Prospect ID
  targetType: 'account' | 'lead' | 'prospect' | 'external';
  targetName: string;
  date: string;
  time: string;
  status: 'Planned' | 'Visited' | 'Postponed' | 'Cancelled';
  notes?: string;
  meetingNotes?: string;
  uid: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'restore' | 'merge' | 'system_alert' | 'system_error';
  entityType: 'lead' | 'contact' | 'account' | 'visit' | 'note' | 'reminder' | 'system' | 'user';
  entityId: string;
  description: string;
  timestamp: string;
  data: any;
  previousData?: any;
  uid: string;
  userEmail?: string;
  userName?: string;
}
