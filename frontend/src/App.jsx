import React, { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import Intro from './pages/Intro'
import Welcome from './pages/Welcome'
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [isSplash, setIsSplash] = useState(true)
  const [isIntro, setIsIntro] = useState(true)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [isTransitionLoading, setIsTransitionLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [transitionCopy, setTransitionCopy] = useState({
    title: 'Preparing workspace...',
    subtitle: 'Loading secure session',
  })
  const [transitionStyle, setTransitionStyle] = useState(0)

  const loadingVariants = [
    {
      title: 'Launching dashboard...',
      subtitle: 'Syncing your workspace',
      ring: 'border-accent-lime',
      icon: 'energy',
    },
    {
      title: 'Warming up AI models...',
      subtitle: 'Calibrating sustainability engine',
      ring: 'border-accent-amber',
      icon: 'water',
    },
    {
      title: 'Securing session...',
      subtitle: 'Encrypting access layer',
      ring: 'border-accent-lavender',
      icon: 'construction',
    },
  ]

  const pickLoadingVariant = (fallbackIndex = 0) => {
    const index = Math.floor(Math.random() * loadingVariants.length)
    const selected = loadingVariants[index] || loadingVariants[fallbackIndex]
    setTransitionCopy({ title: selected.title, subtitle: selected.subtitle })
    setTransitionStyle(index)
  }

  useEffect(() => {
    const stored = localStorage.getItem('sustainable-user')
    if (stored) {
      setUser(JSON.parse(stored))
      setIsIntro(false)
      // Show welcome screen on app restart if user is logged in
      const welcomeShown = sessionStorage.getItem('welcome-shown')
      if (!welcomeShown) {
        setShowWelcome(true)
      }
    }
    const timer = setTimeout(() => setIsSplash(false), 1400)
    return () => clearTimeout(timer)
  }, [])

  const handleContinue = (userData) => {
    pickLoadingVariant(0)
    setIsTransitionLoading(true)
    setTimeout(() => {
      setUser(userData)
      localStorage.setItem('sustainable-user', JSON.stringify(userData))
      setIsTransitionLoading(false)
      // Don't show welcome on initial login, only on app restart
    }, 900)
  }

  const handleGetStarted = () => {
    setIsAuthLoading(true)
    setTimeout(() => {
      setIsIntro(false)
      setIsAuthLoading(false)
    }, 900)
  }

  const handleBackToIntro = () => {
    setIsIntro(true)
  }

  const handleLogout = () => {
    pickLoadingVariant(2)
    setTransitionCopy({
      title: 'Logging out...',
      subtitle: 'Securing your session',
    })
    setIsTransitionLoading(true)
    setTimeout(() => {
      localStorage.removeItem('sustainable-user')
      sessionStorage.removeItem('welcome-shown')
      setUser(null)
      setIsIntro(true)
      setIsTransitionLoading(false)
      setShowWelcome(false)
    }, 900)
  }

  const handleWelcomeContinue = () => {
    sessionStorage.setItem('welcome-shown', 'true')
    setShowWelcome(false)
  }

  if (isSplash) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-3xl bg-dark-surface border border-dark-border shadow-2xl flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 28c8-10 20-12 28-6-4 10-14 16-26 16-4 0-6-4-2-10z" fill="#84ff00" fillOpacity="0.85" />
                <path d="M26 14h16v10H26z" fill="#0ea5e9" fillOpacity="0.8" />
                <path d="M28 16h4v3h-4zm6 0h4v3h-4zM28 20h4v3h-4zm6 0h4v3h-4z" fill="#0a0a0a" fillOpacity="0.6" />
                <path d="M18 30c6-4 12-6 18-7" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M8 30c4-1 8-2 12-2" stroke="#9cff57" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="absolute -inset-2 rounded-[26px] border border-accent-lime/30 animate-pulse" />
            <div className="absolute -inset-4 rounded-[30px] border border-accent-lime-soft/20 animate-pulse" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">Sustainable Design Studio</h1>
            <p className="text-sm text-text-secondary">Initializing AI workspace...</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-lime animate-bounce" />
            <span className="h-2 w-2 rounded-full bg-accent-amber animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-accent-lavender animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    )
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-dark-surface border border-dark-border shadow-2xl flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-accent-lime border-t-transparent animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-text-primary">Preparing login...</h2>
            <p className="text-sm text-text-secondary">Loading secure workspace</p>
          </div>
        </div>
      </div>
    )
  }

  if (isTransitionLoading) {
    const ringClass = loadingVariants[transitionStyle]?.ring || 'border-accent-lime'
    const iconType = loadingVariants[transitionStyle]?.icon || 'energy'
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-dark-surface border border-dark-border shadow-2xl flex items-center justify-center relative">
            <div className={`absolute inset-3 rounded-full border-2 ${ringClass} border-t-transparent animate-spin`} />
            {iconType === 'energy' && (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="#84ff00" />
              </svg>
            )}
            {iconType === 'water' && (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" fill="#38bdf8" />
              </svg>
            )}
            {iconType === 'construction' && (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21h18v-2H3v2zm2-4h14V3H5v14zm2-2V5h10v10H7z" fill="#a78bfa" />
              </svg>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-text-primary">{transitionCopy.title}</h2>
            <p className="text-sm text-text-secondary">{transitionCopy.subtitle}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isIntro) {
    return <Intro onGetStarted={handleGetStarted} />
  }

  if (!user) {
    return <Auth onContinue={handleContinue} onBackToIntro={handleBackToIntro} />
  }

  if (showWelcome) {
    return <Welcome user={user} onContinue={handleWelcomeContinue} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}

export default App
