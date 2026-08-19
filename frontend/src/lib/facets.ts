import type { Course } from '../types/course'
import { quarterSortKey } from './schedule'

export type FacetField =
  | 'quarter'
  | 'program'
  | 'instructor'
  | 'day'
  | 'timing'
  | 'units'
  | 'concentrations'
  | 'foundationsArea'
  | 'flmbeArea'
  | 'building'

export const FACET_LABELS: Record<FacetField, string> = {
  quarter: 'Quarter',
  program: 'Program',
  instructor: 'Instructor',
  day: 'Day',
  timing: 'Timing',
  units: 'Units',
  concentrations: 'Concentration',
  foundationsArea: 'Foundations',
  flmbeArea: 'FLMBE',
  building: 'Building',
}

export function instructorName(course: Course): string {
  return [course.professorFirstName, course.professorLastName].filter(Boolean).join(' ')
}

function facetValues(course: Course, field: FacetField): string[] {
  if (field === 'instructor') {
    const name = instructorName(course)
    return name ? [name] : []
  }
  const raw = course[field]
  if (Array.isArray(raw)) return raw.map(String)
  return raw !== undefined && raw !== null && raw !== '' ? [String(raw)] : []
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMING_ORDER = ['Morning', 'Afternoon', 'Evening']

export function getFacetOptions(courses: Course[], field: FacetField): string[] {
  const values = new Set<string>()
  for (const course of courses) {
    facetValues(course, field).forEach((v) => values.add(v))
  }
  if (field === 'day') {
    return Array.from(values).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
  }
  if (field === 'timing') {
    return Array.from(values).sort((a, b) => TIMING_ORDER.indexOf(a) - TIMING_ORDER.indexOf(b))
  }
  if (field === 'quarter') {
    return Array.from(values).sort((a, b) => {
      const [ay, as] = quarterSortKey(a)
      const [by, bs] = quarterSortKey(b)
      return ay - by || as - bs
    })
  }
  return Array.from(values).sort()
}

export type FacetSelection = Partial<Record<FacetField, Set<string>>>

// Fields in the same group are OR'd together instead of AND'd: a course
// matches the group if it matches ANY selected value from ANY field in the
// group. Foundations and FLMBE are mutually exclusive per class (a class has
// at most one), so requiring both would always return zero results.
const OR_GROUPS: FacetField[][] = [['foundationsArea', 'flmbeArea']]

export function courseMatchesFacets(course: Course, selection: FacetSelection): boolean {
  const groupedFields = new Set(OR_GROUPS.flat())

  for (const group of OR_GROUPS) {
    const selectedInGroup = group.flatMap((field) => Array.from(selection[field] ?? []))
    if (selectedInGroup.length === 0) continue
    const courseValuesInGroup = group.flatMap((field) => facetValues(course, field))
    if (!selectedInGroup.some((v) => courseValuesInGroup.includes(v))) return false
  }

  for (const [field, selected] of Object.entries(selection) as [FacetField, Set<string>][]) {
    if (groupedFields.has(field)) continue
    if (!selected || selected.size === 0) continue
    const courseValues = facetValues(course, field)
    const hasMatch = courseValues.some((v) => selected.has(v))
    if (!hasMatch) return false
  }
  return true
}
