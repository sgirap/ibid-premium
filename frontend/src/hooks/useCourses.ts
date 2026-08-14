import { useEffect, useState } from 'react'
import type { Course } from '../types/course'

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/classes.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load classes (${res.status})`)
        return res.json()
      })
      .then((data: Course[]) => setCourses(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { courses, loading, error }
}
