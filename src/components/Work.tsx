import { useState, useCallback } from "react";
import "./styles/Work.css";
import WorkImage, { WorkFact } from "./WorkImage";
import { MdArrowBack, MdArrowForward } from "react-icons/md";

type Project = {
  title: string;
  category: string;
  summary?: string;
  note?: string;
  tools: string;
  facts: WorkFact[];
  link?: string;
};

const projects: Project[] = [
  {
    title: "Multi-Disease Clinical Decision Support Platform",
    category: "Explainable ML risk assessment with an LLM health assistant",
    summary:
      "Risk scores alone are hard to act on. I built a full-stack prototype with separately trained models for diabetes, heart, liver and kidney disease (XGBoost, LightGBM and Random Forest on public datasets), SHAP explanations for every prediction, LLaMA 3.3 recommendations via Groq, a ChromaDB/MiniLM retrieval-backed health chat, PDF reports, JWT authentication and appointment booking.",
    note: "Decision-support prototype, not a diagnostic or clinically validated system.",
    tools:
      "FastAPI, Next.js, scikit-learn, XGBoost, LightGBM, SHAP, LangChain, ChromaDB, Groq (LLaMA 3.3), ReportLab",
    facts: [
      { value: "4", label: "disease-specific prediction pipelines" },
      { value: "SHAP", label: "explanation behind every prediction" },
      { value: "RAG", label: "retrieval-backed health chat" },
    ],
    link: "https://github.com/Hatpiee/Multi-Disease-Clinical-Decision-Support-Platform",
  },
  {
    title: "Hybrid Career Intelligence & College Recommendation Platform",
    category: "Hybrid recommender for career and college decisions",
    summary:
      "Students often get generic advice on careers and colleges. I built a hybrid system where a five-factor weighted matcher shortlists careers, semantic retrieval and LLM reasoning explain them with personalised roadmaps, and a rank-band predictor sorts colleges into Dream, Target and Safe from JEE ranks. FastAPI endpoints serve career guidance, college prediction and AssemblyAI speech-to-text, and LLM output is JSON-validated before use.",
    tools:
      "FastAPI, Streamlit, PostgreSQL, SQLAlchemy, LangChain, ChromaDB, Sentence-Transformers, Groq (LLaMA 3.3), AssemblyAI",
    facts: [
      { value: "5", label: "factor weighted career matching" },
      { value: "26", label: "career roadmaps" },
      { value: "189", label: "colleges in the predictor" },
    ],
    link: "https://github.com/Hatpiee/-Hybrid-Career-Intelligence-and-College-Recommendation-Platform",
  },
  {
    title: "BoldFlushX",
    category: "IoT-enabled smart sanitation system",
    tools: "IoT, waste segregation, sanitation automation",
    facts: [
      { value: "1st", label: "of 300+ teams, NSS SCE IdeaForge 2K24 (Champion)" },
      { value: "Top 10", label: "of 300+ teams, Kshitij 2025 B-Plan, IIT Kharagpur" },
    ],
  },
  {
    title: "Nivaaz+",
    category: "Real-time telemedicine consultation platform",
    tools: "Telemedicine, remote consultations, digital care delivery",
    facts: [
      { value: "Nodal", label: "Round qualifier, Smart India Hackathon 2025" },
      { value: "46th", label: "of 750 teams in the university selection process" },
    ],
  },
  {
    title: "QuitKit",
    category: "Gamified smoking-cessation platform",
    tools: "Gamification, behavioural science, AI-driven coaching",
    facts: [
      { value: "Top 10", label: "of 250 teams, Tech Zephyr 2025, IIT Bhubaneswar (Finalist)" },
    ],
  },
];

const Work = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 500);
    },
    [isAnimating]
  );

  const goToPrev = useCallback(() => {
    const newIndex =
      currentIndex === 0 ? projects.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    const newIndex =
      currentIndex === projects.length - 1 ? 0 : currentIndex + 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide]);

  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>

        <div className="carousel-wrapper">
          {/* Navigation Arrows */}
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={goToPrev}
            aria-label="Previous project"
            data-cursor="disable"
          >
            <MdArrowBack />
          </button>
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={goToNext}
            aria-label="Next project"
            data-cursor="disable"
          >
            <MdArrowForward />
          </button>

          {/* Slides */}
          <div className="carousel-track-container">
            <div
              className="carousel-track"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {projects.map((project, index) => (
                <div
                  className="carousel-slide"
                  key={index}
                  aria-hidden={index !== currentIndex}
                >
                  <div className="carousel-content">
                    <div className="carousel-info">
                      <div className="carousel-number">
                        <h3>0{index + 1}</h3>
                      </div>
                      <div className="carousel-details">
                        <h4>{project.title}</h4>
                        <p className="carousel-category">
                          {project.category}
                        </p>
                        {project.summary && (
                          <p className="carousel-summary">{project.summary}</p>
                        )}
                        {project.note && (
                          <p className="carousel-note">{project.note}</p>
                        )}
                        <div className="carousel-tools">
                          <span className="tools-label">Tools & Features</span>
                          <p>{project.tools}</p>
                        </div>
                      </div>
                    </div>
                    <div className="carousel-image-wrapper">
                      <WorkImage
                        alt={project.title}
                        link={project.link}
                        facts={project.facts}
                        focusable={index === currentIndex}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot Indicators */}
          <div className="carousel-dots">
            {projects.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? "carousel-dot-active" : ""
                  }`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to project ${index + 1}`}
                data-cursor="disable"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Work;
