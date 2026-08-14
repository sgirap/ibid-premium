import { useState } from 'react'
import { FACET_LABELS, type FacetField, type FacetSelection } from '../lib/facets'

interface FilterPanelProps {
  facetOptions: Record<FacetField, string[]>
  selection: FacetSelection
  onToggle: (field: FacetField, value: string) => void
  onClear: () => void
}

const FIELDS: FacetField[] = [
  'quarter',
  'foundationsArea',
  'flmbeArea',
  'program',
  'concentrations',
  'location',
  'units',
  'day',
  'instructor',
]

// Fields with more options than this get a search box instead of a full chip cloud.
const SEARCH_THRESHOLD = 15

const ACTIVE_CLASSES: Partial<Record<FacetField, string>> = {
  foundationsArea: 'border-violet-600 bg-violet-600 text-white dark:border-violet-400 dark:bg-violet-400 dark:text-violet-950',
  flmbeArea: 'border-amber-600 bg-amber-600 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950',
}

const DEFAULT_ACTIVE_CLASSES = 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'

interface FacetGroupProps {
  field: FacetField
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
}

function FacetGroup({ field, options, selected, onToggle }: FacetGroupProps) {
  const [query, setQuery] = useState('')
  const activeClasses = ACTIVE_CLASSES[field] ?? DEFAULT_ACTIVE_CLASSES
  const searchable = options.length > SEARCH_THRESHOLD

  const trimmedQuery = query.trim().toLowerCase()
  const visibleOptions = searchable
    ? options.filter((o) => selected.has(o) || (trimmedQuery !== '' && o.toLowerCase().includes(trimmedQuery)))
    : options

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {FACET_LABELS[field]}
      </h3>

      {searchable && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${FACET_LABELS[field].toLowerCase()}…`}
          className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      )}

      <div className="flex flex-wrap gap-1.5">
        {visibleOptions.map((option) => {
          const isActive = selected.has(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                isActive ? activeClasses : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              {option}
            </button>
          )
        })}
        {searchable && !query.trim() && visibleOptions.length === selected.size && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Type to search {options.length} options</p>
        )}
      </div>
    </div>
  )
}

export function FilterPanel({ facetOptions, selection, onToggle, onClear }: FilterPanelProps) {
  const activeCount = Object.values(selection).reduce((sum, s) => sum + (s?.size ?? 0), 0)

  return (
    <aside className="w-full shrink-0 space-y-5 md:w-64">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 underline hover:text-gray-900 dark:hover:text-gray-100"
          >
            Clear all
          </button>
        )}
      </div>

      {FIELDS.map((field) => {
        const options = facetOptions[field] ?? []
        if (options.length === 0) return null
        const selected = selection[field] ?? new Set<string>()

        return <FacetGroup key={field} field={field} options={options} selected={selected} onToggle={(value) => onToggle(field, value)} />
      })}
    </aside>
  )
}
