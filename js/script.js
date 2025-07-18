// script.js
const area = document.getElementById('interactive-area');
const bb   = document.querySelector('.bouncing-ball');
const ub   = document.querySelector('.user-ball');

const bbR = 15, ubR = 15;       // radii
let   bbX = 50, bbY = 50;       // initial position
let   bbVX = 4, bbVY = 3;       // velocity

function tick() {
  // 1) move
  bbX += bbVX;
  bbY += bbVY;

  // 2) bounce off walls
  if (bbX <= 0) {
    bbX = 0; bbVX = -bbVX;
  } else if (bbX + 2*bbR >= area.clientWidth) {
    bbX = area.clientWidth - 2*bbR; bbVX = -bbVX;
  }
  if (bbY <= 0) {
    bbY = 0; bbVY = -bbVY;
  } else if (bbY + 2*bbR >= area.clientHeight) {
    bbY = area.clientHeight - 2*bbR; bbVY = -bbVY;
  }

  // 3) bounce off user ball
  const A      = area.getBoundingClientRect();
  const ubRect = ub.getBoundingClientRect();
  const ux     = ubRect.left - A.left;
  const uy     = ubRect.top  - A.top;
  const dx     = (bbX + bbR) - (ux + ubR);
  const dy     = (bbY + bbR) - (uy + ubR);
  const dist   = Math.hypot(dx, dy);

  if (dist < bbR + ubR) {
    bbVX = -bbVX; bbVY = -bbVY;
    const angle = Math.atan2(dy, dx);
    bbX = ux + ubR - bbR + Math.cos(angle)*(bbR+ubR);
    bbY = uy + ubR - bbR + Math.sin(angle)*(bbR+ubR);
  }

  // 4) render
  bb.style.transform = `translate(${bbX}px, ${bbY}px)`;
  requestAnimationFrame(tick);
}

tick();

// user-ball follows cursor
area.addEventListener('mousemove', e => {
  const A = area.getBoundingClientRect();
  const x = e.clientX - A.left - ubR;
  const y = e.clientY - A.top  - ubR;
  ub.style.transform = `translate(${x}px, ${y}px)`;
});

tsParticles.load('particles', {
  particles: {
    number: { value: 30, density: { enable: true, area: 800 } },
    color: { value: '#ececec' },
    shape: { type: 'circle' },

    // Add a soft glow via shadow
    shadow: {
      enable: true,
      blur: 8,
      color: { value: '#ececec' }
    },

    // Tiny size variation + animating size for more life
    size: {
      value: { min: 1, max: 3 },
      animation: {
        enable: true,
        speed: 1.5,
        minimumValue: 1,
        sync: false
      }
    },

    // Twinkle effect: random brighten/darken flashes
    twinkle: {
      particles: {
        enable: true,
        frequency: 0.05,
        opacity: 0.6
      }
    },

    opacity: {
      value: 0.3,
      animation: {
        enable: true,
        speed: 0.5,
        minimumValue: 0.1,
        sync: false
      }
    },

    move: {
      enable: true,
      speed: 1,
      outModes: 'out'
    }
  },

  interactivity: {
    events: {
      onHover: { enable: true, mode: 'repulse' },
      resize: true
    },
    modes: {
      repulse: { distance: 100, duration: 0.4 }
    }
  },

  detectRetina: true
});