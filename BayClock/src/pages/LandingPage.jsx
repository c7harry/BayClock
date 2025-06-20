import { FaRegClock, FaFolderOpen, FaChartBar, FaMoon, FaDatabase } from "react-icons/fa";
import styled from 'styled-components';
import { useNavigate } from "react-router-dom";
import { useSpring, useTrail } from 'react-spring';
import { useInView } from 'react-intersection-observer';
import { TypeAnimation } from 'react-type-animation';
import { GlassCard } from '../components/Theme';

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  .btn {
    position: relative;
    background: linear-gradient(90deg, rgba(15, 45, 82, 0.95) 20%, rgba(60, 120, 200, 0.85) 80%);
    color: #fff;
    border: 3px solid #0f2d52;
    border-radius: 1rem;
    padding: 1rem 2.5rem;
    font-size: 1.25rem;
    font-weight: bold;
    box-shadow: 0 4px 24px 0 #0f2d52aa;
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.2s;
    z-index: 1;
    margin-right: 1rem;
    margin-bottom: 1rem;
    min-width: 140px;
  }
  .btn:last-child {
    margin-right: 0;
  }
  .btn strong {
    position: relative;
    z-index: 2;
    letter-spacing: 0.1em;
  }
  #container-stars {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }
  #stars {
    width: 100%;
    height: 100%;
    background: repeating-radial-gradient(circle at 20% 40%, #fff 1px, transparent 2px, transparent 100px);
    opacity: 0.3;
    animation: twinkle 2s infinite linear;
  }
  @keyframes twinkle {
    0% { background-position: 0 0; }
    100% { background-position: 100px 100px; }
  }
  #glow {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 0;
    pointer-events: none;
  }
  .circle {
    width: 120%;
    height: 120%;
    border-radius: 50%;
    background: radial-gradient(circle, #0f2d52 0%, transparent 70%);
    opacity: 0.22;
    position: absolute;
    animation: pulse 2s infinite alternate;
  }
  .circle:last-child {
    width: 140%;
    height: 140%;
    opacity: 0.13;
    animation-delay: 1s;
  }
  @keyframes pulse {
    0% { transform: scale(1);}
    100% { transform: scale(1.08);}
  }
  .btn:hover {
    transform: scale(1.07);
    box-shadow: 0 0 32px 0 #0f2d52cc;
  }
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    .btn {
      width: 100%;
      margin-right: 0;
      font-size: 1.05rem;
      padding: 0.85rem 1rem;
    }
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 1rem;
  width: 95%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  @media (min-width: 700px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 1100px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

// TopBar with glassmorphism
const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15,45,82,0.65);
  color: white;
  padding: 0.5rem 0 0.5rem 0;
  width: 100vw;
  min-height: 75px;
  box-shadow: 0 2px 16px rgba(15,45,82,0.12);
  z-index: 10;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(8px);
  img {
    height: 75px;
    max-width: 90vw;
    object-fit: contain;
  }
  @media (max-width: 600px) {
    min-height: 54px;
    img {
      height: 44px;
    }
  }
`;

const features = [
  {
    icon: <FaRegClock size={38} style={{ marginBottom: 12, color: "rgba(15, 45, 82, 0.95)" }} />,
    title: "Accurate Time Tracking",
    desc: "Start, pause, and stop timers with persistent accuracy. Manual entries and edits supported.",
  },
  {
    icon: <FaFolderOpen size={38} style={{ marginBottom: 12, color: "rgba(15, 45, 82, 0.95)" }} />,
    title: "Project & Task Management",
    desc: "Organize your work by project and task. Archive, restore, and manage with ease.",
  },
  {
    icon: <FaChartBar size={38} style={{ marginBottom: 12, color: "rgba(15, 45, 82, 0.95)" }} />,
    title: "Insightful Analytics",
    desc: "Visualize your productivity with beautiful charts, summaries, and breakdowns.",
  },
  {
    icon: <FaMoon size={38} style={{ marginBottom: 12, color: "rgba(15, 45, 82, 0.95)" }} />,
    title: "Light & Dark Mode",
    desc: "Switch between light and dark themes for comfortable viewing at any time.",
  },
  {
    icon: <FaDatabase size={38} style={{ marginBottom: 12, color: "rgba(15, 45, 82, 0.95)" }} />,
    title: "Cloud Sync",
    desc: "Your data is securely stored and accessible from any device, anywhere.",
  },
  {
    icon: <FaRegClock size={38} style={{ marginBottom: 12, color: "rgba(15, 45, 82, 0.95)" }} />,
    title: "Modern UI",
    desc: "A clean, responsive, and accessible interface built for productivity.",
  },
];

const headerTextUrl = "/Header.png";
const backgroundUrl = "/Background.png";

export default function LandingPage() {
  const [heroRef, heroInView] = useInView({ threshold: 0.3, triggerOnce: true });
  const [featuresRef, featuresInView] = useInView({ threshold: 0.2, triggerOnce: true });

  const heroSpring = useSpring({
    opacity: heroInView ? 1 : 0,
    transform: heroInView ? 'translateY(0px)' : 'translateY(80px)',
    config: { mass: 1, tension: 80, friction: 26 }
  });

  const featuresTrail = useTrail(features.length, {
    opacity: featuresInView ? 1 : 0,
    transform: featuresInView ? 'scale(1) translateY(0px)' : 'scale(0.92) translateY(40px)',
    config: { mass: 1, tension: 200, friction: 20 }
  });

  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center center",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Top Bar */}
      <TopBar>
        <img src={headerTextUrl} alt="Header Text" />
      </TopBar>

      {/* Hero Section */}
      <div style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: "0 0.5rem"
      }}>
        <GlassCard
          ref={heroRef}
          style={{
            ...heroSpring,
            maxWidth: "520px",
            width: "100%",
            margin: "3rem auto 2rem auto",
            color: "#fff",
            textAlign: "center",
            padding: "3rem 2.5rem 2.5rem 2.5rem",
            '@media (max-width: 600px)': {
              padding: "0.7rem 0.3rem 0.7rem 0.3rem",
              margin: "0.8rem 0 1rem 0",
              maxWidth: "80vw",
            }
          }}
        >
          <div style={{
            fontSize: "2.5rem",
            fontWeight: 900,
            letterSpacing: "0.04em",
            marginBottom: "1.2rem",
            color: "#fff",
            textShadow: "0 2px 16px #0F2D52",
            lineHeight: 1.1,
            // Responsive font size
            ...(window.innerWidth <= 600 ? { fontSize: "1.1rem", marginBottom: "0.5rem" } : {})
          }}>
            Welcome
          </div>
          <div style={{
            fontSize: "1.25rem",
            color: "#fff",
            opacity: 0.92,
            marginBottom: "1.0rem",
            textShadow: "0 2px 8px #0F2D52",
            minHeight: "3.5rem"
          }}>
            <TypeAnimation
              sequence={[
                "Ready to make every second count?",
                1800,
                "Organize. Track. Achieve.",
                1800,
                "Your productivity journey starts here.",
                1800,
                "Let's get things done—together!",
                1800,
              ]}
              wrapper="span"
              speed={40}
              repeat={Infinity}
              style={{
                display: "inline-block",
                whiteSpace: "pre-line",
                fontWeight: 500,
                fontSize: window.innerWidth <= 600 ? "0.92rem" : "1.5rem",
                color: "#fff",
                textShadow: "0 2px 8px #0F2D52"
              }}
            />
          </div>
          <Button />
        </GlassCard>
      </div>

      {/* Features Section */}
      <section
        ref={featuresRef}
        style={{
          width: "100%",
          padding: "0 0 6rem 0",
          margin: 0,
          background: "none",
        }}
      >
        <div style={{ width: "100%", textAlign: "center", marginBottom: "2.5rem" }}>
          <h2 style={{
            fontSize: window.innerWidth <= 600 ? "1.3rem" : "2.5rem",
            fontWeight: 800,
            color: "#fff",
            textAlign: "center",
            letterSpacing: "0.02em",
            textShadow: "0 2px 12px #0F2D52",
            borderBottom: "4px solid #0f2d52",
            display: "inline-block",
            paddingBottom: "0.3rem",
            margin: 0,
            lineHeight: 1.1,
            maxWidth: "95vw"
          }}>
            Core Features
          </h2>
        </div>
        <FeaturesGrid>
          {featuresTrail.map((style, idx) => (
            <GlassCard
              key={features[idx].title}
              style={{
                ...style,
                color: "#fff",
                textAlign: "center",
                padding: "2.5rem 1.5rem 2rem 1.5rem",
                '@media (max-width: 600px)': {
                  padding: "0.9rem 0.5rem 0.9rem 0.5rem",
                  fontSize: "0.92rem"
                }
              }}
              sx={{
                '&:hover': {
                  boxShadow: "0 8px 32px 0 #0f2d52bb, 0 1.5px 8px 0 #fff2",
                  border: "1.5px solid #0f2d52"
                }
              }}
            >
              <div>{features[idx].icon}</div>
              <div style={{
                fontWeight: 700,
                fontSize: window.innerWidth <= 600 ? "1.05rem" : "1.25rem",
                marginBottom: 10,
                color: "#fff"
              }}>
                {features[idx].title}
              </div>
              <div style={{
                color: "#fff",
                fontSize: window.innerWidth <= 600 ? "0.98rem" : "1.15rem",
                opacity: 0.92
              }}>
                {features[idx].desc}
              </div>
            </GlassCard>
          ))}
        </FeaturesGrid>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "2rem 0",
        textAlign: "center",
        color: "#fff",
        background: "rgba(15, 45, 82, 0.95)",
        fontWeight: 500,
        letterSpacing: "0.04em",
        fontSize: "1.1rem",
        borderTop: "1px solid #fff2",
        marginTop: "2rem",
        width: "100vw",
        boxSizing: "border-box"
      }}>
        &copy; {new Date().getFullYear()} BayClock. All rights reserved.
      </footer>
    </div>
  );
}

function Button() {
  const navigate = useNavigate();
  return (
    <StyledWrapper>
      <button
        type="button"
        className="btn"
        onClick={() => navigate("/login")}
      >
        <strong>Login</strong>
        <div id="container-stars">
          <div id="stars" />
        </div>
        <div id="glow">
          <div className="circle" />
          <div className="circle" />
        </div>
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => navigate("/login", { state: { signup: true } })}
      >
        <strong>Sign Up</strong>
        <div id="container-stars">
          <div id="stars" />
        </div>
        <div id="glow">
          <div className="circle" />
          <div className="circle" />
        </div>
      </button>
    </StyledWrapper>
  );
}