// script.js
// ────────────────────────────────────────────────────────────
// Enhanced physics: elastic collision + cursor-speed impulse

// 1) Grab the interactive area & balls
const area = document.querySelector('.interactive-area');
const bb   = document.querySelector('.bouncing-ball');
const ub   = document.querySelector('.user-ball');

const extraBalls = [];
const CRAZY_COUNT = 3;    // how many to spawn
const CRAZY_SPEED = 20; 
const crazySound = document.getElementById('crazy-sound');

const bbR = 15, ubR = 15;       // radii
let   bbX = 50, bbY = 50;       // position
let   bbVX = 2, bbVY = 1.5;       // velocity
let lastClientX = null;
let lastClientY = null;
let userX = 0, userY = 0;
crazySound.volume = 0.1;

// 1.1) Track user-ball (cursor) velocity
let lastMouseX = 0, lastMouseY = 0;
let userVX = 0, userVY = 0;
let lastMouseTime = performance.now();


const video = document.getElementById("bg-video");
video.loop = true; // <-- Add this line to make the video loop
video.pause();
video.currentTime = 0;
video.play(); // <-- Play automatically

let targetTime = 0;
let seeking = false;

// Listen for seek events to avoid flooding the player
// video.addEventListener("seeking", () => (seeking = true));
// video.addEventListener("seeked", () => (seeking = false));

// video.addEventListener("loadedmetadata", () => {
//     const maxScroll = document.body.scrollHeight - window.innerHeight;

//     // Update target video time based on scroll position
//     window.addEventListener("scroll", () => {
//     const scrollTop = window.scrollY;
//     const scrollFraction = scrollTop / maxScroll;
//     targetTime = scrollFraction * video.duration;
//     });

//     // Animation loop using requestAnimationFrame
//     function animate() {
//     if (!seeking) {
//         video.currentTime = targetTime;
//     }
//     requestAnimationFrame(animate);
//     }

//     animate(); // Start the loop
// });

// ...existing code...


window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const scrolled = (scrollTop / docHeight) * 100;
  document.getElementById('scroll-progress').style.width = `${scrolled}%`;
});


function spawnCrazyBalls(count) {
  for (let i = 0; i < count; i++) {
    const ballEl = document.createElement('div');
    ballEl.classList.add('ball', 'extra-ball');
    area.appendChild(ballEl);

    // random start inside the area
    const x  = Math.random() * (area.clientWidth  - 2*bbR);
    const y  = Math.random() * (area.clientHeight - 2*bbR);
    const vx = (Math.random()*2 - 1) * CRAZY_SPEED;
    const vy = (Math.random()*2 - 1) * CRAZY_SPEED;

    extraBalls.push({ el: ballEl, x, y, vx, vy });
  }
}

document
  .getElementById('go-crazy-btn')
  .addEventListener('click', () => {
    // reset to start in case it’s mid-play
    crazySound.currentTime = 0;
    crazySound.play().catch(err => {
      // autoplay policies might block before user interaction—
      // but since this is inside a click handler it should be fine.
      console.warn('Audio play failed:', err);
    });

    // …then spawn your balls as before
    spawnCrazyBalls(CRAZY_COUNT);
});


// 2) Helper: compute the bouncing-ball’s center in the particles canvas
function getBallCenter() {
  const container = tsParticles.domItem(0);
  if (!container) return { x: 0, y: 0 };

  const canvasRect = container.canvas.element.getBoundingClientRect();
  const ballRect   = bb.getBoundingClientRect();

  return {
    x: ballRect.left + ballRect.width  / 2 - canvasRect.left,
    y: ballRect.top  + ballRect.height / 2 - canvasRect.top
  };
}

// 3) Manual repulse logic (unchanged)
function applyBallRepulse() {
  const container = tsParticles.domItem(0);
  if (!container) return;
  const particles = container.particles.filter(() => true);
  const { x: bx, y: by } = getBallCenter();

  const RADIUS   = 250;
  const STRENGTH = 0.1;

  for (const p of particles) {
    const dx   = p.position.x - bx;
    const dy   = p.position.y - by;
    const dist = Math.hypot(dx, dy);

    if (dist > 0 && dist < RADIUS) {
      const force = (1 - dist / RADIUS) * STRENGTH;
      p.velocity.x += (dx / dist) * force;
      p.velocity.y += (dy / dist) * force;
    }
  }
}

// 4) Main loop: move, bounce, collide, repel, render
function tick() {
  // — MOVE the bouncing ball
  bbX += bbVX;
  bbY += bbVY;

  // — BOUNCE off walls
  if (bbX <= 0 || bbX + 2 * bbR >= area.clientWidth)  bbVX = -bbVX;
  if (bbY <= 0 || bbY + 2 * bbR >= area.clientHeight) bbVY = -bbVY;

  // — COLLIDE with user-ball using elastic collision + impulse
  const A      = area.getBoundingClientRect();
  const ubRct  = ub.getBoundingClientRect();
  const ux     = ubRct.left - A.left;
  const uy     = ubRct.top  - A.top;
  const dx     = (bbX + bbR) - (ux + ubR);
  const dy     = (bbY + bbR) - (uy + ubR);
  const dist   = Math.hypot(dx, dy);

  if (dist < bbR + ubR) {
    // collision normal
    const nx = dx / dist;
    const ny = dy / dist;

    const midX = bbX + bbR + (dx * 0.5);
    const midY = bbY + bbR + (dy * 0.5);
    spawnCollisionEffect(midX, midY);
    // elastic reflect with restitution
    const restitution = 0.9;
    const vDotN = bbVX * nx + bbVY * ny;
    bbVX = bbVX - (1 + restitution) * vDotN * nx;
    bbVY = bbVY - (1 + restitution) * vDotN * ny;

    // add a bit of your cursor’s velocity
    const impulseScale = 0.0015;
    bbVX += userVX * impulseScale;
    bbVY += userVY * impulseScale;

    // push out of overlap
    const overlap = bbR + ubR - dist;
    bbX += nx * overlap;
    bbY += ny * overlap;
  }

  // — BOUNCE off walls
  if (bbX <= 0) {
    spawnCollisionEffect(bbR, bbY + bbR);
  }
  if (bbX + 2 * bbR >= area.clientWidth) {
    spawnCollisionEffect(area.clientWidth - bbR, bbY + bbR);
  }
  if (bbY <= 0) {
    spawnCollisionEffect(bbX + bbR, bbR);
  }
  if (bbY + 2 * bbR >= area.clientHeight) {
    spawnCollisionEffect(bbX + bbR, area.clientHeight - bbR);
  }

  // — REPEL nearby particles
  applyBallRepulse();

  // — RENDER the ball
  bb.style.transform = `translate(${bbX}px, ${bbY}px)`;


  // — UPDATE extra balls with user‐ball collisions
for (const b of extraBalls) {
  // 1) MOVE
  b.x += b.vx;
  b.y += b.vy;

  // 2) WALL BOUNCES + EFFECT
  // Left wall
  if (b.x <= 0) {
    b.x = 0;
    b.vx = -b.vx;
    spawnCollisionEffect(b.x + bbR, b.y + bbR);
  }
  // Right wall
  if (b.x + 2 * bbR >= area.clientWidth) {
    b.x = area.clientWidth - 2 * bbR;
    b.vx = -b.vx;
    spawnCollisionEffect(b.x + bbR, b.y + bbR);
  }
  // Top wall
  if (b.y <= 0) {
    b.y = 0;
    b.vy = -b.vy;
    spawnCollisionEffect(b.x + bbR, b.y + bbR);
  }
  // Bottom wall
  if (b.y + 2 * bbR >= area.clientHeight) {
    b.y = area.clientHeight - 2 * bbR;
    b.vy = -b.vy;
    spawnCollisionEffect(b.x + bbR, b.y + bbR);
  }

  // 3) USER‐BALL COLLISION + EFFECT
  const dxUB = (b.x + bbR) - (userX + ubR);
  const dyUB = (b.y + bbR) - (userY + ubR);
  const distUB = Math.hypot(dxUB, dyUB);

  if (distUB < bbR + ubR) {
    // reflect velocity
    const nx = dxUB / distUB;
    const ny = dyUB / distUB;
    const vDotN = b.vx * nx + b.vy * ny;
    b.vx = b.vx - 2 * vDotN * nx;
    b.vy = b.vy - 2 * vDotN * ny;

    // optional impulse
    b.vx += userVX * 0.02;
    b.vy += userVY * 0.02;

    // push out of overlap
    const overlap = bbR + ubR - distUB;
    b.x += nx * overlap;
    b.y += ny * overlap;

    // spawn effect at collision point
    const midX = b.x + bbR;
    const midY = b.y + bbR;
    spawnCollisionEffect(midX, midY);
  }

  // 4) RENDER
  b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
}

  // — NEXT FRAME
  requestAnimationFrame(tick);
}

function spawnCollisionEffect(cx, cy) {
  const ripple = document.createElement('div');
  ripple.className = 'collision-effect';
  ripple.style.left = `${cx}px`;
  ripple.style.top  = `${cy}px`;
  area.appendChild(ripple);
  // remove after animation
  setTimeout(() => area.removeChild(ripple), 500);
}

// 5) user-ball follows cursor & we compute its velocity
area.addEventListener('mousemove', e => {
  const A = area.getBoundingClientRect();
  const now = performance.now();
  const dt = (now - lastMouseTime) / 1000 || 0.016;

  // new position of user-ball
  const curX = e.clientX - A.left - ubR;
  const curY = e.clientY - A.top  - ubR;

  lastClientX = e.clientX;
  lastClientY = e.clientY;

  // compute velocity (px/sec)
  userVX = (curX - lastMouseX) / dt;
  userVY = (curY - lastMouseY) / dt;

  // store for next frame
  lastMouseX = curX;
  lastMouseY = curY;
  lastMouseTime = now;

  ub.style.transform = `translate(${curX}px, ${curY}px)`;

  userX = curX;
  userY = curY;
});

window.addEventListener('scroll', () => {
  // if we haven’t seen the cursor move yet, bail
  if (lastClientX === null || lastClientY === null) return;

  const A = area.getBoundingClientRect();
  // same math as in mousemove…
  const curX = lastClientX - A.left - ubR;
  const curY = lastClientY - A.top  - ubR;

  ub.style.transform = `translate(${curX}px, ${curY}px)`;

  userX = curX;
  userY = curY; 
});

// 6) tsParticles config (unchanged)
const particlesConfig = {
  // particles: {
  //   number: { value: 15, density: { enable: true, area: 800 } },
  //   color: { value: '#ececec' },
  //   shape: { type: 'circle' },
  //   shadow: { enable: true, blur: 8, color: { value: '#ececec' } },
  //   size: { value: { min: 1, max: 4 }, animation: { enable: true, speed: 1.5, minimumValue: 1, sync: false } },
  //   twinkle: { particles: { enable: true, frequency: 0.05, opacity: 0.6 } },
  //   opacity: { value: 0.3, animation: { enable: true, speed: 0.5, minimumValue: 0.1, sync: false } },
  //   move: { enable: true, speed: 0.5, outModes: 'bounce', direction: 'none' }
  // },
  interactivity: {
    events: { onHover: { enable: true, mode: 'repulse' }, resize: true },
    modes: { repulse: { distance: 100, duration: 0.4 } }
  },
  detectRetina: true
};

// 7) Load tsParticles, then start tick()
tsParticles.load('particles', particlesConfig).then(container => {
  console.log('✅ tsParticles loaded with', container.particles.filter(() => true).length, 'particles');
  tick();
});

// 8) Scroll-based tweaks (unchanged)
// let lastScrollY = window.scrollY || window.pageYOffset;
// window.addEventListener('scroll', () => {
//   const currentScrollY = window.scrollY || window.pageYOffset;
//   const dir = currentScrollY > lastScrollY ? 'top' :
//               currentScrollY < lastScrollY ? 'bottom' : 'none';
//   lastScrollY = currentScrollY;

//   const p = tsParticles.domItem(0);
//   if (!p) return;
//   if (dir === 'top' || dir === 'bottom') {
//     p.options.particles.move.direction = dir;
//     p.options.particles.move.speed     = 3;
//   } else {
//     p.options.particles.move.direction = 'none';
//     p.options.particles.move.speed     = 0.5;
//   }
//   p.refresh();
// });

const ubInner = ub.querySelector('.user-ball-inner');


document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => {
    ubInner.classList.add('wobble');
  });
});


ubInner.addEventListener('animationend', () => {
  ubInner.classList.remove('wobble');
});

document.getElementById('go-crazy-btn').addEventListener('click', () => {
  spawnCrazyBalls(CRAZY_COUNT);
});


// // 1) grab eyes
// const eyes = document.querySelectorAll('.eye');

// // 2) on mousemove, update each pupil
// area.addEventListener('mousemove', e => {
//   const eyes = document.querySelectorAll('.eye');
//   eyes.forEach(eye => {
//     const pupil = eye.querySelector('.pupil');
//     const eyeRect = eye.getBoundingClientRect();

//     // center of the eye
//     const eyeCX = eyeRect.left + eyeRect.width  / 2;
//     const eyeCY = eyeRect.top  + eyeRect.height / 2;

//     // vector to cursor
//     const dx = e.clientX - eyeCX;
//     const dy = e.clientY - eyeCY;
//     const angle = Math.atan2(dy, dx);

//     // max distance so pupil stays inside eye
//     const maxOffset = (eyeRect.width - pupil.offsetWidth) / 2 - 2;

//     const offsetX = Math.cos(angle) * maxOffset;
//     const offsetY = Math.sin(angle) * maxOffset;

//     // **here** we retain the original centering translate
//     pupil.style.transform =
//       `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;
//   });
// });


window.dispatchEvent(new Event('scroll'));

/* =======================
   HERO ANIMATION DISABLED
   (GSAP + ScrollTrigger)
==========================

document.addEventListener('DOMContentLoaded', () => {
    // Register the plugin
    gsap.registerPlugin(ScrollTrigger);

    // Create a timeline for the scroll-based animation
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: '+=100%', // Animate over a scroll distance equal to 100% of viewport height
            scrub: 1, // Smoothly scrubs the animation in relation to scroll position
            pin: true, // Pins the hero section during the animation
            pinSpacing: true, // Adds padding to prevent content jump
        }
    });

    // Add the animations to the timeline
    tl.to('.hero', {
        yPercent: -20,
        scale: 0.8, // Pans back
        opacity: 0, // Fades out
        filter: 'blur(5px)', // Blurs out
        ease: 'power2.inOut', // Easing function for a smooth effect
    });
});
*/

const bars = document.querySelectorAll('.wave-bar');

    function randomizeHeights() {
      bars.forEach(bar => {
        const newHeight = Math.floor(Math.random() * 100) +10; // between 20% and 100%
        bar.style.height = newHeight + '%';
      });
    }

    // Set initial random heights
    randomizeHeights();

    // Randomize heights every 250ms
    setInterval(randomizeHeights, 250);



const terminalLines = [
  "> INITIALIZING Sonareal SYSTEM...",
  "> CONNECTION ESTABLISHED: www.sonareal.com",
  "> SECURITY PROTOCOL: ENABLED",
  "> LOADING CREATIVE MATRIX...",
  "> CYBER MODULES: ONLINE",
  "> DATA STREAM: STABLE",
];

const terminalContent = document.getElementById('terminalContent');
let lineIndex = 0;

function addTerminalLine() {
  if (lineIndex < terminalLines.length) {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.textContent = terminalLines[lineIndex];
    terminalContent.appendChild(line);

    // Animate the line
    gsap.to(line, {
    opacity: 1,
    duration: 0.5,
    onComplete: function() {
        lineIndex++;
        setTimeout(addTerminalLine, 200);
      }
    });
  }
}
setTimeout(addTerminalLine, 1000);


document.addEventListener('DOMContentLoaded', function() {
  const reviews = [
      {
          text: "This service completely transformed my business. The results were beyond my expectations and the team was incredibly professional.",
          name: "Sarah Johnson",
          role: "Marketing Director",
          initials: "SJ",
          stars: 5
      },
      {
          text: "I was skeptical at first, but I'm so glad I decided to try it. The value for money is exceptional!",
          name: "Michael Chen",
          role: "Startup Founder",
          initials: "MC",
          stars: 5
      },
      {
          text: "Outstanding support and incredible attention to detail. Will definitely be using again for future projects.",
          name: "Emma Rodriguez",
          role: "Product Manager",
          initials: "ER",
          stars: 5
      },
      {
          text: "The quality of work exceeded my expectations. delivered on time and within budget. Highly recommend!",
          name: "James Wilson",
          role: "Creative Director",
          initials: "JW",
          stars: 5
      },
      {
          text: "A game-changer for our organization. The insights we gained have helped us improve our customer satisfaction significantly.",
          name: "Lisa Thompson",
          role: "Operations Manager",
          initials: "LT",
          stars: 5
      },
      {
          text: "Efficient, professional, and truly innovative. I'm impressed with how quickly they understood our needs.",
          name: "Robert Zhang",
          role: "Tech Lead",
          initials: "RZ",
          stars: 5
      },
      {
          text: "The team was responsive and adaptable to our changing requirements. A pleasure to work with from start to finish.",
          name: "Amanda Williams",
          role: "Business Owner",
          initials: "AW",
          stars: 5
      }
  ];
  
  const carouselTrack = document.querySelector('.carousel-track');
  
  // Function to generate star rating HTML
  function generateStars(rating) {
      let starsHTML = '';
      for (let i = 0; i < 5; i++) {
          if (i < rating) {
              starsHTML += '★';
          } else {
              starsHTML += '☆';
          }
      }
      return `<div class="stars">${starsHTML}</div>`;
  }
  
  // Function to create review elements
  function createReviewElement(review) {
      const div = document.createElement('div');
      div.className = 'carousel-item';
      
      div.innerHTML = `
          <p class="review-text">"${review.text}"</p>
          <div>
              <div class="reviewer">
                  <div class="avatar">${review.initials}</div>
                  <div class="reviewer-info">
                      <div class="reviewer-name">${review.name}</div>
                      <div class="reviewer-role">${review.role}</div>
                  </div>
              </div>
              ${generateStars(review.stars)}
          </div>
      `;
      
      return div;
  }
  
  // Populate the carousel with reviews (duplicated for seamless loop)
  reviews.forEach(review => {
      carouselTrack.appendChild(createReviewElement(review));
  });
  
  // Duplicate the reviews for the infinite loop effect
  reviews.forEach(review => {
      carouselTrack.appendChild(createReviewElement(review));
  });

});