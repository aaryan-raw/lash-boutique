"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <div className="container-page py-20 text-center" role="alert"><h1 className="text-3xl">Something went wrong</h1><p className="mt-2 text-muted">We could not load this page. Please try again, or contact the store.</p><button className="btn-primary mt-6" onClick={reset}>Try again</button></div>;
}
