/* Git Manage 官网共享脚本：光影粒子引擎 + 滚动入场 + 复制按钮
 *
 * 粒子主题通过 <canvas data-particle="ember|digital"> 切换：
 *   - ember  ：暖色光尘上浮，带光晕（OpenChamber 站）
 *   - digital：蓝色数字粒子，近距离连线（VS Code 站）
 * 性能约束：DPR 上限 2、页面隐藏暂停、prefers-reduced-motion 时静止渲染、窄屏降密度
 */
(function () {
  "use strict";

  /* ---------------- 粒子引擎 ---------------- */

  var THEMES = {
    ember: {
      // 暖色光尘：橙金色，缓慢上浮 + 轻微摆动，带径向光晕
      colors: ["224,123,69", "240,166,98", "247,206,150"],
      sizeMin: 1.2,
      sizeMax: 3.2,
      speedMin: 0.12,
      speedMax: 0.45,
      drift: 0.35, // 横向摆动幅度
      glow: 0.55, // 光晕强度
      link: 0 // 无连线
    },
    digital: {
      // 蓝色数字粒子：冷静漂移，近距离连线
      colors: ["77,163,255", "120,190,255", "46,120,200"],
      sizeMin: 1,
      sizeMax: 2.4,
      speedMin: 0.08,
      speedMax: 0.3,
      drift: 0.2,
      glow: 0.35,
      link: 118 // 连线距离阈值
    }
  };

  function setupCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(rect.width, 1);
    var h = Math.max(rect.height, 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function spawn(theme, w, h, rand) {
    return {
      x: rand() * w,
      y: rand() * h,
      r: theme.sizeMin + rand() * (theme.sizeMax - theme.sizeMin),
      vy: -(theme.speedMin + rand() * (theme.speedMax - theme.speedMin)),
      phase: rand() * Math.PI * 2,
      wob: 0.2 + rand() * 0.8,
      color: theme.colors[(rand() * theme.colors.length) | 0],
      alpha: 0.25 + rand() * 0.55
    };
  }

  function initParticles(canvas) {
    var name = canvas.dataset.particle || "ember";
    var theme = THEMES[name] || THEMES.ember;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var view = setupCanvas(canvas);
    var ctx = view.ctx;
    var w = view.w;
    var h = view.h;

    // 密度按面积计算，窄屏减半
    var area = w * h;
    var count = Math.round(area / (name === "digital" ? 14000 : 11000));
    if (w < 700) count = Math.round(count * 0.5);
    count = Math.max(24, Math.min(count, 130));

    var rand = Math.random;
    var dots = [];
    for (var i = 0; i < count; i++) dots.push(spawn(theme, w, h, rand));

    var t = 0;
    var raf = 0;
    var running = false;

    function drawStatic() {
      // 静止模式：只画一帧
      ctx.clearRect(0, 0, w, h);
      dots.forEach(function (d) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + d.color + "," + d.alpha + ")";
        ctx.fill();
      });
    }

    function frame() {
      if (!running) return;
      t += 0.008;
      ctx.clearRect(0, 0, w, h);

      var i;
      var d;
      for (i = 0; i < dots.length; i++) {
        d = dots[i];
        d.y += d.vy;
        // 顶部回绕到底部
        if (d.y < -12) {
          d.y = h + 12;
          d.x = rand() * w;
        }
        var x = d.x + Math.sin(t * d.wob * 6 + d.phase) * (theme.drift * 24);

        // 光晕
        if (theme.glow > 0) {
          var g = ctx.createRadialGradient(x, d.y, 0, x, d.y, d.r * 6);
          g.addColorStop(0, "rgba(" + d.color + "," + (d.alpha * theme.glow) + ")");
          g.addColorStop(1, "rgba(" + d.color + ",0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, d.y, d.r * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // 核心点
        ctx.beginPath();
        ctx.arc(x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + d.color + "," + d.alpha + ")";
        ctx.fill();
        d._x = x;
      }

      // 数字主题：近距离连线
      if (theme.link > 0) {
        for (i = 0; i < dots.length; i++) {
          for (var j = i + 1; j < dots.length; j++) {
            var a = dots[i];
            var b = dots[j];
            var dx = a._x - b._x;
            var dy = a.y - b.y;
            var dist2 = dx * dx + dy * dy;
            if (dist2 < theme.link * theme.link) {
              var fade = 1 - Math.sqrt(dist2) / theme.link;
              ctx.strokeStyle = "rgba(" + theme.colors[0] + "," + (fade * 0.16) + ")";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a._x, a.y);
              ctx.lineTo(b._x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    }

    if (reduced) {
      drawStatic();
    } else {
      start();
    }

    // 页面隐藏时暂停
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    // 视口变化时重建（防抖）
    var timer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        view = setupCanvas(canvas);
        ctx = view.ctx;
        w = view.w;
        h = view.h;
        dots = [];
        for (var k = 0; k < count; k++) dots.push(spawn(theme, w, h, rand));
        if (reduced) drawStatic();
      }, 200);
    });
  }

  /* ---------------- 滚动入场 ---------------- */

  function setupReveal() {
    var els = document.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 复制按钮 ---------------- */

  function setupCopy() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-copy]");
      if (!b) return;
      var text = b.dataset.copy;
      var done = function () {
        var orig = b.textContent;
        b.textContent = b.dataset.done || "已复制";
        setTimeout(function () { b.textContent = orig; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        done();
      }
    });
  }

  /* ---------------- 启动 ---------------- */

  function boot() {
    document.querySelectorAll("canvas.particles[data-particle]").forEach(initParticles);
    setupReveal();
    setupCopy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
