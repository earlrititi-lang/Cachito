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
    // Configura aquí la salida de cada capa sin buscar tweens por el archivo.
    const dismissalMotion = {
      // Background zoom during dismissal.
      background: {
        scale: 1.14,
        duration: 2.4,
        ease: "sine.inOut",
        at: 0.04,
      },
      highHand: {
        // Lower-left corner of HighHand.svg opaque bounds.
        transformOrigin: "17.24% 77.08%",
        // Swapped from baseHand: immediate visible opening.
        open: {
          scale: 1.01,
          rotation: 0,
          xPercent: 6,
          yPercent: 2.4,
          x: 0,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          at: 0,
        },
        // Swapped from baseHand: long diagonal fall toward the bottom-left.
        exit: {
          scale: 1.08,
          rotation: -45,
          xPercent: -18,
          yPercent: 82,
          x: () => window.innerWidth * -0.7,
          y: () => window.innerHeight * 1.02,
          duration: 2.45,
          ease: "power1.inOut",
          delayAfterOpen: 0.22,
        },
      },
      baseHand: {
        // Lower-left corner of BaseHand.svg opaque bounds.
        transformOrigin: "56.4% 99.9%",
        // The hand starts rotating immediately, then its diagonal travel fades in without a mid-motion stop.
        rotate: {
          rotation: 70,
          duration: 6.45,
          ease: "none",
          at: 0,
        },
        travel: {
          scale: 1.08,
          xPercent: 42,
          yPercent: 96,
          x: () => window.innerWidth * 0.9,
          y: () => window.innerHeight * 1.02,
          duration: 7.05,
          ease: "none",
          at: 0.12,
        },
      },
    };

    gsap.set([textStage, textButton, textArt], { force3D: true });
    gsap.set(backgroundLayer, {
      force3D: true,
      transformOrigin: "center center",
    });
    gsap.set(highHandLayer, {
      force3D: true,
      transformOrigin: dismissalMotion.highHand.transformOrigin,
      x: 0,
      y: 0,
    });
    gsap.set(baseHandLayer, {
      force3D: true,
      transformOrigin: dismissalMotion.baseHand.transformOrigin,
      x: 0,
      y: 0,
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
        x: 0,
        y: 0,
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

    const startDismissal = () => {
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
      const highHandExitAt =
        dismissalMotion.highHand.open.at +
        dismissalMotion.highHand.open.duration +
        dismissalMotion.highHand.exit.delayAfterOpen;

      timeline
        .to(textArt, {
          scaleX: 0.948,
          scaleY: 0.908,
          yPercent: 2.2,
          duration: 0.12,
          ease: "power2.out",
        }, 0)
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
        }, 0.08)
        .to(backgroundLayer, {
          scale: dismissalMotion.background.scale,
          duration: dismissalMotion.background.duration,
          ease: dismissalMotion.background.ease,
        }, dismissalMotion.background.at)
        // highHand now gets baseHand's open + long diagonal exit behavior.
        .to(highHandLayer, {
          scale: dismissalMotion.highHand.open.scale,
          rotation: dismissalMotion.highHand.open.rotation,
          xPercent: dismissalMotion.highHand.open.xPercent,
          yPercent: dismissalMotion.highHand.open.yPercent,
          x: dismissalMotion.highHand.open.x,
          y: dismissalMotion.highHand.open.y,
          duration: dismissalMotion.highHand.open.duration,
          ease: dismissalMotion.highHand.open.ease,
        }, dismissalMotion.highHand.open.at)
        .to(highHandLayer, {
          scale: dismissalMotion.highHand.exit.scale,
          rotation: dismissalMotion.highHand.exit.rotation,
          xPercent: dismissalMotion.highHand.exit.xPercent,
          yPercent: dismissalMotion.highHand.exit.yPercent,
          x: dismissalMotion.highHand.exit.x,
          y: dismissalMotion.highHand.exit.y,
          duration: dismissalMotion.highHand.exit.duration,
          ease: dismissalMotion.highHand.exit.ease,
        }, highHandExitAt)
        // baseHand rotation starts first; the diagonal exit overlaps immediately after with no keyframe stop.
        .to(baseHandLayer, {
          rotation: dismissalMotion.baseHand.rotate.rotation,
          duration: dismissalMotion.baseHand.rotate.duration,
          ease: dismissalMotion.baseHand.rotate.ease,
          overwrite: false,
        }, dismissalMotion.baseHand.rotate.at)
        .to(baseHandLayer, {
          scale: dismissalMotion.baseHand.travel.scale,
          xPercent: dismissalMotion.baseHand.travel.xPercent,
          yPercent: dismissalMotion.baseHand.travel.yPercent,
          x: dismissalMotion.baseHand.travel.x,
          y: dismissalMotion.baseHand.travel.y,
          duration: dismissalMotion.baseHand.travel.duration,
          ease: dismissalMotion.baseHand.travel.ease,
          overwrite: false,
        }, dismissalMotion.baseHand.travel.at)
        .to(textStage, {
          opacity: 0,
          duration: 0.22,
          ease: "power2.out",
          pointerEvents: "none",
        }, "<");
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
      startDismissal();
    });

    textButton.addEventListener("click", () => {
      startDismissal();
    });

    syncButtonToStage();
    initMagneticButtons();
    window.addEventListener("resize", requestBoundsSync);
    window.addEventListener("orientationchange", requestBoundsSync);
    window.visualViewport?.addEventListener("resize", requestBoundsSync);
  }
}
