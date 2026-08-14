import type { Course } from '../types/course'
import { instructorName } from '../lib/facets'

interface CourseDetailProps {
  course: Course
  onClose: () => void
  isSaved: boolean
  onToggleSave: (course: Course) => void
}

export function CourseDetail({ course, onClose, isSaved, onToggleSave }: CourseDetailProps) {
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
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleSave(course)}
              aria-pressed={isSaved}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isSaved
                  ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
                  : 'border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-100 dark:hover:text-gray-100'
              }`}
            >
              {isSaved ? '✓ Added' : '+ Add'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
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

        {course.evaluation && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Course Evaluations
              </h3>
              <span className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                {course.evaluation.respondentCount} responses · {course.evaluation.sectionsEvaluated} sections · through{' '}
                {course.evaluation.mostRecentTerm}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-emerald-800 dark:text-emerald-200">Would recommend</dt>
                <dd className="font-semibold text-emerald-900 dark:text-emerald-100">{course.evaluation.recommend.toFixed(2)}/5</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-emerald-800 dark:text-emerald-200">Overall value</dt>
                <dd className="font-semibold text-emerald-900 dark:text-emerald-100">{course.evaluation.overallValue.toFixed(2)}/5</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-emerald-800 dark:text-emerald-200">Clarity</dt>
                <dd className="font-semibold text-emerald-900 dark:text-emerald-100">{course.evaluation.clarity.toFixed(2)}/5</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-emerald-800 dark:text-emerald-200">Engagement</dt>
                <dd className="font-semibold text-emerald-900 dark:text-emerald-100">{course.evaluation.engagement.toFixed(2)}/5</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-emerald-800 dark:text-emerald-200">Usefulness</dt>
                <dd className="font-semibold text-emerald-900 dark:text-emerald-100">{course.evaluation.usefulness.toFixed(2)}/5</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-emerald-800 dark:text-emerald-200">Hours/week</dt>
                <dd className="font-semibold text-emerald-900 dark:text-emerald-100">{course.evaluation.avgHoursPerWeek.toFixed(1)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
