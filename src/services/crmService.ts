import { Lead, Contact, Account, UserLocation, Industry, Department, Address, Reminder, Note, UserProfile, StorageStats, MarketInsight, Visit, Activity, HistoryEntry, ContactPerson } from '../types';
import * as XLSX from 'xlsx';
import { geminiService } from './geminiService';
import { 
  db, 
  auth, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  sendPasswordResetEmail
} from '../firebase';

// Haversine formula to calculate distance between two points in km
export const getDistance = (loc1: UserLocation, loc2: UserLocation): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (loc2.lat - loc1.lat) * (Math.PI / 180);
  const dLng = (loc2.lng - loc1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * (Math.PI / 180)) *
      Math.cos(loc2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Recursively removes undefined values from an object or array for Firestore compatibility.
 */
export const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return undefined;
  if (obj === null) return undefined; // Changed from return null to return undefined to omit null fields
  
  if (Array.isArray(obj)) {
    return obj
      .map(v => sanitizeForFirestore(v))
      .filter(v => v !== undefined);
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === 'object') {
    // Check if it's a plain object
    if (obj.constructor && obj.constructor.name !== 'Object') {
      // For non-plain objects (like classes), try to convert to plain object if possible
      // or just return as is if it's a known Firestore type (though we don't expect them here)
      return obj;
    }

    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const value = sanitizeForFirestore(obj[key]);
      if (value !== undefined) {
        newObj[key] = value;
      }
    });
    return newObj;
  }

  return obj;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const crmService = {
  // Account ID Generation
  getNextAccountId: async (): Promise<string> => {
    if (!auth.currentUser) return '00001';
    try {
      const q = query(collection(db, 'accounts'), where('uid', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const accounts = snapshot.docs.map(doc => doc.data() as Account);
      
      const ids = accounts
        .map(a => a.accountId)
        .filter((id): id is string => !!id && /^\d+$/.test(id))
        .map(id => parseInt(id, 10));
      
      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      return (maxId + 1).toString().padStart(5, '0');
    } catch (error) {
      console.error('Error getting next account ID:', error);
      return '00001';
    }
  },

  migrateExistingAccounts: async (): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'accounts'), 
        where('uid', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      
      // Sort by creation date to assign IDs in order
      const sortedAccounts = [...accounts].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const batch = writeBatch(db);
      let updatedCount = 0;
      
      sortedAccounts.forEach((account, index) => {
        if (!account.accountId) {
          const newId = (index + 1).toString().padStart(5, '0');
          batch.update(doc(db, 'accounts', account.id), { accountId: newId });
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        await batch.commit();
        console.log(`Migrated ${updatedCount} accounts with sequential IDs`);
      }
    } catch (error) {
      console.error('Error migrating accounts:', error);
    }
  },

  // Activity Logging
  logActivity: async (activity: Omit<Activity, 'id' | 'timestamp' | 'uid'>): Promise<string | undefined> => {
    if (!auth.currentUser) return;
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const newActivity: Activity = {
      ...activity,
      id,
      timestamp,
      uid: auth.currentUser.uid,
      userEmail: auth.currentUser.email || undefined,
      userName: auth.currentUser.displayName || undefined
    };
    try {
      const sanitizedActivity = sanitizeForFirestore(newActivity);
      await setDoc(doc(db, 'activities', id), sanitizedActivity);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm-action'));
      }
      return id;
    } catch (error) {
      console.error('Error logging activity:', error);
      return id;
    }
  },

  // Invitations
  createInvitation: async (email: string, accountType: 'classic' | 'pro'): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      const id = email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      await setDoc(doc(db, 'invitations', id), {
        email,
        accountType,
        status: 'pending',
        invitedBy: auth.currentUser.uid,
        invitedAt: new Date().toISOString()
      });
      
      // Also create a placeholder user in User Management as requested
      // "the user shall fall under my user management with email and account version type"
      await setDoc(doc(db, 'users', `invited_${id}`), {
        uid: `invited_${id}`,
        email: email,
        accountType: accountType,
        status: 'inactive', // inactive until they register
        firstName: 'Invited',
        lastName: 'User',
        organizationName: 'Pending Registration',
        designation: 'N/A',
        createdAt: new Date().toISOString(),
        role: 'user',
        theme: 'light'
      }, { merge: true });

      await crmService.logActivity({
        type: 'create',
        entityType: 'system',
        entityId: email,
        description: `Invited new team member: ${email} (${accountType})`,
        data: { email, accountType }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'invitations');
    }
  },

  checkInvitation: async (email: string): Promise<{ accountType: 'classic' | 'pro' } | null> => {
    try {
      const id = email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const snap = await getDoc(doc(db, 'invitations', id));
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'pending') {
          return { accountType: data.accountType };
        }
      }
      return null;
    } catch (error) {
      console.error('Error checking invitation:', error);
      return null;
    }
  },

  consumeInvitation: async (email: string): Promise<void> => {
    try {
      const id = email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      await updateDoc(doc(db, 'invitations', id), {
        status: 'registered',
        registeredAt: new Date().toISOString()
      });
      
      // Remove the placeholder user doc if it exists
      await deleteDoc(doc(db, 'users', `invited_${id}`));
    } catch (error) {
      console.error('Error consuming invitation:', error);
    }
  },

  undoActivity: async (activityId: string): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'activities', activityId));
      if (!snap.exists()) throw new Error('Activity not found');
      
      const activity = snap.data() as Activity;
      const { type, entityType, entityId, previousData, data } = activity;

      const collectionName = entityType === 'lead' ? 'leads' : 
                          entityType === 'contact' ? 'contacts' : 
                          entityType === 'account' ? 'accounts' : 
                          entityType === 'visit' ? 'visits' : 
                          entityType === 'note' ? 'notes' : 
                          entityType === 'reminder' ? 'reminders' : 
                          entityType === 'user' ? 'users' : null;

      if (!collectionName) throw new Error(`Cannot undo activity for entity type: ${entityType}`);

      if (type === 'create') {
        // Undo create: Delete the entity
        await deleteDoc(doc(db, collectionName, entityId));
      } else if (type === 'update') {
        // Undo update: Restore previousData
        const restoreData = previousData || data; // fallback just in case
        if (!restoreData) throw new Error('No data found to undo update');
        await setDoc(doc(db, collectionName, entityId), sanitizeForFirestore(restoreData));
      } else if (type === 'delete') {
        // Undo delete: Restore the entity using 'data' or 'previousData'
        const restoreData = data || previousData;
        if (!restoreData) throw new Error('No data found to restore deleted entity');
        await setDoc(doc(db, collectionName, entityId), sanitizeForFirestore(restoreData));
      } else {
        throw new Error(`Undo not supported for action type: ${type}`);
      }

      await crmService.logActivity({
        type: 'restore',
        entityType,
        entityId,
        description: `Undid ${type} action on ${entityType}: ${activity.description}`,
        data: { undidActivityId: activityId }
      });
    } catch (error) {
      console.error('Error undoing activity:', error);
      throw error;
    }
  },

  logSystemMessage: async (message: string, type: 'alert' | 'error' = 'alert', details?: any): Promise<string | undefined> => {
    return crmService.logActivity({
      type: type === 'alert' ? 'system_alert' : 'system_error',
      entityType: 'system',
      entityId: 'system',
      description: message,
      data: details || {}
    });
  },

  ignoreDuplicates: async (ids: string[], type: string): Promise<void> => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const ref = doc(db, 'ignored_duplicates', `${uid}_${id}`);
        batch.set(ref, { uid, itemId: id, type, ignoredAt: new Date().toISOString() });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ignored_duplicates');
    }
  },

  getIgnoredDuplicates: async (type: string): Promise<string[]> => {
    if (!auth.currentUser) return [];
    const uid = auth.currentUser.uid;
    try {
      const q = query(
        collection(db, 'ignored_duplicates'),
        where('uid', '==', uid),
        where('type', '==', type)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data().itemId);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'ignored_duplicates');
      return [];
    }
  },

  getRecentActivities: async (): Promise<Activity[]> => {
    if (!auth.currentUser) return [];
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      const q = query(
        collection(db, 'activities'),
        where('uid', '==', auth.currentUser.uid),
        where('timestamp', '>=', twentyFourHoursAgo)
      );
      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map(doc => doc.data() as Activity);
      return activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error) {
      console.error('Error fetching activities with query, falling back to in-memory filter:', error);
      try {
        const qBasic = query(
          collection(db, 'activities'),
          where('uid', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(qBasic);
        const activities = snapshot.docs
          .map(doc => doc.data() as Activity)
          .filter(a => a.timestamp >= twentyFourHoursAgo);
        return activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      } catch (innerError) {
        console.error('Error fetching activities fallback:', innerError);
        return [];
      }
    }
  },

  revertActivity: async (activity: Activity): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    try {
      switch (activity.type) {
        case 'create':
          // Undo create = delete
          await crmService.deleteEntity(activity.entityType, activity.entityId, false);
          break;
        case 'delete':
          // Undo delete = restore (re-create)
          await crmService.restoreEntity(activity.entityType, activity.data);
          break;
        case 'update':
          // Undo update = revert to previousData
          if (activity.previousData) {
            await crmService.updateEntity(activity.entityType, activity.entityId, activity.previousData, false);
          }
          break;
        case 'restore':
          // Undo restore = delete again
          await crmService.deleteEntity(activity.entityType, activity.entityId, false);
          break;
      }
    } catch (error) {
      console.error('Error reverting activity:', error);
      throw error;
    }
  },

  // Helper for revert to avoid logging the revert itself as a new activity
  deleteEntity: async (type: Activity['entityType'], id: string, log = true): Promise<void> => {
    const path = type === 'lead' ? 'leads' : type === 'contact' ? 'contacts' : type === 'account' ? 'accounts' : type === 'visit' ? 'visits' : type === 'note' ? 'notes' : 'reminders';
    
    if (log) {
      const docRef = doc(db, path, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        await crmService.logActivity({
          type: 'delete',
          entityType: type,
          entityId: id,
          description: `Deleted ${type}: ${data.name || data.firstName || data.title || id}`,
          data: data
        });
      }
    }
    
    await deleteDoc(doc(db, path, id));
  },

  restoreEntity: async (type: Activity['entityType'], data: any): Promise<void> => {
    const path = type === 'lead' ? 'leads' : type === 'contact' ? 'contacts' : type === 'account' ? 'accounts' : type === 'visit' ? 'visits' : type === 'note' ? 'notes' : 'reminders';
    const sanitizedData = sanitizeForFirestore(data);
    await setDoc(doc(db, path, data.id), sanitizedData);
    await crmService.logActivity({
      type: 'restore',
      entityType: type,
      entityId: data.id,
      description: `Restored ${type}: ${data.name || data.firstName || data.title || data.id}`,
      data: data
    });
  },

  updateEntity: async (type: Activity['entityType'], id: string, data: any, log = true): Promise<void> => {
    const path = type === 'lead' ? 'leads' : type === 'contact' ? 'contacts' : type === 'account' ? 'accounts' : type === 'visit' ? 'visits' : type === 'note' ? 'notes' : 'reminders';
    
    if (log) {
      const docRef = doc(db, path, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const prevData = snapshot.data();
        await crmService.logActivity({
          type: 'update',
          entityType: type,
          entityId: id,
          description: `Updated ${type}: ${prevData.name || prevData.firstName || prevData.title || id}`,
          data: data,
          previousData: prevData
        });
      }
    }
    
    const sanitizedData = sanitizeForFirestore(data);
    await updateDoc(doc(db, path, id), sanitizedData);
  },

  // Duplicate Checks
  checkGlobalDuplicate: async (emails: string[], phones: string[], uid: string, excludeId?: string): Promise<{ found: boolean; type?: 'account' | 'contact' | 'lead'; name?: string; field?: string; value?: string } | null> => {
    const cleanEmails = emails.map(e => e.toLowerCase().trim()).filter(Boolean);
    const cleanPhones = phones.map(p => p.replace(/\D/g, '')).filter(Boolean);

    console.log('[DUP_CHECK] Global check for:', { cleanEmails, cleanPhones, uid, excludeId });

    if (cleanEmails.length === 0 && cleanPhones.length === 0) {
      console.log('[DUP_CHECK] No emails or phones to check.');
      return null;
    }

    const collections = ['accounts', 'contacts', 'leads'] as const;
    
    for (const col of collections) {
      const q = query(collection(db, col), where('uid', '==', uid));
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        if (doc.id === excludeId) continue;
        const data = doc.data() as any;
        
        // Check emails
        const docEmails = [
          data.email, 
          data.secondaryEmail, 
          ...(data.emails || [])
        ].map(e => e?.toLowerCase().trim()).filter(Boolean);
        
        const matchingEmail = cleanEmails.find(e => docEmails.includes(e));
        if (matchingEmail) {
          console.log('[DUP_CHECK] Found email duplicate in:', col, data.name || data.firstName);
          return { 
            found: true, 
            type: col.slice(0, -1) as any, 
            name: data.name || `${data.firstName} ${data.lastName}` || data.accountName || doc.id,
            field: 'email',
            value: matchingEmail
          };
        }
        
        // Check phones
        const docPhones = [
          data.phone, 
          data.telephone, 
          ...(data.phones || [])
        ].map(p => p?.replace(/\D/g, '')).filter(Boolean);
        
        const matchingPhone = cleanPhones.find(p => docPhones.includes(p));
        if (matchingPhone) {
          console.log('[DUP_CHECK] Found phone duplicate in:', col, data.name || data.firstName);
          return { 
            found: true, 
            type: col.slice(0, -1) as any, 
            name: data.name || `${data.firstName} ${data.lastName}` || data.accountName || doc.id,
            field: 'phone',
            value: matchingPhone
          };
        }
      }
    }
    
    return null;
  },

  checkDuplicateAccount: async (name: string, emails: string[], phones: string[], uid: string, excludeId?: string): Promise<{ found: boolean; reason?: string; type?: string; name?: string; field?: string; value?: string } | null> => {
    // 1. Check name duplicate
    const q = query(collection(db, 'accounts'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    
    const nameDup = accounts.find(acc => 
      acc.id !== excludeId && acc.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    
    if (nameDup) {
      console.log('[DUP_CHECK] Found account name duplicate:', nameDup.name);
      return { found: true, reason: 'Account Name already exists', type: 'account', name: nameDup.name, field: 'name', value: nameDup.name };
    }

    // 2. Check global email/phone duplicate
    const globalDup = await crmService.checkGlobalDuplicate(emails, phones, uid, excludeId);
    if (globalDup) {
      return { ...globalDup, reason: 'Phone number or Email already used' };
    }
    
    return null;
  },

  checkDuplicateContact: async (emails: string[], phones: string[], firstName: string, lastName: string, accountId: string, uid: string, excludeId?: string): Promise<{ found: boolean; reason?: string; type?: string; name?: string; field?: string; value?: string } | null> => {
    // 1. Check global email/phone duplicate
    const globalDup = await crmService.checkGlobalDuplicate(emails, phones, uid, excludeId);
    if (globalDup) {
      return { ...globalDup, reason: 'Phone number or Email already used' };
    }

    // 2. Check name duplicate WITHIN SAME ACCOUNT
    const q = query(collection(db, 'contacts'), where('uid', '==', uid), where('accountId', '==', accountId));
    const snapshot = await getDocs(q);
    const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));

    const nameDup = contacts.find(c => 
      c.id !== excludeId &&
      c.firstName.toLowerCase().trim() === firstName.toLowerCase().trim() && 
      c.lastName.toLowerCase().trim() === lastName.toLowerCase().trim()
    );

    if (nameDup) {
      console.log('[DUP_CHECK] Found contact name duplicate in account:', accountId);
      return { found: true, reason: 'Contact with same name already exists in this account', type: 'contact', name: `${nameDup.firstName} ${nameDup.lastName}`, field: 'name', value: `${nameDup.firstName} ${nameDup.lastName}` };
    }

    return null;
  },

  checkDuplicateLead: async (emails: string[], phones: string[], accountName: string, uid: string, excludeId?: string): Promise<{ found: boolean; reason?: string; type?: string; name?: string; field?: string; value?: string } | null> => {
    // 1. Check global email/phone duplicate
    const globalDup = await crmService.checkGlobalDuplicate(emails, phones, uid, excludeId);
    if (globalDup) {
      return { ...globalDup, reason: 'Phone number or Email already used' };
    }

    // 2. Check account name duplicate in leads
    const q = query(collection(db, 'leads'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));

    const accountDup = leads.find(l => 
      l.id !== excludeId && 
      l.accountName.toLowerCase().trim() === accountName.toLowerCase().trim() &&
      l.status !== 'Converted'
    );

    if (accountDup) {
      console.log('[DUP_CHECK] Found lead account name duplicate:', accountDup.accountName);
      return { found: true, reason: 'Lead with same company name already exists', type: 'lead', name: accountDup.accountName, field: 'accountName', value: accountDup.accountName };
    }

    return null;
  },

  // User Profile
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  updateUserProfile: async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
    try {
      const sanitizedProfile = sanitizeForFirestore(profile);
      await setDoc(doc(db, 'users', uid), sanitizedProfile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  // Market Insights using Gemini
  fetchMarketInsightsFromAI: async (userRole: string, excludeNames: string[] = [], industries: string[] = [], count: number = 40, userApiKey?: string): Promise<MarketInsight[]> => {
    try {
      return await geminiService.fetchMarketInsights(userRole, excludeNames, industries, count, userApiKey);
    } catch (error: any) {
      const errStr = (error?.message || error?.error || error?.statusText || (typeof error === 'object' ? JSON.stringify(error) : String(error))).toLowerCase();
      const isQuotaError = error.status === 429 || 
                          error.status === 402 || 
                          error.code === 429 ||
                          error.code === 402 ||
                          error.isQuota ||
                          errStr.includes('429') || 
                          errStr.includes('402') ||
                          errStr.includes('quota') ||
                          errStr.includes('spending cap') ||
                          errStr.includes('resource_exhausted') ||
                          errStr.includes('prepayment') ||
                          errStr.includes('depleted') ||
                          errStr.includes('credits');
      
      if (isQuotaError) {
        const isSpendingCap = errStr.includes('spending cap') || errStr.includes('prepayment') || errStr.includes('depleted');
        console.warn(`Gemini API ${isSpendingCap ? 'spending cap/credits' : 'quota'} limit reached for market insights. Using offline data.`);
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm-api-quota-exceeded', { 
            detail: { 
              type: 'market-insights', 
              message: isSpendingCap ? 'Gemini credits or spending cap limit reached. Using offline data.' : 'Gemini API quota exceeded. Using offline data.',
              isSpendingCap
            } 
          }));
        }
      } else {
        console.warn('Market insights AI query note:', error?.message || error);
      }
      return getMockMarketInsights(excludeNames);
    }
  },

  // Get actionable prospects (customers to approach)
  getProspects: async (userRole: string, excludeNames: string[] = [], industries: string[] = [], count: number = 40, userApiKey?: string): Promise<MarketInsight[]> => {
    try {
      return await geminiService.fetchProspects(userRole, excludeNames, industries, count, userApiKey);
    } catch (error: any) {
      const errStr = (error?.message || error?.error || error?.statusText || (typeof error === 'object' ? JSON.stringify(error) : String(error))).toLowerCase();
      const isQuotaError = error.status === 429 || 
                          error.status === 402 || 
                          error.code === 429 ||
                          error.code === 402 ||
                          error.isQuota ||
                          errStr.includes('429') || 
                          errStr.includes('402') ||
                          errStr.includes('quota') ||
                          errStr.includes('spending cap') ||
                          errStr.includes('resource_exhausted') ||
                          errStr.includes('prepayment') ||
                          errStr.includes('depleted') ||
                          errStr.includes('credits');
      
      if (isQuotaError) {
        const isSpendingCap = errStr.includes('spending cap') || errStr.includes('prepayment') || errStr.includes('depleted');
        console.warn(`Gemini API ${isSpendingCap ? 'spending cap/credits' : 'quota'} limit reached for prospects. Using offline data.`);
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crm-api-quota-exceeded', { 
            detail: { 
              type: 'prospects', 
              message: isSpendingCap ? 'Gemini credits or spending cap limit reached. Using offline data.' : 'Gemini API quota exceeded. Using offline data.',
              isSpendingCap
            } 
          }));
        }
      } else {
        console.warn('Prospects AI query note:', error?.message || error);
      }
      return getMockProspects(excludeNames);
    }
  },

  saveMarketInsightToFirestore: async (insight: MarketInsight): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Use composite ID to prevent collisions between users
      const compositeId = `${user.uid}_${insight.id}`;
      const docRef = doc(db, 'marketInsights', compositeId);
      const sanitizedInsight = sanitizeForFirestore({
        ...insight,
        uid: user.uid,
        createdAt: serverTimestamp()
      });
      await setDoc(docRef, sanitizedInsight);
    } catch (error) {
      console.error('Error saving market insight:', error);
      throw error;
    }
  },

  saveMarketInsightsBulk: async (insights: MarketInsight[]): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    try {
      const batch = writeBatch(db);
      insights.forEach(insight => {
        // Use composite ID to prevent collisions between users
        const compositeId = `${user.uid}_${insight.id}`;
        const docRef = doc(db, 'marketInsights', compositeId);
        const sanitizedInsight = sanitizeForFirestore({
          ...insight,
          uid: user.uid,
          createdAt: serverTimestamp()
        });
        batch.set(docRef, sanitizedInsight);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error saving market insights bulk:', error);
      throw error;
    }
  },

  getMarketInsightsFromFirestore: async (): Promise<MarketInsight[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    
    try {
      const q = query(
        collection(db, 'marketInsights'), 
        where('uid', '==', user.uid),
        where('dismissed', '!=', true),
        orderBy('dismissed'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MarketInsight));
    } catch (error) {
      console.error('Error getting market insights:', error);
      // Fallback if index is missing or other error
      try {
        const qBasic = query(
          collection(db, 'marketInsights'), 
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(qBasic);
        return snapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id } as MarketInsight))
          .filter(insight => !insight.dismissed);
      } catch (innerError) {
        return [];
      }
    }
  },

  clearMarketInsightsFromFirestore: async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(
        collection(db, 'marketInsights'),
        where('uid', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      console.log(`[CRM] Cleared ${snapshot.docs.length} cached market insights from Firestore.`);
    } catch (error) {
      console.warn('Note clearing cached market insights:', error);
    }
  },

  dismissMarketInsight: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'marketInsights', id);
      const sanitizedUpdate = sanitizeForFirestore({ dismissed: true });
      await updateDoc(docRef, sanitizedUpdate);
    } catch (error) {
      console.error('Error dismissing market insight:', error);
      throw error;
    }
  },

  getDismissedInsightNames: async (): Promise<string[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    
    try {
      const q = query(
        collection(db, 'marketInsights'), 
        where('uid', '==', user.uid),
        where('dismissed', '==', true)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => (doc.data() as MarketInsight).projectName);
    } catch (error) {
      console.error('Error getting dismissed insight names:', error);
      return [];
    }
  },

  deleteMarketInsight: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'marketInsights', id));
    } catch (error) {
      console.error('Error deleting market insight:', error);
      throw error;
    }
  },

  // Market Insights Persistence
  saveFavoriteInsight: async (insight: MarketInsight): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    try {
      const insightRef = doc(db, 'favoriteInsights', insight.id);
      const sanitizedInsight = sanitizeForFirestore({
        ...insight,
        uid: user.uid,
        isFavorite: true,
        createdAt: new Date().toISOString()
      });
      await setDoc(insightRef, sanitizedInsight);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `favoriteInsights/${insight.id}`);
    }
  },

  unsaveMarketInsight: async (insightId: string): Promise<void> => {
    try {
      const insightRef = doc(db, 'favoriteInsights', insightId);
      await deleteDoc(insightRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `favoriteInsights/${insightId}`);
    }
  },

  getFavoriteInsights: async (): Promise<MarketInsight[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    
    try {
      const q = query(
        collection(db, 'favoriteInsights'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MarketInsight));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'favoriteInsights');
      return [];
    }
  },

  // Visits
  createVisit: async (visit: Omit<Visit, 'id' | 'uid' | 'createdAt'>): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    try {
      const visitRef = doc(collection(db, 'visits'));
      const newVisit: Visit = {
        ...visit,
        id: visitRef.id,
        uid: user.uid,
        createdAt: new Date().toISOString()
      };
      const sanitizedVisit = sanitizeForFirestore(newVisit);
      await setDoc(visitRef, sanitizedVisit);
      await crmService.logActivity({
        type: 'create',
        entityType: 'visit',
        entityId: visitRef.id,
        description: `Scheduled Visit: ${newVisit.targetName}`,
        data: newVisit
      });
      return visitRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'visits');
      throw error;
    }
  },

  updateVisit: async (id: string, updates: Partial<Visit>): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const visitRef = doc(db, 'visits', id);
      const snapshot = await getDoc(visitRef);
      if (!snapshot.exists()) throw new Error('Visit not found');
      const original = snapshot.data() as Visit;

      const sanitizedUpdates = sanitizeForFirestore(updates);
      await updateDoc(visitRef, sanitizedUpdates);
      const updatedDoc = await getDoc(visitRef);
      const result = { id: updatedDoc.id, ...updatedDoc.data() } as Visit;

      await crmService.logActivity({
        type: 'update',
        entityType: 'visit',
        entityId: id,
        description: `Updated Visit: ${result.targetName}`,
        data: result,
        previousData: original
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `visits/${id}`);
      throw error;
    }
  },

  deleteVisit: async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const visitRef = doc(db, 'visits', id);
      const snapshot = await getDoc(visitRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        await crmService.logActivity({
          type: 'delete',
          entityType: 'visit',
          entityId: id,
          description: `Deleted Visit: ${data.targetName}`,
          data: data
        });
      }
      await deleteDoc(visitRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `visits/${id}`);
      throw error;
    }
  },

  getVisits: async (): Promise<Visit[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    
    try {
      const q = query(
        collection(db, 'visits'),
        where('uid', '==', user.uid),
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Visit));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'visits');
      return [];
    }
  },

  // Storage Stats
  getStorageStats: async (): Promise<StorageStats> => {
    if (!auth.currentUser) return { usedBytes: 0, totalBytes: 524288000, documentCount: 0 }; // 500MB default
    try {
      const collections = ['accounts', 'contacts', 'leads', 'reminders', 'notes', 'favoriteInsights', 'visits'];
      let count = 0;
      for (const col of collections) {
        const q = query(collection(db, col), where('uid', '==', auth.currentUser.uid));
        const snap = await getDocs(q);
        count += snap.size;
      }
      // Rough estimation: 1KB per document
      return {
        usedBytes: count * 1024,
        totalBytes: 524288000, // 500MB
        documentCount: count
      };
    } catch (error) {
      return { usedBytes: 0, totalBytes: 524288000, documentCount: 0 };
    }
  },

  // Export to Excel
  exportToExcel: (data: any[], fileName: string, headers?: string[]) => {
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  },

  exportAllData: async () => {
    if (!auth.currentUser) return;
    try {
      const [accs, cons, lds, rems, nts, vsts] = await Promise.all([
        crmService.getAccounts(),
        crmService.getContacts(),
        crmService.getLeads(),
        crmService.getReminders(),
        crmService.getNotes(),
        crmService.getVisits()
      ]);

      const wb = XLSX.utils.book_new();
      
      const accsSheet = XLSX.utils.json_to_sheet(accs.map(a => ({
        ...a,
        address: `${a.address.flatHouseNo}, ${a.address.street}, ${a.address.city}, ${a.address.pinCode}, ${a.address.country}`
      })));
      XLSX.utils.book_append_sheet(wb, accsSheet, "Accounts");

      const vstsSheet = XLSX.utils.json_to_sheet(vsts);
      XLSX.utils.book_append_sheet(wb, vstsSheet, "Visits");

      const consSheet = XLSX.utils.json_to_sheet(cons);
      XLSX.utils.book_append_sheet(wb, consSheet, "Contacts");

      const ldsSheet = XLSX.utils.json_to_sheet(lds);
      XLSX.utils.book_append_sheet(wb, ldsSheet, "Leads");

      const remsSheet = XLSX.utils.json_to_sheet(rems);
      XLSX.utils.book_append_sheet(wb, remsSheet, "Reminders");

      const ntsSheet = XLSX.utils.json_to_sheet(nts);
      XLSX.utils.book_append_sheet(wb, ntsSheet, "Notes");

      XLSX.writeFile(wb, `CRM_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export all data error:', error);
      throw error;
    }
  },

  updateSecurityPin: async (pin: string | null) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      const sanitizedData = sanitizeForFirestore({ securityPin: pin });
      await setDoc(doc(db, 'users', uid), sanitizedData, { merge: true });
    } catch (error) {
      console.error('Update security pin error:', error);
      throw error;
    }
  },

  // Admin
  getAllUsers: async (): Promise<UserProfile[]> => {
    if (!auth.currentUser) return [];
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  },

  getSystemActivities: async (limitCount: number = 100): Promise<Activity[]> => {
    if (!auth.currentUser) return [];
    try {
      const q = query(
        collection(db, 'activities'), 
        orderBy('timestamp', 'desc'),
        // Limit to prevent massive data fetch
      );
      const snapshot = await getDocs(q);
      // Client side limit if count is smaller, but usually limit in query is better
      const docs = snapshot.docs.map(doc => doc.data() as Activity);
      return docs.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching system activities:', error);
      return [];
    }
  },

  getSystemStats: async (): Promise<{ totalUsers: number, totalAccounts: number, totalLeads: number, totalContacts: number }> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const [users, accounts, leads, contacts] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'accounts')),
        getDocs(collection(db, 'leads')),
        getDocs(collection(db, 'contacts'))
      ]);
      return {
        totalUsers: users.size,
        totalAccounts: accounts.size,
        totalLeads: leads.size,
        totalContacts: contacts.size
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'systemStats');
      return { totalUsers: 0, totalAccounts: 0, totalLeads: 0, totalContacts: 0 };
    }
  },

  updateUserStatus: async (uid: string, status: 'active' | 'inactive'): Promise<void> => {
    try {
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists() && snapshot.data().email === 'udeen3197@gmail.com') {
        throw new Error('Sole admin account cannot be deactivated');
      }
      await updateDoc(docRef, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  deleteUserAccount: async (uid: string): Promise<void> => {
    try {
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return;
      
      const userData = snapshot.data();
      if (userData.email === 'udeen3197@gmail.com') {
        throw new Error('Sole admin account cannot be deleted');
      }

      await crmService.logActivity({
        type: 'delete',
        entityType: 'user',
        entityId: uid,
        description: `Deleted User: ${userData.firstName} ${userData.lastName} (${userData.email})`,
        data: userData
      });

      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      throw error;
    }
  },

  adminUpdateUserProfile: async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
    try {
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists() && snapshot.data().email === 'udeen3197@gmail.com') {
        // Prevent changing critical fields for the sole admin
        const { role, status, email, ...rest } = profile;
        await updateDoc(docRef, sanitizeForFirestore(rest));
        return;
      }
      const sanitizedProfile = sanitizeForFirestore(profile);
      await updateDoc(docRef, sanitizedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  resetUserPassword: async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  },

  // Business Card Scanning
  scanBusinessCard: async (base64Image: string): Promise<Partial<Lead>> => {
    if (!base64Image) throw new Error('No image data provided');

    console.log('Scanning business card via frontend Gemini API...');

    try {
      const extractedData = await geminiService.scanBusinessCard(base64Image);
      
      // Map extracted data to Lead fields
      return {
        salutation: extractedData.salutation || '',
        firstName: extractedData.firstName || '',
        lastName: extractedData.lastName || '',
        designation: extractedData.designation || '',
        accountName: extractedData.accountName || '',
        email: extractedData.email || '',
        emails: extractedData.email ? [extractedData.email] : [],
        phone: extractedData.phone || '',
        phones: extractedData.phone ? [extractedData.phone] : [],
        website: extractedData.website || '',
        street: extractedData.street || '',
        city: extractedData.city || '',
        pinCode: extractedData.pinCode || '',
        country: extractedData.country || '',
        notes: extractedData.notes || '',
        status: 'New',
        leadSource: 'Business Card'
      };
    } catch (error: any) {
      console.error('Scan failed:', error);
      throw error;
    }
  },

  // Industries
  getIndustries: async (): Promise<string[]> => {
    try {
      const initialIndustries = [
        'Aluminium/Steel Industry',
        'Cement Industry',
        'Construction',
        'Consultant',
        'Datacenter / IT infrastructure',
        'Electro Mechanical Contractor',
        'End User',
        'Energy Savings Companies (ESCOs)',
        'Facility Management',
        'Fan / HVAC',
        'Generator OEM',
        'Marine',
        'OEM',
        'Oil & Gas',
        'Panel Builder',
        'Paper Industry',
        'Plastic Industry',
        'Printing Press Industry',
        'Pumps',
        'Sewage Plant',
        'System Integrator / Service Provider',
        'Trader / Retailer',
        'Waste Water / RO Treatment OEM',
        'Waste Water / RO Treatment Plant'
      ];

      const docRef = doc(db, 'metadata', 'industries');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const existingList = docSnap.data().list || [];
        // Merge and remove duplicates
        const mergedList = Array.from(new Set([...initialIndustries, ...existingList]));
        
        // If we added new industries from the initial list, update the doc
        if (mergedList.length > existingList.length) {
          const sanitizedData = sanitizeForFirestore({ list: mergedList });
          await setDoc(docRef, sanitizedData);
        }
        return mergedList;
      }
      
      // Initial list from types if not exists
      const sanitizedInitialData = sanitizeForFirestore({ list: initialIndustries });
      await setDoc(docRef, sanitizedInitialData);
      return initialIndustries;
    } catch (error) {
      console.error('Error getting industries:', error);
      return [];
    }
  },

  addIndustry: async (industry: string): Promise<void> => {
    try {
      const docRef = doc(db, 'metadata', 'industries');
      const docSnap = await getDoc(docRef);
      let list = [];
      if (docSnap.exists()) {
        list = docSnap.data().list || [];
      }
      if (!list.includes(industry)) {
        list.push(industry);
        const sanitizedData = sanitizeForFirestore({ list });
        await setDoc(docRef, sanitizedData);
      }
    } catch (error) {
      console.error('Error adding industry:', error);
      throw error;
    }
  },

  deleteIndustry: async (industry: string): Promise<void> => {
    try {
      const docRef = doc(db, 'metadata', 'industries');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const list = docSnap.data().list || [];
        const newList = list.filter((i: string) => i !== industry);
        const sanitizedData = sanitizeForFirestore({ list: newList });
        await setDoc(docRef, sanitizedData);
      }
    } catch (error) {
      console.error('Error deleting industry:', error);
      throw error;
    }
  },

  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    if (!auth.currentUser) return [];
    try {
      const q = query(collection(db, 'accounts'), where('uid', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
      return [];
    }
  },

  geocode: async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // Try to use Google Maps JS SDK if available (no CORS issues)
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps && (window as any).google.maps.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const response = await geocoder.geocode({ address });
        if (response.results && response.results[0]) {
          const loc = response.results[0].geometry.location;
          return { lat: loc.lat(), lng: loc.lng() };
        }
      } catch (e) {
        // Callback fallback
        try {
          const geocoder = new (window as any).google.maps.Geocoder();
          return new Promise((resolve) => {
            geocoder.geocode({ address }, (results: any, status: any) => {
              if (status === 'OK' && results && results[0]) {
                const loc = results[0].geometry.location;
                resolve({ lat: loc.lat(), lng: loc.lng() });
              } else {
                resolve(null);
              }
            });
          });
        } catch (innerError) {
          console.error('JS SDK Geocoding error:', innerError);
        }
      }
    }

    // Fallback to direct API call (might fail due to CORS in browser)
    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status === 'OK' && result.results[0]) {
        return result.results[0].geometry.location;
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
    return null;
  },

  reverseGeocode: async (lat: number, lng: number): Promise<string | null> => {
    // Try to use Google Maps JS SDK if available (no CORS issues)
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps && (window as any).google.maps.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results[0]) {
          return response.results[0].formatted_address;
        }
      } catch (e) {
        // If it's a "not a function" error, it might be an older version of the SDK using callbacks
        try {
          const geocoder = new (window as any).google.maps.Geocoder();
          return new Promise((resolve) => {
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              if (status === 'OK' && results && results[0]) {
                resolve(results[0].formatted_address);
              } else {
                resolve(null);
              }
            });
          });
        } catch (innerError) {
          console.error('JS SDK Geocoding error:', innerError);
        }
      }
    }

    // Fallback to direct API call (might fail due to CORS in browser)
    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status === 'OK' && result.results[0]) {
        return result.results[0].formatted_address;
      }
    } catch (e) {
      console.error('Reverse geocoding error:', e);
    }
    return null;
  },

  // History Helpers
  createHistoryEntry: (action: string, details?: string, changes?: HistoryEntry['changes']): HistoryEntry => {
    const user = auth.currentUser;
    const userIdentifier = user?.email || user?.displayName || 'Unknown User';
    return {
      timestamp: new Date().toISOString(),
      action,
      userId: user?.uid || 'unknown',
      userName: userIdentifier,
      details,
      changes
    };
  },

  addAccount: async (account: Omit<Account, 'id' | 'createdAt' | 'uid' | 'history'> & { id?: string; createdAt?: string; history?: HistoryEntry[] }): Promise<Account> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    let lat = account.lat;
    let lng = account.lng;

    // Only geocode if lat/lng are at default or not provided, and address is provided
    if ((!lat || !lng || (lat === 25.2048 && lng === 55.2708)) && account.address) {
      const address = account.address;
      const fullAddress = `${address.flatHouseNo} ${address.street} ${address.city} ${address.country}`.trim();
      const location = await crmService.geocode(fullAddress);
      if (location) {
        lat = location.lat;
        lng = location.lng;
      }
    }

    const id = account.id || crypto.randomUUID();
    const createdAt = account.createdAt || new Date().toISOString();
    
    // Get sequential account ID if not provided
    let accountId = (account as any).accountId;
    if (!accountId) {
      accountId = await crmService.getNextAccountId();
    }
    
    const historyEntry = crmService.createHistoryEntry('Created', `Account created: ${account.name}`);
    
    const newAccount: Account = { 
      ...account, 
      lat: lat || 25.2048, 
      lng: lng || 55.2708, 
      id, 
      accountId,
      uid: auth.currentUser.uid,
      createdAt,
      history: account.history ? [...account.history, historyEntry] : [historyEntry]
    };

    try {
      const sanitizedAccount = sanitizeForFirestore(newAccount);
      await setDoc(doc(db, 'accounts', id), sanitizedAccount);
      await crmService.logActivity({
        type: 'create',
        entityType: 'account',
        entityId: id,
        description: `Created Account: ${newAccount.name}`,
        data: newAccount
      });
      return newAccount;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `accounts/${id}`);
      throw error;
    }
  },

  updateAccount: async (id: string, data: Partial<Account>): Promise<Account> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    try {
      const accountDoc = await getDoc(doc(db, 'accounts', id));
      if (!accountDoc.exists()) throw new Error('Account not found');
      const original = accountDoc.data() as Account;

      let updatedData = { ...data };

      if (data.address) {
        const address = data.address;
        const addressChanged = 
          address.flatHouseNo !== original.address.flatHouseNo ||
          address.street !== original.address.street ||
          address.city !== original.address.city ||
          address.pinCode !== original.address.pinCode ||
          address.country !== original.address.country;

        const coordsChanged = 
          (data.lat !== undefined && data.lat !== original.lat) || 
          (data.lng !== undefined && data.lng !== original.lng);

        // Only geocode if address changed AND coordinates DID NOT change
        // This prevents overwriting manual coordinate entries or autocomplete results
        if (addressChanged && !coordsChanged) {
          const fullAddress = `${address.flatHouseNo} ${address.street} ${address.city} ${address.country}`.trim();
          const location = await crmService.geocode(fullAddress);
          if (location) {
            updatedData = { ...updatedData, lat: location.lat, lng: location.lng };
          }
        }
      }

      // Track changes for history
      const changes: HistoryEntry['changes'] = [];
      Object.keys(data).forEach(key => {
        const k = key as keyof Account;
        if (JSON.stringify(data[k]) !== JSON.stringify(original[k]) && k !== 'history') {
          changes.push({
            field: key,
            oldValue: original[k],
            newValue: data[k]
          });
        }
      });

      if (changes.length > 0) {
        const historyEntry = crmService.createHistoryEntry('Updated', `Account updated`, changes);
        updatedData.history = [...(original.history || []), historyEntry];
      }

      const sanitizedData = sanitizeForFirestore(updatedData);
      await updateDoc(doc(db, 'accounts', id), sanitizedData);
      const result = { ...original, ...updatedData };
      await crmService.logActivity({
        type: 'update',
        entityType: 'account',
        entityId: id,
        description: `Updated Account: ${result.name}`,
        data: result,
        previousData: original
      });
      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `accounts/${id}`);
      throw error;
    }
  },

  mergeAccounts: async (primaryId: string, secondaryIds: string[], mergedData?: any, contactMerges?: { sourceId: string, targetId: string }[], contactIdsToKeep?: string[]): Promise<Account> => {
    if (!auth.currentUser) throw new Error('User not authenticated');

    console.log(`[MERGE_DEBUG] Starting mergeAccounts:`, { primaryId, secondaryIds, contactMerges, contactIdsToKeep });

    try {
      const batch = writeBatch(db);
      const primaryRef = doc(db, 'accounts', primaryId);
      const primaryDoc = await getDoc(primaryRef);
      if (!primaryDoc.exists()) {
        console.error(`[MERGE_DEBUG] Primary account ${primaryId} not found`);
        throw new Error('Primary account not found');
      }

      // Update primary with merged data if provided
      if (mergedData) {
        console.log(`[MERGE_DEBUG] Updating primary account with merged data`);
        const { id, uid, createdAt, ...dataToUpdate } = mergedData;
        if (Object.keys(dataToUpdate).length > 0) {
          const sanitizedUpdate = sanitizeForFirestore(dataToUpdate);
          batch.update(primaryRef, sanitizedUpdate);
        }
      }

      // Handle contact merges within the same batch if possible
      if (contactMerges && contactMerges.length > 0) {
        console.log(`[MERGE_DEBUG] Processing ${contactMerges.length} contact merges`);
        for (const merge of contactMerges) {
          const sourceContactRef = doc(db, 'contacts', merge.sourceId);
          const targetContactRef = doc(db, 'contacts', merge.targetId);
          
          batch.delete(sourceContactRef);
          const sanitizedContactUpdate = sanitizeForFirestore({ accountId: primaryId });
          batch.update(targetContactRef, sanitizedContactUpdate);
        }
      }

      const allAccountIds = [primaryId, ...secondaryIds];
      console.log(`[MERGE_DEBUG] Fetching contacts for accounts:`, allAccountIds);
      
      // Fetch only contacts related to the accounts being merged
      const contactsQ = query(
        collection(db, 'contacts'), 
        where('accountId', 'in', allAccountIds),
        where('uid', '==', auth.currentUser.uid)
      );
      const contactsSnapshot = await getDocs(contactsQ);
      console.log(`[MERGE_DEBUG] Found ${contactsSnapshot.size} related contacts`);
      
      let contactsProcessed = 0;
      for (const contactDoc of contactsSnapshot.docs) {
        const contactData = contactDoc.data();
        const contactId = contactDoc.id;
        const contactRef = doc(db, 'contacts', contactId);
        
        // Skip if this contact is already being merged into another
        if (contactMerges?.some(m => m.sourceId === contactId)) continue;
        
        contactsProcessed++;
        if (contactIdsToKeep && !contactIdsToKeep.includes(contactId)) {
          console.log(`[MERGE_DEBUG] Deleting contact ${contactId} (not in keep list)`);
          batch.delete(contactRef);
        } else if (secondaryIds.includes(contactData.accountId)) {
          console.log(`[MERGE_DEBUG] Moving contact ${contactId} to primary account`);
          const sanitizedContactUpdate = sanitizeForFirestore({ accountId: primaryId });
          batch.update(contactRef, sanitizedContactUpdate);
        }
      }
      console.log(`[MERGE_DEBUG] Processed ${contactsProcessed} contacts`);

      // Fetch all secondary accounts to get their names for fallback lead matching
      const secondaryAccountsSnapshot = await Promise.all(
        secondaryIds.map(id => getDoc(doc(db, 'accounts', id)))
      );
      
      const secondaryNames = secondaryAccountsSnapshot
        .map(snap => snap.data()?.name)
        .filter(Boolean) as string[];

      let totalOps = secondaryIds.length + contactsProcessed;
      for (const secondaryId of secondaryIds) {
        if (secondaryId === primaryId) continue;
        
        console.log(`[MERGE_DEBUG] Processing secondary account: ${secondaryId}`);
        
        // Leads by accountId
        const leadsQ = query(collection(db, 'leads'), where('accountId', '==', secondaryId));
        const leadsSnapshot = await getDocs(leadsQ);
        totalOps += leadsSnapshot.size;
        for (const leadDoc of leadsSnapshot.docs) {
          const sanitizedLeadUpdate = sanitizeForFirestore({ 
            accountId: primaryId,
            accountName: primaryDoc.data()?.name || leadDoc.data().accountName
          });
          batch.update(doc(db, 'leads', leadDoc.id), sanitizedLeadUpdate);
        }

        // Leads by accountName (fallback)
        const secondaryAcc = secondaryAccountsSnapshot.find(s => s.id === secondaryId);
        const sName = secondaryAcc?.data()?.name;
        if (sName) {
          const leadsByNameQ = query(
            collection(db, 'leads'), 
            where('accountName', '==', sName), 
            where('uid', '==', auth.currentUser.uid)
          );
          const leadsByNameSnapshot = await getDocs(leadsByNameQ);
          for (const leadDoc of leadsByNameSnapshot.docs) {
            if (!leadsSnapshot.docs.some(d => d.id === leadDoc.id)) {
              totalOps++;
              const sanitizedLeadUpdate = sanitizeForFirestore({ 
                accountId: primaryId,
                accountName: primaryDoc.data()?.name || leadDoc.data().accountName
              });
              batch.update(doc(db, 'leads', leadDoc.id), sanitizedLeadUpdate);
            }
          }
        }

        // Notes
        const notesQ = query(collection(db, 'notes'), where('accountId', '==', secondaryId));
        const notesSnapshot = await getDocs(notesQ);
        totalOps += notesSnapshot.size;
        for (const noteDoc of notesSnapshot.docs) {
          const sanitizedNoteUpdate = sanitizeForFirestore({ accountId: primaryId });
          batch.update(doc(db, 'notes', noteDoc.id), sanitizedNoteUpdate);
        }

        // Reminders
        const remindersQ = query(collection(db, 'reminders'), where('accountId', '==', secondaryId));
        const remindersSnapshot = await getDocs(remindersQ);
        totalOps += remindersSnapshot.size;
        for (const reminderDoc of remindersSnapshot.docs) {
          const sanitizedReminderUpdate = sanitizeForFirestore({ accountId: primaryId });
          batch.update(doc(db, 'reminders', reminderDoc.id), sanitizedReminderUpdate);
        }

        // Delete secondary account
        batch.delete(doc(db, 'accounts', secondaryId));
      }

      console.log(`[MERGE_DEBUG] Committing batch with ${totalOps} operations...`);
      
      if (totalOps > 500) {
        throw new Error(`Merge operation too large (${totalOps} operations). Please merge fewer items at once or clean up related data first.`);
      }
      
      // Add a timeout to the commit to prevent indefinite hanging
      const commitPromise = batch.commit();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore operation timed out after 30 seconds')), 30000)
      );

      await Promise.race([commitPromise, timeoutPromise]);
      console.log('[MERGE_DEBUG] Merge batch committed successfully');

      const updatedPrimary = await getDoc(primaryRef);
      return { id: updatedPrimary.id, ...updatedPrimary.data() } as Account;
    } catch (error) {
      console.error('[MERGE_DEBUG] Merge accounts failed:', error);
      handleFirestoreError(error, OperationType.WRITE, 'accounts/merge');
      throw error;
    }
  },

  deleteAccount: async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'accounts', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        await crmService.logActivity({
          type: 'delete',
          entityType: 'account',
          entityId: id,
          description: `Deleted Account: ${data.name}`,
          data: data
        });
      }
      await deleteDoc(docRef);
      
      // Also delete associated contacts
      const contactsQ = query(collection(db, 'contacts'), where('accountId', '==', id));
      const contactsSnapshot = await getDocs(contactsQ);
      for (const contactDoc of contactsSnapshot.docs) {
        await deleteDoc(doc(db, 'contacts', contactDoc.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accounts/${id}`);
    }
  },

  // Contacts
  getContacts: async (): Promise<Contact[]> => {
    if (!auth.currentUser) return [];
    try {
      const q = query(collection(db, 'contacts'), where('uid', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)).sort((a, b) => a.firstName.localeCompare(b.firstName));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
      return [];
    }
  },

  addContact: async (contact: Omit<Contact, 'id' | 'createdAt' | 'history' | 'uid'> & { id?: string; createdAt?: string; history?: HistoryEntry[]; uid?: string }): Promise<Contact> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const id = contact.id || crypto.randomUUID();
    const createdAt = contact.createdAt || new Date().toISOString();
    const uid = contact.uid || auth.currentUser.uid;
    
    const historyEntry = crmService.createHistoryEntry('Created', `Contact created: ${contact.firstName} ${contact.lastName}`);
    
    const newContact: Contact = { 
      ...contact, 
      id, 
      createdAt, 
      uid,
      history: contact.history ? [...contact.history, historyEntry] : [historyEntry] 
    };
    try {
      const sanitizedContact = sanitizeForFirestore(newContact);
      await setDoc(doc(db, 'contacts', id), sanitizedContact);
      await crmService.logActivity({
        type: 'create',
        entityType: 'contact',
        entityId: id,
        description: `Created Contact: ${newContact.firstName} ${newContact.lastName}`,
        data: newContact
      });
      return newContact;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `contacts/${id}`);
      throw error;
    }
  },

  updateContact: async (id: string, data: Partial<Contact>): Promise<Contact> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'contacts', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error('Contact not found');
      const original = snapshot.data() as Contact;

      // Track changes for history
      const changes: HistoryEntry['changes'] = [];
      Object.keys(data).forEach(key => {
        const k = key as keyof Contact;
        if (JSON.stringify(data[k]) !== JSON.stringify(original[k]) && k !== 'history') {
          changes.push({
            field: key,
            oldValue: original[k],
            newValue: data[k]
          });
        }
      });

      let updatedData = { ...data };
      if (changes.length > 0) {
        const historyEntry = crmService.createHistoryEntry('Updated', `Contact updated`, changes);
        updatedData.history = [...(original.history || []), historyEntry];
      }

      const sanitizedData = sanitizeForFirestore(updatedData);
      await updateDoc(docRef, sanitizedData);
      const updatedDoc = await getDoc(docRef);
      const result = { id: updatedDoc.id, ...updatedDoc.data() } as Contact;

      await crmService.logActivity({
        type: 'update',
        entityType: 'contact',
        entityId: id,
        description: `Updated Contact: ${result.firstName} ${result.lastName}`,
        data: result,
        previousData: original
      });

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contacts/${id}`);
      throw error;
    }
  },

  mergeContacts: async (primaryId: string, secondaryId: string, mergedData?: any): Promise<Contact> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const batch = writeBatch(db);
      const primaryRef = doc(db, 'contacts', primaryId);
      const secondaryRef = doc(db, 'contacts', secondaryId);
      
      const primaryDoc = await getDoc(primaryRef);
      if (!primaryDoc.exists()) throw new Error('Contact not found');

      // Update primary with merged data if provided
      if (mergedData) {
        const { id, uid, createdAt, ...dataToUpdate } = mergedData;
        if (Object.keys(dataToUpdate).length > 0) {
          const sanitizedUpdate = sanitizeForFirestore(dataToUpdate);
          batch.update(primaryRef, sanitizedUpdate);
        }
      }

      batch.delete(secondaryRef);
      
      // Move notes associated with secondary contact to primary
      const notesQ = query(collection(db, 'notes'), where('contactId', '==', secondaryId));
      const notesSnapshot = await getDocs(notesQ);
      for (const noteDoc of notesSnapshot.docs) {
        const sanitizedNoteUpdate = sanitizeForFirestore({ contactId: primaryId });
        batch.update(doc(db, 'notes', noteDoc.id), sanitizedNoteUpdate);
      }

      await batch.commit();
      
      const updatedPrimary = await getDoc(primaryRef);
      return { id: updatedPrimary.id, ...updatedPrimary.data() } as Contact;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `contacts/merge`);
      throw error;
    }
  },

  deleteContact: async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'contacts', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        await crmService.logActivity({
          type: 'delete',
          entityType: 'contact',
          entityId: id,
          description: `Deleted Contact: ${data.firstName} ${data.lastName}`,
          data: data
        });
      }
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `contacts/${id}`);
    }
  },

  // Leads
  getLeads: async (): Promise<Lead[]> => {
    if (!auth.currentUser) return [];
    try {
      const q = query(collection(db, 'leads'), where('uid', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)).sort((a, b) => a.firstName.localeCompare(b.firstName));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'leads');
      return [];
    }
  },

  addLead: async (lead: Omit<Lead, 'id' | 'createdAt' | 'history' | 'uid'> & { id?: string; createdAt?: string; history?: HistoryEntry[]; uid?: string }): Promise<Lead> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const id = lead.id || crypto.randomUUID();
    const createdAt = lead.createdAt || new Date().toISOString();
    const uid = lead.uid || auth.currentUser.uid;
    
    const historyEntry = crmService.createHistoryEntry('Created', `Lead created: ${lead.firstName} ${lead.lastName}`);
    
    const newLead: Lead = { 
      ...lead, 
      id, 
      createdAt, 
      uid,
      history: lead.history ? [...lead.history, historyEntry] : [historyEntry] 
    };
    try {
      const sanitizedLead = sanitizeForFirestore(newLead);
      await setDoc(doc(db, 'leads', id), sanitizedLead);
      await crmService.logActivity({
        type: 'create',
        entityType: 'lead',
        entityId: id,
        description: `Created Lead: ${newLead.firstName} ${newLead.lastName}`,
        data: newLead
      });
      return newLead;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `leads/${id}`);
      throw error;
    }
  },

  updateLead: async (id: string, data: Partial<Lead>): Promise<Lead> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'leads', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error('Lead not found');
      const original = snapshot.data() as Lead;

      // Track changes for history
      const changes: HistoryEntry['changes'] = [];
      Object.keys(data).forEach(key => {
        const k = key as keyof Lead;
        if (JSON.stringify(data[k]) !== JSON.stringify(original[k]) && k !== 'history') {
          changes.push({
            field: key,
            oldValue: original[k],
            newValue: data[k]
          });
        }
      });

      let updatedData = { ...data };
      if (changes.length > 0) {
        const historyEntry = crmService.createHistoryEntry('Updated', `Lead updated`, changes);
        updatedData.history = [...(original.history || []), historyEntry];
      }

      const sanitizedData = sanitizeForFirestore(updatedData);
      await updateDoc(docRef, sanitizedData);
      const updatedDoc = await getDoc(docRef);
      const result = { id: updatedDoc.id, ...updatedDoc.data() } as Lead;

      await crmService.logActivity({
        type: 'update',
        entityType: 'lead',
        entityId: id,
        description: `Updated Lead: ${result.firstName} ${result.lastName}`,
        data: result,
        previousData: original
      });

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${id}`);
      throw error;
    }
  },

  mergeLeads: async (primaryId: string, secondaryId: string, mergedData?: any): Promise<Lead> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const batch = writeBatch(db);
      const primaryRef = doc(db, 'leads', primaryId);
      const secondaryRef = doc(db, 'leads', secondaryId);

      const primaryDoc = await getDoc(primaryRef);
      if (!primaryDoc.exists()) throw new Error('Lead not found');

      // Update primary with merged data if provided
      if (mergedData) {
        const { id, uid, createdAt, ...dataToUpdate } = mergedData;
        if (Object.keys(dataToUpdate).length > 0) {
          const sanitizedUpdate = sanitizeForFirestore(dataToUpdate);
          batch.update(primaryRef, sanitizedUpdate);
        }
      }

      batch.delete(secondaryRef);
      
      // Move notes associated with secondary lead to primary
      const notesQ = query(collection(db, 'notes'), where('leadId', '==', secondaryId));
      const notesSnapshot = await getDocs(notesQ);
      for (const noteDoc of notesSnapshot.docs) {
        const sanitizedNoteUpdate = sanitizeForFirestore({ leadId: primaryId });
        batch.update(doc(db, 'notes', noteDoc.id), sanitizedNoteUpdate);
      }

      await batch.commit();
      
      const updatedPrimary = await getDoc(primaryRef);
      return { id: updatedPrimary.id, ...updatedPrimary.data() } as Lead;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `leads/merge`);
      throw error;
    }
  },

  deleteLead: async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'leads', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        await crmService.logActivity({
          type: 'delete',
          entityType: 'lead',
          entityId: id,
          description: `Deleted Lead: ${data.firstName} ${data.lastName}`,
          data: data
        });
      }
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leads/${id}`);
    }
  },

  convertLead: async (leadId: string, accountData: Omit<Account, 'id' | 'createdAt' | 'name' | 'history' | 'uid'>): Promise<{ account: Account, contacts: Contact[] }> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    const leadDoc = await getDoc(doc(db, 'leads', leadId));
    if (!leadDoc.exists()) throw new Error('Lead not found');
    const lead = leadDoc.data() as Lead;

    // 0. Prepare history for new entities
    let leadHistory = lead.history || [];
    const hasCreatedEntry = leadHistory.some(entry => entry.action === 'Created');
    if (!hasCreatedEntry && lead.createdAt) {
      leadHistory = [{
        timestamp: lead.createdAt,
        action: 'Created',
        userId: lead.uid || 'system',
        userName: 'System',
        details: 'Initial lead creation'
      }, ...leadHistory];
    }

    const conversionEntry = crmService.createHistoryEntry('Converted', `Converted from Lead: ${lead.firstName} ${lead.lastName}`);
    const historyForNewEntities = [...leadHistory, conversionEntry];

    // 1. Create Account
    const account = await crmService.addAccount({
      name: lead.accountName || 'Unnamed Account',
      industries: (accountData.industries && accountData.industries.length > 0) ? accountData.industries : (lead.industries || (lead.industry ? [lead.industry] : ['Others'])),
      phones: (accountData.phones && accountData.phones.length > 0) ? accountData.phones : (lead.phones || (lead.phone ? [lead.phone] : [])),
      emails: (accountData.emails && accountData.emails.length > 0) ? accountData.emails : (lead.emails || (lead.email ? [lead.email] : [])),
      history: historyForNewEntities,
      ...accountData
    });

    // 2. Create Primary Contact
    const primaryContact = await crmService.addContact({
      accountId: account.id,
      salutation: lead.salutation,
      firstName: lead.firstName,
      lastName: lead.lastName,
      designation: lead.designation,
      department: lead.department,
      email: lead.email || '',
      emails: lead.emails || [lead.email || ''],
      secondaryEmail: lead.secondaryEmail,
      phone: lead.phone || '',
      phones: lead.phones || [lead.phone || ''],
      telephone: lead.telephone,
      history: historyForNewEntities
    });

    const contacts: Contact[] = [primaryContact];

    // 3. Create Additional Contacts if any
    if (lead.additionalContacts && lead.additionalContacts.length > 0) {
      for (const person of lead.additionalContacts) {
        const contact = await crmService.addContact({
          accountId: account.id,
          salutation: person.salutation,
          firstName: person.firstName,
          lastName: person.lastName,
          designation: person.designation,
          department: person.department,
          email: person.email,
          emails: [person.email],
          phone: person.phone,
          phones: [person.phone],
          history: historyForNewEntities
        });
        contacts.push(contact);
      }
    }

    // 4. Update Lead Status and associate with account
    const historyEntry = crmService.createHistoryEntry('Converted', `Lead converted to Account: ${account.name}`);
    const leadUpdate = sanitizeForFirestore({ 
      status: 'Converted',
      accountId: account.id,
      history: [...(lead.history || []), historyEntry]
    });
    await updateDoc(doc(db, 'leads', leadId), leadUpdate);

    // 5. Move Notes
    const notesQ = query(collection(db, 'notes'), where('leadId', '==', leadId));
    const notesSnapshot = await getDocs(notesQ);
    for (const noteDoc of notesSnapshot.docs) {
      const noteUpdate = sanitizeForFirestore({ 
        leadId: null, 
        accountId: account.id, 
        contactId: primaryContact.id 
      });
      await updateDoc(doc(db, 'notes', noteDoc.id), noteUpdate);
    }

    return { account, contacts };
  },

  bulkConvertLeads: async (leadIds: string[]): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    for (const leadId of leadIds) {
      try {
        const leadDoc = await getDoc(doc(db, 'leads', leadId));
        if (!leadDoc.exists()) continue;
        const lead = leadDoc.data() as Lead;
        if (lead.status === 'Converted') continue;

        // Use defaults from lead for account data
        const accountData = {
          industries: lead.industries || (lead.industry ? [lead.industry] : ['Others']),
          address: {
            flatHouseNo: '',
            street: lead.street || '',
            city: lead.city || '',
            pinCode: lead.pinCode || '',
            country: lead.country || 'United Arab Emirates'
          },
          phones: (lead.phones && lead.phones.length > 0) ? lead.phones : (lead.phone ? [lead.phone] : []),
          emails: (lead.emails && lead.emails.length > 0) ? lead.emails : (lead.email ? [lead.email] : []),
          website: lead.website || '',
          lat: lead.lat || 25.2048,
          lng: lead.lng || 55.2708
        };

        await crmService.convertLead(leadId, accountData as any);
      } catch (error) {
        console.error(`Error converting lead ${leadId}:`, error);
      }
    }
  },

  // Reminders
  getReminders: async (): Promise<Reminder[]> => {
    if (!auth.currentUser) return [];
    try {
      const q = query(collection(db, 'reminders'), where('uid', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reminders');
      return [];
    }
  },

  addReminder: async (reminder: Omit<Reminder, 'id' | 'createdAt' | 'completed'> & { id?: string; createdAt?: string; completed?: boolean }): Promise<Reminder> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const id = reminder.id || crypto.randomUUID();
    const createdAt = reminder.createdAt || new Date().toISOString();
    const completed = reminder.completed !== undefined ? reminder.completed : false;
    const newReminder: Reminder = { ...reminder, id, createdAt, completed };
    try {
      const sanitizedReminder = sanitizeForFirestore({ ...newReminder, uid: auth.currentUser.uid });
      await setDoc(doc(db, 'reminders', id), sanitizedReminder);
      await crmService.logActivity({
        type: 'create',
        entityType: 'reminder',
        entityId: id,
        description: `Created Reminder: ${newReminder.title}`,
        data: newReminder
      });
      return newReminder;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reminders/${id}`);
      throw error;
    }
  },

  updateReminder: async (id: string, data: Partial<Reminder>): Promise<Reminder> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'reminders', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error('Reminder not found');
      const original = snapshot.data() as Reminder;

      const sanitizedData = sanitizeForFirestore(data);
      await updateDoc(docRef, sanitizedData);
      const updatedDoc = await getDoc(docRef);
      const result = { id: updatedDoc.id, ...updatedDoc.data() } as Reminder;

      await crmService.logActivity({
        type: 'update',
        entityType: 'reminder',
        entityId: id,
        description: `Updated Reminder: ${result.title}`,
        data: result,
        previousData: original
      });

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reminders/${id}`);
      throw error;
    }
  },

  // Notes
  getNotes: async (): Promise<Note[]> => {
    if (!auth.currentUser) return [];
    try {
      const q = query(collection(db, 'notes'), where('uid', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'notes');
      return [];
    }
  },

  addNote: async (note: Omit<Note, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<Note> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const id = note.id || crypto.randomUUID();
    const createdAt = note.createdAt || new Date().toISOString();
    const newNote: Note = { ...note, id, createdAt };
    try {
      const sanitizedNote = sanitizeForFirestore({ ...newNote, uid: auth.currentUser.uid });
      await setDoc(doc(db, 'notes', id), sanitizedNote);
      await crmService.logActivity({
        type: 'create',
        entityType: 'note',
        entityId: id,
        description: `Created Note: ${newNote.title}`,
        data: newNote
      });
      return newNote;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notes/${id}`);
      throw error;
    }
  },

  updateNote: async (id: string, data: Partial<Note>): Promise<Note> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'notes', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error('Note not found');
      const original = snapshot.data() as Note;

      const sanitizedData = sanitizeForFirestore(data);
      await updateDoc(docRef, sanitizedData);
      const updatedDoc = await getDoc(docRef);
      const result = { id: updatedDoc.id, ...updatedDoc.data() } as Note;

      await crmService.logActivity({
        type: 'update',
        entityType: 'note',
        entityId: id,
        description: `Updated Note: ${result.title}`,
        data: result,
        previousData: original
      });

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${id}`);
      throw error;
    }
  },

  deleteNote: async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'notes', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        await crmService.logActivity({
          type: 'delete',
          entityType: 'note',
          entityId: id,
          description: `Deleted Note: ${data.title}`,
          data: data
        });
      }
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
    }
  },

  deleteReminder: async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    try {
      const docRef = doc(db, 'reminders', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        await crmService.logActivity({
          type: 'delete',
          entityType: 'reminder',
          entityId: id,
          description: `Deleted Reminder: ${data.title}`,
          data: data
        });
      }
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reminders/${id}`);
    }
  },

  // Proximity
  getNearbyAccounts: async (location: UserLocation, radiusKm: number = 5): Promise<Account[]> => {
    const all = await crmService.getAccounts();
    return all.filter(a => getDistance(location, { lat: a.lat, lng: a.lng }) <= radiusKm);
  },

  // Excel Import
  importContacts: async (data: any[], onProgress?: (current: number, total: number) => void): Promise<{ success: number; errors: string[] }> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const errors: string[] = [];
    let successCount = 0;
    const total = data.length;
    
    try {
      // Fetch all accounts and contacts once to optimize lookups
      const [existingAccounts, existingContacts] = await Promise.all([
        crmService.getAccounts(),
        crmService.getContacts()
      ]);

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const accountName = row['Account Name'] || row['name'];
          const firstName = row['First Name'] || row['firstName'];
          const lastName = row['Last Name'] || row['lastName'];
          const email = row['Email'] || row['email'];
          
          if (!accountName) {
            errors.push(`Row ${i + 1}: Missing Account Name`);
            continue;
          }

          const address: Address = {
            flatHouseNo: row['Flat / House No. / Building / Apartment Name'] || '',
            street: row['Street'] || '',
            city: row['City'] || row['city'] || '',
            pinCode: row['Pin Code'] || row['pinCode'] || '',
            country: row['Country'] || row['country'] || ''
          };

          const fullAddress = `${address.flatHouseNo} ${address.street} ${address.city} ${address.country}`.trim();
          let location: { lat: number; lng: number } | null = null;

          if (row['Latitude'] || row['lat']) {
            location = {
              lat: parseFloat(row['Latitude'] || row['lat']),
              lng: parseFloat(row['Longitude'] || row['lng'])
            };
          } else {
            location = await crmService.geocode(`${accountName}, ${fullAddress}`);
          }
          
          if (!location || isNaN(location.lat) || isNaN(location.lng)) {
            location = { lat: 25.2048, lng: 55.2708 };
          }

          let account = existingAccounts.find(a => a.name.toLowerCase() === accountName.toLowerCase());
          
          const accountData: Omit<Account, 'id' | 'createdAt' | 'uid'> = {
            name: accountName,
            industry: (row['Industry'] || row['industry'] || 'End User') as Industry,
            industries: [ (row['Industry'] || row['industry'] || 'End User') as Industry ],
            address,
            lat: location.lat,
            lng: location.lng,
            phone: row['Phone'] || row['phone'] || '',
            phones: [ row['Phone'] || row['phone'] || '' ],
            telephone: row['Telephone'] || row['telephone'] || '',
            email: email || '',
            emails: [ email || '' ],
            website: row['Website'] || row['website'] || ''
          };

          if (account) {
            await crmService.updateAccount(account.id, accountData);
            account = { ...account, ...accountData };
          } else {
            account = await crmService.addAccount(accountData);
            existingAccounts.push(account); // Add to local list for subsequent rows
          }

          let contact = existingContacts.find(c => 
            c.accountId === account!.id && 
            c.email.toLowerCase() === (email || '').toLowerCase()
          );

          const contactData: Omit<Contact, 'id' | 'createdAt' | 'uid'> = {
            accountId: account.id,
            salutation: row['Salutation'] || row['salutation'] || 'Mr.',
            firstName: firstName || 'Unknown',
            lastName: lastName || 'Unknown',
            designation: row['Designation'] || row['designation'] || '',
            department: (row['Department'] || row['department'] || 'Others') as Department,
            email: email || '',
            emails: [ email || '' ],
            phone: row['Phone'] || row['phone'] || '',
            phones: [ row['Phone'] || row['phone'] || '' ],
            telephone: row['Telephone'] || row['telephone'] || ''
          };

          if (contact) {
            await crmService.updateContact(contact.id, contactData);
          } else {
            const newContact = await crmService.addContact(contactData);
            existingContacts.push(newContact); // Add to local list for subsequent rows
          }

          successCount++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unexpected error'}`);
        }
        
        if (onProgress) {
          onProgress(i + 1, total);
        }
      }
    } catch (err) {
      errors.push(`General error: ${err instanceof Error ? err.message : 'Unexpected error'}`);
    }

    return { success: successCount, errors };
  },

  detectDuplicates: (items: any[], type: 'accounts' | 'contacts' | 'leads'): { [name: string]: any[] } => {
    const duplicates: { [name: string]: any[] } = {};
    const matchMap: { [key: string]: any[] } = {};

    items.forEach(item => {
      const keys: string[] = [];
      
      if (type === 'accounts') {
        if (item.name) keys.push(`name:${item.name.toLowerCase().trim()}`);
      } else {
        // For contacts and leads, check name, email, and phone
        const fullName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase().trim();
        if (fullName && fullName !== ' ') keys.push(`name:${fullName}`);
        
        if (item.email) keys.push(`email:${item.email.toLowerCase().trim()}`);
        if (item.emails && Array.isArray(item.emails)) {
          item.emails.forEach((e: string) => {
            if (e) keys.push(`email:${e.toLowerCase().trim()}`);
          });
        }
        
        if (item.phone) {
          const cleanPhone = item.phone.replace(/\D/g, '');
          if (cleanPhone) keys.push(`phone:${cleanPhone}`);
        }
        if (item.phones && Array.isArray(item.phones)) {
          item.phones.forEach((p: string) => {
            if (p) {
              const cp = p.replace(/\D/g, '');
              if (cp) keys.push(`phone:${cp}`);
            }
          });
        }
      }

      // Use a Set to avoid duplicate keys for the same item
      const uniqueKeys = Array.from(new Set(keys));
      
      uniqueKeys.forEach(key => {
        if (!matchMap[key]) {
          matchMap[key] = [];
        }
        // Only add if not already in the list for this key
        if (!matchMap[key].find(i => i.id === item.id)) {
          matchMap[key].push(item);
        }
      });
    });

    Object.keys(matchMap).forEach(key => {
      if (matchMap[key].length > 1) {
        // Use the key (e.g., "email:test@example.com") as the duplicate group name
        duplicates[key] = matchMap[key];
      }
    });

    return duplicates;
  },

  bulkDelete: async (ids: string[], type: 'accounts' | 'contacts' | 'leads'): Promise<void> => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const deletePromises = ids.map(id => {
      if (type === 'accounts') return crmService.deleteAccount(id);
      if (type === 'contacts') return crmService.deleteContact(id);
      return crmService.deleteLead(id);
    });
    await Promise.all(deletePromises);
  }
};

// Authentic UAE projects and industrial intelligence for offline reference or fallback
function getMockMarketInsights(excludeNames: string[]): MarketInsight[] {
  const allMocks: MarketInsight[] = [
    {
      id: 'uae-project-warsan-wte',
      projectName: 'Dubai Waste-to-Energy Facility - Warsan Expansion',
      location: 'Warsan Industrial Area, Dubai, UAE',
      status: 'Under Construction',
      category: 'Industrial Automation & PLCs',
      contractor: 'Hitachi Zosen Inova & Danway Electrical',
      consultant: 'Ramboll Middle East',
      description: 'Major thermal waste treatment and renewable energy plant generating 200MW clean electricity for Dubai grid.',
      relevance: 'Extensive scope for DCS/PLC automation, boiler draft fan motor drives, and MCC panels.',
      scope: 'Supply of 24x 400kW medium & low voltage VFDs, redundant PLC controllers, and 415V Form 4 Type 7 MCCs.',
      tenderLink: 'https://www.dewa.gov.ae/en/supplier/tenders',
      website: 'https://www.besix.com',
      companyDetails: 'Joint venture between BESIX, Hitachi Zosen Inova, and Danway Electrical Engineering LLC.',
      publishedDate: 'Early 2026',
      dateFound: new Date().toISOString(),
      type: 'project',
      lat: 25.1610,
      lng: 55.4055,
      contactPerson: 'Danway Electrical Tenders Directorate',
      contactPhone: '+971 4 347 3700',
      contactEmail: 'electrical.tenders@danway.com'
    },
    {
      id: 'uae-project-hassyan-swro',
      projectName: 'DEWA Hassyan 120 MIGD Seawater Reverse Osmosis Plant',
      location: 'Saih Shuaib, Dubai, UAE',
      status: 'Under Construction',
      category: 'HVAC & Pump Controls',
      contractor: 'Larsen & Toubro (L&T) Construction Electrical',
      consultant: 'ILF Consulting Engineers',
      description: 'Ultra-modern seawater desalination facility utilizing energy-efficient high-pressure membrane technology.',
      relevance: 'High volume requirement for high-pressure pump VFDs and harmonic mitigation.',
      scope: 'Supply of 16x 1.8MW high-pressure pump variable frequency drives, harmonic active filters, and smart motor protection relays.',
      tenderLink: 'https://www.dewa.gov.ae/en/consumer/innovation/hassyan-swro',
      website: 'https://www.larsentoubro.com',
      companyDetails: 'Larsen & Toubro Middle East Electrical & Automation Division.',
      publishedDate: 'Late 2025 / 2026',
      dateFound: new Date().toISOString(),
      type: 'project',
      lat: 24.9312,
      lng: 54.9810,
      contactPerson: 'Procurement Department (L&T Middle East)',
      contactPhone: '+971 4 454 9900',
      contactEmail: 'info.uae@larsentoubro.com'
    },
    {
      id: 'uae-project-adnoc-habshan',
      projectName: 'ADNOC Gas Processing - Habshan Plant Automation Modernization',
      location: 'Habshan Industrial Complex, Abu Dhabi, UAE',
      status: 'Tender',
      category: 'Power Quality & Harmonics',
      contractor: 'Target Engineering Construction Co.',
      consultant: 'Technip Energies UAE',
      description: 'Comprehensive electrical reliability upgrade and harmonic filter integration for high-power gas compressor motors.',
      relevance: 'Specialized power quality filters and explosion-proof motor starters.',
      scope: 'Supply and commissioning of 8x Active Harmonic Filters (600A each) and Hazardous Area ATEX MCC panels.',
      tenderLink: 'https://www.adnoc.ae/en/suppliers/tenders',
      website: 'https://www.target.ae',
      companyDetails: 'Target Engineering Construction Co. (a subsidiary of ALEC Engineering).',
      publishedDate: 'Jan 2026',
      dateFound: new Date().toISOString(),
      type: 'project',
      lat: 23.9510,
      lng: 53.7210,
      contactPerson: 'Target Engineering Commercial Procurement',
      contactPhone: '+971 2 673 0000',
      contactEmail: 'procurement@target.ae'
    },
    {
      id: 'uae-project-sewa-kalba',
      projectName: 'SEWA Kalba Desalination & Pumping Station Modernization',
      location: 'Kalba, Sharjah East Coast, UAE',
      status: 'Tender',
      category: 'HVAC & Pump Controls',
      contractor: 'Danway Electrical & Mechanical Engineering',
      consultant: 'Khatib & Alami',
      description: 'Municipal water distribution pumping station upgrade to intelligent motor control centers and SCADA telemetry.',
      relevance: 'Direct match for intelligent pump control panels, soft starters, and RTU telemetry.',
      scope: 'Supply of 18 intelligent MCCs with integrated soft starters, redundant Siemens S7-1500 PLC architecture.',
      tenderLink: 'https://www.sewa.gov.ae/en/tenders',
      website: 'https://www.danway.com',
      companyDetails: 'Sharjah Electricity, Water and Gas Authority (SEWA) capital development initiative.',
      publishedDate: 'Feb 2026',
      dateFound: new Date().toISOString(),
      type: 'project',
      lat: 25.0320,
      lng: 56.3530,
      contactPerson: 'SEWA Procurement & Contracts Department',
      contactPhone: '+971 6 528 7000',
      contactEmail: 'tenders@sewa.gov.ae'
    },
    {
      id: 'uae-project-etihad-rail',
      projectName: 'Etihad Rail Stage 2 Freight Depot Automation & Maintenance Facilities',
      location: 'Al Faya & Al Mirfa, Abu Dhabi, UAE',
      status: 'Newly Acquired',
      category: 'Industrial Automation & PLCs',
      contractor: 'BK Gulf LLC / China State Joint Venture',
      consultant: 'Jacobs & Egis Rail',
      description: 'National railway maintenance depots, automated train washing facilities, and locomotive workshop power networks.',
      relevance: 'Heavy-duty industrial motor controls, overhead crane power busways, and supervisory SCADA.',
      scope: 'Depot automated power distribution boards (MDB 3200A), overhead crane auxiliary starter panels, and Allen-Bradley PLCs.',
      tenderLink: 'https://www.etihadrail.ae/tenders',
      website: 'https://www.bkgulf.com',
      companyDetails: 'BK Gulf LLC (Balfour Beatty & Dutco Group).',
      publishedDate: 'Nov 2025',
      dateFound: new Date().toISOString(),
      type: 'project',
      lat: 24.1120,
      lng: 54.4210,
      contactPerson: 'BK Gulf Procurement Directorate',
      contactPhone: '+971 4 330 6000',
      contactEmail: 'tenders@bkgulf.com'
    },
    {
      id: 'uae-project-dubai-south',
      projectName: 'Dubai South Aviation District Logistics Park Substation & MDB Package',
      location: 'Dubai South (DWC), Jebel Ali, Dubai, UAE',
      status: 'Under Construction',
      category: 'Building Electrical (MDB/DB/MCC)',
      contractor: 'Al Naboodah MEP / Voltas Limited',
      consultant: 'AECOM Middle East',
      description: 'New mega air-cargo logistics and aerospace support warehouses adjacent to Al Maktoum International Airport.',
      relevance: 'Volume opportunity for main distribution boards, sub-main boards, and power factor correction capacitors.',
      scope: 'Supply of 12 Form 4 Type 7 Main Distribution Boards (2500A-4000A) and 80 SMDBs with automatic power factor correction.',
      tenderLink: 'https://www.dubaisouth.ae/en/business/tenders',
      website: 'https://www.alnaboodah.com',
      companyDetails: 'Al Naboodah Construction Group MEP Division.',
      publishedDate: 'Dec 2025',
      dateFound: new Date().toISOString(),
      type: 'project',
      lat: 24.8922,
      lng: 55.1583,
      contactPerson: 'Al Naboodah MEP Commercial & Tenders Office',
      contactPhone: '+971 4 294 8888',
      contactEmail: 'mep.procurement@alnaboodah.com'
    },
    {
      id: 'uae-project-sharjah-wwtp',
      projectName: 'Sharjah Industrial Waste Water Treatment Plant Phase 4',
      location: 'Al Sajaa Industrial Oasis, Sharjah, UAE',
      status: 'Under Construction',
      category: 'HVAC & Pump Controls',
      contractor: 'Metito Utilities & BK Gulf',
      consultant: 'Mott MacDonald Middle East',
      description: 'Expansion of municipal and industrial effluent processing capacity to 250,000 m3/day.',
      relevance: 'Direct match for submersible pump control panels and aeration blower VFDs.',
      scope: 'Supply of 32 variable speed pump control panels with IP55 enclosures, automated PLC cascade controls.',
      tenderLink: 'https://www.shjmun.gov.ae/en/Tenders',
      website: 'https://www.metito.com',
      companyDetails: 'Metito Utilities Limited UAE Head Office.',
      publishedDate: 'Late 2025',
      dateFound: new Date().toISOString(),
      type: 'project',
      lat: 25.3210,
      lng: 55.5120,
      contactPerson: 'Metito Technical Procurement Lead',
      contactPhone: '+971 6 534 8888',
      contactEmail: 'middleeast@metito.com'
    },
    {
      id: 'uae-project-al-ain-hospital',
      projectName: 'SEHA New Al Ain Hospital - Specialized Medical Facilities Electrical Package',
      location: 'Al Jimi, Al Ain, Abu Dhabi, UAE',
      status: 'Under Construction',
      category: 'Building Electrical (MDB/DB/MCC)',
      contractor: 'Arabtec / Shapoorji Pallonji UAE Electrical',
      consultant: 'ICME Healthcare / AECOM',
      description: 'Major medical center complex requiring isolated power supplies, clean medical grade distribution boards, and ATS.',
      relevance: 'High-specification electrical switchboard and automatic transfer switch requirement.',
      scope: 'Supply of 14 essential power MDBs, 120 SMDBs, and synchronized dual-source ATS control panels.',
      tenderLink: 'https://www.seha.ae/en/suppliers/tenders',
      website: 'https://www.shapoorjipallonji.com',
      companyDetails: 'Shapoorji Pallonji Mideast LLC Electrical Division.',
      publishedDate: 'Jan 2026',
      dateFound: new Date().toISOString(),
      type: 'project',
      lat: 24.2210,
      lng: 55.7210,
      contactPerson: 'Shapoorji Pallonji UAE Procurement Team',
      contactPhone: '+971 4 335 5250',
      contactEmail: 'info.mideast@shapoorji.com'
    }
  ];

  const filtered = allMocks.filter(m => !excludeNames.includes(m.projectName));
  return filtered.slice(0, 10);
}

function getMockProspects(excludeNames: string[]): MarketInsight[] {
  const allMocks: MarketInsight[] = [
    {
      id: 'uae-prospect-voltas',
      projectName: 'Voltas Limited - MEP & Water Management Division UAE',
      location: 'Al Barsha / Al Quoz Industrial 3, Dubai, UAE',
      status: 'Active Prospect',
      category: 'OEM Panel Building',
      description: 'One of the largest Tier-1 MEP contractors and engineering solutions providers in the Middle East with massive panel building and equipment packaging operations.',
      relevance: 'High volume recurring requirements for VFD drives, soft starters, and intelligent MCC components.',
      scope: 'Supply of low-voltage motor drives and switchgear components for ongoing commercial and utility project packages.',
      tenderLink: 'https://www.voltas.com',
      website: 'https://www.voltas.com',
      companyDetails: 'A Tata Enterprise, operating extensively across UAE, Saudi Arabia, and Bahrain.',
      publishedDate: 'Active 2026',
      dateFound: new Date().toISOString(),
      type: 'prospect',
      lat: 25.1180,
      lng: 55.2210,
      contactPerson: 'Commercial Procurement Manager (MEP Division)',
      contactPhone: '+971 4 340 0300',
      contactEmail: 'voltasuae@voltas.com'
    },
    {
      id: 'uae-prospect-danway',
      projectName: 'Danway Electrical & Mechanical Engineering LLC',
      location: 'Al Quoz Industrial 3, Dubai, UAE',
      status: 'Active Prospect',
      category: 'OEM Panel Building',
      description: 'Premier UAE certified switchboard manufacturer and system integrator with in-house Form 4 ASTA-certified panel assembly factories.',
      relevance: 'Key OEM partner for low voltage and medium voltage components, PLC automation, and harmonic active filters.',
      scope: 'OEM supply of circuit breakers, contactors, VFD drives, and active harmonic mitigation units for industrial switchboards.',
      tenderLink: 'https://www.danway.com',
      website: 'https://www.danway.com',
      companyDetails: 'Established UAE engineering leader specializing in substation automation, power generation, and switchgear manufacturing.',
      publishedDate: 'Active 2026',
      dateFound: new Date().toISOString(),
      type: 'prospect',
      lat: 25.1320,
      lng: 55.2410,
      contactPerson: 'General Manager - Switchgear Division',
      contactPhone: '+971 4 347 3700',
      contactEmail: 'info@danway.com'
    },
    {
      id: 'uae-prospect-bkgulf',
      projectName: 'BK Gulf LLC - Modular Solutions & Electrical Division',
      location: 'Jebel Ali Industrial Area 1, Dubai, UAE',
      status: 'Active Prospect',
      category: 'Building Electrical (MDB/DB/MCC)',
      description: 'Leading MEP contracting giant with specialized off-site modular prefabrication plant in Jebel Ali.',
      relevance: 'Modular plant rooms requiring standardized motor control centers, chiller VFDs, and harmonic power filters.',
      scope: 'Standardized pump and AHU motor control packages for modular prefabricated MEP skids.',
      tenderLink: 'https://www.bkgulf.com',
      website: 'https://www.bkgulf.com',
      companyDetails: 'Joint venture between Dutco Group and Balfour Beatty.',
      publishedDate: 'Active 2026',
      dateFound: new Date().toISOString(),
      type: 'prospect',
      lat: 25.0120,
      lng: 55.1020,
      contactPerson: 'Head of Modular Engineering & Sourcing',
      contactPhone: '+971 4 880 1800',
      contactEmail: 'contact@bkgulf.com'
    },
    {
      id: 'uae-prospect-metito',
      projectName: 'Metito Water Treatment & Desalination UAE',
      location: 'Dubai Investments Park 1 (DIP), Dubai, UAE',
      status: 'Active Prospect',
      category: 'HVAC & Pump Controls',
      description: 'Global water treatment OEM and concessionaire specializing in industrial wastewater, recycling, and SWRO plants across the GCC.',
      relevance: 'Repeat demand for pump motor controls, VFD multi-pump staging, and PLC/SCADA automation.',
      scope: 'VFD pump control panels, solar-powered inverter pump drives, and remote telemetry panels.',
      tenderLink: 'https://www.metito.com',
      website: 'https://www.metito.com',
      companyDetails: 'Headquartered in Dubai with operations in over 50 countries.',
      publishedDate: 'Active 2026',
      dateFound: new Date().toISOString(),
      type: 'prospect',
      lat: 24.9810,
      lng: 55.1820,
      contactPerson: 'Senior Procurement & Materials Director',
      contactPhone: '+971 4 810 5000',
      contactEmail: 'info@metito.com'
    },
    {
      id: 'uae-prospect-scientechnic',
      projectName: 'Scientechnic LLC - Industrial Automation & Drives Division',
      location: 'Dubai Industrial City (DIC) & Deira, Dubai, UAE',
      status: 'Active Prospect',
      category: 'Industrial Automation & PLCs',
      description: 'Flagship engineering arm of the Easa Saleh Al Gurg Group, leading system integrator and automation solution provider in the UAE.',
      relevance: 'System integration partnership for factory automation, MCC panels, and power quality solutions.',
      scope: 'Supply and integration of PLC systems, VFD drives, and building energy monitoring systems.',
      tenderLink: 'https://www.scientechnic.com',
      website: 'https://www.scientechnic.com',
      companyDetails: 'One of the UAE’s largest technology solutions providers with over 50 years in the market.',
      publishedDate: 'Active 2026',
      dateFound: new Date().toISOString(),
      type: 'prospect',
      lat: 25.2710,
      lng: 55.3120,
      contactPerson: 'Head of Automation Solutions',
      contactPhone: '+971 4 203 5777',
      contactEmail: 'scientechnic@scientechnic.ae'
    },
    {
      id: 'uae-prospect-ducab',
      projectName: 'Ducab Metals Business & High Voltage Plant',
      location: 'Jebel Ali Industrial Area, Dubai & Musaffah, Abu Dhabi, UAE',
      status: 'Active Prospect',
      category: 'Industrial Modernization',
      description: 'Premier UAE manufacturer of copper and aluminum rod, medium and high voltage cables with extensive extrusion and casting operations.',
      relevance: 'Heavy industrial continuous manufacturing with severe harmonic and motor speed synchronization requirements.',
      scope: 'Drive retrofits on continuous rolling lines, active harmonic mitigation filters, and substation capacitor banks.',
      tenderLink: 'https://www.ducab.com',
      website: 'https://www.ducab.com',
      companyDetails: 'Jointly owned by the Investment Corporation of Dubai (ICD) and ADQ Abu Dhabi.',
      publishedDate: 'Active 2026',
      dateFound: new Date().toISOString(),
      type: 'prospect',
      lat: 25.0180,
      lng: 55.0910,
      contactPerson: 'Plant Maintenance & Engineering Manager',
      contactPhone: '+971 4 815 8888',
      contactEmail: 'ducab@ducab.com'
    },
    {
      id: 'uae-prospect-al-futtaim',
      projectName: 'Al Futtaim Engineering & Technologies - Electrical Division',
      location: 'Airport Road, Garhoud, Dubai, UAE',
      status: 'Active Prospect',
      category: 'Building Electrical (MDB/DB/MCC)',
      description: 'Multi-disciplinary engineering company representing international electrical brands and undertaking large-scale MEP contracts.',
      relevance: 'Regular sourcing of electrical panels, motor control centers, and energy management systems.',
      scope: 'Distribution boards, smart energy meters, and motor control solutions for ongoing commercial and industrial projects.',
      tenderLink: 'https://www.afengg.com',
      website: 'https://www.afengg.com',
      companyDetails: 'Al-Futtaim Group division providing total engineering solutions in the UAE, KSA, Qatar, and Egypt.',
      publishedDate: 'Active 2026',
      dateFound: new Date().toISOString(),
      type: 'prospect',
      lat: 25.2410,
      lng: 55.3510,
      contactPerson: 'Electrical Contracting Procurement Manager',
      contactPhone: '+971 4 211 9111',
      contactEmail: 'engineering@alfuttaim.com'
    }
  ];

  const filtered = allMocks.filter(m => !excludeNames.includes(m.projectName));
  return filtered.slice(0, 10);
}

