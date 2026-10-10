import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";
import { EMAIL, GITHUB_URL, LINKEDIN_URL } from "../data/links";

const Contact = () => {
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <h3>Contact</h3>
        <div className="contact-flex">
          <div className="contact-box">
            <h4>Email</h4>
            <p>
              <a href={`mailto:${EMAIL}`} data-cursor="disable">
                {EMAIL}
              </a>
            </p>
            <h4>Education</h4>
            <p>
              B.Tech Computer Science &amp; Engineering, KIIT University,
              Bhubaneswar — 2024–2028 (expected), CGPA 9.70/10
            </p>
            <p>Class XII 95% · Class X 97% — DAV Public School, Bhubaneswar</p>
            <h4>Honours</h4>
            <p>
              Special Mention (3rd Place), KIIT MUN 2025 — 3rd among 150
              delegates, INR 8,000 prize
            </p>
          </div>
          <div className="contact-box">
            <h4>Social</h4>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              data-cursor="disable"
              className="contact-social"
            >
              GitHub <MdArrowOutward />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              data-cursor="disable"
              className="contact-social"
            >
              LinkedIn <MdArrowOutward />
            </a>
            <a
              href={`mailto:${EMAIL}`}
              data-cursor="disable"
              className="contact-social"
            >
              Email <MdArrowOutward />
            </a>
          </div>
          <div className="contact-box">
            <h2>
              Designed and Developed <br /> by <span>Shreyash Tripathy</span>
            </h2>
            <h5>
              <MdCopyright /> 2026
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
