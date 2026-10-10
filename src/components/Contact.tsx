import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";
import { EMAIL, GITHUB_URL, LINKEDIN_URL } from "../data/links";

const Contact = () => {
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <h2 className="section-heading">
          Get in <span>touch</span>
        </h2>
        <div className="contact-flex">
          <div className="contact-box">
            <div className="contact-group">
              <h4>Email</h4>
              <a
                href={`mailto:${EMAIL}`}
                data-cursor="disable"
                className="contact-email"
              >
                {EMAIL}
              </a>
            </div>
            <div className="contact-group">
              <h4>Education</h4>
              <p>
                B.Tech Computer Science &amp; Engineering, KIIT University,
                Bhubaneswar
              </p>
              <p>2024–2028 (expected) · CGPA 9.70/10</p>
              <p>Class XII 95% · Class X 97% · DAV Public School, Bhubaneswar</p>
            </div>
            <div className="contact-group">
              <h4>Honours</h4>
              <p>
                Special Mention (3rd Place), KIIT MUN 2025 · 3rd among 150
                delegates, INR&nbsp;8,000 prize
              </p>
            </div>
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
              GitHub <MdArrowOutward aria-hidden="true" />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              data-cursor="disable"
              className="contact-social"
            >
              LinkedIn <MdArrowOutward aria-hidden="true" />
            </a>
            <a
              href={`mailto:${EMAIL}`}
              data-cursor="disable"
              className="contact-social"
            >
              Email <MdArrowOutward aria-hidden="true" />
            </a>
          </div>
          <div className="contact-box">
            <h2>
              Designed and developed <br /> by <span>Shreyash Tripathy</span>
            </h2>
            <h5>
              <MdCopyright aria-hidden="true" /> 2026
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
