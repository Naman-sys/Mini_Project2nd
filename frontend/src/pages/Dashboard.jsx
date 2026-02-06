import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import InputPanel from '../components/InputPanel';
import Loader from '../components/Loader';
import DesignCard from '../components/DesignCard';
import ComparisonChart from '../components/ComparisonChart';
import Templates from '../components/Templates';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import SkeletonLoader from '../components/SkeletonLoader';
import CustomSpinner from '../components/CustomSpinner';
import { useTheme } from '../context/ThemeContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { generateDesignAlternatives } from '../data/mockDesigns';

const Dashboard = ({ user, onLogout }) => {
  const { isDark, toggleTheme } = useTheme();
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const apiUrl = (path) => `${apiBase}${path}`
  const [constraints, setConstraints] = useState({
    area: 1000,
    budget: 50,
    climate: 'moderate',
    priority: 'energy',
  });

  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('applying');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [mlRankings, setMlRankings] = useState(null);
  const [prefSaved, setPrefSaved] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const handleConstraintChange = (newConstraints) => {
    setConstraints(newConstraints);
  };

  const handleSelectTemplate = (templateDefaults) => {
    setConstraints(templateDefaults);
    setShowTemplates(false);
  };

  const toggleFavorite = (design) => {
    const isFaved = favorites.some(f => f.id === design.id);
    if (isFaved) {
      setFavorites(favorites.filter(f => f.id !== design.id));
    } else {
      setFavorites([...favorites, design]);
    }
    localStorage.setItem('sustainable-favorites', JSON.stringify(
      isFaved ? favorites.filter(f => f.id !== design.id) : [...favorites, design]
    ));
  };

  useEffect(() => {
    const saved = localStorage.getItem('sustainable-favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    let scrollTimeout;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setShowHeader(true);
      } else if (currentScrollY > 100) {
        if (currentScrollY > lastScrollY) {
          setShowHeader(false);
        } else {
          setShowHeader(true);
        }
      }
      
      setLastScrollY(currentScrollY);
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setShowHeader(true);
      }, 2000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [lastScrollY]);

  useKeyboardShortcuts({
    onGenerate: () => {
      if (!loading) simulateGeneration();
    },
    onSavePreferences: () => {
      localStorage.setItem('sustainable-preferences', JSON.stringify(constraints));
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2000);
    },
    onToggleHistory: () => setIsHistoryOpen(!isHistoryOpen),
    onShowShortcuts: () => setShowShortcuts(true),
    onClose: () => {
      setIsHistoryOpen(false);
      setShowShortcuts(false);
      setShowTemplates(false);
    },
  });

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const query = user?.id
        ? `?limit=15&user_id=${user.id}`
        : '?limit=15&guest=1';
      const response = await fetch(apiUrl(`/api/projects${query}`));
      const data = await response.json();
      if (response.ok) {
        setHistory(data.projects || []);
      }
    } catch (error) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const clearHistory = async () => {
    setClearingHistory(true);
    try {
      await fetch(apiUrl('/api/projects/clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id || null, guest: !user?.id }),
      });
      await loadHistory();
    } catch (error) {
      // no-op
    } finally {
      setClearingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  useEffect(() => {
    if (isHistoryOpen) {
      loadHistory();
    }
  }, [isHistoryOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('sustainable-preferences');
    if (saved) {
      try {
        setConstraints(JSON.parse(saved));
      } catch (error) {
        // no-op
      }
    }
    setTimeout(() => setInitialLoad(false), 800);
  }, []);

  const simulateGeneration = async () => {
    setLoading(true);
    setDesigns([]);

    // Simulate constraint application
    setLoadingStatus('applying');
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Simulate design generation
    setLoadingStatus('generating');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate evaluation
    setLoadingStatus('evaluating');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate designs (backend with fallback)
    try {
      const payload = {
        ...constraints,
        user_id: user?.id || null,
      };

      const response = await fetch(apiUrl('/api/designs/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Backend generate failed');
      }

      const data = await response.json();
      setDesigns(data.designs || []);
      setMlRankings(data.ml_rankings || null);
    } catch (error) {
      const generatedDesigns = generateDesignAlternatives(constraints);
      setDesigns(generatedDesigns);
      setMlRankings(null);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = () => {
    localStorage.setItem('sustainable-preferences', JSON.stringify(constraints));
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 1500);
  };

  const downloadFile = (content, fileName, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!designs.length) return;
    const payload = {
      constraints,
      designs,
      generatedAt: new Date().toISOString(),
    };
    downloadFile(JSON.stringify(payload, null, 2), 'design-report.json', 'application/json');
  };

  const exportCSV = () => {
    if (!designs.length) return;
    const headers = ['Design', 'Energy', 'Water', 'Carbon', 'Sustainability', 'Estimated Cost'];
    const rows = designs.map((d) => [
      d.name,
      d.metrics.energyEfficiency,
      d.metrics.waterEfficiency,
      d.metrics.carbonFootprint,
      d.metrics.sustainabilityIndex,
      d.metrics.estimatedCost,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadFile(csv, 'design-report.csv', 'text/csv');
  };

  const printReport = () => {
    if (!designs.length) return;
    const reportWindow = window.open('', '_blank', 'width=900,height=700');
    if (!reportWindow) return;
    const rows = designs.map((d) => `
      <tr>
        <td>${d.name}</td>
        <td>${d.metrics.energyEfficiency}%</td>
        <td>${d.metrics.waterEfficiency}%</td>
        <td>${d.metrics.carbonFootprint}</td>
        <td>${d.metrics.sustainabilityIndex}%</td>
        <td>$${d.metrics.estimatedCost.toLocaleString()}</td>
      </tr>
    `).join('');

    reportWindow.document.write(`
      <html>
        <head>
          <title>Sustainable Design Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            p { color: #444; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <h1>Sustainable Design Studio - Report</h1>
          <p>Generated at ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Design</th>
                <th>Energy</th>
                <th>Water</th>
                <th>Carbon</th>
                <th>Sustainability</th>
                <th>Estimated Cost</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  // Find the best design
  const bestDesign = designs.length > 0
    ? (Array.isArray(mlRankings) && mlRankings.length > 0
        ? designs.reduce((prev, curr) => {
            const prevScore = mlRankings.find(r => r.id === prev.id)?.ml_score ?? prev.metrics.sustainabilityIndex;
            const currScore = mlRankings.find(r => r.id === curr.id)?.ml_score ?? curr.metrics.sustainabilityIndex;
            return currScore > prevScore ? curr : prev;
          })
        : designs.reduce((prev, curr) =>
            curr.metrics.sustainabilityIndex > prev.metrics.sustainabilityIndex ? curr : prev
          ))
    : null;

  return (
    <div className="min-h-screen bg-dark-bg pb-12">
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsHistoryOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHistoryOpen && (
          <motion.aside
            className="fixed top-0 right-0 h-full w-full max-w-md bg-dark-panel border-l border-dark-border shadow-2xl z-[110] p-6 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-accent-lime">Project History</h3>
                <p className="text-xs text-text-label">Saved projects for {user?.name || 'Guest'}</p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={loadHistory}
                className="text-xs px-3 py-1 rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-accent-lime-soft hover:text-accent-lime-soft transition-all"
              >
                Refresh
              </button>
              <button
                onClick={clearHistory}
                disabled={clearingHistory}
                className="text-xs px-3 py-1 rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-accent-coral hover:text-accent-coral transition-all"
              >
                {clearingHistory ? 'Clearing...' : 'Clear'}
              </button>
            </div>

            {historyLoading ? (
              <p className="text-sm text-text-secondary">Loading history...</p>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-dark-graphite border border-dark-border rounded-md px-4 py-3 hover:border-accent-lime-soft/30 transition-all"
                  >
                    <p className="text-sm text-text-primary">Project #{item.id}</p>
                    <p className="text-xs text-text-secondary">
                      {item.area} sq ft • Budget {item.budget}% • {item.climate} • {item.priority}
                    </p>
                    <p className="text-[11px] text-text-label mt-2">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No saved projects yet. Generate a design to create history.</p>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: showHeader ? 1 : 0, y: showHeader ? 0 : -100 }}
        transition={{ duration: 0.3 }}
        className="bg-dark-panel/95 border-b border-dark-border sticky top-0 z-50 backdrop-blur-md shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-text-primary">
                🌍 Sustainable Design Studio
              </h1>
              <p className="text-text-secondary mt-2 font-medium">Generative AI-Powered Design & Planning System</p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-right space-y-2"
            >
              <p className="text-sm text-text-label">Academic Research Project</p>
              <p className="text-xs text-text-label">Decision Support System v1.0</p>
              <div className="flex items-center justify-end gap-3 flex-wrap">
                <span className="text-xs text-text-secondary">Signed in as {user?.name || 'Guest'}</span>
                <button
                  onClick={() => setShowShortcuts(true)}
                  className="px-2 py-1 text-xs rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-accent-lavender hover:text-accent-lavender transition-all"
                  title="Show keyboard shortcuts (Ctrl+/)"
                >
                  ⌨️
                </button>
                <button
                  onClick={toggleTheme}
                  className="px-2 py-1 text-xs rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-accent-amber hover:text-accent-amber transition-all"
                >
                  {isDark ? '🌙' : '☀️'}
                </button>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="px-3 py-1 text-xs rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-accent-lime-soft hover:text-accent-lime-soft transition-all"
                >
                  History
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-1 text-xs rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-accent-coral hover:text-accent-coral transition-all"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Input Panel */}
          <motion.div
            className="lg:sticky lg:top-32 lg:h-fit lg:w-[320px] lg:shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-6">
              <InputPanel
                constraints={constraints}
                onConstraintChange={handleConstraintChange}
                onGenerate={simulateGeneration}
                isLoading={loading}
              />

              <div className="bg-dark-surface rounded-lg p-5 shadow-xl">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Profile & Preferences</h3>
                <div className="text-sm text-text-secondary space-y-1">
                  <p><span className="text-text-label">Name:</span> {user?.name || 'Guest'}</p>
                  <p><span className="text-text-label">Email:</span> {user?.email || '—'}</p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="px-3 py-1.5 text-xs rounded-md bg-accent-lime/20 border border-accent-lime text-accent-lime hover:bg-accent-lime/30 transition-all"
                  >
                    📐 Design Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('sustainable-preferences', JSON.stringify(constraints));
                      setPrefSaved(true);
                      setTimeout(() => setPrefSaved(false), 2000);
                    }}
                    className="px-3 py-1.5 text-xs rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-gray-600"
                  >
                    Save Default Constraints
                  </button>
                  {prefSaved && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-accent-lime font-semibold"
                    >
                      ✓ Preferences saved
                    </motion.span>
                  )}
                </div>
              </div>

              {favorites.length > 0 && (
                <div className="bg-dark-surface rounded-lg p-5 shadow-xl">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">❤️ Favorites ({favorites.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {favorites.map((fav) => (
                      <div key={fav.id} className="text-xs bg-dark-bg/60 p-2 rounded border border-dark-border text-text-secondary">
                        {fav.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column - Results */}
          <motion.div
            className="flex-1 space-y-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {showTemplates && (
                <Templates onSelectTemplate={handleSelectTemplate} />
              )}

              {loading ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex justify-center items-center py-24"
                >
                  <CustomSpinner 
                    variant="building" 
                    size="xl" 
                    message={
                      loadingStatus === 'applying' ? 'Applying constraints...' :
                      loadingStatus === 'generating' ? 'Generating designs...' :
                      'Evaluating sustainability...'
                    }
                  />
                </motion.div>
              ) : initialLoad ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SkeletonLoader type="card" count={3} />
                </motion.div>
              ) : designs.length > 0 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {/* Design Overview */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-dark-surface rounded-lg p-6 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-text-primary">Design Overview</h2>
                        <p className="text-text-secondary text-sm mt-1">
                          Generated <span className="font-bold text-accent-blue">{designs.length}</span> design alternatives based on your constraints.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={exportCSV}
                          className="px-3 py-1.5 text-xs rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-gray-600"
                        >
                          Export CSV
                        </button>
                        <button
                          type="button"
                          onClick={exportJSON}
                          className="px-3 py-1.5 text-xs rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-gray-600"
                        >
                          Export JSON
                        </button>
                        <button
                          type="button"
                          onClick={printReport}
                          className="px-3 py-1.5 text-xs rounded-md bg-dark-graphite border border-dark-border text-text-secondary hover:border-gray-600"
                        >
                          Print PDF
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-dark-graphite px-3 py-1 rounded-md text-xs border border-dark-border text-text-secondary">
                        📐 {constraints.area} sq ft
                      </span>
                      <span className="bg-dark-graphite px-3 py-1 rounded-md text-xs border border-dark-border text-text-secondary">
                        💰 Budget: {constraints.budget}%
                      </span>
                      <span className="bg-dark-graphite px-3 py-1 rounded-md text-xs border border-dark-border text-text-secondary">
                        🌡️ {constraints.climate.charAt(0).toUpperCase() + constraints.climate.slice(1)}
                      </span>
                      <span className="bg-dark-graphite px-3 py-1 rounded-md text-xs border border-dark-border text-text-secondary">
                        🎯 Focus: {constraints.priority.charAt(0).toUpperCase() + constraints.priority.slice(1)}
                      </span>
                    </div>
                  </motion.div>

                  {/* Design Cards */}
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-text-primary">Generated Alternatives</h2>
                    <motion.div 
                      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.1
                          }
                        }
                      }}
                    >
                      {designs.map((design, index) => (
                        <motion.div
                          key={design.id}
                          variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 }
                          }}
                        >
                          <DesignCard
                            design={design}
                            isBest={design.id === bestDesign?.id}
                            index={index}
                            isFavorite={favorites.some(f => f.id === design.id)}
                            onToggleFavorite={toggleFavorite}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>


                  {/* Comparison Charts */}
                  <ComparisonChart designs={designs} />

                  {/* Best Design Recommendation */}
                  {bestDesign && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-dark-surface border border-accent-lime/20 rounded-lg p-6 shadow-xl"
                    >
                      <h3 className="text-lg font-bold text-accent-lime mb-2">🏆 Recommended Design</h3>
                      <p className="text-text-secondary text-sm">
                        Based on your sustainability metrics, <span className="font-bold text-accent-lime-soft">{bestDesign.name}</span> achieves the highest overall sustainability index of <span className="font-bold text-accent-yellow">{bestDesign.metrics.sustainabilityIndex}%</span>.
                      </p>
                      <p className="text-text-label text-xs mt-3">
                        This design best aligns with your priority focus on <span className="font-bold capitalize">{constraints.priority}</span> while maintaining feasibility within your budget and climate constraints.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-dark-surface rounded-lg p-12 text-center shadow-xl"
                >
                  <p className="text-6xl mb-4">🎨</p>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Ready to Generate Designs</h3>
                  <p className="text-text-label text-sm">
                    Configure your design constraints using the panel on the left and click "Generate AI Designs" to explore sustainable alternatives.
                  </p>
                  <p className="text-xs text-text-secondary mt-4">💡 Tip: Use Ctrl+G to quickly generate designs</p>
                </motion.div>
              )}
            </AnimatePresence>

            <KeyboardShortcuts isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border-t border-dark-border mt-16 pt-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-label text-xs space-y-2">
          <p>
            This system demonstrates how Generative AI can accelerate sustainable design exploration
            while maintaining feasibility and explainability for academic evaluation.
          </p>
          <p className="opacity-50">
            © 2026 Sustainable AI Design Studio | Built with React, Vite, Tailwind CSS, and Framer Motion
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
