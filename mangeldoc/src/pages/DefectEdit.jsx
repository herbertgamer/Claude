import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDefect, saveDefect, deleteDefect } from '../utils/db'

export default function DefectEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [defect, setDefect] = useState(null)
  const [tool, setTool] = useState('circle')
  const [annotations, setAnnotations] = useState([])
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)
  const [currentPos, setCurrentPos] = useState(null)
  const [freehandPoints, setFreehandPoints] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const containerRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    loadDefect()
  }, [id])

  async function loadDefect() {
    const d = await getDefect(id)
    if (!d) { navigate('/'); return; }
    setDefect(d)
    setAnnotations(d.annotations || [])
  }

  // Draw existing annotations
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#E53935'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const ann of annotations) {
      if (ann.type === 'circle') {
        const cx = (ann.startX + ann.endX) / 2
        const cy = (ann.startY + ann.endY) / 2
        const rx = Math.abs(ann.endX - ann.startX) / 2
        const ry = Math.abs(ann.endY - ann.startY) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      } else if (ann.type === 'arrow') {
        ctx.beginPath()
        ctx.moveTo(ann.startX, ann.startY)
        ctx.lineTo(ann.endX, ann.endY)
        ctx.stroke()
        const angle = Math.atan2(ann.endY - ann.startY, ann.endX - ann.startX)
        const headLen = 15
        ctx.beginPath()
        ctx.moveTo(ann.endX, ann.endY)
        ctx.lineTo(ann.endX - headLen * Math.cos(angle - 0.4), ann.endY - headLen * Math.sin(angle - 0.4))
        ctx.moveTo(ann.endX, ann.endY)
        ctx.lineTo(ann.endX - headLen * Math.cos(angle + 0.4), ann.endY - headLen * Math.sin(angle + 0.4))
        ctx.stroke()
      } else if (ann.type === 'freehand' && ann.points?.length > 1) {
        ctx.beginPath()
        ctx.moveTo(ann.points[0].x, ann.points[0].y)
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y)
        }
        ctx.stroke()
      }
    }
  }, [annotations])

  useEffect(() => {
    drawAnnotations()
  }, [drawAnnotations])

  // Draw overlay for live preview
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    if (!drawing || !startPos) return

    ctx.strokeStyle = '#E53935'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (tool === 'circle' && currentPos) {
      const cx = (startPos.x + currentPos.x) / 2
      const cy = (startPos.y + currentPos.y) / 2
      const rx = Math.abs(currentPos.x - startPos.x) / 2
      const ry = Math.abs(currentPos.y - startPos.y) / 2
      if (rx > 0 && ry > 0) {
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else if (tool === 'arrow' && currentPos) {
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(currentPos.x, currentPos.y)
      ctx.stroke()
      const angle = Math.atan2(currentPos.y - startPos.y, currentPos.x - startPos.x)
      const headLen = 15
      ctx.beginPath()
      ctx.moveTo(currentPos.x, currentPos.y)
      ctx.lineTo(currentPos.x - headLen * Math.cos(angle - 0.4), currentPos.y - headLen * Math.sin(angle - 0.4))
      ctx.moveTo(currentPos.x, currentPos.y)
      ctx.lineTo(currentPos.x - headLen * Math.cos(angle + 0.4), currentPos.y - headLen * Math.sin(angle + 0.4))
      ctx.stroke()
    } else if (tool === 'freehand' && freehandPoints.length > 1) {
      ctx.beginPath()
      ctx.moveTo(freehandPoints[0].x, freehandPoints[0].y)
      for (let i = 1; i < freehandPoints.length; i++) {
        ctx.lineTo(freehandPoints[i].x, freehandPoints[i].y)
      }
      ctx.stroke()
    }
  }, [drawing, startPos, currentPos, freehandPoints, tool])

  function getPos(e) {
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  function handleStart(e) {
    e.preventDefault()
    const pos = getPos(e)
    setDrawing(true)
    setStartPos(pos)
    setCurrentPos(pos)
    if (tool === 'freehand') {
      setFreehandPoints([pos])
    }
  }

  function handleMove(e) {
    if (!drawing) return
    e.preventDefault()
    const pos = getPos(e)
    setCurrentPos(pos)
    if (tool === 'freehand') {
      setFreehandPoints(prev => [...prev, pos])
    }
  }

  function handleEnd(e) {
    if (!drawing) return
    e.preventDefault()

    let newAnn
    if (tool === 'circle' && startPos && currentPos) {
      newAnn = { type: 'circle', startX: startPos.x, startY: startPos.y, endX: currentPos.x, endY: currentPos.y }
    } else if (tool === 'arrow' && startPos && currentPos) {
      newAnn = { type: 'arrow', startX: startPos.x, startY: startPos.y, endX: currentPos.x, endY: currentPos.y }
    } else if (tool === 'freehand' && freehandPoints.length > 1) {
      newAnn = { type: 'freehand', points: freehandPoints }
    }

    if (newAnn) {
      setAnnotations(prev => [...prev, newAnn])
    }

    setDrawing(false)
    setStartPos(null)
    setCurrentPos(null)
    setFreehandPoints([])
  }

  function handleImageLoad() {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container) return
    const w = container.clientWidth
    const h = (img.naturalHeight / img.naturalWidth) * w
    const canvases = [canvasRef.current, overlayRef.current]
    canvases.forEach(c => {
      if (c) {
        c.width = w
        c.height = h
      }
    })
    drawAnnotations()
  }

  async function handleSave() {
    const canvasWidth = canvasRef.current?.width || containerRef.current?.clientWidth || 350
    const updated = {
      ...defect,
      annotations,
      canvasWidth,
      location: defect.location,
      description: defect.description,
      status: defect.status,
    }
    await saveDefect(updated)
    navigate(`/project/${defect.projectId}`)
  }

  async function handleDeleteDefect() {
    await deleteDefect(id)
    navigate(`/project/${defect.projectId}`)
  }

  function undo() {
    setAnnotations(prev => prev.slice(0, -1))
  }

  function clearAll() {
    setAnnotations([])
  }

  if (!defect) return null

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={handleSave}>←</button>
        <h1>Mangel bearbeiten</h1>
        <button className="btn btn-sm btn-primary" onClick={handleSave}>Speichern</button>
      </div>

      <div
        className="annotation-container"
        ref={containerRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        <img
          ref={imgRef}
          src={defect.imageData}
          alt="Mangel"
          onLoad={handleImageLoad}
          draggable={false}
        />
        <canvas ref={canvasRef} />
        <canvas ref={overlayRef} />
      </div>

      <div className="toolbar">
        <button
          className={`tool-btn ${tool === 'circle' ? 'active' : ''}`}
          onClick={() => setTool('circle')}
        >
          ⭕ Kreis
        </button>
        <button
          className={`tool-btn ${tool === 'arrow' ? 'active' : ''}`}
          onClick={() => setTool('arrow')}
        >
          ➡ Pfeil
        </button>
        <button
          className={`tool-btn ${tool === 'freehand' ? 'active' : ''}`}
          onClick={() => setTool('freehand')}
        >
          ✏ Freihand
        </button>
        <button className="tool-btn undo" onClick={undo}>↩ Rückgängig</button>
        <button className="tool-btn" onClick={clearAll}>🗑 Alle</button>
      </div>

      <div className="defect-form">
        <div className="form-group">
          <label>Bereich / Raum</label>
          <input
            className="form-input"
            value={defect.location || ''}
            onChange={e => setDefect(prev => ({ ...prev, location: e.target.value }))}
            placeholder="z.B. 2. OG, Raum 204"
          />
        </div>

        <div className="form-group">
          <label>Mangelbeschreibung</label>
          <textarea
            className="form-input"
            value={defect.description || ''}
            onChange={e => setDefect(prev => ({ ...prev, description: e.target.value }))}
            placeholder="z.B. Brandschutzklappe fehlt, Kabelkanal nicht verschlossen"
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <div className="tag-list">
            <button
              type="button"
              className={`tag tag-danger ${defect.status !== 'behoben' ? 'active' : ''}`}
              onClick={() => setDefect(prev => ({ ...prev, status: 'offen' }))}
            >
              Offen
            </button>
            <button
              type="button"
              className={`tag tag-success ${defect.status === 'behoben' ? 'active' : ''}`}
              onClick={() => setDefect(prev => ({ ...prev, status: 'behoben' }))}
            >
              Behoben
            </button>
          </div>
        </div>
      </div>

      <div className="delete-section">
        <button className="btn btn-outline btn-full" onClick={() => setShowDeleteConfirm(true)}>
          🗑 Foto löschen
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Mangel löschen?</h3>
            <p>Das Foto und alle Markierungen werden gelöscht.</p>
            <div className="btn-row">
              <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>Abbrechen</button>
              <button className="btn btn-danger" onClick={handleDeleteDefect}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
