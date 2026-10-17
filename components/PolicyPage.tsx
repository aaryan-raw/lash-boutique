import { Notice } from "./Section";
export default function PolicyPage({ title, topics }: { title: string; topics: string[] }) {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-4xl md:text-5xl">{title}</h1>
      <div className="mt-6"><Notice>PLACEHOLDER: the actual {title.toLowerCase()} policy has not been supplied. Do not publish until the owner provides approved text.</Notice></div>
      <ul className="mt-8 space-y-3">
        {topics.map((t) => <li key={t} className="border-b border-line pb-3"><span className="font-medium">{t}</span><span className="block text-sm text-muted">[To be confirmed by the owner]</span></li>)}
      </ul>
    </div>
  );
}
