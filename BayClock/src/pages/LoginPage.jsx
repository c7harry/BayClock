import React, { useState, useEffect } from "react";
import { Box, IconButton, Fade } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FaRegClock } from "react-icons/fa";
import styled from 'styled-components';
import { supabase } from "../supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";

const backgroundUrl = "/Background.png";
const headerTextUrl = "/Header.png";

const MAIN_WORKSPACE_ID = "9ef07a06-d8cf-458a-80c0-a68eeafd62b2";

export default function LoginPage() {
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [namePrompt, setNamePrompt] = useState("");
  const [signupMessage, setSignupMessage] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Add a state to control the toggle
  const [showSignup, setShowSignup] = useState(location.state?.signup || false);

  // If the route state changes (e.g., user navigates again), update the toggle
  useEffect(() => {
    if (location.state?.signup) setShowSignup(true);
    else setShowSignup(false);
  }, [location.state]);

  // Login form submit handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = loginData;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Show "Please confirm your email..." only if the error message indicates unconfirmed email
      if (
        error.message.toLowerCase().includes("confirm") ||
        error.message.toLowerCase().includes("not confirmed") ||
        error.message.toLowerCase().includes("confirmation")
      ) {
        setLoginMessage("Please confirm your email before logging in.");
      } else if (
        error.status === 400 && error.message.toLowerCase().includes("invalid login credentials")
      ) {
        setLoginMessage("Invalid Login");
      } else {
        setLoginMessage(error.message); // fallback: show any other error as a pop-up
      }
    } else {
      const { user } = data;
      if (user) {
        await handleFirstLoginProfile(user);
      }
    }
  };

  // Signup form submit handler
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password } = signupData;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setSignupMessage(error.message); 
    } else if (!data.user) {
      // No error, but no user object: likely already registered (confirmed or not)
      setSignupMessage(
        "This email is already registered. Please check your inbox for the confirmation email or try logging in."
      );
    } else {
      setSignupMessage(
        "Signup successful! Please check your email and confirm your account before logging in."
      );
    }
  };

  // Forgot password handler
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotMessage("Please enter your email.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + "/reset-password"
    });
    if (error) {
      setForgotMessage(error.message);
    } else {
      setForgotMessage(
        "If your email is valid, you will receive a password reset link. Please check your inbox."
      );
    }
  };

  // On first login after email confirmation, insert profile if missing
  // (This logic is only needed if email confirmation is enabled)
  const handleFirstLoginProfile = async (user) => {
    // Check if profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    if (!profile) {
      // Prompt for name if missing
      setShowNamePrompt(true);
    } else {
      navigate("/dashboard");
    }
  };

  // Handler for submitting name prompt (for first login after email confirmation)
  const handleNamePromptSubmit = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && namePrompt.trim()) {
      await supabase.from("profiles").insert([
        {
          id: user.id,
          full_name: namePrompt.trim(),
          email: user.email,
          workspace_id: MAIN_WORKSPACE_ID,
        }
      ]);
      setShowNamePrompt(false);
      navigate("/dashboard");
    }
  };

  // Handle login input changes
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle signup input changes
  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper for pop-up notifications
  const PopupNotification = ({ message, onClose, top = 40 }) => (
    <Fade in={!!message}>
      <div
        style={{
          display: message ? "flex" : "none",
          position: "fixed",
          top,
          left: 0,
          right: 0,
          margin: "0 auto",
          maxWidth: 420,
          background: "#fffbe6",
          color: "#b45309",
          border: "1px solid #fb923c",
          borderRadius: 10,
          padding: "20px 32px 20px 20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          zIndex: 2000,
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 17,
          textAlign: "center",
        }}
        onClick={onClose}
      >
        <span style={{ flex: 1, cursor: "default", textAlign: "center" }}>
          {message}
        </span>
        <IconButton
          aria-label="close"
          size="small"
          onClick={e => {
            e.stopPropagation();
            onClose();
          }}
          sx={{
            marginLeft: 2,
            color: "#b45309",
            position: "absolute",
            top: 8,
            right: 8,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    </Fade>
  );

  return (
    <>
      <Box
        sx={{
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
        {/* Header */}
        <TopBar>
          <img src={headerTextUrl} alt="Header Text" />
        </TopBar>

        {/* Pop-up Notifications */}
        <PopupNotification
          message={signupMessage}
          onClose={() => setSignupMessage("")}
          top={40}
        />
        <PopupNotification
          message={loginMessage}
          onClose={() => setLoginMessage("")}
          top={100}
        />
        <PopupNotification
          message={forgotMessage}
          onClose={() => setForgotMessage("")}
          top={160}
        />

        {/* Centered Login Box */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: { xs: "calc(100vh - 100px)", md: "calc(100vh - 100px)" },
            flexDirection: "column",
            gap: 2
          }}
        >
          <StyledWrapper>
            <div className="wrapper">
              <div className="card-switch">
                <label className="switch">
                  {/* CONTROL THE TOGGLE CHECKED STATE */}
                  <input
                    type="checkbox"
                    className="toggle"
                    checked={showSignup}
                    onChange={e => setShowSignup(e.target.checked)}
                  />
                  <span className="slider" />
                  <span className="card-side" />
                  <div className="flip-card__inner">
                    <div className="flip-card__front">
                      <div className="clock-icon">
                        <div className="clock-circle">
                          <FaRegClock size={28} color="#fff" />
                          <div className="clock-hand"></div>
                        </div>
                      </div>
                      <div className="title">Log in</div>
                      <form className="flip-card__form" onSubmit={handleLoginSubmit}>
                        <input 
                          className="flip-card__input" 
                          name="email" 
                          placeholder="Email" 
                          type="email" 
                          value={loginData.email}
                          onChange={handleLoginChange}
                          required
                        />
                        <input 
                          className="flip-card__input" 
                          name="password" 
                          placeholder="Password" 
                          type="password" 
                          value={loginData.password}
                          onChange={handleLoginChange}
                          required
                        />
                        <button className="flip-card__btn" type="submit">Let's go!</button>
                      </form>
                      {/* Forgot password link */}
                      <div style={{ marginTop: -10 }}>
                        <details>
                          <summary style={{ color: "#fb923c", cursor: "pointer", fontWeight: 600, fontSize: 15, outline: "none" }}>
                            Forgot password?
                          </summary>
                          <form onSubmit={handleForgotPassword} style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                            <input
                              type="email"
                              placeholder="Enter your email"
                              value={forgotEmail}
                              onChange={e => setForgotEmail(e.target.value)}
                              style={{
                                width: 200,
                                padding: 6,
                                borderRadius: 4,
                                border: "1px solid #fb923c",
                                fontSize: 14
                              }}
                              required
                            />
                            <button
                              type="submit"
                              style={{
                                background: "#fb923c",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "6px 14px",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              Send reset link
                            </button>
                          </form>
                        </details>
                      </div>
                    </div>
                    <div className="flip-card__back">
                      <div className="clock-icon">
                        <div className="clock-circle">
                          <FaRegClock size={28} color="#fff" />
                          <div className="clock-hand"></div>
                        </div>
                      </div>
                      <div className="title">Sign up</div>
                      <form className="flip-card__form" onSubmit={handleSignupSubmit}>
                        <input 
                          className="flip-card__input" 
                          name="name"
                          placeholder="Name" 
                          type="text" 
                          value={signupData.name}
                          onChange={handleSignupChange}
                          required
                        />
                        <input 
                          className="flip-card__input" 
                          name="email" 
                          placeholder="Email" 
                          type="email" 
                          value={signupData.email}
                          onChange={handleSignupChange}
                          required
                        />
                        <input 
                          className="flip-card__input" 
                          name="password" 
                          placeholder="Password" 
                          type="password" 
                          value={signupData.password}
                          onChange={handleSignupChange}
                          required
                        />
                        <button className="flip-card__btn" type="submit">Confirm!</button>
                      </form>
                    </div>
                  </div>
                </label>
              </div>   
            </div>
          </StyledWrapper>
        </Box>
      </Box>
      {showNamePrompt && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <form
            onSubmit={handleNamePromptSubmit}
            style={{
              background: "#fff", padding: 32, borderRadius: 8, boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
              display: "flex", flexDirection: "column", gap: 16, minWidth: 300
            }}
          >
            <label htmlFor="namePrompt" style={{ fontWeight: 600 }}>Please enter your name:</label>
            <input
              id="namePrompt"
              type="text"
              value={namePrompt}
              onChange={e => setNamePrompt(e.target.value)}
              required
              style={{ padding: 8, fontSize: 16, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <button type="submit" style={{
              background: "#fb923c", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontWeight: 600
            }}>
              Save
            </button>
          </form>
        </div>
      )}
    </>
  );
}

const StyledWrapper = styled.div`
  .wrapper {
    --input-focus: #fb923c;
    --font-color: #ffffff;
    --font-color-sub: rgba(255, 255, 255, 0.7);
    --bg-color: rgba(15, 45, 82, 0.95);
    --bg-color-alt: #666;
    --main-color: #fb923c;
  }
  /* switch card */
  .switch {
    transform: translateY(-250px);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 30px;
    width: 50px;
    height: 20px;
    z-index: 10;
  }

  .card-side::before {
    position: absolute;
    content: 'Log in';
    left: -70px;
    top: 0;
    width: 100px;
    text-decoration: underline;
    color: var(--font-color);
    font-weight: 600;
  }

  .card-side::after {
    position: absolute;
    content: 'Sign up';
    left: 70px;
    top: 0;
    width: 100px;
    text-decoration: none;
    color: var(--font-color);
    font-weight: 600;
  }

  .toggle {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    box-sizing: border-box;
    border-radius: 5px;
    border: 2px solid #ffffff;
    box-shadow: 
      0 0 0 2px var(--main-color),
      4px 4px 12px rgba(0, 0, 0, 0.3);
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--bg-color);
    transition: 0.3s;
  }

  .slider:before {
    box-sizing: border-box;
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    border: 3px solid #ffffff;
    border-radius: 5px;
    left: -3px;
    bottom: 2px;
    background-color: var(--main-color);
    box-shadow: 
      0 0 0 1px var(--main-color),
      0 3px 6px rgba(0, 0, 0, 0.4);
    transition: 0.3s;
  }

  .toggle:checked + .slider {
    background-color: var(--input-focus);
    border-color: #ffffff;
    box-shadow: 
      0 0 0 2px var(--input-focus),
      4px 4px 12px rgba(0, 0, 0, 0.3);
  }

  .toggle:checked + .slider:before {
    transform: translateX(30px);
    background-color: #ffffff;
    border-color: var(--input-focus);
    box-shadow: 
      0 0 0 1px var(--input-focus),
      0 3px 6px rgba(0, 0, 0, 0.4);
  }

  .toggle:checked ~ .card-side:before {
    text-decoration: none;
  }

  .toggle:checked ~ .card-side:after {
    text-decoration: underline;
  }

  /* Clock icon for both sides */
  .clock-icon {
    display: flex;
    justify-content: center;
    margin-bottom: -20px;
    z-index: 15;
    position: relative;
  }

  .clock-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #fb923c 60%, #ffa94d 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 2px 8px rgba(251,146,60,0.2);
    z-index: 15;
  }

  .clock-hand {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 2px;
    height: 16px;
    background-color: #fff;
    border-radius: 2px;
    transform: translate(-50%, -90%) rotate(0deg);
    transform-origin: bottom center;
    animation: spinClockHand 2s linear infinite;
    z-index: 16;
  }

  @keyframes spinClockHand {
    0% { transform: translate(-50%, -90%) rotate(0deg); }
    100% { transform: translate(-50%, -90%) rotate(360deg); }
  }

  /* card */ 

  .flip-card__inner {
    width: 300px;
    height: 350px;
    position: relative;
    background-color: transparent;
    perspective: 1000px;
    text-align: center;
    transition: transform 0.8s;
    transform-style: preserve-3d;
    z-index: 5;
  }

  .toggle:checked ~ .flip-card__inner {
    transform: rotateY(180deg);
  }

  .toggle:checked ~ .flip-card__front {
    box-shadow: none;
  }

  .flip-card__front, .flip-card__back {
    padding: 20px;
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    background: var(--bg-color);
    gap: 20px;
    border-radius: 5px;
    border: 2px solid var(--main-color);
    box-shadow: 4px 4px var(--main-color);
    z-index: 5;
  }

  .flip-card__back {
    width: 100%;
    transform: rotateY(180deg);
  }

  .flip-card__form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .title {
    margin: 10px 0 5px 0;
    font-size: 25px;
    font-weight: 900;
    text-align: center;
    color: var(--font-color);
    z-index: 10;
    position: relative;
  }

  .flip-card__input {
    width: 250px;
    height: 40px;
    border-radius: 5px;
    border: 2px solid var(--main-color);
    background-color: rgba(255, 255, 255, 0.1);
    box-shadow: 4px 4px var(--main-color);
    font-size: 15px;
    font-weight: 600;
    color: var(--font-color);
    padding: 5px 10px;
    outline: none;
  }

  .flip-card__input::placeholder {
    color: var(--font-color-sub);
    opacity: 0.8;
  }

  .flip-card__input:focus {
    border: 2px solid var(--input-focus);
  }

  .flip-card__btn:active, .button-confirm:active {
    box-shadow: 0px 0px var(--main-color);
    transform: translate(3px, 3px);
  }

  .flip-card__btn {
    margin: 20px 0 20px 0;
    width: 120px;
    height: 40px;
    border-radius: 5px;
    border: 2px solid var(--main-color);
    background-color: var(--main-color);
    box-shadow: 4px 4px var(--main-color);
    font-size: 17px;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
  }
`;

// Match LandingPage header
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
  border-bottom: none;
  img {
    height: 75px;
  }
`;