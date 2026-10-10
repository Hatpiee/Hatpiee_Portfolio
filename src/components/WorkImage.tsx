import { MdArrowOutward } from "react-icons/md";

export type WorkFact = { value: string; label: string };

interface Props {
  image?: string;
  alt?: string;
  link?: string;
  facts?: WorkFact[];
  focusable?: boolean;
}

// Shows a project screenshot when one exists; otherwise a text panel of
// verified facts, so no screenshots have to be invented.
const WorkImage = (props: Props) => {
  const visual = props.image ? (
    <img src={props.image} alt={props.alt} />
  ) : (
    <div className="work-facts">
      {props.facts?.map((fact) => (
        <div className="work-fact" key={fact.value + fact.label}>
          <strong>{fact.value}</strong>
          <span>{fact.label}</span>
        </div>
      ))}
    </div>
  );

  const inClass = props.image ? "work-image-in" : "work-image-in work-image-text";

  return (
    <div className="work-image">
      {props.link ? (
        <a
          className={inClass}
          href={props.link}
          target="_blank"
          rel="noreferrer"
          data-cursor={"disable"}
          aria-label={`${props.alt} source code on GitHub (opens in a new tab)`}
          tabIndex={props.focusable === false ? -1 : undefined}
        >
          <div className="work-link">
            <MdArrowOutward />
          </div>
          {visual}
        </a>
      ) : (
        <div className={inClass}>{visual}</div>
      )}
    </div>
  );
};

export default WorkImage;
