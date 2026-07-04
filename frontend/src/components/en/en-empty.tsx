// Graceful empty state — shown while English content is still being published.
export function EnEmpty({
  title = 'No stories yet',
  message = 'English coverage is being published. Please check back soon.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="en-empty">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
