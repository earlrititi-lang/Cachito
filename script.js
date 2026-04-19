if (window.gsap) {
  const { gsap } = window;
  const hero = document.querySelector(".hero");
  const textStage = document.querySelector(".hero__text-stage");
  const textButton = document.querySelector(".hero__text-button");
  const textArt = document.querySelector(".hero__layer--text");
  const backgroundLayer = document.querySelector(".hero__layer--background");
  const highHandLayer = document.querySelector(".hero__layer--high-hand");
  const baseHandLayer = document.querySelector(".hero__layer--base-hand");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let dismissing = false;
  let hovering = false;
  let boundsFrame = null;

  if (hero && textStage && textButton && textArt) {
    gsap.set([textStage, textButton, textArt], { force3D: true });
    gsap.set(backgroundLayer, {
      force3D: true,
      transformOrigin: "center center",
    });
    gsap.set(highHandLayer, {
      force3D: true,
      transformOrigin: "22% 12%",
    });
    gsap.set(baseHandLayer, {
      force3D: true,
      transformOrigin: "88% 10%",
    });

    const readCssLength = (propertyName, fallback) => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(propertyName).trim();
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const syncButtonToStage = () => {
      boundsFrame = null;

      const heroRect = hero.getBoundingClientRect();
      const stageRect = textStage.getBoundingClientRect();
      const gapX = readCssLength("--hero-button-gap-x", 24);
      const gapY = readCssLength("--hero-button-gap-y", 18);
      const left = Math.max(stageRect.left - heroRect.left - gapX, 0);
      const top = Math.max(stageRect.top - heroRect.top - gapY, 0);
      const width = Math.min(stageRect.width + (gapX * 2), heroRect.width - left);
      const height = Math.min(stageRect.height + (gapY * 2), heroRect.height - top);

      gsap.set(textButton, {
        left,
        top,
        width,
        height,
        borderRadius: readCssLength("--hero-button-radius", 18),
      });
    };

    const requestBoundsSync = () => {
      if (boundsFrame) {
        return;
      }

      boundsFrame = window.requestAnimationFrame(syncButtonToStage);
    };

    const resetPress = () => {
      if (dismissing) {
        return;
      }

      gsap.to(backgroundLayer, {
        scale: 1,
        duration: 0.55,
        ease: "power2.out",
        overwrite: true,
      });

      gsap.to([highHandLayer, baseHandLayer], {
        scale: 1,
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        duration: 0.55,
        ease: "power2.out",
        overwrite: true,
      });

      if (hovering) {
        gsap.to(textArt, {
          scaleX: 1.012,
          scaleY: 1.012,
          duration: 0.24,
          ease: "power2.out",
          overwrite: true,
        });
        return;
      }

      gsap.to(textButton, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.28,
        ease: "power2.out",
        overwrite: true,
      });

      gsap.to(textArt, {
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 0.34,
        ease: "power2.out",
        overwrite: true,
      });
    };

    const initMagneticButtons = () => {
      if (!window.matchMedia("(pointer: fine)").matches || reduceMotion.matches) {
        return;
      }

      const magneticButtons = document.querySelectorAll("[data-magnetic]");

      for (const button of magneticButtons) {
        let rafId = 0;
        const position = { x: 0, y: 0 };

        const render = () => {
          button.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
          rafId = 0;
        };

        const onPointerMove = (event) => {
          if (dismissing) {
            return;
          }

          const rect = button.getBoundingClientRect();
          const x = event.clientX - rect.left - (rect.width / 2);
          const y = event.clientY - rect.top - (rect.height / 2);

          position.x = x * 0.22;
          position.y = y * 0.22;

          gsap.to(textArt, {
            xPercent: (x / rect.width) * 10,
            yPercent: (y / rect.height) * 8,
            rotation: (x / rect.width) * 5,
            scaleX: 1.02,
            scaleY: 1.02,
            duration: 0.22,
            ease: "power3.out",
            overwrite: true,
          });

          if (rafId) {
            cancelAnimationFrame(rafId);
          }

          rafId = requestAnimationFrame(render);
        };

        const onPointerLeave = () => {
          position.x = 0;
          position.y = 0;

          if (rafId) {
            cancelAnimationFrame(rafId);
          }

          rafId = requestAnimationFrame(render);
        };

        button.addEventListener("pointermove", onPointerMove);
        button.addEventListener("pointerleave", onPointerLeave);
      }
    };

    textButton.addEventListener("pointerenter", () => {
      if (dismissing) {
        return;
      }

      hovering = true;

      gsap.to(textArt, {
        scaleX: 1.012,
        scaleY: 1.012,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
    });

    textButton.addEventListener("pointerleave", () => {
      hovering = false;
      resetPress();
    });

    textButton.addEventListener("pointercancel", () => {
      hovering = false;
      resetPress();
    });

    textButton.addEventListener("pointerdown", () => {
      if (dismissing) {
        return;
      }

      gsap.to(textArt, {
        scaleX: 0.948,
        scaleY: 0.908,
        yPercent: 2.2,
        duration: 0.12,
        ease: "power2.out",
        overwrite: true,
      });

      gsap.to(backgroundLayer, {
        scale: 1.006,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });

      gsap.to(highHandLayer, {
        scale: 1.01,
        yPercent: 0.6,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });

      gsap.to(baseHandLayer, {
        scale: 1.014,
        yPercent: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
    });

    textButton.addEventListener("pointerup", resetPress);

    textButton.addEventListener("click", () => {
      if (dismissing) {
        return;
      }

      dismissing = true;
      textButton.disabled = true;

      if (reduceMotion.matches) {
        gsap.set([textButton, textStage], {
          opacity: 0,
          pointerEvents: "none",
        });
        return;
      }

      const timeline = gsap.timeline({
        defaults: { overwrite: true },
      });

      timeline
        .to(textButton, {
          x: 0,
          y: 0,
          opacity: 0,
          duration: 0.22,
          ease: "power2.out",
          pointerEvents: "none",
        }, 0)
        .to(textArt, {
          xPercent: 0,
          yPercent: 10,
          rotation: 1.4,
          scaleX: 0.84,
          scaleY: 0.8,
          opacity: 0,
          duration: 0.5,
          ease: "expo.inOut",
          pointerEvents: "none",
        }, 0)
        .to(backgroundLayer, {
          scale: 1.18,
          duration: 0.9,
          ease: "power3.inOut",
        }, 0.04)
        .to(baseHandLayer, {
          scale: 1.18,
          rotation: 90,
          xPercent: 40,
          yPercent: 108,
          duration: 1.04,
          ease: "power2.inOut",
        }, 0.04)
        .to(highHandLayer, {
          scale: 1.08,
          rotation: -90,
          xPercent: -24,
          yPercent: 88,
          duration: 1.08,
          ease: "power2.inOut",
        }, 0.34)
        .to(textStage, {
          opacity: 0,
          duration: 0.22,
          ease: "power2.out",
          pointerEvents: "none",
        }, "<");
    });

    syncButtonToStage();
    initMagneticButtons();
    window.addEventListener("resize", requestBoundsSync);
    window.addEventListener("orientationchange", requestBoundsSync);
    window.visualViewport?.addEventListener("resize", requestBoundsSync);
  }
}
