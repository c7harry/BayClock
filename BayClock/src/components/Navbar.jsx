import { motion } from "framer-motion";
import logo from "../assets/BayClock.png";

export default function Navbar() {
  return (
    <motion.header
      className="bg-white shadow p-4 flex items-center gap-4"
      style={{ paddingTop: "0.4rem" }}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 12 }}
    >
      <motion.img
        src={logo}
        alt="BayClock Logo"
        className="h-8 w-10 square-full shadow-md"
        style={{ height: "3rem", width: "6rem" }} 
        initial={{ rotate: -20, scale: 0.8 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 8, delay: 0.2 }}
      />
      <motion.div
        className="text-2xl font-extrabold tracking-wide text-[#ff6910] drop-shadow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
      </motion.div>
    </motion.header>
  );
}
