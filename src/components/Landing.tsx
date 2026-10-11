import { PropsWithChildren } from "react";
import { TbDownload } from "react-icons/tb";
import { RESUME_URL } from "../data/links";
import "./styles/Landing.css";

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>Hello! I'm</h2>
            <h1>
              SHREYASH
              <br />
              <span>TRIPATHY</span>
            </h1>
            {RESUME_URL && (
              <a
                className="hero-resume"
                href={RESUME_URL}
                download="Shreyash_Tripathy_CV.pdf"
                data-cursor="disable"
              >
                My Resume
                <TbDownload aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="landing-info">
            <h3>AI Engineer &</h3>
            <h2 className="landing-info-h2">
              <div className="landing-h2-1">Applied ML</div>
              <div className="landing-h2-2">Software</div>
            </h2>
            <h2>
              <div className="landing-h2-info">Developer</div>
              <div className="landing-h2-info-1">Systems</div>
            </h2>
          </div>
        </div>
        {children}
      </div>
    </>
  );
};

export default Landing;
