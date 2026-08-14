export interface CourseEvaluation {
  avgHoursPerWeek: number
  clarity: number
  engagement: number
  usefulness: number
  overallValue: number
  recommend: number
  invitedCount: number
  respondentCount: number
  sectionsEvaluated: number
  mostRecentTerm: string
}

export interface Course {
  quarter: string
  title: string
  course: string
  courseNumber: string
  program: string
  professorFirstName: string
  professorLastName: string
  day: string
  time: string
  timing: string
  capacity: string
  building: string
  location: string
  units: number
  concentrations: string[]
  foundationsArea: string
  flmbeArea: string
  evaluation: CourseEvaluation | null
}
