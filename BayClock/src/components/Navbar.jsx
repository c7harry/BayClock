import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import styled, { createGlobalStyle } from "styled-components";
import { supabase } from "../supabaseClient";
import { FaRegClock } from "react-icons/fa";
import { Tooltip as MuiTooltip, tooltipClasses } from "@mui/material";

const TIMER_STATE_KEY = "timerState";

// Utility: seconds to "1h 23m 45s"
function timerToDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [
    h ? `${h}h` : "",
    m ? `${m}m` : "",
    s ? `${s}s` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// --- Custom Tooltip for Stop Button ---
const StyledTooltip = styled(({ className, ...props }) => (
  <MuiTooltip
    {...props}
    classes={{ popper: className }}
    arrow
    placement="bottom"
  />
))`
  & .${tooltipClasses.tooltip} {
    background: linear-gradient(90deg, #fb923c 0%, #f43f1a 100%);
    color: #fff;
    font-weight: 700;
    font-size: 1.05rem;
    border-radius: 10px;
    box-shadow: 0 2px 12px 0 rgba(251, 146, 60, 0.18);
    padding: 10px 18px;
    letter-spacing: 0.5px;
    border: 2px solid #fff7ed;
    text-shadow: 0 1px 4px #f43f1a44;
  }
  & .${tooltipClasses.arrow} {
    color: #fb923c;
    filter: drop-shadow(0 2px 4px #f43f1a44);
  }
`;

function TimerNavDisplay() {
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    function updateTimer() {
      const saved = localStorage.getItem(TIMER_STATE_KEY);
      if (saved) {
        const { isRunning, timer, startedAt } = JSON.parse(saved);
        if (isRunning && startedAt) {
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          setTimer(elapsed);
          setIsRunning(true);
        } else {
          setTimer(timer || 0);
          setIsRunning(false);
        }
      } else {
        setTimer(0);
        setIsRunning(false);
      }
    }
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    window.addEventListener("storage", updateTimer);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", updateTimer);
    };
  }, []);

  const handleStopTask = () => {
    localStorage.removeItem(TIMER_STATE_KEY);
    setIsRunning(false);
    setTimer(0);
    window.dispatchEvent(new Event("storage"));
  };

  if (!isRunning) return null;

  return (
    <StyledTimerNav>
      <FaRegClock style={{ marginRight: 4 }} />
      {timerToDuration(timer)}
      <StyledTooltip title="Stop Task" arrow>
        <StopTaskButton onClick={handleStopTask} aria-label="Stop Task">
          <span className="stop-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="6" y="6" width="16" height="16" rx="3" fill="#fff"/>
              <rect x="6" y="6" width="16" height="16" rx="3" stroke="#fb923c" strokeWidth="3"/>
            </svg>
          </span>
        </StopTaskButton>
      </StyledTooltip>
    </StyledTimerNav>
  );
}

// Global styles for glitch effect
const GlitchStyles = createGlobalStyle`
.navbar-glitch.glitch-wrapper {
   height: 56px;
   display: flex;
   align-items: center;
   justify-content: center;
   background: transparent;
   margin-left: 8px;
}

.navbar-glitch .glitch {
   position: relative;
   font-size: 2rem;
   font-family: "Montserrat", 'Segoe UI', Arial, sans-serif;
   font-weight: 800;
   line-height: 1.2;
   color: white;
   letter-spacing: 1.5px;
   z-index: 1;
}
   
.navbar-glitch .glitch:before {
   content: attr(data-glitch);
   position: absolute;
   top: 0;
   left: -2px;
   width: 100%;
   color: white;
   background: transparent;
   overflow: hidden;
   clip: rect(0, 900px, 0, 0);
   animation: noise-before 3s infinite linear alternate-reverse;
}

.navbar-glitch .glitch:after {
   content: attr(data-glitch);
   position: absolute;
   top: 0;
   left: 2px;
   width: 100%;
   color: white;
   background: transparent;
   overflow: hidden;
   clip: rect(0, 900px, 0, 0);
   animation: noise-after 2s infinite linear alternate-reverse;
}

/* Dark mode styles for glitch */
html.dark .navbar-glitch .glitch {
   color: #d1d5db;
}
html.dark .navbar-glitch .glitch:before {
   color: #d1d5db;
}
html.dark .navbar-glitch .glitch:after {
   color: #d1d5db;
}
@keyframes noise-before {
   0% { clip: rect(61px, 9999px, 52px, 0); }
   5% { clip: rect(33px, 9999px, 144px, 0); }
   10% { clip: rect(121px, 9999px, 115px, 0); }
   15% { clip: rect(144px, 9999px, 162px, 0); }
   20% { clip: rect(62px, 9999px, 180px, 0); }
   25% { clip: rect(34px, 9999px, 42px, 0); }
   30% { clip: rect(147px, 9999px, 179px, 0); }
   35% { clip: rect(99px, 9999px, 63px, 0); }
   40% { clip: rect(188px, 9999px, 122px, 0); }
   45% { clip: rect(154px, 9999px, 14px, 0); }
   50% { clip: rect(63px, 9999px, 37px, 0); }
   55% { clip: rect(161px, 9999px, 147px, 0); }
   60% { clip: rect(109px, 9999px, 175px, 0); }
   65% { clip: rect(157px, 9999px, 88px, 0); }
   70% { clip: rect(173px, 9999px, 131px, 0); }
   75% { clip: rect(62px, 9999px, 70px, 0); }
   80% { clip: rect(24px, 9999px, 153px, 0); }
   85% { clip: rect(138px, 9999px, 40px, 0); }
   90% { clip: rect(79px, 9999px, 136px, 0); }
   95% { clip: rect(25px, 9999px, 34px, 0); }
   100% { clip: rect(173px, 9999px, 166px, 0); }
}
@keyframes noise-after {
   0% { clip: rect(26px, 9999px, 33px, 0); }
   5% { clip: rect(140px, 9999px, 198px, 0); }
   10% { clip: rect(184px, 9999px, 89px, 0); }
   15% { clip: rect(121px, 9999px, 6px, 0); }
   20% { clip: rect(181px, 9999px, 99px, 0); }
   25% { clip: rect(154px, 9999px, 133px, 0); }
   30% { clip: rect(134px, 9999px, 169px, 0); }
   35% { clip: rect(26px, 9999px, 187px, 0); }
   40% { clip: rect(147px, 9999px, 137px, 0); }
   45% { clip: rect(31px, 9999px, 52px, 0); }
   50% { clip: rect(191px, 9999px, 109px, 0); }
   55% { clip: rect(74px, 9999px, 54px, 0); }
   60% { clip: rect(145px, 9999px, 75px, 0); }
   65% { clip: rect(153px, 9999px, 198px, 0); }
   70% { clip: rect(99px, 9999px, 136px, 0); }
   75% { clip: rect(118px, 9999px, 192px, 0); }
   80% { clip: rect(1px, 9999px, 83px, 0); }
   85% { clip: rect(145px, 9999px, 98px, 0); }
   90% { clip: rect(121px, 9999px, 154px, 0); }
   95% { clip: rect(156px, 9999px, 44px, 0); }
   100% { clip: rect(67px, 9999px, 122px, 0); }
}
`;

// --- Main Navbar ---
export default function Navbar() {
  return (
    <>
      <GlitchStyles />
      <StyledNavbar
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 80, damping: 12 }}
      >
        <div className="navbar-left">
          <div className="navbar-glitch glitch-wrapper">
            <div className="glitch" data-glitch="BayClock">BayClock</div>
          </div>
        </div>
        <div className="navbar-right">
          <TimerNavDisplay /> 
        </div>
      </StyledNavbar>
    </>
  );
}

const StyledNavbar = styled(motion.header)`
  width: 100%;
  height: 56px;
  background: #0F2D52;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px 0 0px;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 50;

  /* Dark mode styles */
  html.dark & {
    background: #0F2D52;
    box-shadow: 0 2px 8px 0 rgba(0,0,0,0.18);
  }

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 0px;
    margin-left: 0;
  }

  .navbar-title {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: white;
    transition: color 0.3s;
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
    flex: 1;
  }

  @media (max-width: 600px) {
    height: 44px;
    padding: 0 10px 0 2px;

    .glitch-wrapper {
      height: 32px;
    }
    .glitch {
      font-size: 1.1rem;
    }
    .navbar-title {
      font-size: 1.1rem;
    }
    .navbar-right {
      margin-right: 0;
    }
  }
`;

const StyledTimerNav = styled.div`
  margin-right: 24px;
  font-weight: 700;
  color: #fb923c;
  font-size: 1.1rem;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  background: linear-gradient(90deg, #fff7ed 0%, #ffe6d3 100%);
  border-radius: 18px;
  padding: 4px 10px 4px 10px;
  box-shadow: 0 2px 8px 0 rgba(251, 146, 60, 0.08);
  border: 1.5px solidrgb(251, 60, 60);
  transition: background 0.2s, border 0.2s;

  html.dark & {
    background: linear-gradient(90deg, #23232a 0%, #18181b 100%);
    color: #fb923c;
    border: 1.5px solid #fb923c;
  }
`;

const StopTaskButton = styled.button`
  margin-left: 8px;
  background: linear-gradient(90deg, #fb923c 0%, #f43f1a 100%);
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px 0 rgba(251, 146, 60, 0.18);
  transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
  outline: none;
  position: relative;
  overflow: hidden;

  &:hover, &:focus {
    background: linear-gradient(90deg, #f43f1a 0%, #fb923c 100%);
    box-shadow: 0 4px 16px 0 rgba(251, 146, 60, 0.28);
    transform: scale(1.08);
  }

  .stop-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  svg {
    display: block;
  }
`;
