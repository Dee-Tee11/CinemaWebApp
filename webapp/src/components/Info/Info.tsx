import React, { useEffect, useRef } from "react";
import styles from "./Info.module.css";
import Logo from "../Logo";

const Info = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;

      const container = scrollRef.current;
      const cards = container.querySelectorAll(`.${styles.stackCard}`);
      const containerRect = container.getBoundingClientRect();

      cards.forEach((card, index) => {
        const cardElement = card as HTMLElement;
        const cardRect = cardElement.getBoundingClientRect();

        const distanceFromTop = cardRect.top - containerRect.top;
        const stickyTop = 80 + index * 20;

        if (distanceFromTop <= stickyTop) {
          const shrinkAmount = Math.max(0, stickyTop - distanceFromTop);
          const scale = Math.max(0.85, 1 - shrinkAmount / 500);
          const opacity = Math.max(0.4, 1 - shrinkAmount / 300);

          cardElement.style.transform = `scale(${scale})`;
          cardElement.style.opacity = `${opacity}`;
        } else {
          cardElement.style.transform = "scale(1)";
          cardElement.style.opacity = "1";
        }
      });
    };

    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      handleScroll();
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const cards = [
    {
      title: "What to watch",
      description:
        "Discover movies and shows based on your preferences and mood. Get personalized recommendations tailored just for you.",
      icon: "🎬",
    },
    {
      title: "Where to watch",
      description:
        "Find out which streaming platforms have your favorite content available right now. Never miss where to stream.",
      icon: "📺",
    },
    {
      title: "Who to watch with",
      description:
        "Match with friends and family to find content everyone will enjoy together. Make movie nights easy.",
      icon: "👥",
    },
    {
      title: "Rate & Review",
      description:
        "Share your thoughts and read what others think about movies and shows. Join the community.",
      icon: "⭐",
    },
  ];

  return (
    <div className={styles.infoContainer} ref={scrollRef}>
      <div className={styles.content}>
        {/* Header fixo */}
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <Logo />
            </div>
          </div>

          <h1 className={styles.title}>Movie Night</h1>
          <p className={styles.subtitle}>Your perfect night starts here</p>
        </div>

        {/* Scroll Stack Cards */}
        <div className={styles.scrollStack}>
          {cards.map((card, index) => (
            <div key={index} className={styles.stackCard}>
              <div className={styles.cardIcon}>{card.icon}</div>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardDescription}>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Espaço extra para scroll */}
        <div style={{ height: "100px" }} />
      </div>
    </div>
  );
};

export default Info;
