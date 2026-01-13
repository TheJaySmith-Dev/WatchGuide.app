import React, { useState } from 'react';
import TabBar from './components/TabBar';
import Browse from './pages/Browse';
import Search from './pages/Search';
import More from './pages/More';
import MediaDetailView from './components/MediaDetailView';
import PersonDetailView from './components/PersonDetailView';
import CollectionDetailView from './components/CollectionDetailView';
import { MediaItem } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  
  // Default to US, can be persisted in localStorage in a real app
  const [region, setRegion] = useState('US');

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
    </div>
  );
};

export default App;