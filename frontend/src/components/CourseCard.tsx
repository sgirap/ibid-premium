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
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {course.quarter}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave(course)
            }}
            aria-label={isSaved ? 'Remove from saved schedule' : 'Save to schedule'}
            aria-pressed={isSaved}
            className={`text-lg leading-none transition-colors ${isSaved ? 'text-amber-500' : 'text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500'}`}
          >
            {isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {instructorName(course) || 'Staff'} · {schedule} · {course.units} units
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        {course.program}
        {course.building ? ` · ${course.building}${course.location ? ` ${course.location}` : ''}` : ''}
      </p>
      {(course.concentrations.length > 0 || course.foundationsArea || course.flmbeArea) && (
        <div className="mt-2 flex flex-wrap gap-1">
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
      )}
    </div>
  )
}
