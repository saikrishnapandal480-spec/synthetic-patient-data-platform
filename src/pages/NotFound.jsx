import { Link } from 'react-router-dom'
import Icon from '../components/ui/Icon.jsx'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-7xl font-extrabold text-gradient">404</p>
      <h1 className="mt-4 text-xl font-bold text-white">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn-primary mt-8">
        <Icon name="home" className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}
