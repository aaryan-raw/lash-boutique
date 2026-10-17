// Renders a real image when `src` exists (admin-supplied https URL); otherwise a labelled placeholder. Never represents real inventory as a placeholder.
export default function ImagePlaceholder({ label = "Photo placeholder", ratio = "aspect-[3/4]", className = "", src }: { label?: string; ratio?: string; className?: string; src?: string }) {
  if (src) /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={src} alt={label} loading="lazy" className={`${ratio} ${className} w-full bg-cream object-cover`} />;
  return (
    <div role="img" aria-label={`${label} (not a real product image)`} className={`${ratio} ${className} relative flex w-full items-end bg-sage-soft`}>
      <span className="m-3 bg-ivory/90 px-2 py-1 text-[11px] uppercase tracking-widest text-muted">{label}</span>
    </div>
  );
}
