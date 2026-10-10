import {
  useState,
  useCallback,
  useLayoutEffect,
  useRef,
  KeyboardEvent,
  TouchEvent,
} from "react";
import "./styles/Work.css";
import WorkImage, { WorkFact } from "./WorkImage";
import { MdArrowBack, MdArrowForward } from "react-icons/md";

type Project = {
  title: string;
  kicker: string;
  category: string;
  problem: string;
  approach: string;
  // "Stack" lists verified technologies; "Focus" is used where the sources name
  // what a project does but not what it was built with.
  stackLabel: "Stack" | "Focus";
  stack: string[];
  outcomeLabel: string;
  facts: WorkFact[];
  note?: string;
  link?: string;
  featured?: boolean;
};

// Every claim below is taken from the technical resume or the public repositories.
const projects: Project[] = [
  {
    title: "CHITRADARSHI",
    kicker: "Flagship · PruTech Solutions internship · 2026",
    category: "AI-powered multimodal surveillance intelligence system",
    problem:
      "Surveillance video has to be screened for anomalies offline, without sensitive footage leaving the site, while meeting enterprise latency, GPU-memory and data-sovereignty requirements.",
    approach:
      "I evaluated competing vision-language architectures and video inference strategies, then designed a five-stage pipeline that combines three models for visual reasoning, speech transcription and incident reasoning, running as GPU-native inference on NVIDIA DGX Spark.",
    stackLabel: "Stack",
    stack: [
      "Vision-language models",
      "Speech transcription",
      "Incident reasoning",
      "GPU-native inference",
      "NVIDIA DGX Spark",
    ],
    outcomeLabel: "Evaluation",
    facts: [
      { value: "5", label: "stage multimodal pipeline" },
      { value: "3", label: "models working together" },
      { value: "37", label: "anomaly categories classified" },
      { value: "55–70 s", label: "end-to-end inference on the evaluated setup" },
    ],
    note: "Internship work for PruTech Solutions. Figures come from evaluation on the project's surveillance dataset; there is no public code or demo.",
    featured: true,
  },
  {
    title: "Multi-Disease Clinical Decision Support Platform",
    kicker: "Applied ML · Full-stack prototype",
    category: "Explainable risk assessment with an LLM health assistant",
    problem:
      "A bare risk score is hard to act on without knowing which factors drove it or what to do next.",
    approach:
      "I built four disease-specific pipelines (XGBoost for diabetes and kidney disease, LightGBM for heart disease, Random Forest for liver disease), each explained with SHAP. The explanations feed LLaMA 3.3 via Groq for recommendations, alongside ChromaDB/MiniLM retrieval-backed health guidance, PDF reports, JWT authentication and appointment booking.",
    stackLabel: "Stack",
    stack: [
      "FastAPI",
      "Next.js",
      "PostgreSQL",
      "scikit-learn",
      "XGBoost",
      "LightGBM",
      "SHAP",
      "LLaMA 3.3 · Groq",
      "ChromaDB",
    ],
    outcomeLabel: "Highlights",
    facts: [
      { value: "4", label: "disease-specific prediction pipelines" },
      { value: "3", label: "model families: XGBoost, LightGBM, Random Forest" },
      { value: "SHAP", label: "explanations behind each prediction" },
    ],
    note: "Decision-support prototype, not a diagnostic or clinically validated system.",
    link: "https://github.com/Hatpiee/Multi-Disease-Clinical-Decision-Support-Platform",
  },
  {
    title: "Hybrid Career Intelligence & College Recommendation Platform",
    kicker: "Applied AI · Recommender system",
    category: "Career guidance and JEE-based college prediction",
    problem:
      "Students choosing a career and an engineering college often get generic advice that ignores their own profile and JEE rank.",
    approach:
      "I built a hybrid recommender: a five-factor weighted matcher shortlists careers, semantic retrieval and LLM reasoning explain them with personalised roadmaps, and a rank-band predictor sorts colleges into Dream, Target and Safe. FastAPI endpoints serve career recommendation, college prediction and speech-to-text, and LLM output is JSON-validated before use.",
    stackLabel: "Stack",
    stack: [
      "FastAPI",
      "Streamlit",
      "PostgreSQL",
      "LangChain",
      "ChromaDB",
      "MiniLM embeddings",
      "LLaMA 3.3 · Groq",
      "AssemblyAI",
    ],
    outcomeLabel: "Highlights",
    facts: [
      { value: "5", label: "factor weighted career matching" },
      { value: "26", label: "career roadmaps" },
      { value: "189", label: "colleges in the Dream / Target / Safe predictor" },
    ],
    link: "https://github.com/Hatpiee/-Hybrid-Career-Intelligence-and-College-Recommendation-Platform",
  },
  {
    title: "BoldFlushX",
    kicker: "Hackathon & venture · IoT",
    category: "IoT-enabled smart sanitation system",
    problem: "Improving waste management efficiency and public hygiene.",
    approach:
      "Engineered an IoT-enabled sanitation system for waste segregation and automation, with data-driven monitoring.",
    stackLabel: "Focus",
    stack: ["IoT", "Waste segregation", "Automation", "Data-driven monitoring"],
    outcomeLabel: "Recognition",
    facts: [
      { value: "1st", label: "among 300+ teams · Champion, NSS SCE Ideaforge 2K24" },
      {
        value: "Top 10",
        label: "among 300+ teams · Finalist, B-Plan Competition, Kshitij 2025, IIT Kharagpur",
      },
    ],
  },
  {
    title: "Nivaaz+",
    kicker: "Hackathon · Healthcare",
    category: "Real-time telemedicine consultation platform",
    problem: "Improving healthcare accessibility in underserved communities.",
    approach:
      "Created a telemedicine platform for remote consultations and digital care delivery.",
    stackLabel: "Focus",
    stack: ["Telemedicine", "Remote consultations", "Digital care delivery"],
    outcomeLabel: "Recognition",
    facts: [
      { value: "Nodal Round", label: "Qualified, Smart India Hackathon 2025" },
      { value: "46th", label: "among 750 teams in the university selection process" },
    ],
  },
  {
    title: "QuitKit",
    kicker: "Hackathon · Health",
    category: "Gamified smoking-cessation platform",
    problem: "Helping people overcome nicotine addiction.",
    approach:
      "Co-developed a gamified platform that combines behavioural science with AI-driven coaching.",
    stackLabel: "Focus",
    stack: ["Gamification", "Behavioural science", "AI-driven coaching"],
    outcomeLabel: "Recognition",
    facts: [
      { value: "Top 10", label: "among 250 teams · Finalist, Tech Zephyr 2025, IIT Bhubaneswar" },
    ],
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

// Matches the phone breakpoint in Work.css.
const PHONE_MAX_WIDTH = 600;

const Work = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideHeights, setSlideHeights] = useState<number[]>();
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchStartX = useRef<number | null>(null);

  // Slides share one height so the page doesn't move as the carousel changes. On
  // phones the text-heavy technical projects are roughly twice as tall as the
  // hackathon ones, so there they form two height groups instead of leaving the
  // short cards mostly empty. Content is centred within its slide.
  useLayoutEffect(() => {
    const slides = slideRefs.current;
    const contents = slides.map((slide) =>
      slide?.querySelector<HTMLElement>(".carousel-content")
    );
    const measure = () => {
      if (!slides[0]) return;
      const style = getComputedStyle(slides[0]);
      const padding =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const split = window.innerWidth <= PHONE_MAX_WIDTH;
      const groupOf = (i: number) => (split ? projects[i].stackLabel : "all");
      const tallest = new Map<string, number>();
      contents.forEach((content, i) => {
        const height = content?.offsetHeight ?? 0;
        tallest.set(groupOf(i), Math.max(tallest.get(groupOf(i)) ?? 0, height));
      });
      const next = projects.map((_, i) =>
        Math.ceil((tallest.get(groupOf(i)) ?? 0) + padding)
      );
      setSlideHeights((prev) =>
        prev && prev.join() === next.join() ? prev : next
      );
    };
    measure();
    // Slide heights don't affect content heights, so this can't loop.
    const observer = new ResizeObserver(measure);
    contents.forEach((content) => content && observer.observe(content));
    return () => observer.disconnect();
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating || index === currentIndex) return;
      setIsAnimating(true);
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 500);
    },
    [isAnimating, currentIndex]
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

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") goToPrev();
    if (e.key === "ArrowRight") goToNext();
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) goToNext();
    else goToPrev();
  };

  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <div className="work-head">
          <h2 className="section-heading">
            My <span>work</span>
          </h2>
          <div className="carousel-controls">
            <p className="carousel-counter" aria-live="polite">
              <span>{pad(currentIndex + 1)}</span> / {pad(projects.length)}
            </p>
            <button
              className="carousel-arrow"
              onClick={goToPrev}
              aria-label="Previous project"
              data-cursor="disable"
            >
              <MdArrowBack />
            </button>
            <button
              className="carousel-arrow"
              onClick={goToNext}
              aria-label="Next project"
              data-cursor="disable"
            >
              <MdArrowForward />
            </button>
          </div>
        </div>

        <div
          className="carousel-wrapper"
          role="region"
          aria-roledescription="carousel"
          aria-label="Projects"
          onKeyDown={onKeyDown}
        >
          <div
            className="carousel-track-container"
            style={{ height: slideHeights?.[currentIndex] }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="carousel-track"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {projects.map((project, index) => (
                <div
                  className={`carousel-slide${project.featured ? " carousel-slide-featured" : ""}`}
                  key={project.title}
                  ref={(el) => {
                    slideRefs.current[index] = el;
                  }}
                  style={{ minHeight: slideHeights?.[index] }}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${projects.length}: ${project.title}`}
                  aria-hidden={index !== currentIndex}
                >
                  <div className="carousel-content">
                    <div className="carousel-info">
                      <div className="carousel-number" aria-hidden="true">
                        {pad(index + 1)}
                      </div>
                      <div className="carousel-details">
                        <p className="eyebrow carousel-kicker">{project.kicker}</p>
                        <h3 className="carousel-title">{project.title}</h3>
                        <p className="carousel-category">{project.category}</p>
                        <dl className="carousel-brief">
                          <div>
                            <dt>Problem</dt>
                            <dd>{project.problem}</dd>
                          </div>
                          <div>
                            <dt>
                              {project.featured || project.link
                                ? "My contribution"
                                : "Approach"}
                            </dt>
                            <dd>{project.approach}</dd>
                          </div>
                        </dl>
                        <div className="carousel-stack">
                          <span className="carousel-label">
                            {project.stackLabel}
                          </span>
                          <ul>
                            {project.stack.map((tech) => (
                              <li key={tech}>{tech}</li>
                            ))}
                          </ul>
                        </div>
                        {project.note && (
                          <p className="carousel-note">{project.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="carousel-image-wrapper">
                      <WorkImage
                        alt={project.title}
                        link={project.link}
                        label={project.outcomeLabel}
                        facts={project.facts}
                        featured={project.featured}
                        focusable={index === currentIndex}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="carousel-dots">
            {projects.map((project, index) => (
              <button
                key={project.title}
                className={`carousel-dot ${index === currentIndex ? "carousel-dot-active" : ""
                  }`}
                onClick={() => goToSlide(index)}
                aria-label={`Show project ${index + 1}: ${project.title}`}
                aria-current={index === currentIndex}
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
