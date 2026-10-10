import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2 className="section-heading">
          My career &amp;
          <br /> <span>experience</span>
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>AI Project Intern</h4>
                <h5>PruTech Solutions</h5>
              </div>
              <h3>2026</h3>
            </div>
            <p>
              May – Jul 2026. Engineered CHITRADARSHI, an offline multimodal
              surveillance intelligence system, from model evaluation to a
              GPU-native inference pipeline. Featured first under My Work.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>IoT Developer</h4>
                <h5>IoT Lab</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>
              Since Jan 2025. Integrating sensing, computer vision and embedded
              components across 3 IoT systems, including an ID card-based
              facial-recognition attendance solution for campus automation.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>AI/ML Member</h4>
                <h5>GeeksforGeeks KIIT Chapter</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>
              Since Feb 2025. Collaborating on 4 AI applications across
              healthcare, surveillance, recommendation and resume analysis,
              contributing to implementation, testing and technical discussions.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Senior Marketing Executive</h4>
                <h5>FED KIIT</h5>
              </div>
              <h3>2025</h3>
            </div>
            <p>
              Nov 2024 – Dec 2025. Coordinated sponsorship engagement for 6
              university events, partnering with REMAX Temple City on event
              execution and stakeholder communication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
