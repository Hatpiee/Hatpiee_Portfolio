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
            <p>May – Jul 2026. Engineered CHITRADARSHI, an on-site CCTV surveillance intelligence system (featured first under My Work), working with operators, researchers and senior stakeholders to turn monitoring needs into technical priorities.</p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>
                  KSAC &amp; Outreach Lead
                  <br />
                  IoT Developer
                </h4>
                <h5>IoT Lab, KIIT</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>IoT Developer since Jan 2025, integrating sensing, computer vision and embedded components across 3 IoT systems, including an ID card-based facial-recognition attendance solution. KSAC &amp; Outreach Lead since Jul 2026; represented the lab as Student POC and Technical Event Ambassador for KIITFest 2026.</p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>AI/ML Member</h4>
                <h5>GeeksforGeeks KIIT</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>Since Feb 2025. Collaborating on the design, implementation and testing of AI applications across healthcare, surveillance, recommendation and resume analysis.</p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>CEO &amp; Co-Founder</h4>
                <h5>Grape UAV</h5>
              </div>
              <h3>2025</h3>
            </div>
            <p>May – Nov 2025. Co-founded and led Grape UAV, a drone venture planning affordable, modular, locally supported drones for personal, educational and light commercial use.</p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Senior Marketing Executive</h4>
                <h5>FED KIIT</h5>
              </div>
              <h3>2025</h3>
            </div>
            <p>Nov 2024 – Dec 2025. Managed sponsor outreach and marketing execution for 6+ university events, coordinating stakeholders including primary sponsor REMAX Temple City.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
