import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { gsap } from "gsap";
import { GoArrowUpRight } from "react-icons/go";

import { cn } from "@/lib/utils";

import "./CardNav.css";

type CardNavLink = {
  label: string;
  href?: string;
  ariaLabel: string;
  onSelect?: () => void;
  external?: boolean;
};

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
};

export interface CardNavProps {
  logo: ReactNode | string;
  logoAlt?: string;
  items: CardNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  theme?: "light" | "dark";
}

export default function CardNav({
  logo,
  logoAlt = "Logo",
  items,
  className,
  ease = "power3.out",
  baseColor = "rgba(255, 255, 255, 0.82)",
  menuColor,
  buttonBgColor = "#0f172a",
  buttonTextColor = "#f8fafc",
  ctaLabel,
  ctaHref,
  onCtaClick,
  theme = "light",
}: CardNavProps) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) {
      const contentEl = navEl.querySelector(".card-nav-content") as HTMLElement | null;
      if (contentEl) {
        const wasVisible = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = "visible";
        contentEl.style.pointerEvents = "auto";
        contentEl.style.position = "static";
        contentEl.style.height = "auto";
        contentEl.offsetHeight;

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisible;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }

    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    const cardElements = cardsRef.current.filter(Boolean);
    gsap.set(navEl, { height: 60, overflow: "hidden" });
    gsap.set(cardElements, { y: 50, opacity: 0 });

    const timeline = gsap.timeline({ paused: true });
    timeline.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease,
    });
    timeline.to(cardElements, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, "-=0.1");

    return timeline;
  };

  useLayoutEffect(() => {
    const timeline = createTimeline();
    tlRef.current = timeline;

    return () => {
      timeline?.kill();
      tlRef.current = null;
    };
  }, [ease, items.length]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        gsap.set(navRef.current, { height: calculateHeight() });
      }

      tlRef.current.kill();
      const timeline = createTimeline();
      if (!timeline) return;

      if (isExpanded) {
        timeline.progress(1);
      }
      tlRef.current = timeline;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isExpanded, ease, items.length]);

  const closeMenu = () => {
    const timeline = tlRef.current;
    if (!timeline || !isExpanded) return;

    setIsHamburgerOpen(false);
    timeline.eventCallback("onReverseComplete", () => setIsExpanded(false));
    timeline.reverse();
  };

  const toggleMenu = () => {
    const timeline = tlRef.current;
    if (!timeline) return;

    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      timeline.play(0);
      return;
    }

    closeMenu();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleMenu();
  };

  const handleSelect = (callback?: () => void) => {
    callback?.();
    if (window.matchMedia("(max-width: 768px)").matches) {
      closeMenu();
    }
  };

  const setCardRef = (index: number) => (element: HTMLDivElement | null) => {
    if (element) cardsRef.current[index] = element;
  };

  const renderLogo = () => {
    if (typeof logo === "string") {
      return <img src={logo} alt={logoAlt} className="logo" />;
    }

    return <div className="card-nav-logo-mark">{logo}</div>;
  };

  return (
    <div className={cn("card-nav-container", className)}>
      <nav
        ref={navRef}
        className={cn("card-nav", `card-nav-theme-${theme}`, isExpanded && "open")}
        style={{ backgroundColor: baseColor }}
      >
        <div className="card-nav-top">
          <div
            className={cn("hamburger-menu", isHamburgerOpen && "open")}
            onClick={toggleMenu}
            onKeyDown={handleMenuKeyDown}
            role="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Close menu" : "Open menu"}
            tabIndex={0}
            style={{ color: menuColor || (theme === "dark" ? "#f8fafc" : "#0f172a") }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="logo-container">{renderLogo()}</div>

          {ctaLabel ? (
            ctaHref ? (
              <a
                href={ctaHref}
                className="card-nav-cta-button"
                style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
              >
                {ctaLabel}
              </a>
            ) : (
              <button
                type="button"
                className="card-nav-cta-button"
                style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
                onClick={onCtaClick}
              >
                {ctaLabel}
              </button>
            )
          ) : (
            <div className="card-nav-cta-spacer" aria-hidden="true" />
          )}
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {items.slice(0, 3).map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="nav-card"
              ref={setCardRef(index)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links.map((link, linkIndex) =>
                  link.href ? (
                    <a
                      key={`${link.label}-${linkIndex}`}
                      className="nav-card-link"
                      href={link.href}
                      aria-label={link.ariaLabel}
                      onClick={() => handleSelect(link.onSelect)}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer noopener" : undefined}
                    >
                      <GoArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
                      {link.label}
                    </a>
                  ) : (
                    <button
                      key={`${link.label}-${linkIndex}`}
                      type="button"
                      className="nav-card-link nav-card-link-button"
                      aria-label={link.ariaLabel}
                      onClick={() => handleSelect(link.onSelect)}
                    >
                      <GoArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
                      {link.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
