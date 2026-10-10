import { TECH_STACK } from "../data/techStack";

// Readable list of the sphere technologies. On touch layouts, where the 3D section
// isn't rendered, it stands on its own with a heading.
const TechLabels = ({ standalone }: { standalone: boolean }) => {
  return (
    <section
      className={`tech-labels section-container${standalone ? " tech-labels-mobile" : ""}`}
      aria-label={standalone ? undefined : "Tech stack"}
    >
      {standalone && (
        <h2 className="section-heading">
          My tech <span>stack</span>
        </h2>
      )}
      <ul>
        {TECH_STACK.map((tech) => (
          <li key={tech.name}>{tech.name}</li>
        ))}
      </ul>
    </section>
  );
};

export default TechLabels;
