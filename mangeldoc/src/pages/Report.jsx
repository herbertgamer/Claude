import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, getDefectsByProject } from '../utils/db'
import { burnAnnotations } from '../utils/imageUtils'
import { exportPDF, sharePDF } from '../utils/pdfExport'

export default function Report() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [defects, setDefects] = useState([])
  const [burnedImages, setBurnedImages] = useState({})
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    const p = await getProject(projectId)
    if (!p) { navigate('/'); return; }
    setProject(p)
    const d = await getDefectsByProject(projectId)
    d.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    setDefects(d)

    // Burn annotations for preview
    const burned = {}
    for (const defect of d) {
      if (defect.imageData && defect.annotations?.length > 0 && defect.canvasWidth) {
        try {
          burned[defect.id] = await burnAnnotations(defect.imageData, defect.annotations, defect.canvasWidth)
        } catch {
          burned[defect.id] = defect.imageData
        }
      } else {
        burned[defect.id] = defect.imageData
      }
    }
    setBurnedImages(burned)
  }

  async function handleExport() {
    setGenerating(true)
    try {
      await exportPDF(project, defects)
    } finally {
      setGenerating(false)
    }
  }

  async function handleShare() {
    setGenerating(true)
    try {
      await sharePDF(project, defects)
    } finally {
      setGenerating(false)
    }
  }

  if (!project) return null

  const open = defects.filter(d => d.status !== 'behoben').length

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(`/project/${projectId}`)}>←</button>
        <h1>Bericht</h1>
      </div>

      <div className="card">
        <h3>{project.name}</h3>
        <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>
          {project.inspectionType && <span>{project.inspectionType}</span>}
          {project.address && <span> · {project.address}</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>
          {new Date().toLocaleDateString('de-DE')} · {defects.length} Mängel · {open} offen
        </div>
      </div>

      <div className="action-row">
        <button className="btn btn-primary" onClick={handleExport} disabled={generating}>
          {generating ? '...' : '📄 PDF speichern'}
        </button>
        <button className="btn btn-outline" onClick={handleShare} disabled={generating}>
          {generating ? '...' : '📤 Teilen'}
        </button>
      </div>

      {defects.map((d, i) => (
        <div key={d.id} className="card report-item" style={{ marginTop: 16 }}>
          <div className="report-header">
            <strong>Mangel #{i + 1}</strong>
            <span className={`status-badge ${d.status === 'behoben' ? 'fixed' : 'open'}`}>
              {d.status === 'behoben' ? 'Behoben' : 'Offen'}
            </span>
          </div>
          {burnedImages[d.id] && (
            <img src={burnedImages[d.id]} alt={`Mangel ${i + 1}`} />
          )}
          {d.location && <div style={{ fontSize: 13, color: 'var(--text-light)' }}>📍 {d.location}</div>}
          {d.description && <div style={{ fontSize: 14, marginTop: 4 }}>{d.description}</div>}
        </div>
      ))}
    </>
  )
}
