'use client';

import { useState, useEffect, useCallback } from 'react';
// Using inline SVG icons instead of @heroicons/react to avoid dependency issues

// Icon components
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const FunnelIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

export interface SearchFilters {
  tags: string[];
  creators: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  duration: {
    min?: number;
    max?: number;
  };
  sortBy: 'relevance' | 'date' | 'duration' | 'views' | 'title';
  sortOrder: 'asc' | 'desc';
  status?: 'ready' | 'processing' | 'error';
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableTags: string[];
  availableCreators: string[];
}

interface FilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

function FilterDropdown({ label, icon, isOpen, onToggle, children, count }: FilterDropdownProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
          isOpen || count
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {icon}
        <span>{label}</span>
        {count && count > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

export function SearchFilters({ 
  filters, 
  onFiltersChange, 
  availableTags, 
  availableCreators
}: SearchFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchTags, setSearchTags] = useState('');
  const [searchCreators, setSearchCreators] = useState('');

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    updateFilters({ tags: newTags });
  };

  const toggleCreator = (creator: string) => {
    const newCreators = filters.creators.includes(creator)
      ? filters.creators.filter(c => c !== creator)
      : [...filters.creators, creator];
    updateFilters({ creators: newCreators });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      tags: [],
      creators: [],
      dateRange: {},
      duration: {},
      sortBy: 'relevance',
      sortOrder: 'desc',
    });
  };

  const getActiveFilterCount = () => {
    return filters.tags.length + 
           filters.creators.length + 
           (filters.dateRange.start || filters.dateRange.end ? 1 : 0) +
           (filters.duration.min || filters.duration.max ? 1 : 0) +
           (filters.status ? 1 : 0);
  };

  const filteredTags = availableTags.filter(tag =>
    tag.toLowerCase().includes(searchTags.toLowerCase())
  );

  const filteredCreators = availableCreators.filter(creator =>
    creator.toLowerCase().includes(searchCreators.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
        
        {getActiveFilterCount() > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
          >
            <XMarkIcon className="w-4 h-4" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {/* Tags Filter */}
        <FilterDropdown
          label="Tags"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>}
          isOpen={openDropdown === 'tags'}
          onToggle={() => toggleDropdown('tags')}
          count={filters.tags.length}
        >
          <div className="p-4">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTags}
              onChange={(e) => setSearchTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredTags.map((tag) => (
                <label key={tag} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{tag}</span>
                </label>
              ))}
              {filteredTags.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No tags found</p>
              )}
            </div>
          </div>
        </FilterDropdown>

        {/* Creators Filter */}
        <FilterDropdown
          label="Creators"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>}
          isOpen={openDropdown === 'creators'}
          onToggle={() => toggleDropdown('creators')}
          count={filters.creators.length}
        >
          <div className="p-4">
            <input
              type="text"
              placeholder="Search creators..."
              value={searchCreators}
              onChange={(e) => setSearchCreators(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredCreators.map((creator) => (
                <label key={creator} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={filters.creators.includes(creator)}
                    onChange={() => toggleCreator(creator)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{creator}</span>
                </label>
              ))}
              {filteredCreators.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No creators found</p>
              )}
            </div>
          </div>
        </FilterDropdown>

        {/* Date Range Filter */}
        <FilterDropdown
          label="Upload Date"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>}
          isOpen={openDropdown === 'date'}
          onToggle={() => toggleDropdown('date')}
          count={filters.dateRange.start || filters.dateRange.end ? 1 : 0}
        >
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <input
                type="date"
                value={filters.dateRange.start || ''}
                onChange={(e) => updateFilters({ 
                  dateRange: { ...filters.dateRange, start: e.target.value || undefined } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <input
                type="date"
                value={filters.dateRange.end || ''}
                onChange={(e) => updateFilters({ 
                  dateRange: { ...filters.dateRange, end: e.target.value || undefined } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const lastWeek = new Date();
                  lastWeek.setDate(lastWeek.getDate() - 7);
                  updateFilters({ 
                    dateRange: { 
                      start: lastWeek.toISOString().split('T')[0],
                      end: new Date().toISOString().split('T')[0]
                    } 
                  });
                }}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Last 7 days
              </button>
              <button
                onClick={() => {
                  const lastMonth = new Date();
                  lastMonth.setMonth(lastMonth.getMonth() - 1);
                  updateFilters({ 
                    dateRange: { 
                      start: lastMonth.toISOString().split('T')[0],
                      end: new Date().toISOString().split('T')[0]
                    } 
                  });
                }}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Last 30 days
              </button>
            </div>
          </div>
        </FilterDropdown>

        {/* Duration Filter */}
        <FilterDropdown
          label="Duration"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>}
          isOpen={openDropdown === 'duration'}
          onToggle={() => toggleDropdown('duration')}
          count={filters.duration.min || filters.duration.max ? 1 : 0}
        >
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Duration (minutes)</label>
              <input
                type="number"
                min="0"
                value={filters.duration.min ? Math.floor(filters.duration.min / 60) : ''}
                onChange={(e) => updateFilters({ 
                  duration: { 
                    ...filters.duration, 
                    min: e.target.value ? parseInt(e.target.value) * 60 : undefined 
                  } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Duration (minutes)</label>
              <input
                type="number"
                min="0"
                value={filters.duration.max ? Math.floor(filters.duration.max / 60) : ''}
                onChange={(e) => updateFilters({ 
                  duration: { 
                    ...filters.duration, 
                    max: e.target.value ? parseInt(e.target.value) * 60 : undefined 
                  } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="∞"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '< 5 min', max: 300 },
                { label: '5-15 min', min: 300, max: 900 },
                { label: '15-30 min', min: 900, max: 1800 },
                { label: '30+ min', min: 1800 }
              ].map(({ label, min, max }) => (
                <button
                  key={label}
                  onClick={() => updateFilters({ duration: { min, max } })}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </FilterDropdown>

        {/* Status Filter */}
        <FilterDropdown
          label="Status"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>}
          isOpen={openDropdown === 'status'}
          onToggle={() => toggleDropdown('status')}
          count={filters.status ? 1 : 0}
        >
          <div className="p-4">
            <div className="space-y-2">
              {[
                { value: undefined, label: 'All statuses' },
                { value: 'ready', label: 'Ready' },
                { value: 'processing', label: 'Processing' },
                { value: 'error', label: 'Error' }
              ].map(({ value, label }) => (
                <label key={label} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="status"
                    checked={filters.status === value}
                    onChange={() => updateFilters({ status: value as SearchFilters['status'] })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </FilterDropdown>
      </div>

      {/* Sort Options */}
      <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilters({ sortBy: e.target.value as SearchFilters['sortBy'] })}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="relevance">Relevance</option>
          <option value="date">Upload Date</option>
          <option value="duration">Duration</option>
          <option value="views">Views</option>
          <option value="title">Title</option>
        </select>
        
        <select
          value={filters.sortOrder}
          onChange={(e) => updateFilters({ sortOrder: e.target.value as SearchFilters['sortOrder'] })}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                Tag: {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="ml-1 hover:text-blue-600"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            
            {filters.creators.map((creator) => (
              <span
                key={creator}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
              >
                Creator: {creator}
                <button
                  onClick={() => toggleCreator(creator)}
                  className="ml-1 hover:text-green-600"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            
            {(filters.dateRange.start || filters.dateRange.end) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Date: {filters.dateRange.start || '∞'} - {filters.dateRange.end || '∞'}
                <button
                  onClick={() => updateFilters({ dateRange: {} })}
                  className="ml-1 hover:text-purple-600"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {(filters.duration.min || filters.duration.max) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                Duration: {filters.duration.min ? Math.floor(filters.duration.min / 60) : 0}min - {filters.duration.max ? Math.floor(filters.duration.max / 60) : '∞'}min
                <button
                  onClick={() => updateFilters({ duration: {} })}
                  className="ml-1 hover:text-orange-600"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filters.status && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                Status: {filters.status}
                <button
                  onClick={() => updateFilters({ status: undefined })}
                  className="ml-1 hover:text-gray-600"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
