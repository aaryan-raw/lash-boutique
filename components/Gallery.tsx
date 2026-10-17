"use client";
import { useState } from "react";
import type { ProductImage } from "@/lib/types";
import ImagePlaceholder from "./ImagePlaceholder";
export default function Gallery({ images }: { images: ProductImage[] }) {
  const [i, setI] = useState(0);
  const go = (n: number) => setI((n + images.length) % images.length);
  if (!images.length) return <ImagePlaceholder label="No image available" />;
  return (
    <div>
      <div className="relative" aria-roledescription="carousel" aria-label="Product images">
        <ImagePlaceholder label={images[i].alt} src={images[i].url} />
        {images.length > 1 && <div className="absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
          <button type="button" className="btn bg-ivory/90 px-3" onClick={() => go(i - 1)} aria-label="Previous image">‹</button>
          <button type="button" className="btn bg-ivory/90 px-3" onClick={() => go(i + 1)} aria-label="Next image">›</button></div>}
      </div>
      <p className="sr-only" role="status">Image {i + 1} of {images.length}</p>
      <ul className="mt-3 grid grid-cols-4 gap-2">{images.map((im, n) => (
        <li key={im.id}><button type="button" onClick={() => setI(n)} aria-label={`Show image ${n + 1}: ${im.alt}`} aria-pressed={n === i} className={`block w-full border ${n === i ? "border-burgundy" : "border-line"}`}><ImagePlaceholder label={im.alt} src={im.url} ratio="aspect-square" /></button></li>))}</ul>
    </div>
  );
}
