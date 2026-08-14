import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { useCourses } from './hooks/useCourses'
import { useSavedSchedule } from './hooks/useSavedSchedule'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { CourseCard } from './components/CourseCard'
import { CourseDetail } from './components/CourseDetail'
import { DonateButton } from './components/DonateButton'
import { courseMatchesFacets, getFacetOptions, type FacetField, type FacetSelection } from './lib/facets'
import { courseKey } from './lib/schedule'
import type { Course } from './types/course'

const FACET_FIELDS: FacetField[] = [
  'quarter',
  'program',
  'instructor',
  'day',
  'timing',
  'units',
  'concentrations',
  'foundationsArea',
  'flmbeArea',
  'building',
]

function App() {
  const { courses, loading, error } = useCourses()
  const { savedKeys, isSaved, toggle: toggleSaved } = useSavedSchedule()
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<FacetSelection>({})
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [view, setView] = useState<'browse' | 'saved'>('browse')

  const fuse = useMemo(
    () =>
      new Fuse(courses, {
        keys: ['course', 'courseNumber', 'title', 'professorFirstName', 'professorLastName', 'program'],
        threshold: 0.3,
      }),
    [courses],
  )

  const facetOptions = useMemo(() => {
    const options = {} as Record<FacetField, string[]>
    for (const field of FACET_FIELDS) {
      options[field] = getFacetOptions(courses, field)
    }
    return options
  }, [courses])

  const filteredCourses = useMemo(() => {
    const base = query.trim() ? fuse.search(query).map((r) => r.item) : courses
    return base.filter((course) => courseMatchesFacets(course, selection))
  }, [courses, fuse, query, selection])

  const savedCourses = useMemo(() => courses.filter((c) => savedKeys.has(courseKey(c))), [courses, savedKeys])
  const savedUnitsTotal = useMemo(() => savedCourses.reduce((sum, c) => sum + c.units, 0), [savedCourses])

  function toggleFacet(field: FacetField, value: string) {
    setSelection((prev) => {
      const next = { ...prev }
      const current = new Set(next[field])
      if (current.has(value)) {
        current.delete(value)
      } else {
        current.add(value)
      }
      next[field] = current
      return next
    })
  }

  const visibleCourses = view === 'saved' ? savedCourses : filteredCourses

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Booth Class Explorer</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Search and filter Booth's course catalog</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-300 p-0.5 text-sm dark:border-gray-700">
              <button
                type="button"
                onClick={() => setView('browse')}
                className={`rounded-md px-3 py-1 transition-colors ${
                  view === 'browse' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Browse
              </button>
              <button
                type="button"
                onClick={() => setView('saved')}
                className={`rounded-md px-3 py-1 transition-colors ${
                  view === 'saved' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                ★ My Schedule ({savedCourses.length})
              </button>
            </div>
            <DonateButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading classes…</p>}
        {error && <p className="text-sm text-red-600">Failed to load classes: {error}</p>}

        {!loading && !error && view === 'browse' && (
          <>
            <div className="mb-6">
              <SearchBar value={query} onChange={setQuery} />
            </div>
            <div className="flex flex-col gap-6 md:flex-row">
              <FilterPanel
                facetOptions={facetOptions}
                selection={selection}
                onToggle={toggleFacet}
                onClear={() => setSelection({})}
              />

              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {visibleCourses.length} class{visibleCourses.length === 1 ? '' : 'es'}
                </p>
                {visibleCourses.map((course, i) => (
                  <CourseCard
                    key={`${courseKey(course)}-${i}`}
                    course={course}
                    onSelect={setSelectedCourse}
                    isSaved={isSaved(courseKey(course))}
                    onToggleSave={(c) => toggleSaved(courseKey(c))}
                  />
                ))}
                {visibleCourses.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No classes match your search/filters.</p>
                )}
              </div>
            </div>
          </>
        )}

        {!loading && !error && view === 'saved' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {savedCourses.length} class{savedCourses.length === 1 ? '' : 'es'} saved · {savedUnitsTotal} units total
            </p>
            {savedCourses.map((course, i) => (
              <CourseCard
                key={`${courseKey(course)}-${i}`}
                course={course}
                onSelect={setSelectedCourse}
                isSaved={isSaved(courseKey(course))}
                onToggleSave={(c) => toggleSaved(courseKey(c))}
              />
            ))}
            {savedCourses.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nothing saved yet — click the ☆ on a class to add it to your schedule. Saved here, on this device.
              </p>
            )}
          </div>
        )}
      </main>

      {selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          isSaved={isSaved(courseKey(selectedCourse))}
          onToggleSave={(c) => toggleSaved(courseKey(c))}
        />
      )}
    </div>
  )
}

export default App
