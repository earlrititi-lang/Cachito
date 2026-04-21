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
        // Both hands share the same pulse immediately on press, then rotation and travel start.
        rotate: {
          rotation: -90,
          duration: 2.45,
          ease: "none",
          at: 0.3,
        },
        pulse: {
          duration: 0.3,
          ease: "sine.inOut",
          at: 0,
          keyframes: {
            "55%": { scale: 1.045 },
            "82%": { scale: 0.998 },
            "100%": { scale: 1 },
          },
        },
        travel: {
          scale: 1.08,
          xPercent: -18,
          yPercent: 82,
          x: () => window.innerWidth * -0.7,
          y: () => window.innerHeight * 1.02,
          duration: 2.33,
          ease: "none",
          at: 0.42,
        },
      },
      baseHand: {
        // Lower-left corner of BaseHand.svg opaque bounds.
        transformOrigin: "56.4% 99.9%",
        // Both hands share the same pulse immediately on press, then rotation and travel start.
        rotate: {
          rotation: 70,
          duration: 6.45,
          ease: "none",
          at: 0.3,
        },
        pulse: {
          duration: 0.3,
          ease: "sine.inOut",
          at: 0,
          keyframes: {
            "55%": { scale: 1.045 },
            "82%": { scale: 0.998 },
            "100%": { scale: 1 },
          },
        },
        travel: {
          scale: 1.08,
          xPercent: 42,
          yPercent: 96,
          x: () => window.innerWidth * 0.9,
          y: () => window.innerHeight * 1.02,
          duration: 7.05,
          ease: "none",
          at: 0.42,
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
      if (reduceMotion.matches) {
        return;
      }

      const magneticButtons = document.querySelectorAll("[data-magnetic]");

      for (const button of magneticButtons) {
        let rafId = 0;
        let activePointerId = null;
        const position = { x: 0, y: 0 };

        const render = () => {
          gsap.set(button, {
            x: position.x,
            y: position.y,
            force3D: true,
          });
          rafId = 0;
        };

        const queueRender = () => {
          if (rafId) {
            cancelAnimationFrame(rafId);
          }

          rafId = requestAnimationFrame(render);
        };

        const updateMagnetic = (event) => {
          if (dismissing) {
            return;
          }

          const rect = button.getBoundingClientRect();
          const halfWidth = Math.max(rect.width / 2, 1);
          const halfHeight = Math.max(rect.height / 2, 1);
          const ratioX = gsap.utils.clamp(-1, 1, (event.clientX - rect.left - halfWidth) / halfWidth);
          const ratioY = gsap.utils.clamp(-1, 1, (event.clientY - rect.top - halfHeight) / halfHeight);
          const maxOffset = gsap.utils.clamp(8, 28, Math.min(rect.width, rect.height) * 0.14);

          position.x = ratioX * maxOffset;
          position.y = ratioY * maxOffset;

          button.style.setProperty("--glass-x", `${(ratioX + 1) * 50}%`);
          button.style.setProperty("--glass-y", `${(ratioY + 1) * 50}%`);

          gsap.to(textArt, {
            xPercent: ratioX * 10,
            yPercent: ratioY * 8,
            rotation: ratioX * 5,
            scaleX: 1.02,
            scaleY: 1.02,
            duration: event.pointerType === "mouse" ? 0.22 : 0.16,
            ease: "power3.out",
            overwrite: true,
          });

          queueRender();
        };

        const releaseMagnetic = () => {
          activePointerId = null;
          position.x = 0;
          position.y = 0;
          hovering = false;
          resetPress();
        };

        const onPointerDown = (event) => {
          activePointerId = event.pointerId;

          if (event.pointerType !== "mouse" && button.setPointerCapture) {
            button.setPointerCapture(event.pointerId);
          }

          updateMagnetic(event);
        };

        const onPointerMove = (event) => {
          if (event.pointerType === "mouse" || activePointerId === event.pointerId) {
            updateMagnetic(event);
          }
        };

        const onPointerLeave = (event) => {
          if (event.pointerType === "mouse") {
            releaseMagnetic();
          }
        };

        const onPointerEnd = (event) => {
          if (activePointerId !== event.pointerId) {
            return;
          }

          releaseMagnetic();
        };

        button.addEventListener("pointerdown", onPointerDown);
        button.addEventListener("pointermove", onPointerMove);
        button.addEventListener("pointerleave", onPointerLeave);
        button.addEventListener("pointerup", onPointerEnd);
        button.addEventListener("pointercancel", onPointerEnd);
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
        // highHand opens immediately on press and exits in the same continuous motion.
        .to(highHandLayer, {
          rotation: dismissalMotion.highHand.rotate.rotation,
          duration: dismissalMotion.highHand.rotate.duration,
          ease: dismissalMotion.highHand.rotate.ease,
          overwrite: false,
        }, dismissalMotion.highHand.rotate.at)
        .to(highHandLayer, {
          duration: dismissalMotion.highHand.pulse.duration,
          ease: dismissalMotion.highHand.pulse.ease,
          keyframes: dismissalMotion.highHand.pulse.keyframes,
          overwrite: false,
        }, dismissalMotion.highHand.pulse.at)
        .to(highHandLayer, {
          xPercent: dismissalMotion.highHand.travel.xPercent,
          yPercent: dismissalMotion.highHand.travel.yPercent,
          x: dismissalMotion.highHand.travel.x,
          y: dismissalMotion.highHand.travel.y,
          duration: dismissalMotion.highHand.travel.duration,
          ease: dismissalMotion.highHand.travel.ease,
          overwrite: false,
        }, dismissalMotion.highHand.travel.at)
        // baseHand rotation starts first; the diagonal exit overlaps immediately after with no keyframe stop.
        .to(baseHandLayer, {
          rotation: dismissalMotion.baseHand.rotate.rotation,
          duration: dismissalMotion.baseHand.rotate.duration,
          ease: dismissalMotion.baseHand.rotate.ease,
          overwrite: false,
        }, dismissalMotion.baseHand.rotate.at)
        .to(baseHandLayer, {
          duration: dismissalMotion.baseHand.pulse.duration,
          ease: dismissalMotion.baseHand.pulse.ease,
          keyframes: dismissalMotion.baseHand.pulse.keyframes,
          overwrite: false,
        }, dismissalMotion.baseHand.pulse.at)
        .to(baseHandLayer, {
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

    textButton.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") {
        return;
      }

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

    textButton.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "mouse") {
        return;
      }

      hovering = false;
      resetPress();
    });

    textButton.addEventListener("pointercancel", () => {
      hovering = false;
      resetPress();
    });

    textButton.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") {
        startDismissal();
      }
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
