import { useState, useEffect } from "react"
import Layout from "./components/Layout"
import OverviewPage from "./views/OverviewPage"
import HealthMapPage from "./views/HealthMapPage"
import FacilitiesPage from "./views/FacilitiesPage"
import DiseasePage from "./views/DiseasePage"
import CompareRegionPage from "./views/CompareRegionPage"
import AllRegionsPage from "./views/AllRegionsPage"
import ProgramRecommendationPage from "./views/ProgramRecommendationPage"
import OpenDataPage from "./views/OpenDataPage"
import AboutPage from "./views/AboutPage"
import AIInsightPage from "./views/AIInsightPage"
import AIInsightPanel from "./components/AIInsightPanel"
import SplashScreen from "./components/SplashScreen"

type Page = "overview" | "healthmap" | "facilities" | "disease" | "compare" | "regions" | "programs" | "aiinsight" | "opendata" | "about"

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [currentPage, setCurrentPage] = useState<Page>("overview")
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [year, setYear] = useState("2024")
  const [region, setRegion] = useState("all")
  const [recommendationRegion, setRecommendationRegion] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const handleNavigate = (page: string) => {
    if (page === "programs") setRecommendationRegion(null)
    setCurrentPage(page as Page)
  }

  const handleRecommendationNavigate = (regionName: string) => {
    setRecommendationRegion(regionName)
    setCurrentPage("programs")
  }

  const handleYearChange = (y: string) => {
    setYear(y)
    setToast(`Data tahun ${y} ditampilkan`)
  }

  const handleRegionChange = (r: string, label?: string) => {
    setRegion(r)
    setToast(r === "all" ? "Menampilkan data Jawa Timur" : `Wilayah: ${label ?? r}`)
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const sharedProps = {
    onAIPanel: () => setAiPanelOpen(true),
    year,
  }

  const renderPage = () => {
    switch (currentPage) {
      case "overview":   return <OverviewPage   {...sharedProps} onNavigate={handleNavigate} region={region} onRegionChange={handleRegionChange} onYearChange={handleYearChange} />
      case "healthmap":  return <HealthMapPage  {...sharedProps} />
      case "facilities": return <FacilitiesPage {...sharedProps} />
      case "disease":    return <DiseasePage    {...sharedProps} />
      case "compare":    return <CompareRegionPage {...sharedProps} />
      case "regions":    return <AllRegionsPage {...sharedProps} onYearChange={handleYearChange} onRecommendationNavigate={handleRecommendationNavigate} />
      case "programs":   return <ProgramRecommendationPage {...sharedProps} initialRegion={recommendationRegion} />
      case "aiinsight":  return <AIInsightPage {...sharedProps} />
      case "opendata":   return <OpenDataPage   {...sharedProps} />
      case "about":      return <AboutPage      onNavigate={handleNavigate} onAIPanel={() => setAiPanelOpen(true)} />
      default:           return <OverviewPage   {...sharedProps} onNavigate={handleNavigate} />
    }
  }

  return (
    <div className="cura-layout">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Layout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onAIPanel={() => setAiPanelOpen(true)}
        year={year}
        onYearChange={handleYearChange}
      >
        {renderPage()}
      </Layout>

      {aiPanelOpen && <AIInsightPanel onClose={() => setAiPanelOpen(false)} />}

      {/* Global toast */}
      {toast && (
        <div className="cura-toast">
          {toast}
        </div>
      )}
    </div>
  )
}
