import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllProjects, deleteProject, getDefectsByProject } from '../utils/db'

export default function ProjectList() {
  const [projects, setProjects] = useState([])
  const [deleteId, setDeleteId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const all = await getAllProjects()
    const withCounts = await Promise.all(
      all.map(async (p) => {
        const defects = await getDefectsByProject(p.id)
        return {
          ...p,
          total: defects.length,
          open: defects.filter(d => d.status !== 'behoben').length,
          fixed: defects.filter(d => d.status === 'behoben').length,
        }
      })
    )
    withCounts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    setProjects(withCounts)
  }

  async function handleDelete() {
    if (deleteId) {
      await deleteProject(deleteId)
      setDeleteId(null)
      loadProjects()
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>MängelDoc</h1>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>Noch keine Projekte.<br/>Erstelle dein erstes Projekt!</p>
        </div>
      ) : (
        projects.map(p => (
          <div key={p.id} className="card project-card" onClick={() => navigate(`/project/${p.id}`)}>
            <h3>{p.name}</h3>
            <div className="meta">
              {p.inspectionType && <span>{p.inspectionType}</span>}
              {p.address && <span> · {p.address}</span>}
            </div>
            <div className="badge-row">
              <span className="status-badge open">{p.open} offen</span>
              <span className="status-badge fixed">{p.fixed} behoben</span>
            </div>
            <button
              className="btn btn-sm btn-outline"
              style={{ marginTop: 10 }}
              onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
            >
              Löschen
            </button>
          </div>
        ))
      )}

      <button
        className="btn btn-primary btn-full"
        style={{ marginTop: 16 }}
        onClick={() => navigate('/new')}
      >
        + Neues Projekt
      </button>

      {deleteId && (
        <div className="confirm-overlay" onClick={() => setDeleteId(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Projekt löschen?</h3>
            <p>Alle Mängel und Fotos werden gelöscht.</p>
            <div className="btn-row">
              <button className="btn btn-outline" onClick={() => setDeleteId(null)}>Abbrechen</button>
              <button className="btn btn-danger" onClick={handleDelete}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
