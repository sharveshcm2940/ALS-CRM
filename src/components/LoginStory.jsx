import { useState } from "react";
import { Pause, Play } from "lucide-react";
const slides = [
  {
    first: "Good relationships.",
    second: "Great work.",
    description:
      "One shared workspace for the people, projects, and conversations that move us forward.",
  },
  {
    first: "Clear priorities.",
    second: "Real progress.",
    description:
      "Keep your projects in focus, your tasks on track, and your team moving together.",
  },
  {
    first: "One team.",
    second: "Moving forward.",
    description:
      "From the first conversation to the next milestone. Everything connected, every step of the way.",
  },
];
export default function LoginStory() {
  const [paused, setPaused] = useState(false);
  return (
    <section
      className={`story-content${paused ? " story-paused" : ""}`}
      aria-label="Our workspace"
    >
      <div className="story-label">THE WAY WE WORK</div>
      <div className="sr-only">
        <h2>Good relationships. Great work.</h2>
        <p>{slides[0].description}</p>
      </div>
      <div className="story-frames" aria-hidden="true">
        {slides.map((slide, i) => (
          <div
            className="story-slide"
            key={slide.first}
            style={{ "--slide-delay": `${i * 6}s` }}
          >
            <h2>
              {slide.first}
              <br />
              <span>{slide.second}</span>
            </h2>
            <p>{slide.description}</p>
          </div>
        ))}
      </div>
      <div className="story-controls">
        <div className="story-lines" aria-hidden="true">
          {slides.map((slide, i) => (
            <span key={slide.first}>
              <i style={{ "--slide-delay": `${i * 6}s` }} />
            </span>
          ))}
        </div>
        <button
          className="story-motion-control"
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Resume text animation" : "Pause text animation"}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          <span>{paused ? "Resume" : "Pause"}</span>
        </button>
      </div>
    </section>
  );
}
