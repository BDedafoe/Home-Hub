import Link from "next/link";
import { signUp } from "./actions";

type SignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <section className="w-full max-w-sm rounded-lg border border-line bg-panel p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-sage">Home Hub</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Create your household</h1>
          <p className="mt-2 text-sm text-ink/65">Start the private workspace you will share.</p>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        ) : null}

        <form action={signUp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              required
              name="email"
              type="email"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              required
              minLength={8}
              name="password"
              type="password"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-sage"
            />
          </label>
          <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-paper hover:bg-primary/90">
            Create account
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/65">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
