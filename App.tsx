import React, { useState, useEffect, useRef } from 'react';
import TabBar from './components/TabBar';
import Browse from './pages/Browse';
import Search from './pages/Search';
import More from './pages/More';
import MyList from './pages/MyList';
import Countdown from './pages/Countdown';
import MediaDetailView from './components/MediaDetailView';
import PersonDetailView from './components/PersonDetailView';
import CollectionDetailView from './components/CollectionDetailView';
import OnboardingTour from './components/OnboardingTour';
import { simklService } from './services/simkl';
import { traktService } from './services/trakt';
import { mdblistService } from './services/mdblist';
import { storageService } from './services/storage';
import { MediaItem, SimklUser, TraktUser } from './types';

// Initialize storage service sync
storageService.fetchConfigFromTrakt();

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [region, setRegion] = useState('US');
  const [simklUser, setSimklUser] = useState<SimklUser | null>(null);
  const [traktUser, setTraktUser] = useState<TraktUser | null>(null);
  const [isListsViewOpen, setIsListsViewOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const authProcessing = useRef(false);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Simple Hash Router Implementation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      
      // Check for list route
      if (hash.startsWith('list/')) {
          const listId = hash.replace('list/', '');
          setSelectedListId(listId);
          setActiveTab('browse'); // Keep Browse active as parent
      } else {
          setActiveTab(hash || 'browse');
          setSelectedListId(null);
      }
    };

    // Set initial tab based on hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    // Check for onboarding
    const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding_v1');
    if (!hasSeenOnboarding) {
        // Small delay to let the app load first
        setTimeout(() => setShowOnboarding(true), 1500);
    }
  }, []);

  const handleTabChange = (tab: string) => {
    window.location.hash = `#/${tab}`;
    setActiveTab(tab);
  };

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const provider = localStorage.getItem('auth_provider_pending');

    if (code && !authProcessing.current) {
      authProcessing.current = true;
      
      // Determine which provider to use
      if (provider === 'trakt') {
          traktService.handleOAuthCallback(code).then(success => {
            const currentHash = window.location.hash || `#/${activeTab}`;
            window.history.replaceState({}, document.title, window.location.pathname + currentHash);
            
            if (success) {
                alert('Successfully connected to Trakt!');
                traktService.getCurrentUser().then(setTraktUser);
            } else {
                alert('Failed to connect to Trakt.');
            }
            localStorage.removeItem('auth_provider_pending');
            authProcessing.current = false;
          });
      } else if (provider === 'mdblist') {
          mdblistService.handleCallback(code).then(success => {
            const currentHash = window.location.hash || `#/${activeTab}`;
            window.history.replaceState({}, document.title, window.location.pathname + currentHash);
            
            if (success) {
                alert('Successfully connected to MDBList!');
            } else {
                alert('Failed to connect to MDBList.');
            }
            localStorage.removeItem('auth_provider_pending');
            authProcessing.current = false;
          });
      } else {
          // Default to Simkl if not specified or 'simkl'
          simklService.handleOAuthCallback(code).then(success => {
            // ALWAYS clear the code from URL to prevent refresh loops that trigger rate limits
            const currentHash = window.location.hash || `#/${activeTab}`;
            window.history.replaceState({}, document.title, window.location.pathname + currentHash);

            if (success) {
              alert('Successfully connected to Simkl!');
              simklService.getCurrentUser().then(setSimklUser);
            } else {
              // Check for rate limit error in local storage or just generic message
              const lastError = localStorage.getItem('simkl_last_error');
              if (lastError && lastError.includes('412')) {
                alert('Connection limit exceeded. Please wait a few minutes before trying to connect again.');
              } else {
                alert('Failed to connect to Simkl. The authorization code may have expired or been used. Please try connecting again.');
              }
              localStorage.removeItem('simkl_last_error');
            }
            localStorage.removeItem('auth_provider_pending');
            authProcessing.current = false;
          });
      }
    } else {
      // Load existing users
      if (simklService.isAuthenticated()) {
        simklService.getCurrentUser().then(setSimklUser);
      }
      if (traktService.isAuthenticated()) {
        traktService.getCurrentUser().then(setTraktUser);
      }
    }
  }, []);

  const handleMediaClick = (item: MediaItem) => {
    // Reset others to simulate navigation
    setSelectedPersonId(null);
    setSelectedCollectionId(null);
    setSelectedItem(item);
  };

  const handlePersonClick = (personId: number) => {
    // If person is clicked, close others
    setSelectedItem(null);
    setSelectedCollectionId(null);
    setSelectedPersonId(personId);
  };

  const handleCollectionClick = (collectionId: number) => {
    setSelectedItem(null);
    setSelectedPersonId(null);
    setSelectedCollectionId(collectionId);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'browse':
        return <Browse onItemClick={handleMediaClick} selectedListId={selectedListId} onListClose={() => setSelectedListId(null)} />;
      case 'mylist':
        return <MyList onItemClick={handleMediaClick} />;
      case 'countdown':
        return <Countdown onItemClick={handleMediaClick} region={region} />;
      case 'search':
        return <Search onItemClick={(item) => {
          if (item.media_type === 'person') {
            handlePersonClick(item.id);
          } else {
            handleMediaClick(item);
          }
        }} />;
      case 'more':
        return (
          <More
            onPersonClick={handlePersonClick}
            currentRegion={region}
            onRegionChange={setRegion}
            simklUser={simklUser}
            traktUser={traktUser}
            onCountdownClick={() => handleTabChange('countdown')}
            onListsToggle={setIsListsViewOpen}
          />
        );
      default:
        return <Browse onItemClick={handleMediaClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">

      {/* Main Content Area */}
      <main className="w-full">
        {renderContent()}
      </main>

      {/* Navigation */}
      <TabBar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        hideOnDesktop={selectedCollectionId !== null || isListsViewOpen} // Hide on list view (handled inside 'more' logic)
      />

      {/* Media Detail Overlay */}
      {selectedItem && (
        <MediaDetailView
          item={selectedItem}
          region={region}
          onClose={() => setSelectedItem(null)}
          onItemClick={handleMediaClick}
          onPersonClick={handlePersonClick}
          onCollectionClick={handleCollectionClick}
        />
      )}

      {/* Person Detail Overlay */}
      {selectedPersonId && (
        <PersonDetailView
          personId={selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
          onMediaClick={handleMediaClick}
        />
      )}

      {/* Collection Detail Overlay */}
      {selectedCollectionId && (
        <CollectionDetailView
          collectionId={selectedCollectionId}
          onClose={() => setSelectedCollectionId(null)}
          onItemClick={handleMediaClick}
        />
      )}

 {/* GuideAI Bot Overlay - Removed as it's now a full page in More */}
      
      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('has_seen_onboarding_v1', 'true');
        }} />
      )}
    </div>
  );
};

export default App;