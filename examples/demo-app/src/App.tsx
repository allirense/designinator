import React from "react";

export function App() {
  return (
    <div className="min-h-screen bg-white px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Demo App
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          A small file to test token extraction.
        </p>
      </header>

      <main className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Card Title</h2>
          <p className="mt-2 text-sm text-gray-700">
            This card uses a common border, radius, shadow, and spacing set.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
              Primary
            </button>
            <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100">
              Secondary
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
          <label className="block text-sm font-medium text-gray-900">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            placeholder="you@example.com"
          />

          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              Active
            </span>
            <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
              Error
            </span>
          </div>
        </section>

        <footer className="border-t border-gray-200 pt-6 text-sm text-gray-600">
          <span className="text-[color:var(--fg)]">
            Arbitrary color token example
          </span>
          <span className="ml-2 text-[13px]">(arbitrary font size)</span>
        </footer>
      </main>
    </div>
  );
}
