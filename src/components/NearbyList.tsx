import React from 'react';
import { Account, UserLocation } from '../types';
import { getDistance } from '../services/crmService';
import { MapPin, Navigation, Phone, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface NearbyListProps {
  userLocation: UserLocation;
  nearbyAccounts: Account[];
  onSelectAccount: (account: Account) => void;
}

const NearbyList: React.FC<NearbyListProps> = ({ userLocation, nearbyAccounts, onSelectAccount }) => {
  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-500" />
          Nearby Accounts
        </h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {nearbyAccounts.length} accounts found in your vicinity.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {nearbyAccounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No accounts nearby</p>
            <p className="text-[13px] text-gray-400 mt-1">Try moving to a different location.</p>
          </div>
        ) : (
          nearbyAccounts.map((account, index) => {
            const distance = getDistance(userLocation, { lat: account.lat, lng: account.lng });
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={account.id}
                className="group p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                onClick={() => onSelectAccount(account)}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="font-bold text-[13px] text-gray-900 group-hover:text-blue-700 transition-colors">
                    {account.name}
                  </h3>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {distance.toFixed(1)} km
                  </span>
                </div>
                
                <div className="space-y-1 text-[11px] text-gray-600">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                    <p className="line-clamp-2">{account.address.street}, {account.address.city}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <p>{account.industry}</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${account.lat},${account.lng}`, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-1.5 rounded-lg text-[11px] font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Navigate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${account.phone}`;
                    }}
                    className="w-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NearbyList;
