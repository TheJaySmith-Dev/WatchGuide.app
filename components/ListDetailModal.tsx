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
