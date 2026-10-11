import { useEffect, useRef } from "react";
import "./styles/WhatIDo.css";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const WhatIDo = () => {
  const containerRef = useRef<(HTMLDivElement | null)[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const setRef = (el: HTMLDivElement | null, index: number) => {
    containerRef.current[index] = el;
  };
  // The cards start hidden and appear once they scroll into view. On desktop the
  // character's desk timeline (GsapScroll) sets an inline display that overrides this;
  // on phones, and wherever the 3D character can't load (e.g. no WebGL, or plain HTTP
  // where Web Crypto is unavailable), nothing else would ever show them.
  useEffect(() => {
    const box = boxRef.current;
    if (!box?.parentElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        box.classList.add("what-box-in-ready");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -30% 0px" }
    );
    observer.observe(box.parentElement);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!ScrollTrigger.isTouch) return;
    const handlers = containerRef.current.flatMap((container) => {
      if (!container) return [];
      const onClick = () => handleClick(container);
      container.classList.remove("what-noTouch");
      container.addEventListener("click", onClick);
      return [() => container.removeEventListener("click", onClick)];
    });
    return () => handlers.forEach((remove) => remove());
  }, []);
  return (
    <div className="whatIDO">
      <div className="what-box">
        <h2 className="title">
          W<span className="hat-h2">HAT</span>
          <div>
            I<span className="do-h2"> DO</span>
          </div>
        </h2>
      </div>
      <div className="what-box">
        <div className="what-box-in" ref={boxRef}>
          <div className="what-border2">
            <svg width="100%">
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="100%"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="7,7"
              />
              <line
                x1="100%"
                y1="0"
                x2="100%"
                y2="100%"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="7,7"
              />
            </svg>
          </div>
          <div
            className="what-content what-noTouch"
            ref={(el) => setRef(el, 0)}
            tabIndex={0}
            onFocus={(e) => setFocused(e.currentTarget, true)}
            onBlur={(e) => setFocused(e.currentTarget, false)}
          >
            <div className="what-border1">
              <svg height="100%">
                <line
                  x1="0"
                  y1="0"
                  x2="100%"
                  y2="0"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                />
                <line
                  x1="0"
                  y1="100%"
                  x2="100%"
                  y2="100%"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                />
              </svg>
            </div>
            <div className="what-corner"></div>

            <div className="what-content-in">
              <h3>AI &amp; ML ENGINEERING</h3>
              <h4>Models, explanations and retrieval</h4>
              <p>
                Training and evaluating ML models, explaining their predictions,
                and building retrieval-backed LLM features with structured,
                validated output.
              </p>
              <h5>Skillset & tools</h5>
              <div className="what-content-flex">
                <div className="what-tags">Python</div>
                <div className="what-tags">scikit-learn</div>
                <div className="what-tags">XGBoost</div>
                <div className="what-tags">LightGBM</div>
                <div className="what-tags">SHAP</div>
                <div className="what-tags">LangChain</div>
                <div className="what-tags">RAG</div>
                <div className="what-tags">ChromaDB</div>
                <div className="what-tags">Hugging Face</div>
                <div className="what-tags">Ollama</div>
                <div className="what-tags">OpenCV</div>
              </div>
              <div className="what-arrow"></div>
            </div>
          </div>
          <div
            className="what-content what-noTouch"
            ref={(el) => setRef(el, 1)}
            tabIndex={0}
            onFocus={(e) => setFocused(e.currentTarget, true)}
            onBlur={(e) => setFocused(e.currentTarget, false)}
          >
            <div className="what-border1">
              <svg height="100%">
                <line
                  x1="0"
                  y1="100%"
                  x2="100%"
                  y2="100%"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                />
              </svg>
            </div>
            <div className="what-corner"></div>
            <div className="what-content-in">
              <h3>SOFTWARE &amp; SYSTEMS</h3>
              <h4>APIs, interfaces and IoT</h4>
              <p>
                Building the backends, interfaces and embedded systems that put
                models to work, from FastAPI services to sensor-driven IoT
                prototypes.
              </p>
              <h5>Skillset & tools</h5>
              <div className="what-content-flex">
                <div className="what-tags">FastAPI</div>
                <div className="what-tags">Next.js</div>
                <div className="what-tags">TypeScript</div>
                <div className="what-tags">REST APIs</div>
                <div className="what-tags">PostgreSQL</div>
                <div className="what-tags">Arduino</div>
                <div className="what-tags">ESP-IDF</div>
                <div className="what-tags">Git</div>
                <div className="what-tags">GitHub</div>
                <div className="what-tags">Vercel</div>
              </div>
              <div className="what-arrow"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIDo;

function handleClick(container: HTMLDivElement) {
  container.classList.toggle("what-content-active");
  container.classList.remove("what-sibling");
  if (container.parentElement) {
    const siblings = Array.from(container.parentElement.children);

    siblings.forEach((sibling) => {
      if (sibling !== container) {
        sibling.classList.remove("what-content-active");
        sibling.classList.toggle("what-sibling");
      }
    });
  }
}

// Keyboard focus expands a card the same way hover (or a tap on touch) does.
function setFocused(container: HTMLDivElement, focused: boolean) {
  container.classList.toggle("what-content-active", focused);
  Array.from(container.parentElement?.children ?? []).forEach((sibling) => {
    if (sibling !== container && sibling.classList.contains("what-content")) {
      sibling.classList.toggle("what-sibling", focused);
    }
  });
}
