import { lazy, PropsWithChildren, Suspense, useEffect, useState } from "react";
import About from "./About";
import Career from "./Career";
import Contact from "./Contact";
import Cursor from "./Cursor";
import Landing from "./Landing";
import Navbar from "./Navbar";
import SocialIcons from "./SocialIcons";
import WhatIDo from "./WhatIDo";
import Work from "./Work";
import Honors from "./Honors";
import TechLabels from "./TechLabels";
import setSplitText from "./utils/splitText";
import { useLoading } from "../context/LoadingProvider";
import { onViewportResize } from "./utils/viewport";

const TechStack = lazy(() => import("./TechStack"));

const MainContainer = ({ children }: PropsWithChildren) => {
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );
  const { isLoading } = useLoading();

  useEffect(() => {
    const resizeHandler = () => {
      setSplitText();
      setIsDesktopView(window.innerWidth > 1024);
    };
    // Split text only once the web fonts are in, so line breaks are measured correctly.
    // The display face is requested explicitly: headings below the fold may not have
    // triggered its download yet.
    Promise.all([
      document.fonts.load('800 1em "Archivo"'),
      document.fonts.load('400 1em "Geist"'),
    ])
      .catch(() => undefined)
      .then(() => document.fonts.ready)
      .then(resizeHandler);
    return onViewportResize(resizeHandler);
  }, [isDesktopView]);

  // Re-split when the content width changes without a window resize, e.g. when the
  // scrollbar appears after the intro. Otherwise lines measured at the old width wrap.
  useEffect(() => {
    const content = document.getElementById("smooth-content");
    if (!content) return;
    let width = content.clientWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (content.clientWidth === width) return;
      width = content.clientWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSplitText());
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="container-main">
      <Cursor />
      <Navbar />
      <SocialIcons />
      {isDesktopView && children}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="container-main">
            <Landing>{!isDesktopView && children}</Landing>
            <About />
            <WhatIDo />
            <Career />
            <Work />
            <Honors />
            {isDesktopView &&
              (isLoading ? (
                // Same-height placeholder: the 2.5 MB physics chunk loads after the
                // intro instead of competing with the character model.
                <div className="techstack" aria-hidden="true" />
              ) : (
                <Suspense fallback={<div className="techstack" aria-hidden="true" />}>
                  <TechStack />
                </Suspense>
              ))}
            <TechLabels standalone={!isDesktopView} />
            <Contact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContainer;
