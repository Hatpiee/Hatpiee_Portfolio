import "./styles/Honors.css";

type Honor = {
  title: string;
  issuer: string;
  result: string;
  resultNote: string;
  detail: string;
};

// Wording follows the owner's LinkedIn Honors & awards entries. The SIH team count
// differs between sources (650 vs 750), so only the rank is shown.
const honors: Honor[] = [
  {
    title: "Champion, NSS SCE IdeaForge 2K24",
    issuer: "NSS SCE · Oct 2024",
    result: "1st",
    resultNote: "among 300+ teams",
    detail:
      "With BoldFlushX, an IoT-enabled smart sanitation system for waste segregation and automation.",
  },
  {
    title: "Special Mention, KIIT MUN 2025",
    issuer: "KIIT MUN · Dec 2025",
    result: "₹8,000",
    resultNote: "cash prize · 150 delegates",
    detail:
      "Represented Turkey in UNCSW, recognised for negotiation, policy analysis and committee deliberations.",
  },
  {
    title: "Finalist, Kshitij B-Plan Competition, IIT Kharagpur",
    issuer: "IIT Kharagpur · Jan 2025",
    result: "Top 10",
    resultNote: "among 300+ teams",
    detail: "Presented BoldFlushX to mentors and venture capitalists.",
  },
  {
    title: "Finalist, Tech Zephyr 2025, IIT Bhubaneswar",
    issuer: "IIT Bhubaneswar · Oct 2025",
    result: "Top 10",
    resultNote: "among 250 teams",
    detail: "With QuitKit, a gamified smoking-cessation platform.",
  },
  {
    title: "Nodal Round Qualifier, Smart India Hackathon 2025",
    issuer: "Smart India Hackathon · Oct 2025",
    result: "46th",
    resultNote: "in the university selection process",
    detail: "With Nivaaz+, a real-time telemedicine consultation platform.",
  },
];

const Honors = () => {
  return (
    <section className="honors-section section-container" id="honors">
      <h2 className="section-heading">
        Honors &amp; <span>achievements</span>
      </h2>
      <ol className="honors-list">
        {honors.map((honor) => (
          <li className="honors-item" key={honor.title}>
            <div className="honors-result">
              <strong>{honor.result}</strong>
              <span>{honor.resultNote}</span>
            </div>
            <div className="honors-text">
              <h3>{honor.title}</h3>
              <p>{honor.detail}</p>
            </div>
            <p className="honors-issuer">{honor.issuer}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default Honors;
