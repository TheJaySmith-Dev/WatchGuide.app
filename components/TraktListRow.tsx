import React, { useEffect, useState } from 'react';
import { MediaItem, TraktList } from '../types';
import ContentRow from './ContentRow';
import { storageService } from '../services/storage';
import { Trash2 } from 'lucide-react';

interface TraktListRowProps {
  list: TraktList;
  onItemClick: (item: MediaItem) => void;
  onRemove?: () => void;
}

const TraktListRow: React.FC<TraktListRowProps> = ({ list, onItemClick, onRemove }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const mediaItems = await storageService.getTraktListItems(list.ids.trakt);
        setItems(mediaItems);
      } catch (error) {
        console.error(`Failed to load list ${list.name}`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [list.ids.trakt]);

  if (loading || items.length === 0) return null;

  return (
    <ContentRow 
      title={list.name} 
      items={items} 
      onItemClick={onItemClick} 
      isPoster={true}
      headerContent={
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-md">
            {list.item_count} items
          </span>
          {onRemove && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to remove "${list.name}" from your home screen?`)) {
                  onRemove();
                }
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
              title="Remove from Home Screen"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      }
    />
  );
};

export default TraktListRow;
