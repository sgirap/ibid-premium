import type { Course } from '../types/course'

export type FacetField = 'quarter' | 'program' | 'instructor' | 'day' | 'units' | 'concentrations' | 'requirementTypes'

export const FACET_LABELS: Record<FacetField, string> = {
  quarter: 'Quarter',
  program: 'Program',
  instructor: 'Instructor',
  day: 'Day',
  units: 'Units',
  concentrations: 'Concentration',
  requirementTypes: 'Requirement Type',
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

export function getFacetOptions(courses: Course[], field: FacetField): string[] {
  const values = new Set<string>()
  for (const course of courses) {
    facetValues(course, field).forEach((v) => values.add(v))
  }
  return Array.from(values).sort()
}

export type FacetSelection = Partial<Record<FacetField, Set<string>>>

export function courseMatchesFacets(course: Course, selection: FacetSelection): boolean {
  for (const [field, selected] of Object.entries(selection) as [FacetField, Set<string>][]) {
    if (!selected || selected.size === 0) continue
    const courseValues = facetValues(course, field)
    const hasMatch = courseValues.some((v) => selected.has(v))
    if (!hasMatch) return false
  }
  return true
}
