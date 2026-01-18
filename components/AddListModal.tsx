import React, { useState } from 'react';
import { Search, Plus, Save, X, Image as ImageIcon, Loader2, Database } from 'lucide-react';
import { traktService } from '../services/trakt';
import { mdblistService } from '../services/mdblist';
import { storageService } from '../services/storage';
import { TraktList, MDBListList } from '../types';

interface AddListModalProps {
  onClose: () => void;
  onAdded: () => void;
  mode?: 'create' | 'merge';
  targetListId?: string;
}

const AddListModal: React.FC<AddListModalProps> = ({ onClose, onAdded, mode = 'create', targetListId }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState<'trakt' | 'mdblist'>('trakt');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(TraktList | MDBListList)[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedList, setSelectedList] = useState<TraktList | MDBListList | null>(null);

  // Load Top Lists when switching to MDBList
  React.useEffect(() => {
    if (provider === 'mdblist' && !query && mdblistService.isAuthenticated()) {
        setSearching(true);
        mdblistService.getTopLists()
            .then(setSearchResults)
            .catch(console.error)
            .finally(() => setSearching(false));
    }
  }, [provider]);
  
  // Step 2 config
  const [customName, setCustomName] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setSearchResults([]);
    try {
      if (provider === 'trakt') {
          const results = await traktService.searchLists(query);
          setSearchResults(results.map(r => r.list));
      } else {
          // Check auth for MDBList
          if (!mdblistService.isAuthenticated()) {
             const confirm = window.confirm("You need to connect MDBList first. Connect now?");
             if (confirm) {
                 await mdblistService.initiateOAuth();
                 return;
             }
          }
          const results = await mdblistService.searchLists(query);
          setSearchResults(results);
      }
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (list: TraktList | MDBListList) => {
    if (mode === 'merge' && targetListId) {
        // Merge immediately
        storageService.mergeCustomList(targetListId, list);
        onAdded();
        onClose();
        return;
    }

    setSelectedList(list);
    setCustomName(list.name);
    setStep(2);
  };

  const handleSave = async () => {
    if (!selectedList) return;
    
    const isTrakt = 'ids' in selectedList;

    // Save locally
    const config: any = {
      customName: customName || selectedList.name,
      thumbnailUrl: thumbnailUrl || undefined,
    };
    
    if (isTrakt) {
        config.traktList = selectedList;
    } else {
        config.mdblistList = selectedList;
    }
    
    storageService.addCustomList(config);

    // Sync: Like the list on Trakt so it appears on other devices (Trakt only for now)
    if (isTrakt) {
        try {
            await storageService.toggleListLike(selectedList as TraktList);
        } catch (e) {
            console.error('Failed to sync like to Trakt', e);
        }
    }

    onAdded();
    onClose();
  };
  
  const isTraktList = (list: TraktList | MDBListList): list is TraktList => {
      return 'ids' in list;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#121212] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {step === 1 
                ? (mode === 'merge' ? 'Merge with List' : 'Find a List') 
                : 'Customize List'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 ? (
            <div className="space-y-4">
              
              {/* Provider Toggle */}
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                  <button
                    onClick={() => setProvider('trakt')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${provider === 'trakt' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                      <img src="https://cdn.brandfetch.io/id-7yyc2jm/w/193/h/193/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" alt="Trakt" className="w-5 h-5 rounded-full" />
                      Trakt
                  </button>
                  <button
                    onClick={() => setProvider('mdblist')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${provider === 'mdblist' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                      <img src="https://mdblist.com/static/mdblist_logo.png" alt="MDBList" className="w-5 h-5 rounded-full" />
                      MDBList
                  </button>
              </div>
            
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${provider === 'trakt' ? 'Trakt' : 'MDBList'} lists...`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
              </form>

              {searching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
              ) : (
                <div className="space-y-2">
                  {!query && provider === 'mdblist' && searchResults.length > 0 && (
                      <h3 className="text-sm font-bold text-gray-400 px-1 uppercase tracking-wider mb-2">Top Lists</h3>
                  )}
                  {searchResults.map((list: any) => (
                    <button
                      key={isTraktList(list) ? list.ids.trakt : list.id}
                      onClick={() => handleSelect(list)}
                      className="w-full text-left p-3 rounded-xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 group"
                    >
                      <h3 className="text-white font-medium group-hover:text-indigo-400 transition-colors">{list.name}</h3>
                      <p className="text-gray-400 text-sm truncate">
                        {isTraktList(list) 
                            ? `${list.item_count} items • by ${list.user.username}`
                            : `${list.items || 0} items • by ${list.user_name || 'User'}`
                        }
                      </p>
                    </button>
                  ))}
                  {searchResults.length === 0 && query && !searching && (
                    <p className="text-center text-gray-500 py-4">No lists found.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Display Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Thumbnail URL (Optional)</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                        type="text"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Leave blank to use the poster of the first item in the list.
                </p>
              </div>

              {thumbnailUrl && (
                  <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10 bg-black/50 flex items-center justify-center relative">
                      <img 
                        src={thumbnailUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')} 
                      />
                      <span className="text-gray-600 text-xs absolute">Preview</span>
                  </div>
              )}

              <button
                onClick={handleSave}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Save List to Home
              </button>
              
              <button
                onClick={() => setStep(1)}
                className="w-full py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Back to Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddListModal;
