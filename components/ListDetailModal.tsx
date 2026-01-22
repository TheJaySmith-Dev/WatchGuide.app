import React, { useEffect, useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { CustomListConfig, MediaItem } from '../types';
import { storageService } from '../services/storage';
import { getImageUrl } from '../services/api';
import AddListModal from './AddListModal';

interface ListDetailModalProps {
  list: CustomListConfig;
  onClose: () => void;
  onItemClick: (item: MediaItem) => void;
  onListUpdated?: () => void; // Called after merge
}

const ListDetailModal: React.FC<ListDetailModalProps> = ({ list, onClose, onItemClick, onListUpdated }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [itemsSyncUrl, setItemsSyncUrl] = useState<string>('');

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const data = await storageService.getListItems(list);
        setItems(data);
      } catch (error) {
        console.error('Failed to load list items', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
    setItemsSyncUrl(storageService.getCustomListItemsSyncUrl(list.id) || '');
  }, [list]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-fade-in">
        <div className="p-6 md:p-10 border-b border-white/10 flex items-center justify-between bg-black/50">
            <div>
                <h2 className="text-3xl font-bold text-white mb-1">{list.customName}</h2>
                <p className="text-gray-400">
                    {(() => {
                        const traktCount = list.traktList ? (Array.isArray(list.traktList) ? list.traktList.length : 1) : 0;
                        const mdbCount = list.mdblistList ? (Array.isArray(list.mdblistList) ? list.mdblistList.length : 1) : 0;
                        const totalCount = traktCount + mdbCount;
                        
                        if (totalCount > 1) return `Merged ${totalCount} lists`;
                        
                        if (list.traktList) {
                            const l = Array.isArray(list.traktList) ? list.traktList[0] : list.traktList;
                            return `From ${l.name} (${l.item_count} items)`;
                        }
                        
                        if (list.mdblistList) {
                            const l = Array.isArray(list.mdblistList) ? list.mdblistList[0] : list.mdblistList;
                            return `From ${l.name} (${l.items} items)`;
                        }
                        
                        return 'Custom List';
                    })()}
                </p>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setShowMergeModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 rounded-xl hover:bg-indigo-600/30 transition-colors border border-indigo-500/30"
                >
                    <Plus size={18} />
                    <span className="font-medium">Merge List</span>
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white" title="Close">
                    <X size={32} />
                </button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="text-white font-bold mb-2">Sync Items via JSON URL</h3>
                <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-2">Current URL</p>
                        <div className="px-3 py-2 rounded-xl bg-white/10 text-gray-200 break-all">{itemsSyncUrl || 'Not set'}</div>
                    </div>
                    <div className="flex gap-2 mt-3 md:mt-0">
                        <button
                            onClick={async () => {
                                const url = await storageService.getCustomListItemsDataUrl(list.id);
                                if (!url) return;
                                try {
                                    await navigator.clipboard.writeText(url);
                                } catch {
                                    window.open(url, '_blank');
                                }
                            }}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                        >
                            Copy Items URL
                        </button>
                        <button
                            onClick={async () => {
                                const changed = await storageService.syncCustomListItemsFromUrl(list.id);
                                if (changed) {
                                    const data = await storageService.getListItems(list, true);
                                    setItems(data);
                                }
                            }}
                            className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                        >
                            Sync Now
                        </button>
                    </div>
                </div>
                <div className="mt-3 flex gap-2">
                    <input
                        type="text"
                        placeholder="Paste items JSON URL here"
                        value={itemsSyncUrl}
                        onChange={(e) => setItemsSyncUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                        onClick={() => {
                            const url = itemsSyncUrl.trim() || null;
                            storageService.setCustomListItemsSyncUrl(list.id, url);
                        }}
                        className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                    >
                        Save
                    </button>
                    <button
                        onClick={async () => {
                            if (!itemsSyncUrl.trim()) return;
                            const ok = await storageService.importCustomListItemsFromUrl(list.id, itemsSyncUrl.trim());
                            if (ok) {
                                const data = await storageService.getListItems(list, true);
                                setItems(data);
                                alert('Items imported');
                            } else {
                                alert('Failed to import items');
                            }
                        }}
                        className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                        Import
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Use “Copy Items URL” on the device you want to share from, paste here, and save. You can import once or click Sync Now anytime.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-indigo-500" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {items.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => onItemClick(item)}
                            className="group cursor-pointer space-y-2"
                        >
                            <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/10 relative">
                                <img 
                                    src={getImageUrl(item.poster_path, 'w500')} 
                                    alt={item.title || item.name} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </div>
                            <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-indigo-400 transition-colors">
                                {item.title || item.name}
                            </h3>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {showMergeModal && (
            <AddListModal
                onClose={() => setShowMergeModal(false)}
                onAdded={() => {
                    if (onListUpdated) onListUpdated();
                    // We might need to refresh the list items here if the parent doesn't unmount us
                    // But usually onAdded triggers a refresh in parent which might pass new props
                    // For now, let's just reload items
                    storageService.getListItems(list).then(setItems);
                }}
                mode="merge"
                targetListId={list.id}
            />
        )}
    </div>
  );
};

export default ListDetailModal;
