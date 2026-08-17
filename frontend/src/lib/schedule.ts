import type { Course } from '../types/course'

export function courseKey(course: Course): string {
  return [course.course, course.quarter, course.day, course.time, course.professorFirstName, course.professorLastName].join('|')
}

const SEASON_ORDER: Record<string, number> = { Winter: 0, Spring: 1, Summer: 2, Autumn: 3 }

function quarterSortKey(quarter: string): [number, number] {
  const [season, year] = quarter.split(' ')
  return [Number(year) || 0, SEASON_ORDER[season] ?? -1]
}

export interface QuarterGroup {
  quarter: string
  courses: Course[]
}

export function groupByQuarter(courses: Course[]): QuarterGroup[] {
  const groups = new Map<string, Course[]>()
  for (const course of courses) {
    const list = groups.get(course.quarter) ?? []
    list.push(course)
    groups.set(course.quarter, list)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      const [ay, as] = quarterSortKey(a)
      const [by, bs] = quarterSortKey(b)
      return ay - by || as - bs
    })
    .map(([quarter, courses]) => ({ quarter, courses }))
}
