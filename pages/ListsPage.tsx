import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, X, Loader2, Edit2, Database, LayoutTemplate } from 'lucide-react';
import { storageService } from '../services/storage';
import { CustomListConfig, MediaItem, MDBListList } from '../types';
import AddListModal from '../components/AddListModal';
import { getImageUrl } from '../services/api';
import MediaDetailView from '../components/MediaDetailView';
import ListDetailModal from '../components/ListDetailModal';
import { mdblistService } from '../services/mdblist';

interface ListsPageProps {
  onBack: () => void;
  onPersonClick?: (id: number) => void;
  filter?: (list: CustomListConfig) => boolean;
}

const ListsPage: React.FC<ListsPageProps> = ({ onBack, onPersonClick, filter }) => {
  const [lists, setLists] = useState<CustomListConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingList, setViewingList] = useState<CustomListConfig | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [editingList, setEditingList] = useState<CustomListConfig | null>(null);
  const [mdbUserLists, setMdbUserLists] = useState<MDBListList[]>([]);
  const [loadingMdbLists, setLoadingMdbLists] = useState(false);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>('');
  const [singleUrlInput, setSingleUrlInput] = useState<string>('');

  const loadLists = () => {
    let allLists = storageService.getCustomLists();
    if (filter) {
        allLists = allLists.filter(filter);
    }
    setLists(allLists);
  };

  useEffect(() => {
    loadLists();
    // Trigger background sync when page loads to pull new lists from Trakt
    storageService.fetchLists(true).then(() => {
        loadLists(); // Reload after sync
    });
    // Load MDBList user-created lists for quick add section
    if (mdblistService.isAuthenticated()) {
        setLoadingMdbLists(true);
        mdblistService.getUserLists()
            .then((lists: any) => {
                if (Array.isArray(lists)) setMdbUserLists(lists as MDBListList[]);
            })
            .catch(console.error)
            .finally(() => setLoadingMdbLists(false));
    }
    // Load sync URL and start auto sync
    const currentUrl = storageService.getCustomListsSyncUrl();
    setSyncUrl(currentUrl);
    const sync = async () => {
      const changed = await storageService.syncCustomListsFromUrl();
      if (changed) loadLists();
    };
    if (currentUrl) {
      sync();
      const interval = setInterval(sync, 60_000);
      const onVis = () => { if (document.visibilityState === 'visible') sync(); };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVis);
      };
    }
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
        <div className="flex items-center gap-4 mb-6">
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
            <button
                onClick={() => {
                    if (confirm('Delete all lists titled Favourites, Liked, Watched, Watchlist?')) {
                        storageService.removeCoreNamedLists();
                        loadLists();
                    }
                }}
                className="px-3 py-2 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-semibold"
                title="Delete core titled lists"
            >
                Delete Core Lists
            </button>
        </div>

        {/* Sync via JSON URL */}
        <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-white mb-3">Sync via JSON URL</h2>
          {syncUrl ? (
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-2">Current URL</p>
                <div className="px-3 py-2 rounded-xl bg-white/10 text-gray-200 break-all">{syncUrl}</div>
              </div>
              <div className="flex gap-2 mt-3 md:mt-0">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(syncUrl);
                  }}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  Copy URL
                </button>
                <button
                  onClick={async () => {
                    const changed = await storageService.syncCustomListsFromUrl();
                    if (changed) loadLists();
                  }}
                  className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                >
                  Sync Now
                </button>
                <button
                  onClick={() => {
                    storageService.setCustomListsSyncUrl(null);
                    setSyncUrl(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 transition-colors border border-rose-500/30"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const url = storageService.getCustomListsDataUrl();
                    await navigator.clipboard.writeText(url);
                  }}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  Copy Share URL
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Paste JSON URL here"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!urlInput.trim()) return;
                    const ok = await storageService.importCustomListsFromUrl(urlInput.trim());
                    if (ok) {
                      setSyncUrl(urlInput.trim());
                      loadLists();
                      setUrlInput('');
                    } else {
                      alert('Failed to import JSON from URL');
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                >
                  Save & Sync
                </button>
              </div>
              <p className="text-xs text-gray-500">Copy the Share URL and paste it on your other devices. The app will auto-sync from that URL.</p>
            </div>
          )}
        </div>

        {/* Import Single List */}
        <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-white mb-3">Import Single List via JSON URL</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste single list JSON URL here"
              value={singleUrlInput}
              onChange={(e) => setSingleUrlInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={async () => {
                if (!singleUrlInput.trim()) return;
                const ok = await storageService.importCustomListConfigFromUrl(singleUrlInput.trim());
                if (ok) {
                  loadLists();
                  setSingleUrlInput('');
                  alert('List imported');
                } else {
                  alert('Failed to import list');
                }
              }}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Import
            </button>
          </div>
        </div>

        {mdblistService.isAuthenticated() && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-3">Your MDBList Lists</h2>
            {loadingMdbLists ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="animate-spin" size={18} />
                <span>Loading your lists…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {mdbUserLists.map((list) => {
                  const alreadyAdded = storageService.getCustomLists().some(l => {
                    if (l.mdblistList && Array.isArray(l.mdblistList)) return l.mdblistList.some(m => m.id === list.id);
                    if (l.mdblistList && !Array.isArray(l.mdblistList)) return l.mdblistList.id === list.id;
                    return false;
                  });
                  return (
                    <div key={list.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="text-white font-medium">{list.name}</p>
                        <p className="text-xs text-gray-400">{list.items} items • by {list.user_name}</p>
                      </div>
                      <div className="flex gap-2">
                        {!alreadyAdded ? (
                          <>
                            <button
                              onClick={() => {
                                storageService.addCustomList({
                                  mdblistList: list,
                                  customName: list.name,
                                  viewType: 'hub',
                                  showOnBrowse: true
                                });
                                loadLists();
                              }}
                              className="px-3 py-1 text-xs rounded-lg bg-pink-600 text-white hover:bg-pink-500 transition-colors"
                            >
                              Add Hub
                            </button>
                            <button
                              onClick={async () => {
                                storageService.addCustomList({
                                  mdblistList: list,
                                  customName: list.name,
                                  viewType: 'row',
                                  showOnBrowse: true
                                });
                                // Preload items for row lists
                                await storageService.getListItems({
                                  id: 'temp',
                                  mdblistList: list,
                                  customName: list.name,
                                  viewType: 'row'
                                } as any);
                                loadLists();
                              }}
                              className="px-3 py-1 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                            >
                              Add Row
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Added</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {mdbUserLists.length === 0 && (
                  <p className="text-gray-400 text-sm">No MDBList lists found. Create lists on mdblist.com and they’ll appear here.</p>
                )}
              </div>
            )}
          </div>
        )}

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

          {lists.filter(l => l.showOnBrowse !== false).map(list => (
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
              
              {/* Hover Overlay with Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-2">
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingList(list);
                        }}
                        className="p-2 bg-indigo-600/80 text-white rounded-full hover:bg-indigo-600 transition-colors"
                        title="Edit List"
                    >
                        <Edit2 size={16} />
                    </button>
                    {/* Visual indicator of type */}
                    <div className="p-2 bg-black/60 text-white/70 rounded-full" title={list.viewType === 'row' ? 'Row View' : 'Hub View'}>
                        {list.viewType === 'row' ? <LayoutTemplate size={16} /> : <Database size={16} />}
                    </div>
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            const url = storageService.getCustomListConfigDataUrl(list.id);
                            if (!url) {
                                alert('Failed to generate share URL');
                                return;
                            }
                            try {
                                await navigator.clipboard.writeText(url);
                                alert('List share URL copied');
                            } catch {
                                window.open(url, '_blank');
                            }
                        }}
                        className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                        title="Copy List Share URL"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 1 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                const url = await storageService.getCustomListItemsDataUrl(list.id);
                                if (!url) {
                                    alert('Failed to generate items URL');
                                    return;
                                }
                                try {
                                    await navigator.clipboard.writeText(url);
                                    alert('List items URL copied');
                                } catch {
                                    window.open(url, '_blank');
                                }
                            }}
                            className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                            title="Copy Items Share URL"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .7.4 1.31 1 1.63"></path></svg>
                        </button>
                </div>

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

        {lists.some(l => l.showOnBrowse === false) && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3">Hidden Lists</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {lists.filter(l => l.showOnBrowse === false).map(list => (
                <div 
                  key={list.id} 
                  onClick={() => setViewingList(list)}
                  className="aspect-video relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden group cursor-pointer hover:scale-105 transition-transform shadow-lg"
                >
                  <div className="w-full h-full">
                    {list.thumbnailUrl ? (
                      <img src={list.thumbnailUrl} className="w-full h-full object-cover" alt={list.customName} />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-4">
                        <span className="text-gray-500 font-bold text-lg text-center">{list.customName}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingList(list);
                        }}
                        className="p-2 bg-indigo-600/80 text-white rounded-full hover:bg-indigo-600 transition-colors"
                        title="Edit List"
                      >
                        <Edit2 size={16} />
                      </button>
                      <div className="p-2 bg-black/60 text-white/70 rounded-full" title={list.viewType === 'row' ? 'Row View' : 'Hub View'}>
                        {list.viewType === 'row' ? <LayoutTemplate size={16} /> : <Database size={16} />}
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = storageService.getCustomListConfigDataUrl(list.id);
                          if (!url) {
                            alert('Failed to generate share URL');
                            return;
                          }
                          try {
                            await navigator.clipboard.writeText(url);
                            alert('List share URL copied');
                          } catch {
                            window.open(url, '_blank');
                          }
                        }}
                        className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                        title="Copy List Share URL"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 1 0 7.07 7.07l1.71-1.71"></path></svg>
                      </button>
                    </div>
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
          </div>
        )}

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
          initialProvider="create"
        />
      )}

      {editingList && (
          <AddListModal
            onClose={() => setEditingList(null)}
            onAdded={loadLists}
            mode="edit"
            existingConfig={editingList}
          />
      )}
    </div>
  );
};

export default ListsPage;
