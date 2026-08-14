import type { Course } from '../types/course'
import { instructorName } from '../lib/facets'

interface CourseCardProps {
  course: Course
  onSelect: (course: Course) => void
  isSaved: boolean
  onToggleSave: (course: Course) => void
}

export function CourseCard({ course, onSelect, isSaved, onToggleSave }: CourseCardProps) {
  const schedule = course.day && course.time ? `${course.day} · ${course.time}` : 'Schedule TBD'
  const hasBadges = course.concentrations.length > 0 || !!course.foundationsArea || !!course.flmbeArea

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(course)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(course)
      }}
      className="w-full cursor-pointer rounded-lg border border-gray-200 p-4 text-left shadow-sm transition-shadow hover:shadow-md dark:border-gray-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{course.course}</p>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{course.title}</h3>
        </div>
        <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {course.quarter}
        </span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-gray-600 dark:text-gray-400">
        <span>
          {instructorName(course) || 'Staff'} · {schedule} · {course.units} units
        </span>
        {course.evaluation && (
          <span
            className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            title={`${course.evaluation.respondentCount} responses across ${course.evaluation.sectionsEvaluated} sections, most recently ${course.evaluation.mostRecentTerm}`}
          >
            ★ {course.evaluation.recommend.toFixed(1)}
          </span>
        )}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        {course.program}
        {course.building ? ` · ${course.building}${course.location ? ` ${course.location}` : ''}` : ''}
      </p>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {course.foundationsArea && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              Foundations: {course.foundationsArea}
            </span>
          )}
          {course.flmbeArea && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              FLMBE: {course.flmbeArea}
            </span>
          )}
          {course.concentrations.map((c) => (
            <span key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {c}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave(course)
          }}
          aria-pressed={isSaved}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            !hasBadges ? 'ml-auto' : ''
          } ${
            isSaved
              ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
              : 'border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-100 dark:hover:text-gray-100'
          }`}
        >
          {isSaved ? '✓ Added' : '+ Add'}
        </button>
      </div>
    </div>
  )
}
