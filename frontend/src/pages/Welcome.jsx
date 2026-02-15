import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

const Welcome = ({ user, onContinue }) => {
  useEffect(() => {
    // Auto-continue to dashboard after 3 seconds
    const timer = setTimeout(() => {
      onContinue()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onContinue])

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Orbs */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.15 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="pointer-events-none absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-accent-lime blur-3xl"
      />
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.1 }}
        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
        className="pointer-events-none absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-accent-lavender blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl px-6">
        {/* Logo/Icon with animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.1
          }}
          className="relative"
        >
          <div className="h-24 w-24 rounded-3xl bg-dark-surface border border-dark-border shadow-2xl flex items-center justify-center relative overflow-hidden">
            {/* Animated gradient background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-br from-accent-lime/20 via-transparent to-accent-lavender/20"
            />
            
            <svg width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 1, delay: 0.5 }}
                d="M10 28c8-10 20-12 28-6-4 10-14 16-26 16-4 0-6-4-2-10z"
                fill="#84ff00"
                fillOpacity="0.85"
              />
              <motion.path
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.8 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                d="M26 14h16v10H26z"
                fill="#0ea5e9"
                fillOpacity="0.8"
              />
              <motion.path
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.6 }}
                transition={{ duration: 0.3, delay: 1 }}
                d="M28 16h4v3h-4zm6 0h4v3h-4zM28 20h4v3h-4zm6 0h4v3h-4z"
                fill="#0a0a0a"
                fillOpacity="0.6"
              />
            </svg>
          </div>
          
          {/* Pulsing rings */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-3 rounded-[30px] border-2 border-accent-lime/40"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.3,
            }}
            className="absolute -inset-6 rounded-[36px] border-2 border-accent-lavender/30"
          />
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center space-y-4"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-5xl md:text-6xl font-bold text-text-primary"
          >
            Welcome back,
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: 1.2,
              type: 'spring',
              stiffness: 150
            }}
            className="relative inline-block"
          >
            <h2 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-accent-lime via-accent-amber to-accent-lavender bg-clip-text text-transparent">
              {firstName}
            </h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 1.4 }}
              className="h-1 bg-gradient-to-r from-accent-lime via-accent-amber to-accent-lavender rounded-full mt-2"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.6 }}
            className="text-xl text-text-secondary mt-6"
          >
            Let's create something sustainable today
          </motion.p>
        </motion.div>

        {/* Loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 2 }}
          className="flex items-center gap-2 mt-4"
        >
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="h-2 w-2 rounded-full bg-accent-lime"
          />
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="h-2 w-2 rounded-full bg-accent-amber"
          />
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="h-2 w-2 rounded-full bg-accent-lavender"
          />
        </motion.div>

        {/* Skip button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          whileHover={{ opacity: 1, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.5, delay: 2.2 }}
          onClick={onContinue}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors mt-4 px-4 py-2 rounded-lg border border-dark-border/50 hover:border-dark-border"
        >
          Skip to dashboard →
        </motion.button>
      </div>
    </div>
  )
}

export default Welcome
