import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveProject } from '../utils/db'

const INSPECTION_TYPES = [
  'Brandschutz',
  'Förderanlage',
  'WKP',
  'Absturzsicherung',
  'Blitzschutz',
  'Allgemeine Begehung',
]

export default function NewProject() {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [customType, setCustomType] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return

    const inspectionType = selectedType || customType.trim()

    const project = {
      id: Date.now().toString(),
      name: name.trim(),
      address: address.trim(),
      inspectionType,
      createdAt: Date.now(),
    }
    await saveProject(project)
    navigate(`/project/${project.id}`)
  }

  function handleTagClick(type) {
    setSelectedType(prev => prev === type ? '' : type)
    setCustomType('')
  }

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        <h1>Neues Projekt</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Projektname *</label>
          <input
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="z.B. Bürogebäude Musterstr. 5"
            required
          />
        </div>

        <div className="form-group">
          <label>Adresse</label>
          <input
            className="form-input"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="z.B. Musterstraße 5, 10115 Berlin"
          />
        </div>

        <div className="form-group">
          <label>Prüfart</label>
          <div className="tag-list">
            {INSPECTION_TYPES.map(type => (
              <button
                key={type}
                type="button"
                className={`tag ${selectedType === type ? 'active' : ''}`}
                onClick={() => handleTagClick(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Eigene Prüfart</label>
          <input
            className="form-input"
            value={customType}
            onChange={e => { setCustomType(e.target.value); setSelectedType(''); }}
            placeholder="z.B. Elektroprüfung"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full">
          Projekt anlegen
        </button>
      </form>
    </>
  )
}
