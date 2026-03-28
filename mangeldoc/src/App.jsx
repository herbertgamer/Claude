import { Routes, Route } from 'react-router-dom'
import ProjectList from './pages/ProjectList.jsx'
import NewProject from './pages/NewProject.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import DefectEdit from './pages/DefectEdit.jsx'
import Report from './pages/Report.jsx'
import './styles.css'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/new" element={<NewProject />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/defect/:id" element={<DefectEdit />} />
        <Route path="/report/:projectId" element={<Report />} />
      </Routes>
    </div>
  )
}
