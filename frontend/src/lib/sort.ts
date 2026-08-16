import type { Course } from '../types/course'

export type SortOption = 'default' | 'ratingDesc' | 'ratingAsc' | 'hoursAsc' | 'hoursDesc'

export const SORT_LABELS: Record<SortOption, string> = {
  default: 'Default',
  ratingDesc: 'Rating: high to low',
  ratingAsc: 'Rating: low to high',
  hoursAsc: 'Workload: fewest hours/week',
  hoursDesc: 'Workload: most hours/week',
}

export function sortCourses(courses: Course[], sort: SortOption): Course[] {
  if (sort === 'default') return courses

  // Classes with no evaluation data have nothing to sort by — push them to
  // the end regardless of direction, rather than treating missing data as 0.
  const withEval = courses.filter((c) => c.evaluation)
  const withoutEval = courses.filter((c) => !c.evaluation)

  const sorted = [...withEval].sort((a, b) => {
    switch (sort) {
      case 'ratingDesc':
        return b.evaluation!.recommend - a.evaluation!.recommend
      case 'ratingAsc':
        return a.evaluation!.recommend - b.evaluation!.recommend
      case 'hoursAsc':
        return a.evaluation!.avgHoursPerWeek - b.evaluation!.avgHoursPerWeek
      case 'hoursDesc':
        return b.evaluation!.avgHoursPerWeek - a.evaluation!.avgHoursPerWeek
    }
  })

  return [...sorted, ...withoutEval]
}
