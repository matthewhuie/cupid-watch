'use client';

import useSWR from 'swr';
import { useState, useEffect, useRef } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Slot {
  startDateTime: string;
  startTime: number;
  timeAriaLabel: string;
  timeLabel: string;
}

interface DayColumn {
  dateHeader: string;
  slots: Slot[];
}

interface ApiResponse {
  data: DayColumn[];
  timestamp: string;
}

export default function Home() {
  const { data: response, error, isLoading, mutate, isValidating } = useSWR<ApiResponse>('/api/slots', fetcher, {
    refreshInterval: 600000, // 10 minutes
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [seenSlotIds, setSeenSlotIds] = useState<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Play a simple notification sound
  const playNotificationSound = () => {
    if (!isSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error('Failed to play sound', e);
    }
  };

  // Load preferences and seen slots
  useEffect(() => {
    // Dark mode
    const savedMode = localStorage.getItem('darkMode');
    const html = document.documentElement;
    if (savedMode === 'true' || (!savedMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      html.classList.add('dark');
    } else {
      html.classList.add('light');
    }

    // Sound preference
    const savedSound = localStorage.getItem('soundEnabled');
    if (savedSound === 'true') {
      setIsSoundEnabled(true);
    }

    // Seen slots
    const savedSlots = localStorage.getItem('seenSlots');
    if (savedSlots) {
      try {
        setSeenSlotIds(new Set(JSON.parse(savedSlots)));
      } catch (e) {
        console.error('Failed to parse seen slots', e);
      }
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    const html = document.documentElement;
    if (newMode) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
  };

  const toggleSound = () => {
    const newMode = !isSoundEnabled;
    setIsSoundEnabled(newMode);
    localStorage.setItem('soundEnabled', String(newMode));
    // Play a test sound when enabled
    if (newMode) {
      setTimeout(() => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      }, 100);
    }
  };

  useEffect(() => {
    if (response?.data && response.timestamp) {
      setLastUpdated(new Date(response.timestamp));

      const allCurrentSlots = response.data.flatMap(day => day.slots);
      const currentSlotIds = allCurrentSlots.map(s => `${s.startDateTime}-${s.startTime}`);
      
      if (initialLoadRef.current) {
        // On first load, mark everything as seen
        const initialSeen = new Set(currentSlotIds);
        setSeenSlotIds(initialSeen);
        localStorage.setItem('seenSlots', JSON.stringify(Array.from(initialSeen)));
        initialLoadRef.current = false;
      } else {
        // Check for new slots
        const newSlotsFound = allCurrentSlots.filter(s => !seenSlotIds.has(`${s.startDateTime}-${s.startTime}`));
        
        if (newSlotsFound.length > 0) {
          // Play sound
          playNotificationSound();

          // Notify user
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Appointments Found!', {
              body: `${newSlotsFound.length} new slot(s) are now available.`,
              icon: '/favicon.ico'
            });
          } else {
            alert(`Found ${newSlotsFound.length} new appointment slots!`);
          }

          // Update seen list
          const updatedSeen = new Set([...Array.from(seenSlotIds), ...currentSlotIds]);
          setSeenSlotIds(updatedSeen);
          localStorage.setItem('seenSlots', JSON.stringify(Array.from(updatedSeen)));
        }
      }
    }
  }, [response, seenSlotIds, isSoundEnabled]);

  const handleRefresh = async () => {
    await mutate();
  };

  const data = response?.data;

  const isNewSlot = (slot: Slot) => {
    // A slot is "new" if we've loaded data before and this specific ID isn't in our seen set
    return !initialLoadRef.current && !seenSlotIds.has(`${slot.startDateTime}-${slot.startTime}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cupid Watch</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitoring NYC Marriage Ceremony appointment slots</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {/* Sound Toggle */}
                <button
                  onClick={toggleSound}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  aria-label={isSoundEnabled ? 'Disable sound' : 'Enable sound'}
                  title={isSoundEnabled ? 'Disable sound notifications' : 'Enable sound notifications'}
                >
                  {isSoundEnabled ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9l4 4m0-4l-4 4" />
                    </svg>
                  )}
                </button>

                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isValidating}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isValidating ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {lastUpdated && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {(isLoading || (isValidating && !data)) && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-8 rounded">
            <p className="text-sm text-red-700 dark:text-red-200">Error loading slots. Please try again later.</p>
          </div>
        )}

        {data && Array.isArray(data) && data.map((day, dayIndex) => (
          <div key={dayIndex} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-t-lg">
              {day.dateHeader}
            </h2>
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-b-lg">
              {day.slots.length === 0 ? (
                <p className="p-6 text-center text-gray-500 dark:text-gray-400">No slots available for this day.</p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {day.slots.map((slot, slotIndex) => {
                    const isNew = isNewSlot(slot);
                    return (
                      <li key={slotIndex}>
                        <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                {slot.timeLabel}
                              </p>
                              {isNew && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse">
                                  NEW
                                </span>
                              )}
                            </div>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              Available
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(slot.startDateTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ))}

        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Created with <span className="text-red-500">❤️</span> by Matthew Huie
          </p>
        </footer>
      </div>
    </main>
  );
}
