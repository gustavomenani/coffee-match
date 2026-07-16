export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6">
      <div className="skeleton mb-4 h-4 w-32" />
      <div className="skeleton mb-3 h-12 w-2/3 max-w-md" />
      <div className="skeleton mb-10 h-4 w-full max-w-lg" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-40" />
        <div className="skeleton h-40" />
      </div>
    </div>
  );
}
