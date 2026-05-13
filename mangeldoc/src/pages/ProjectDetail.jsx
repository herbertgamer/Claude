import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, getDefectsByProject, saveDefect, saveProject } from '../utils/db'
import { compressImage } from '../utils/imageUtils'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [defects, setDefects] = useState([])
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const p = await getProject(id)
    if (!p) { navigate('/'); return; }
    setProject(p)
    const d = await getDefectsByProject(id)
    d.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    setDefects(d)
  }

  function startEditing() {
    const dateObj = new Date(project.createdAt)
    const dateStr = dateObj.toISOString().split('T')[0]
    setEditData({
      name: project.name,
      address: project.address || '',
      date: dateStr,
      inspectionType: project.inspectionType || '',
    })
    setEditing(true)
  }

  async function handleSaveEdit() {
    const dateParts = editData.date.split('-')
    const newDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12)
    const updated = {
      ...project,
      name: editData.name,
      address: editData.address,
      inspectionType: editData.inspectionType,
      createdAt: newDate.getTime(),
    }
    await saveProject(updated)
    setProject(updated)
    setEditing(false)
  }

  async function handleFiles(files) {
    for (const file of files) {
      const imageData = await compressImage(file)
      const defect = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        projectId: id,
        imageData,
        annotations: [],
        canvasWidth: null,
        location: '',
        description: '',
        status: 'offen',
        createdAt: Date.now(),
      }
      await saveDefect(defect)
    }
    loadData()
  }

  function handleCapture(e) {
    if (e.target.files?.length) {
      handleFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  if (!project) return null

  const open = defects.filter(d => d.status !== 'behoben').length
  const fixed = defects.filter(d => d.status === 'behoben').length

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        <h1>{project.name}</h1>
        <button className="btn btn-sm btn-outline" onClick={startEditing}>Bearbeiten</button>
      </div>

      {editing && (
        <div className="edit-project-form">
          <div className="form-group">
            <label>Projektname</label>
            <input
              className="form-input"
              value={editData.name}
              onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Adresse</label>
            <input
              className="form-input"
              value={editData.address}
              onChange={e => setEditData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Begehungsdatum</label>
            <input
              type="date"
              className="form-input"
              value={editData.date}
              onChange={e => setEditData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Prüfart</label>
            <input
              className="form-input"
              value={editData.inspectionType}
              onChange={e => setEditData(prev => ({ ...prev, inspectionType: e.target.value }))}
              placeholder="z.B. Blitzschutz"
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-outline" onClick={() => setEditing(false)}>Abbrechen</button>
            <button className="btn btn-primary" onClick={handleSaveEdit}>Speichern</button>
          </div>
        </div>
      )}

      {!editing && project.inspectionType && (
        <div style={{ marginBottom: 12, color: 'var(--text-light)', fontSize: 13 }}>
          {project.inspectionType}
          {project.address && ` · ${project.address}`}
        </div>
      )}

      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-number">{defects.length}</div>
          <div className="stat-label">Gesamt</div>
        </div>
        <div className="stat-item open">
          <div className="stat-number">{open}</div>
          <div className="stat-label">Offen</div>
        </div>
        <div className="stat-item fixed">
          <div className="stat-number">{fixed}</div>
          <div className="stat-label">Behoben</div>
        </div>
      </div>

      <div className="photo-buttons">
        <label className="photo-btn-label">
          Foto aufnehmen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
          />
        </label>
        <label className="photo-btn-label secondary">
          Aus Galerie
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleCapture}
          />
        </label>
      </div>

      {defects.length > 0 && (
        <>
          <div className="photo-grid">
            {defects.map((d, i) => (
              <div
                key={d.id}
                className="photo-thumb"
                onClick={() => navigate(`/defect/${d.id}`)}
              >
                <img src={d.imageData} alt={`Mangel ${i + 1}`} />
                <div className={`status-dot ${d.status === 'behoben' ? 'fixed' : 'open'}`} />
              </div>
            ))}
          </div>

          <button
            className="btn btn-outline btn-full"
            style={{ marginTop: 20 }}
            onClick={() => navigate(`/report/${id}`)}
          >
            Bericht anzeigen
          </button>
        </>
      )}
    </>
  )
}
