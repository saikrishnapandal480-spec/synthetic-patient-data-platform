import Badge from '../ui/Badge.jsx'
import StatCard from '../ui/StatCard.jsx'

export default function PatientProfile({ patient, medications, symptoms }) {
  if (!patient) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon="users" tone="sky" value={patient.patient_id} label="Patient ID" sub="Synthetic record" />
        <StatCard icon="heart" tone="rose" value={patient.age} label="Age" sub={patient.gender} />
        <StatCard icon="activity" tone="teal" value={patient.pain_score} label="Pain Score" sub="0 (none) – 10 (worst)" />
        <StatCard icon="shield" tone="violet" value={patient.diabetes} label="Diabetes" sub="Reported flag" />
        <StatCard icon="activity" tone="amber" value={patient.blood_pressure} label="Blood Pressure" sub="mmHg (synthetic)" />
        <StatCard icon="users" tone="sky" value={patient.activity_level} label="Activity Level" sub="Synthetic value" />
        <StatCard icon="shield" tone="teal" value={patient.medication_adherence} label="Adherence" sub="Synthetic value" />
        <StatCard icon="file" tone="rose" value={patient.date} label="Record Date" sub={patient.gender} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Medications & Dosages</h3>
            <Badge variant="data">{medications.length}</Badge>
          </div>
          {medications.length === 0 ? (
            <p className="text-sm text-slate-400">No medication records returned for this patient.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {medications.map((m, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.frequency}</p>
                  </div>
                  <span className="rounded-lg bg-sky-500/10 px-2 py-0.5 font-mono text-xs text-sky-300">{m.dosage}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Reported Symptoms</h3>
            <Badge variant="mock">{symptoms.length}</Badge>
          </div>
          {symptoms.length === 0 ? (
            <p className="text-sm text-slate-400">No symptom records returned for this patient.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {symptoms.map((s, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.date_reported}</p>
                  </div>
                  <span className="rounded-lg bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-300">{s.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
