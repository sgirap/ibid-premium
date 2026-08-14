import type { Course } from '../types/course'
import { instructorName } from '../lib/facets'

interface CourseDetailProps {
  course: Course
  onClose: () => void
}

export function CourseDetail({ course, onClose }: CourseDetailProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{course.course}</p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{course.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Instructor</dt>
            <dd className="text-gray-900 dark:text-gray-100">{instructorName(course) || 'Staff'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Quarter</dt>
            <dd className="text-gray-900 dark:text-gray-100">{course.quarter}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Day &amp; Time</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {course.day && course.time ? `${course.day} · ${course.time}` : 'TBD'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Units</dt>
            <dd className="text-gray-900 dark:text-gray-100">{course.units}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Program</dt>
            <dd className="text-gray-900 dark:text-gray-100">{course.program}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Location</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {course.building ? `${course.building}${course.location ? ` ${course.location}` : ''}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Capacity</dt>
            <dd className="text-gray-900 dark:text-gray-100">{course.capacity || '—'}</dd>
          </div>
        </dl>

        {course.concentrations.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Concentrations</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {course.concentrations.map((c) => (
                <span key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {course.foundationsArea && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Foundations</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                {course.foundationsArea}
              </span>
            </div>
          </div>
        )}

        {course.flmbeArea && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">FLMBE</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {course.flmbeArea}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
