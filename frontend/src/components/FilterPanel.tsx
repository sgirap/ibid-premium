import { FACET_LABELS, type FacetField, type FacetSelection } from '../lib/facets'

interface FilterPanelProps {
  facetOptions: Record<FacetField, string[]>
  selection: FacetSelection
  onToggle: (field: FacetField, value: string) => void
  onClear: () => void
}

const FIELDS: FacetField[] = ['quarter', 'concentrations', 'requirementTypes', 'program', 'units', 'day', 'instructor']

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

        return (
          <div key={field}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {FACET_LABELS[field]}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {options.map((option) => {
                const isActive = selected.has(option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onToggle(field, option)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      isActive
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </aside>
  )
}
