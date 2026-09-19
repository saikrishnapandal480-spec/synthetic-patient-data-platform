export const fmtInt = (x) => Math.round(x).toLocaleString('en-US')
export const fmtNum1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const fmtPct = (x) => `${(Math.round(x * 10) / 10).toLocaleString('en-US')}%`
