import React, { useState, useEffect } from 'react';
import TabBar from './components/TabBar';
import Browse from './pages/Browse';
import Search from './pages/Search';
import More from './pages/More';
import MyList from './pages/MyList';
import Calendar from './pages/Calendar';
import MediaDetailView from './components/MediaDetailView';
import PersonDetailView from './components/PersonDetailView';
import CollectionDetailView from './components/CollectionDetailView';
import GuideAIBot from './components/GuideAIBot';
import { simklService } from './services/simkl';
import { MediaItem, SimklUser } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [region, setRegion] = useState('US');
  const [simklUser, setSimklUser] = useState<SimklUser | null>(null);

  useEffect(() => {
    // Handle Simkl OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      simklService.handleOAuthCallback(code).then(success => {
        if (success) {
          simklService.getCurrentUser().then(user => {
            setSimklUser(user);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          });
        }
      });
    } else if (simklService.isAuthenticated()) {
      // Load existing user
      simklService.getCurrentUser().then(setSimklUser);
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
        return <Browse onItemClick={handleMediaClick} />;
      case 'mylist':
        return <MyList onItemClick={handleMediaClick} />;
      case 'calendar':
        return <Calendar onItemClick={handleMediaClick} />;
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
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

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

      {/* GuideAI Assistant - Desktop Floating */}
      <div className="hidden md:block">
        <GuideAIBot contextItem={selectedItem} />
      </div>
    </div>
  );
};

export default App;