import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './state/AppContext.jsx'
import Layout from './components/layout/Layout.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Upload from './pages/Upload.jsx'
import Analysis from './pages/Analysis.jsx'
import CohortBuilder from './pages/CohortBuilder.jsx'
import CustomCohort from './pages/CustomCohort.jsx'
import Longitudinal from './pages/Longitudinal.jsx'
import SyntheticData from './pages/SyntheticData.jsx'
import Validation from './pages/Validation.jsx'
import Privacy from './pages/Privacy.jsx'
import DataAssistant from './pages/DataAssistant.jsx'
import Predictor from './pages/Predictor.jsx'
import SourceDataset from './pages/SourceDataset.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/source-dataset" element={<SourceDataset />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/cohort-builder" element={<CohortBuilder />} />
          <Route path="/custom-cohort" element={<CustomCohort />} />
          <Route path="/longitudinal" element={<Longitudinal />} />
          <Route path="/synthetic-data" element={<SyntheticData />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/data-assistant" element={<DataAssistant />} />
          <Route path="/predictor" element={<Predictor />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
