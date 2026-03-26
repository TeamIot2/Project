// Shared environment carousel - horizontal scroll with highlighted active card

import type { EnvironmentMode } from "../types";

interface CarouselEnv {
  id: EnvironmentMode;
  img: string;
  label: string;
  icon?: React.FC<{ size?: number; className?: string }>;
}

export default function EnvironmentCarousel({
  environments,
  activeId,
  onSelect,
  overlayStyle = false,
}: {
  environments: CarouselEnv[];
  activeId: EnvironmentMode;
  onSelect: (id: EnvironmentMode) => void;
  overlayStyle?: boolean;
}) {
  const activeIndex = environments.findIndex((e) => e.id === activeId);

  function navigate(direction: number) {
    const len = environments.length;
    const nextIndex = ((activeIndex + direction) % len + len) % len;
    onSelect(environments[nextIndex].id);
  }

  return (
    <section className="env-carousel">
      <button className="env-carousel-arrow left" onClick={() => navigate(-1)} aria-label="Previous">
        ‹
      </button>
      <div className="env-carousel-track">
        {environments.map((env, i) => {
          const len = environments.length;
          let diff = i - activeIndex;
          if (diff > len / 2) diff -= len;
          if (diff < -len / 2) diff += len;
          const absDiff = Math.abs(diff);
          const isActive = diff === 0;
          const Icon = env.icon;

          return (
            <button
              key={env.id}
              className={`env-card ${isActive ? "active" : ""}`}
              data-env={env.id}
              onClick={() => onSelect(env.id)}
              style={{
                transform: `translateX(${diff * (overlayStyle ? 100 : 75)}%) scale(1)`,
                opacity: absDiff <= 1 ? 1 : 0,
                zIndex: 10 - absDiff,
              }}
            >
              <img src={env.img} alt={env.label} className="env-card-img" />
              {overlayStyle && Icon ? (
                <>
                  <div className="env-card-overlay" />
                  <div className="env-card-copy">
                    <Icon size={isActive ? 29 : 24} className="env-card-icon" />
                    <span className="env-card-label">{env.label}</span>
                  </div>
                </>
              ) : (
                <span className="env-card-label">{env.label}</span>
              )}
            </button>
          );
        })}
      </div>
      <button className="env-carousel-arrow right" onClick={() => navigate(1)} aria-label="Next">
        ›
      </button>
    </section>
  );
}
