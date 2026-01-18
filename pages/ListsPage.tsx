import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, X, Loader2 } from 'lucide-react';
import { storageService } from '../services/storage';
import { CustomListConfig, MediaItem } from '../types';
import AddListModal from '../components/AddListModal';
import { getImageUrl } from '../services/api';
import MediaDetailView from '../components/MediaDetailView';
import ListDetailModal from '../components/ListDetailModal';

interface ListsPageProps {
  onBack: () => void;
  onPersonClick?: (id: number) => void;
}

const ListsPage: React.FC<ListsPageProps> = ({ onBack, onPersonClick }) => {
  const [lists, setLists] = useState<CustomListConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingList, setViewingList] = useState<CustomListConfig | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const loadLists = () => {
    setLists(storageService.getCustomLists());
  };

  useEffect(() => {
    loadLists();
    // Trigger background sync when page loads to pull new lists from Trakt
    storageService.fetchLists(true).then(() => {
        loadLists(); // Reload after sync
    });
  }, []);

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this list from your home screen?')) {
      storageService.removeCustomList(id);
      loadLists();
      if (viewingList?.id === id) setViewingList(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-6 pb-24 md:pl-32 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-white" />
            </button>
            <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">Manage Lists</h1>
            </div>
            <button 
                onClick={() => {
                    setLists([]); // Show loading state implication or just clear
                    storageService.fetchLists(true).then(loadLists);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                title="Force Sync"
            >
                <Loader2 size={20} />
            </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
          <button
            onClick={() => setShowAddModal(true)}
            className="aspect-video flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/10 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
          >
            <div className="p-3 bg-white/5 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-colors text-gray-400">
              <Plus size={24} />
            </div>
            <span className="text-gray-400 font-medium group-hover:text-white">Add New List</span>
          </button>

          {lists.map(list => (
            <div 
                key={list.id} 
                onClick={() => setViewingList(list)}
                className="aspect-video relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden group cursor-pointer hover:scale-105 transition-transform shadow-lg"
            >
              {/* Thumbnail */}
              <div className="w-full h-full">
                  {list.thumbnailUrl ? (
                       <img src={list.thumbnailUrl} className="w-full h-full object-cover" alt={list.customName} />
                  ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-4">
                          <span className="text-gray-500 font-bold text-lg text-center">{list.customName}</span>
                      </div>
                  )}
              </div>
              
              {/* Hover Overlay with Delete */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2">
                <button
                    onClick={(e) => handleRemove(e, list.id)}
                    className="p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove List"
                >
                    <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {lists.length === 0 && (
            <div className="text-center text-gray-500 mt-12">
                <p>You haven't added any custom lists yet.</p>
                <p className="text-sm">Add lists from Trakt to create custom hubs on your home screen.</p>
            </div>
        )}
      </div>

      {/* List Viewer Modal */}
      {viewingList && (
        <ListDetailModal
            list={viewingList}
            onClose={() => setViewingList(null)}
            onItemClick={setSelectedMedia}
            onListUpdated={() => {
                loadLists();
                // Update viewing list ref
                const updated = storageService.getCustomLists().find(l => l.id === viewingList.id);
                if (updated) setViewingList(updated);
            }}
        />
      )}

      {selectedMedia && (
        <MediaDetailView
            item={selectedMedia}
            region="US" // Default region
            onClose={() => setSelectedMedia(null)}
            onItemClick={setSelectedMedia}
            onPersonClick={onPersonClick || (() => {})} 
            onCollectionClick={() => {}} // Placeholder
        />
      )}

      {showAddModal && (
        <AddListModal 
          onClose={() => setShowAddModal(false)} 
          onAdded={loadLists} 
        />
      )}
    </div>
  );
};

export default ListsPage;
