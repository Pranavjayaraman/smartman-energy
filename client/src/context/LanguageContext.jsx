import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    // Branding & Navigation
    brandName: 'AQ TRACK',
    brandSub: 'Water Monitoring System',
    adminConsole: 'Admin Console',
    workerNav: 'Worker Menu',
    navDesc: 'Select your daily task below',
    liveDashboard: 'Live Dashboard',
    dashboardDesc: 'Overview & Water Charts',
    areaDataEntry: 'Daily Meter Entry',
    areaEntryDesc: 'Enter Today\'s Water Reading',
    pastRecords: 'Past Records (PDF Data)',
    pastRecordsDesc: 'View 2026 History Logs',
    metersConfig: 'Meters Setup',
    metersConfigDesc: 'Manage Sub-meters & Lines',
    dbSecurity: 'Database & Security',
    dbSecurityDesc: 'Backups, Health & Anti-Data-Loss',
    auditTrail: 'Audit Log',
    auditTrailDesc: 'View History of Changes',
    downloadExcel: 'Download Excel File',
    signOut: 'Sign Out',
    worker: 'Worker',

    // Language Toggle
    selectLanguage: 'Language / மொழி',
    english: 'English',
    tamil: 'தமிழ் (Tamil)',

    // Worker Step-by-Step Guidance Banner
    howToSubmit: 'How to enter today\'s water numbers:',
    step1: '1. Check Date',
    step2: '2. Type Numbers in Boxes',
    step3: '3. Press SAVE Button',

    // Dashboard Overview
    waterOpsOverview: 'Water Operations Overview',
    opsOverviewSub: 'Simple summary of daily water intake, usage, and efficiency',
    last30Days: 'All 2026 Records',
    monthlySummary: 'Monthly Summary',
    waterIntakeCard: 'Water Intake',
    incomingWater: 'Total Water Coming In',
    targetLimit: 'Safe limit',
    totalConsumption: 'Total Water Used',
    plantUsage: 'Factory Usage (Process + Domestic)',
    process: 'Process',
    efficiencyRatio: 'Water Efficiency Ratio',
    targetRatio: 'Safe Limit: ≤ 1.5 KL per MT',
    goodEfficiency: 'Good (Normal Water Usage)',
    higherThanTarget: 'High Water Usage Warning',
    domesticPerPerson: 'Water Used Per Person',
    litersPerPersonDay: 'Liters per worker each day',
    targetLpd: 'Limit: 30 LPD',
    staff: 'Workers Count',
    dailyIntakeVsCons: 'Daily Water Intake vs. Consumption',
    compareIntakeCons: 'Comparison of incoming water with factory usage',
    whereIsWaterUsed: 'Where is Water Used?',
    todayBreakdown: 'Today\'s usage by section',
    recentDailyLogs: 'Recent Daily Records',
    date: 'Date',
    intakeKl: 'Intake (KL)',
    processKl: 'Process Water (KL)',
    domesticKl: 'Domestic Water (KL)',
    gardenKl: 'Garden Water (KL)',
    outsideKl: 'Outside Water (KL)',
    totalConsKl: 'Total Used (KL)',
    prodMt: 'Production (MT)',
    ratioKlMt: 'Efficiency (KL/MT)',
    status: 'Status',
    pass: 'Normal',
    high: 'High',

    // Area Data Entry
    entryPage: 'Data Entry Page',
    workerInterface: 'Simple Worker Entry Screen',
    adminEntryView: 'Admin Data Entry View',
    readingDate: 'Reading Date:',
    selectArea: 'Select Section (Admin):',
    lockedArea: 'Your Section:',
    restoreDraft: 'Restore Saved Numbers',
    meteredVolTotal: 'Total Water Entered for',
    exceedsIntakeTarget: 'Water Intake is High!',
    exceedsSpecificRatio: 'Water Usage per MT is High!',
    facilityContext: 'Today\'s Factory Production & Staff',
    dailyProductionMt: 'Today\'s Factory Output (MT)',
    plantManpower: 'Workers Count Today',
    gardenAreaM2: 'Garden Area (m²)',
    subtotal: 'Section Total',
    savingReadings: 'Saving Numbers to Database...',
    saveReadingsBtn: 'SAVE WATER NUMBERS NOW',
    finishedEntering: 'Finished entering numbers?',
    clickSaveTip: 'Click the green button below to save today\'s numbers.',

    // Categories & Meter Sections
    waterIntakeMeters: 'Water Intake Meters (Borewell / Tanker / Public)',
    processWaterMeters: 'Factory Process Lines (PW1, PW2, PW3)',
    domesticWaterMeters: 'Domestic Taps & Restrooms (DW1 to DW10)',
    gardenWaterMeters: 'Garden Sprinklers & Drips (GW1 to GW10)',
    outsideWaterMeters: 'Outside Contractor Taps (OW1, OW2)',
    stpModule: 'Sewage Treatment Plant (STP)',
    etpModule: 'Effluent Treatment Plant (ETP)',

    // Past Records
    pastRecordsTitle: 'Past Water Monitoring Records (PDF Dataset)',
    pastRecordsSub: 'Search and inspect 365 days of 2026 historical water records',
    exportToExcel: 'Export to Excel',
    totalDaysFiltered: 'Total Days Shown',
    filteredIntake: 'Total Water Intake',
    avgSpecificRatio: 'Average Usage Ratio',
    searchByDatePlaceholder: 'Type date (e.g. 2026-06-15 or 2026-03)...',
    allMonths: 'All Months (2026)',
    allRatios: 'All Usage Ratios',
    passTarget: 'Normal Usage (≤ 1.5 KL/MT)',
    highRatio: 'High Usage (> 1.5 KL/MT)',
    newestFirst: 'Newest Date First',
    oldestFirst: 'Oldest Date First',
    showing: 'Showing',
    to: 'to',
    of: 'of',
    historicalEntries: 'records',
    page: 'Page',
    viewDetails: 'View Details',
    dailyLogBreakdown: 'Daily Record Details:',
    openDateInEntry: 'Edit This Date',
    close: 'Close',

    // Login Modal
    signInTitle: 'Welcome to AQ TRACK',
    signInSub: 'Easy Daily Water Monitoring System',
    workerLoginTip: 'Workers & Operators: Click your name card below for instant 1-click login!',
    usernameLabel: 'Username / Worker ID',
    passwordLabel: 'Password',
    loginBtn: 'Sign In to AQ TRACK',
    invalidCreds: 'Invalid username or password'
  },

  ta: {
    // Branding & Navigation
    brandName: 'AQ TRACK',
    brandSub: 'நீர் கண்காணிப்பு அமைப்பு',
    adminConsole: 'நிர்வாகி பகுதி',
    workerNav: 'தொழிலாளி பட்டி',
    navDesc: 'கீழே உங்கள் பணியைத் தேர்ந்தெடுக்கவும்',
    liveDashboard: 'நேரடி டாஷ்போர்டு',
    dashboardDesc: 'கண்ணோட்டம் & நீர் வரைபடங்கள்',
    areaDataEntry: 'தினசரி மீட்டர் உள்ளீடு',
    areaEntryDesc: 'இன்றைய நீர் அளவை உள்ளிடவும்',
    pastRecords: 'முந்தைய பதிவுகள் (PDF)',
    pastRecordsDesc: '2026 வரலாற்றுப் பதிவுகளைப் பார்க்கவும்',
    metersConfig: 'மீட்டர்கள் அமைப்பு',
    metersConfigDesc: 'சப்-மீட்டர்களை நிர்வகிக்கவும்',
    dbSecurity: 'தரவுத்தளம் & பாதுகாப்பு',
    dbSecurityDesc: 'காப்புப்பிரதி, பாதுகாப்பு & நிலைமை',
    auditTrail: 'மாற்றப் பதிவு',
    auditTrailDesc: 'மாற்றங்களின் வரலாற்றைப் பார்க்கவும்',
    downloadExcel: 'எக்செல் பதிவிறக்கம்',
    signOut: 'வெளியேறு',
    worker: 'தொழிலாளி',

    // Language Toggle
    selectLanguage: 'மொழி / Language',
    english: 'English (ஆங்கிலம்)',
    tamil: 'தமிழ் (Tamil)',

    // Worker Step-by-Step Guidance Banner
    howToSubmit: 'இன்றைய நீர் அளவுகளை எவ்வாறு உள்ளிடுவது:',
    step1: '1. தேதியை பார்க்கவும்',
    step2: '2. பெட்டிகளில் எண்களை எழுதவும்',
    step3: '3. சேமி பொத்தானை அழுத்தவும்',

    // Dashboard Overview
    waterOpsOverview: 'நீர் பயன்பாட்டு கண்ணோட்டம்',
    opsOverviewSub: 'தினசரி நீர் பயன்பாடு மற்றும் திறனின் எளிய சுருக்கம்',
    last30Days: 'அனைத்து 2026 பதிவுகள்',
    monthlySummary: 'மாதாந்திர சுருக்கம்',
    waterIntakeCard: 'மொத்த உள்வரும் நீர்',
    incomingWater: 'உள்ளே வந்த மொத்த நீர்',
    targetLimit: 'பாதுகாப்பான வரம்பு',
    totalConsumption: 'பயன்படுத்தப்பட்ட நீர்',
    plantUsage: 'ஆலை பயன்பாடு (செயல்முறை + உள்நாட்டு)',
    process: 'செயல்முறை',
    efficiencyRatio: 'நீர் பயன்பாட்டு செயல்திறன்',
    targetRatio: 'பாதுகாப்பான வரம்பு: ≤ 1.5 KL/MT',
    goodEfficiency: 'நல்ல நிலை (சாதாரண நீர் பயன்பாடு)',
    higherThanTarget: 'அதிக நீர் பயன்பாடு எச்சரிக்கை',
    domesticPerPerson: 'நபருக்கு நீர் பயன்பாடு',
    litersPerPersonDay: 'ஒரு தொழிலாளிக்கு ஒரு நாள் பயன்பாடு',
    targetLpd: 'வரம்பு: 30 LPD',
    staff: 'தொழிலாளர்கள் எண்ணிக்கை',
    dailyIntakeVsCons: 'தினசரி நீர் உட்கொள்ளல் vs நுகர்வு',
    compareIntakeCons: 'உள்வரும் நீர் மற்றும் ஆலை பயன்பாட்டின் ஒப்பீடு',
    whereIsWaterUsed: 'நீர் எங்கு பயன்படுத்தப்படுகிறது?',
    todayBreakdown: 'துறை வாரியாக இன்றைய பயன்பாடு',
    recentDailyLogs: 'சமீபத்திய தினசரி பதிவுகள்',
    date: 'தேதி',
    intakeKl: 'உட்கொள்ளல் (KL)',
    processKl: 'செயல்முறை நீர் (KL)',
    domesticKl: 'உள்நாட்டு நீர் (KL)',
    gardenKl: 'தோட்ட நீர் (KL)',
    outsideKl: 'வெளி நீர் (KL)',
    totalConsKl: 'மொத்த பயன்பாடு (KL)',
    prodMt: 'உற்பத்தி (MT)',
    ratioKlMt: 'செயல்திறன் (KL/MT)',
    status: 'நிலை',
    pass: 'சாதாரண',
    high: 'அதிகம்',

    // Area Data Entry
    entryPage: 'தரவு உள்ளீட்டு பக்கம்',
    workerInterface: 'எளிய தொழிலாளி இடைமுகம்',
    adminEntryView: 'நிர்வாகி பகுதி உள்ளீட்டு காட்சி',
    readingDate: 'அளவீட்டு தேதி:',
    selectArea: 'பகுதியைத் தேர்ந்தெடுக்கவும் (நிர்வாகி):',
    lockedArea: 'உங்கள் பகுதி:',
    restoreDraft: 'சேமிக்கப்பட்ட எண்களை மீட்டெடுக்கவும்',
    meteredVolTotal: 'மொத்த கணக்கிடப்பட்ட நீர் அளவு:',
    exceedsIntakeTarget: 'நீர் உட்கொள்ளல் அதிகமாக உள்ளது!',
    exceedsSpecificRatio: 'தயாரிப்புக்கான நீர் பயன்பாடு அதிகம்!',
    facilityContext: 'இன்றைய உற்பத்தி & தொழிலாளர்கள்',
    dailyProductionMt: 'இன்றைய உற்பத்தி (MT)',
    plantManpower: 'இன்றைய தொழிலாளர்கள் எண்ணிக்கை',
    gardenAreaM2: 'தோட்ட பரப்பளவு (m²)',
    subtotal: 'பகுதி மொத்தம்',
    savingReadings: 'எண்கள் சேமிக்கப்படுகின்றன...',
    saveReadingsBtn: 'நீர் அளவுகளை இப்போது சேமிக்கவும்',
    finishedEntering: 'எண்களை உள்ளிட்டு முடித்துவிட்டீர்களா?',
    clickSaveTip: 'இன்றைய எண்களை சேமிக்க பச்சை நிற பொத்தானைக் கிளிக் செய்யவும்.',

    // Categories & Meter Sections
    waterIntakeMeters: 'நீர் உட்கொள்ளும் மீட்டர்கள் (போர்வெல் / டேங்கர் / பொது)',
    processWaterMeters: 'ஆலை செயல்முறை வரிகள் (PW1, PW2, PW3)',
    domesticWaterMeters: 'உள்நாட்டு குழாய்கள் & கழிப்பறைகள் (DW1 - DW10)',
    gardenWaterMeters: 'தோட்ட நீரமைப்பு (GW1 - GW10)',
    outsideWaterMeters: 'வெளிப்புற ஒப்பந்ததாரர் குழாய்கள் (OW1, OW2)',
    stpModule: 'STP (கழிவுநீர் சுத்திகரிப்பு ஆலை)',
    etpModule: 'ETP (தொழிற்சாலை கழிவுநீர் சுத்திகரிப்பு ஆலை)',

    // Past Records
    pastRecordsTitle: 'முந்தைய நீர் கண்காணிப்பு பதிவுகள் (PDF)',
    pastRecordsSub: '2026 ஆம் ஆண்டின் 365 நாட்களின் வரலாற்று நீர் பதிவுகளைத் தேடவும் பார்க்கவும்',
    exportToExcel: 'எக்செல் ஏற்றுமதி',
    totalDaysFiltered: 'காண்பிக்கப்படும் மொத்த நாட்கள்',
    filteredIntake: 'வடிகட்டப்பட்ட நீர் உட்கொள்ளல்',
    avgSpecificRatio: 'சராசரி பயன்பாட்டு விகிதம்',
    searchByDatePlaceholder: 'தேதியை உள்ளிடவும் (எ.கா. 2026-06-15 அல்லது 2026-03)...',
    allMonths: 'அனைத்து மாதங்களும் (2026)',
    allRatios: 'அனைத்து பயன்பாட்டு விகிதங்களும்',
    passTarget: 'சாதாரண பயன்பாடு (≤ 1.5 KL/MT)',
    highRatio: 'அதிக பயன்பாடு (> 1.5 KL/MT)',
    newestFirst: 'புதிய தேதி முதலில்',
    oldestFirst: 'பழைய தேதி முதலில்',
    showing: 'காண்பிக்கப்படுகிறது',
    to: 'முதல்',
    of: 'இல்',
    historicalEntries: 'பதிவுகள்',
    page: 'பக்கம்',
    viewDetails: 'விவரங்களைப் பார்க்கவும்',
    dailyLogBreakdown: 'தினசரி பதிவு விவரங்கள்:',
    openDateInEntry: 'இந்த தேதியைத் திருத்தவும்',
    close: 'மூடு',

    // Login Modal
    signInTitle: 'AQ TRACK க்கு வரவேற்கிறோம்',
    signInSub: 'எளிய தினசரி நீர் கண்காணிப்பு அமைப்பு',
    workerLoginTip: 'தொழிலாளர்கள்: உடனடி உள்நுழைவுக்கு கீழே உள்ள உங்கள் பெயர் அட்டையைக் கிளிக் செய்யவும்!',
    usernameLabel: 'பயனர்பெயர் / தொழிலாளி ஐடி',
    passwordLabel: 'கடவுச்சொல்',
    loginBtn: 'AQ TRACK இல் உள்நுழைக',
    invalidCreds: 'தவறான பயனர்பெயர் அல்லது கடவுச்சொல்'
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('aqua_lang') || 'en';
  });

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('aqua_lang', newLang);
  };

  const t = (key, fallback = '') => {
    return translations[lang]?.[key] || translations['en']?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
