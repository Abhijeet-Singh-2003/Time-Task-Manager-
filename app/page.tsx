import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6">
      <div className="rounded-3xl border border-gray-200 bg-white/90 p-10 shadow-xl">
        <h1 className="text-3xl font-semibold text-gray-900">Welcome to TimeTask</h1>
        <p className="mt-3 text-gray-600">Track projects, tasks, and team progress in one place.</p>
      </div>
      <Link href="/auth/login" className="btn-primary">
        Sign in
      </Link>
    </div>
  )
}
