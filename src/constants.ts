export const COUNTRIES_DATA: Record<string, string[]> = {
  'United Arab Emirates': ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'],
  'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Abha', 'Tabuk', 'Buraidah', 'Hail'],
  'United Kingdom': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Newcastle', 'Sheffield', 'Liverpool', 'Leeds', 'Bristol', 'Belfast'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
  'Qatar': ['Doha', 'Al Wakrah', 'Al Khor', 'Al Rayyan', 'Umm Salal'],
  'Oman': ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur'],
  'Kuwait': ['Kuwait City', 'Al Ahmadi', 'Hawalli', 'Al Farwaniyah'],
  'Bahrain': ['Manama', 'Riffa', 'Muharraq', 'Hamad Town'],
  'Singapore': ['Singapore'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton'],
  'Germany': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'],
  'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice']
};

export const COUNTRIES = Object.keys(COUNTRIES_DATA).sort();

export const PHONE_CODES: Record<string, string> = {
  'United Arab Emirates': '+971',
  'India': '+91',
  'Saudi Arabia': '+966',
  'United Kingdom': '+44',
  'United States': '+1',
  'Qatar': '+974',
  'Oman': '+968',
  'Kuwait': '+965',
  'Bahrain': '+973',
  'Singapore': '+65',
  'Australia': '+61',
  'Canada': '+1',
  'Germany': '+49',
  'France': '+33'
};
