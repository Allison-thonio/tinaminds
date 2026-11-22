'use client'

import { useEffect, useId, useState } from 'react'

type ImageUploadProps = {
  title: string
  helper: string
  file?: File
  error?: string
  capture?: 'user'
  onSelect: (file: File) => Promise<void>
  onRemove: () => void
}

export function ImageUpload({ title, helper, file, error, capture, onSelect, onRemove }: ImageUploadProps) {
  const reactId = useId()
  const inputId = `upload-${reactId}`
  const cameraId = `camera-${reactId}`
  const [previewUrl, setPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const errorId = `${inputId}-error`

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function selectFile(candidate?: File) {
    if (!candidate) return
    setLocalError('')
    setBusy(true)
    try {
      await onSelect(candidate)
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : 'This image could not be prepared. Try another image.')
    } finally {
      setBusy(false)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    void selectFile(event.dataTransfer.files[0])
  }

  return (
    <div className="image-upload" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <div className="image-upload-heading">
        <div><label className="image-upload-title" htmlFor={inputId}>{title}</label><span className="field-help">{helper}</span></div>
        {busy && <span className="upload-processing" role="status">Preparing image…</span>}
      </div>
      <input id={inputId} className="visually-hidden-file" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby={error || localError ? errorId : undefined} onChange={(event) => { void selectFile(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
      {capture && <input id={cameraId} className="visually-hidden-file" type="file" accept="image/jpeg,image/png,image/webp" capture={capture} aria-describedby={error || localError ? errorId : undefined} onChange={(event) => { void selectFile(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />}
      <div className={`image-upload-dropzone${previewUrl ? ' has-preview' : ''}`}>
        {previewUrl ? <img className="image-upload-preview" src={previewUrl} alt={`Preview of ${title.toLowerCase()}`} /> : <span className="image-upload-placeholder" aria-hidden="true">Image preview appears here</span>}
        <div className="image-upload-actions">
          <label className="upload-action" htmlFor={inputId}>{file ? 'Replace image' : 'Choose from gallery'}</label>
          {capture && <label className="upload-action secondary-upload-action" htmlFor={cameraId}>Take a photo</label>}
          {file && <button type="button" className="upload-remove" onClick={onRemove}>Remove</button>}
        </div>
      </div>
      {file && <p className="upload-file-name">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
      {(error || localError) && <p className="form-error upload-error" id={errorId} role="alert">{error || localError}</p>}
    </div>
  )
}
