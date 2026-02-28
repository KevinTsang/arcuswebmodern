import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-[var(--gutter)]">
      <h1 className="text-[length:var(--font-size-h1)] font-[var(--heading-font-weight)] text-swift mb-4">
        Arcus Smart Home
      </h1>
      <p className="text-coot mb-8">Next.js migration in progress</p>
      <Link
        href="/login"
        className="bg-peacock text-crane px-6 py-3 rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity"
      >
        Go to Login
      </Link>
    </main>
  );
}
