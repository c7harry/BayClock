import { motion } from "framer-motion";
import styled from "styled-components";
import logo from "../assets/BayClock.png";

export default function Navbar() {
  return (
    <StyledNavbar
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 12 }}
    >
      <div className="navbar-left">
        <motion.img
          src={logo}
          alt="BayClock Logo"
          className="navbar-logo"
          initial={{ rotate: -20, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 8, delay: 0.2 }}
        />
      </div>
      <div className="navbar-right">
      </div>
    </StyledNavbar>
  );
}

const StyledNavbar = styled(motion.header)`
  width: 100%;
  height: 56px;
  background: #fff;
  border-bottom: 1.5px solid #ececec;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px 0 20px;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 50;

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .navbar-logo {
    height: 50px;
    width: 100px;
    border-radius: 8px;
    box-shadow: 0 2px 8px 0 rgba(255, 105, 16, 0.08);
    background: #fff;
    object-fit: contain;
  }

  .navbar-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: #ff6910;
    letter-spacing: 1px;
    text-shadow: 0 1px 0 #fff3e6;
    user-select: none;
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 24px;
  }

`;
