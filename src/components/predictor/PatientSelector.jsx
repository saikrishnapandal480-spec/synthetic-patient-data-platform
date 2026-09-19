import { useState } from 'react'
import Icon from '../ui/Icon.jsx'
import Badge from '../ui/Badge.jsx'

// Controlled combobox over the exact patient IDs returned by GET /api/patients.
// A free-text option lets the user analyze a patient not present in the list.
export default function PatientSelector({ patients, selectedId, onSelect }) {
  const [custom, setCustom] = useState('')
  const ids = (patients || []).map((p) => p.patient_id)

  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="patient-select">
        Select synthetic patient
      </label>
      <select
        id="patient-select"
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-slate-200 transition-colors focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
      >
        <option value="" disabled>
          {ids.length === 0 ? 'No patients available' : 'Choose a patient…'}
        </option>
        {ids.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="…or type a patient ID"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
        />
        <button
          type="button"
          onClick={() => custom.trim() && onSelect(custom.trim())}
          disabled={!custom.trim()}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/30 hover:bg-white/10 disabled:opacity-40"
        >
          Use
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon name="info" className="h-3.5 w-3.5" />
        Patients served by GET /api/patients — all records are synthetic.
      </p>
    </div>
  )
}
