import React, { useState, useMemo } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Account, UserLocation, MarketInsight } from '../types';
import { Navigation, Search, X } from 'lucide-react';

interface MapProps {
  userLocation: UserLocation | null;
  pinnedLocation?: UserLocation | null;
  onPinLocation?: (location: UserLocation) => void;
  accounts: Account[];
  prospects: MarketInsight[];
  externalCustomers?: any[];
  onConvertExternal?: (customer: any) => void;
  onEditAccount?: (account: Account) => void;
  isLoaded: boolean;
  theme: 'light' | 'dark';
  nearbyTypeFilter?: 'All' | 'Accounts' | 'Prospects' | 'External';
  nearbyIndustryFilter?: string;
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

const Map: React.FC<MapProps> = ({ 
  userLocation, 
  pinnedLocation, 
  onPinLocation, 
  accounts, 
  prospects, 
  externalCustomers = [],
  onConvertExternal,
  onEditAccount,
  isLoaded, 
  theme, 
  nearbyTypeFilter = 'All',
  nearbyIndustryFilter = 'All'
}) => {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<MarketInsight | null>(null);
  const [selectedExternal, setSelectedExternal] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const filteredItems = useMemo(() => {
    let combined = [
      ...accounts.map(a => ({ ...a, type: 'account' as const })),
      ...prospects.map(p => ({ ...p, type: 'prospect' as const })),
      ...externalCustomers.map(e => ({ ...e, type: 'external' as const }))
    ];
    
    if (nearbyTypeFilter === 'Accounts') combined = combined.filter(i => i.type === 'account');
    if (nearbyTypeFilter === 'Prospects') combined = combined.filter(i => i.type === 'prospect');
    if (nearbyTypeFilter === 'External') combined = combined.filter(i => i.type === 'external');

    if (nearbyIndustryFilter !== 'All') {
      combined = combined.filter(item => {
        const industry = item.type === 'account' ? (item as Account).industry : item.type === 'prospect' ? (item as MarketInsight).category : (item as any).industry;
        return industry === nearbyIndustryFilter;
      });
    }

    if (!searchQuery) return combined;
    const query = searchQuery.toLowerCase();
    return combined.filter(item => {
      const name = item.type === 'account' 
        ? (item as Account).name 
        : item.type === 'prospect' 
          ? (item as MarketInsight).projectName 
          : (item as any).name;
      return name.toLowerCase().includes(query);
    });
  }, [accounts, prospects, externalCustomers, searchQuery, nearbyTypeFilter]);

  const center = pinnedLocation || userLocation || { lat: 25.2048, lng: 55.2708 };

  // React.useEffect(() => {
  //   if (map && center) {
  //     map.panTo(center);
  //   }
  // }, [map, center]);

  if (!isLoaded) return <div className="w-full h-full bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest">Loading Map...</div>;

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={map => setMap(map)}
        onUnmount={() => setMap(null)}
        onClick={(e) => {
          if (onPinLocation && e.latLng) {
            onPinLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }
        }}
        options={{
          styles: theme === 'dark' ? [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
            {
              featureType: 'administrative.locality',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }]
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }]
            },
            {
              featureType: 'poi.park',
              elementType: 'geometry',
              stylers: [{ color: '#263c3f' }]
            },
            {
              featureType: 'poi.park',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#6b9a76' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#38414e' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#212a37' }]
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#9ca5b3' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{ color: '#746855' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#1f2835' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#f3d19c' }]
            },
            {
              featureType: 'transit',
              elementType: 'geometry',
              stylers: [{ color: '#2f3948' }]
            },
            {
              featureType: 'transit.station',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#17263c' }]
            },
            {
              featureType: 'water',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#515c6d' }]
            },
            {
              featureType: 'water',
              elementType: 'labels.text.stroke',
              stylers: [{ color: '#17263c' }]
            },
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ] : [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        }}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
            }}
            title="Your Location"
          />
        )}

        {pinnedLocation && (
          <Marker
            position={pinnedLocation}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 8,
              fillColor: '#EF4444',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
            }}
            title="Pinned Location"
          />
        )}

        {filteredItems.filter(item => typeof item.lat === 'number' && typeof item.lng === 'number').map((item) => {
          const isAccount = item.type === 'account';
          const isProspect = item.type === 'prospect';
          const isExternal = item.type === 'external';
          
          let color = '#3B82F6'; // Blue for accounts
          if (isProspect) color = '#10B981'; // Emerald for prospects
          if (isExternal) color = '#F59E0B'; // Amber for external
          
          return (
            <Marker
              key={item.id}
              position={{ lat: item.lat!, lng: item.lng! }}
              onClick={() => {
                if (isAccount) {
                  setSelectedAccount(item as Account);
                  setSelectedProspect(null);
                  setSelectedExternal(null);
                } else if (isProspect) {
                  setSelectedProspect(item as MarketInsight);
                  setSelectedAccount(null);
                  setSelectedExternal(null);
                } else {
                  setSelectedExternal(item);
                  setSelectedAccount(null);
                  setSelectedProspect(null);
                }
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isAccount ? 10 : 8,
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
              }}
              title={isAccount ? (item as Account).name : isProspect ? (item as MarketInsight).projectName : (item as any).name}
            />
          );
        })}

        {selectedAccount && (
          <InfoWindow
            position={{ lat: selectedAccount.lat, lng: selectedAccount.lng }}
            onCloseClick={() => setSelectedAccount(null)}
          >
            <div className="p-2 min-w-[180px] bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="font-black text-xs text-slate-900 dark:text-white tracking-tight">{selectedAccount.name}</h3>
                <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-600 text-[7px] font-black uppercase tracking-widest">Account</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{selectedAccount.address.street}, {selectedAccount.address.city}</p>
              <p className="text-[9px] text-blue-600 dark:text-blue-400 mt-1 font-black uppercase tracking-widest">{selectedAccount.industry}</p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedAccount.lat},${selectedAccount.lng}${selectedAccount.placeId ? `&query_place_id=${selectedAccount.placeId}` : ''}`)}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2 rounded-xl text-[8px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"
                >
                  G-Maps
                </button>
                <button
                  onClick={() => window.open(`https://waze.com/ul?q=${selectedAccount.lat},${selectedAccount.lng}`)}
                  className="flex items-center justify-center gap-1.5 bg-orange-600 text-white py-2 rounded-xl text-[8px] font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest"
                >
                  Waze
                </button>
                <button
                  onClick={() => {
                    if (onEditAccount) onEditAccount(selectedAccount);
                    setSelectedAccount(null);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 text-white py-2 rounded-xl text-[8px] font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-500/20 uppercase tracking-widest"
                >
                  Edit
                </button>
              </div>
            </div>
          </InfoWindow>
        )}

        {selectedProspect && (
          <InfoWindow
            position={{ lat: selectedProspect.lat!, lng: selectedProspect.lng! }}
            onCloseClick={() => setSelectedProspect(null)}
          >
            <div className="p-2 min-w-[180px] bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="font-black text-xs text-slate-900 dark:text-white tracking-tight">{selectedProspect.projectName}</h3>
                <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-600 text-[7px] font-black uppercase tracking-widest">Prospect</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{selectedProspect.location}</p>
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-black uppercase tracking-widest">{selectedProspect.category}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedProspect.lat},${selectedProspect.lng}`)}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2 rounded-xl text-[9px] font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest"
                >
                  G-Maps
                </button>
                <button
                  onClick={() => window.open(`https://waze.com/ul?q=${selectedProspect.lat},${selectedProspect.lng}`)}
                  className="flex items-center justify-center gap-1.5 bg-orange-600 text-white py-2 rounded-xl text-[9px] font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest"
                >
                  Waze
                </button>
              </div>
            </div>
          </InfoWindow>
        )}

        {selectedExternal && (
          <InfoWindow
            position={{ lat: selectedExternal.lat!, lng: selectedExternal.lng! }}
            onCloseClick={() => setSelectedExternal(null)}
          >
            <div className="p-2 min-w-[180px] bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="font-black text-xs text-slate-900 dark:text-white tracking-tight">{selectedExternal.name}</h3>
                <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-600 text-[7px] font-black uppercase tracking-widest">Nearby Customer</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{selectedExternal.address}</p>
              <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 font-black uppercase tracking-widest">{selectedExternal.industry}</p>
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedExternal.lat},${selectedExternal.lng}`)}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-[8px] font-bold hover:bg-slate-200 transition-all uppercase tracking-widest"
                >
                  G-Maps
                </button>
                <button
                  onClick={() => window.open(`https://waze.com/ul?q=${selectedExternal.lat},${selectedExternal.lng}`)}
                  className="flex items-center justify-center gap-1.5 bg-orange-600 text-white py-2 rounded-xl text-[8px] font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest"
                >
                  Waze
                </button>
                <button
                  onClick={() => {
                    if (onConvertExternal) onConvertExternal(selectedExternal);
                    setSelectedExternal(null);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-amber-600 text-white py-2 rounded-xl text-[8px] font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-500/20 uppercase tracking-widest"
                >
                  Convert
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default Map;
