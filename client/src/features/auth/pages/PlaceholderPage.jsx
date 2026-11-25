import { Link } from 'react-router-dom'

export function PlaceholderPage({ title, owner }) {
  return (
    <main className="page-wrap placeholder-page">
      <div className="panel-card">
        <p className="eyebrow">Team Extension Point</p>
        <h1>{title}</h1>
        <p>
          This route is intentionally reserved for {owner}. Student 1 has provided
          the shared React layout, navigation, auth state, and protected route base.
        </p>
        <Link className="btn btn-soft" to="/">
          Back Home
        </Link>
      </div>
    </main>
  )
}
