import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { useCourses } from './hooks/useCourses'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { CourseCard } from './components/CourseCard'
import { CourseDetail } from './components/CourseDetail'
import { DonateButton } from './components/DonateButton'
import { courseMatchesFacets, getFacetOptions, type FacetField, type FacetSelection } from './lib/facets'
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
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<FacetSelection>({})
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Booth Class Explorer</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Search and filter Booth's course catalog</p>
          </div>
          <DonateButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <SearchBar value={query} onChange={setQuery} />
        </div>

        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading classes…</p>}
        {error && <p className="text-sm text-red-600">Failed to load classes: {error}</p>}

        {!loading && !error && (
          <div className="flex flex-col gap-6 md:flex-row">
            <FilterPanel
              facetOptions={facetOptions}
              selection={selection}
              onToggle={toggleFacet}
              onClear={() => setSelection({})}
            />

            <div className="flex-1 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredCourses.length} class{filteredCourses.length === 1 ? '' : 'es'}
              </p>
              {filteredCourses.map((course, i) => (
                <CourseCard
                  key={`${course.course}-${course.day}-${course.time}-${course.professorFirstName}-${course.professorLastName}-${i}`}
                  course={course}
                  onSelect={setSelectedCourse}
                />
              ))}
              {filteredCourses.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No classes match your search/filters.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedCourse && <CourseDetail course={selectedCourse} onClose={() => setSelectedCourse(null)} />}
    </div>
  )
}

export default App
