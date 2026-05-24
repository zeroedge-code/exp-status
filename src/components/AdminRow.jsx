import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button } from './Button.jsx'
import { categories, ownerOptions, priorityOptions, statusOptions, typeOptions } from '../statusData.js'

export function AdminRow({
  entry,
  isNew = false,
  onSave,
  onDelete,
  onCancelNew,
  onEdit,
  flash = '',
  error = '',
  saveState = 'idle',
}) {
  const [draft, setDraft] = useState(entry)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const nameRef = useRef(null)
  const statusId = useId()
  const errorId = useId()
  const describedBy = [statusId, error ? errorId : null].filter(Boolean).join(' ')

  useEffect(() => {
    if (isNew) nameRef.current?.focus()
  }, [isNew])

  const hasChanges = useMemo(
    () => JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(entry)),
    [draft, entry],
  )

  const canSave = draft.title.trim() && (hasChanges || isNew)

  function updateField(field, value) {
    onEdit?.()
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
      updatedAt: field === 'updatedAt' ? value : currentDraft.updatedAt,
      ...(field === 'type'
        ? {
            showProgress: value === 'process',
            priority: value === 'info' ? '' : currentDraft.priority || priorityOptions[0],
          }
        : {}),
    }))
  }

  function handleSave() {
    if (!canSave) return
    onSave({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
    })
  }

  return (
    <article
      aria-busy={saveState === 'saving'}
      className={`card ${flash === 'success' ? 'save-flash-success' : ''} ${flash === 'error' ? 'save-flash-error' : ''} grid gap-3 px-3 py-3 shadow-none`}
    >
      <h3 className="sr-only">{draft.title || 'Neuer Eintrag'}</h3>
      <div className="grid gap-3 lg:grid-cols-[1.1fr_10rem_1.3fr_auto] lg:items-start">
        <label className="grid gap-1.5">
          <span className="label">Titel</span>
          <input
            ref={nameRef}
            value={draft.title}
            onChange={(event) => updateField('title', event.target.value)}
            className="field"
            placeholder="Neuer Eintrag"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy || undefined}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="label">Status</span>
          <select
            value={draft.status}
            onChange={(event) => updateField('status', event.target.value)}
            className="field select-field"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy || undefined}
          >
            {statusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="label">Hinweis</span>
          <input
            value={draft.description}
            onChange={(event) => updateField('description', event.target.value)}
            className="field"
            placeholder="Kurzer Statushinweis"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy || undefined}
          />
        </label>
        <div className="flex flex-col items-start gap-2 lg:pt-[1.4rem]">
          {hasChanges && (
            <span
              className="mt-3 h-2 w-2 rounded-full bg-[var(--warning)]"
              aria-label="Ungespeicherte Änderungen"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={!canSave}
              loading={saveState === 'saving'}
              onClick={handleSave}
              aria-describedby={statusId}
            >
              Speichern
            </Button>
            {isNew ? (
              <Button size="sm" variant="ghost" onClick={onCancelNew} aria-label="Neue Zeile verwerfen">
                Abbrechen
              </Button>
            ) : confirmingDelete ? (
              <div className="inline-flex items-center gap-1.5">
                <span className="label text-[var(--danger)]">Sicher?</span>
                <Button size="sm" variant="danger" onClick={onDelete}>
                  Löschen bestätigen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                  Nein
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingDelete(true)}
                aria-label="Löschen"
              >
                <TrashIcon />
              </Button>
            )}
          </div>
          <p id={statusId} className="min-h-4 text-xs text-[var(--text-secondary)]" aria-live="polite">
            {saveState === 'saving'
              ? 'Speichert...'
              : saveState === 'saved'
                ? 'Gespeichert'
                : saveState === 'error'
                  ? 'Speichern fehlgeschlagen'
                  : hasChanges
                    ? 'Ungespeicherte Änderungen'
                    : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-[var(--border)] pt-3 md:grid-cols-5">
        <CompactSelect
          label="Kategorie"
          value={draft.category}
          options={categories}
          onChange={(value) => updateField('category', value)}
        />
        <CompactSelect
          label="Typ"
          value={draft.type}
          options={typeOptions}
          format={formatType}
          onChange={(value) => updateField('type', value)}
        />
        <CompactSelect
          label="Verantwortung"
          value={draft.owner}
          options={ownerOptions}
          onChange={(value) => updateField('owner', value)}
        />
        <CompactSelect
          label="Priorität"
          value={draft.priority}
          options={['', ...priorityOptions]}
          format={(value) => value || 'Keine'}
          onChange={(value) => updateField('priority', value)}
        />
        <label className="grid gap-1.5">
          <span className="label">Fällig</span>
          <input
            type="date"
            value={draft.dueDate}
            onChange={(event) => updateField('dueDate', event.target.value)}
            className="field"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy || undefined}
          />
        </label>
      </div>

      {error && (
        <p id={errorId} className="text-sm text-[var(--danger)]" aria-live="polite">
          {error}
        </p>
      )}
    </article>
  )
}

function CompactSelect({ label, value, options, format = (option) => option, onChange }) {
  return (
    <label className="grid gap-1.5">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field select-field"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {format(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  )
}

function formatType(type) {
  const labels = {
    info: 'Info',
    task: 'Aufgabe',
    process: 'Prozess',
  }
  return labels[type] || 'Info'
}

function normalizeDraft(draft) {
  return {
    category: draft.category,
    title: draft.title,
    status: draft.status,
    owner: draft.owner,
    type: draft.type,
    priority: draft.priority,
    showProgress: draft.showProgress,
    updatedAt: draft.updatedAt,
    dueDate: draft.dueDate,
    description: draft.description,
  }
}
