import { SKILL_GROUPS } from "../data/techStack";
import TechSpheres from "./TechSpheres";

// Grouped skills under the 3D spheres. On touch layouts, where the 3D section
// isn't rendered, it stands on its own with a heading and a CSS sphere pile.
const TechLabels = ({ standalone }: { standalone: boolean }) => {
  return (
    <section
      className={`tech-labels section-container${standalone ? " tech-labels-mobile" : ""}`}
      aria-label={standalone ? undefined : "Skills"}
    >
      {standalone && (
        <h2 className="section-heading">
          My tech <span>stack</span>
        </h2>
      )}
      {standalone && <TechSpheres />}
      <dl className="skill-groups">
        {SKILL_GROUPS.map((group) => (
          <div className="skill-group" key={group.name}>
            <dt>{group.name}</dt>
            <dd>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default TechLabels;
