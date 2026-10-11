import { MdArrowOutward } from "react-icons/md";

export type WorkFact = { value: string; label: string };

interface Props {
  image?: string;
  alt?: string;
  link?: string;
  label?: string;
  facts?: WorkFact[];
  featured?: boolean;
  focusable?: boolean;
}

// Shows a project screenshot when one exists; otherwise a text panel of
// verified facts, so no screenshots have to be invented.
const WorkImage = (props: Props) => {
  const visual = props.image ? (
    <img src={props.image} alt={props.alt} />
  ) : (
    <div className={`work-facts${props.featured ? " work-facts-featured" : ""}`}>
      {props.label && <p className="carousel-label">{props.label}</p>}
      <div className="work-facts-grid">
        {props.facts?.map((fact) => (
          <div className="work-fact" key={fact.value + fact.label}>
            <strong>{fact.value}</strong>
            <span>{fact.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="work-image">
      <div className={props.image ? "work-image-in" : "work-image-in work-image-text"}>
        {visual}
        {props.link && (
          <a
            className="work-source"
            href={props.link}
            target="_blank"
            rel="noreferrer"
            data-cursor="disable"
            aria-label={`${props.alt} source code on GitHub (opens in a new tab)`}
            tabIndex={props.focusable === false ? -1 : undefined}
          >
            View source on GitHub <MdArrowOutward aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
};

export default WorkImage;
