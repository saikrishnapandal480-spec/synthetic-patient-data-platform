import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Icon from '../components/ui/Icon.jsx'
import { api } from '../api/client.js'

// Quick questions — each triggers a REAL data query against the current
// backend data (no scripted answers behind these buttons).
const SUGGESTIONS = [
  'Current cohort size',
  'What is the average age?',
  'How many patients have diabetes?',
  'How many patients are hypertensive?',
  'What is the average systolic blood pressure?',
  'What are the activity-level distributions?',
  'What is the medication adherence distribution?',
  'How was this cohort configured?',
  'How does the synthetic cohort compare with the original dataset?',
  'What variables are correlated?',
]

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300">
      <Icon name="assistant" className="h-4 w-4" />
    </div>
  )
}

export default function DataAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! Ask me anything about the current synthetic cohort, the source dataset, validation results or longitudinal timelines — every answer is computed live from the data. All records are synthetic and intended for research/demo prototyping only. This assistant does not provide medical advice and does not represent real patients.',
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  // Keep the newest answer in view inside the conversation panel only —
  // the page itself never scrolls.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, error])

  const send = async (text) => {
    const question = (text ?? input).trim()
    if (!question || typing) return
    setInput('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', text: question }])
    setTyping(true)
    try {
      const resp = await api.assistantQuery(question, null)
      setMessages((m) => [...m, {
        role: 'assistant',
        text: resp.answer,
        source: resp.source,
        data: resp.data,
        kind: resp.assistant_kind,
      }])
    } catch (err) {
      setError(err?.message || 'The assistant could not reach the backend. Is it running on http://localhost:8000?')
    } finally {
      setTyping(false)
    }
  }

  const clearConversation = () => {
    setMessages([{
      role: 'assistant',
      text: 'Conversation cleared. Ask me anything about the current synthetic cohort, the source dataset, validation results or longitudinal timelines.',
    }])
    setError(null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Data Assistant"
        description="A data-aware conversational assistant. Questions are answered by querying and calculating against the current synthetic cohort, source dataset and longitudinal timelines — no LLM or external AI service is connected."
        badge={<Badge variant="data">Data-aware assistant</Badge>}
      >
        <button onClick={clearConversation} className="btn-ghost" type="button">
          <Icon name="refresh" className="h-4 w-4" />
          Clear conversation
        </button>
      </PageHeader>

      {/* Two columns on desktop: presented questions (left) + conversation (right).
          Stacked on tablet/mobile with the same internal scrolling behavior. */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* LEFT — "Try these questions": all presented questions, list scrolls
            internally if it grows taller than the panel. */}
        <aside className="glass flex flex-col rounded-2xl p-4 shadow-card">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Icon name="sparkles" className="h-4 w-4 text-sky-300" />
            Try these questions
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">Each one queries the current data live.</p>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1 lg:max-h-none lg:min-h-0 lg:flex-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={typing}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium leading-snug text-slate-300 transition hover:border-sky-400/30 hover:text-sky-200 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </aside>

        {/* RIGHT — conversation panel with a controlled height. Messages scroll
            inside this panel; the webpage itself does not grow. */}
        <section
          className="glass flex min-h-0 flex-col overflow-hidden rounded-2xl shadow-card lg:h-[calc(100vh-230px)] lg:max-h-[720px] lg:min-h-[500px] h-[min(72vh,620px)]"
        >
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' && <AssistantAvatar />}
                  {m.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-[10px] font-bold text-sky-300">
                      You
                    </div>
                  )}
                  <div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'rounded-tr-sm bg-gradient-to-b from-sky-500 to-sky-600 text-white'
                          : 'rounded-tl-sm border border-white/10 bg-white/5 text-slate-200'
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.role === 'assistant' && m.source && (
                      <p className="mt-1 pl-1 text-[11px] text-slate-500">
                        Source: {m.source}
                        {m.data ? ' · values computed from current records' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2">
                  <AssistantAvatar />
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-typing rounded-full bg-slate-400"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Input — pinned to the bottom of the panel, always visible while
              the conversation scrolls above it. */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex shrink-0 items-center gap-2 border-t border-white/5 p-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the current synthetic cohort…"
              className="input-base"
              aria-label="Message the data assistant"
            />
            <button type="submit" className="btn-primary shrink-0 px-3.5" disabled={!input.trim() || typing} aria-label="Send message">
              <Icon name="send" className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
