import { useEffect, useState } from 'react'

const STORAGE_KEY = 'boothClassExplorer.savedSchedule'

function loadSavedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export function useSavedSchedule() {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => loadSavedKeys())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(savedKeys)))
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — saves just won't persist.
    }
  }, [savedKeys])

  function toggle(key: string) {
    setSavedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function isSaved(key: string) {
    return savedKeys.has(key)
  }

  return { savedKeys, isSaved, toggle }
}
