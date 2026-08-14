import type { Course } from '../types/course'

export type FacetField = 'quarter' | 'instructor' | 'units' | 'days' | 'concentrations' | 'requirementTypes'

export const FACET_LABELS: Record<FacetField, string> = {
  quarter: 'Quarter',
  instructor: 'Instructor',
  units: 'Units',
  days: 'Days',
  concentrations: 'Concentration',
  requirementTypes: 'Requirement Type',
}

export function getFacetOptions(courses: Course[], field: FacetField): string[] {
  const values = new Set<string>()
  for (const course of courses) {
    const raw = course[field]
    if (Array.isArray(raw)) {
      raw.forEach((v) => values.add(String(v)))
    } else if (raw !== undefined && raw !== null && raw !== '') {
      values.add(String(raw))
    }
  }
  return Array.from(values).sort()
}

export type FacetSelection = Partial<Record<FacetField, Set<string>>>

export function courseMatchesFacets(course: Course, selection: FacetSelection): boolean {
  for (const [field, selected] of Object.entries(selection) as [FacetField, Set<string>][]) {
    if (!selected || selected.size === 0) continue
    const raw = course[field]
    const courseValues = Array.isArray(raw) ? raw.map(String) : [String(raw)]
    const hasMatch = courseValues.some((v) => selected.has(v))
    if (!hasMatch) return false
  }
  return true
}
