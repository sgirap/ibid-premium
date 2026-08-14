import type { Course } from '../types/course'

export function courseKey(course: Course): string {
  return [course.course, course.quarter, course.day, course.time, course.professorFirstName, course.professorLastName].join('|')
}
