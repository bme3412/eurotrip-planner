import Image from 'next/image';

export default function ResultCard({ item, index }) {
  return (
    <article className="card overflow-hidden group">
      <div className="relative">
        <Image
          src={item.image}
          alt={item.title}
          width={1200}
          height={600}
          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute left-3 top-3">
          <span className="badge bg-white/90 backdrop-blur">
            #{index + 1} • {item.score.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{item.subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags?.map((t) => (
            <span key={t} className="badge">{t}</span>
          ))}
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          <span className="font-medium">Why now:</span> {item.why}
        </p>
      </div>
    </article>
  );
}

