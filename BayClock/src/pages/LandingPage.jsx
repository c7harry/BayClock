import { motion } from "framer-motion";
import { FaRegClock, FaFolderOpen, FaChartBar, FaMoon, FaDatabase } from "react-icons/fa";
import styled from 'styled-components';

const orange = "#ff6910";

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  .btn {
    position: relative;
    background: linear-gradient(90deg,rgb(229, 122, 60) 20%,rgb(246, 191, 132) 80%);
    color: #fff;
    border: 3px solid #ff6910;
    border-radius: 1rem;
    padding: 1rem 2.5rem;
    font-size: 1.25rem;
    font-weight: bold;
    box-shadow: 0 4px 24px 0 #ff691055;
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.2s;
    z-index: 1;
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
    background: radial-gradient(circle, #ff6910 0%, transparent 70%);
    opacity: 0.25;
    position: absolute;
    animation: pulse 2s infinite alternate;
  }
  .circle:last-child {
    width: 140%;
    height: 140%;
    opacity: 0.15;
    animation-delay: 1s;
  }
  @keyframes pulse {
    0% { transform: scale(1);}
    100% { transform: scale(1.08);}
  }
  .btn:hover {
    transform: scale(1.07);
    box-shadow: 0 0 32px 0 #ff6910cc;
  }
`;

const Button = () => {
  return (
    <StyledWrapper>
      <button
        type="button"
        className="btn"
        onClick={() => (window.location.href = "/dashboard")}
      >
        <strong>Go to Dashboard</strong>
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
};

const features = [
	{
		icon: <FaRegClock className="text-4xl mb-2" style={{ color: orange }} />,
		title: "Time Tracking",
		desc: "Start, pause, and stop timers or log hours manually.",
	},
	{
		icon: <FaFolderOpen className="text-4xl mb-2" style={{ color: orange }} />,
		title: "Project & Task Management",
		desc: "Organize your work by projects and tasks.",
	},
	{
		icon: <FaChartBar className="text-4xl mb-2" style={{ color: orange }} />,
		title: "Reports",
		desc: "Visualize your productivity with charts and summaries.",
	},
	{
		icon: <FaMoon className="text-4xl mb-2" style={{ color: orange }} />,
		title: "Light/Dark Mode",
		desc: "Switch themes for your comfort.",
	},
	{
		icon: <FaDatabase className="text-4xl mb-2" style={{ color: orange }} />,
		title: "Local Data",
		desc: "Your data is stored safely in your browser.",
	},
];

export default function LandingPage() {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white">
            {/* Decorative orange bar */}
            <div className="w-32 h-2 rounded-full bg-gradient-to-r from-[#ff6910] to-[#ffa94d] mb-8 z-10" />
            <motion.div
				initial={{ boxShadow: "0 0 0px 0px #ff6910" }}
				animate={{ boxShadow: `0 0 40px 0px ${orange}` }}
				transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
				className="relative z-10 max-w-xl w-full rounded-3xl"
			>
				<motion.div
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
					className="bg-white rounded-3xl shadow-2xl p-10 text-center border-4"
					style={{ borderColor: orange }}
				>
					<h1
						className="text-5xl font-extrabold mb-2 drop-shadow-lg"
						style={{ color: orange }}
					>
						Welcome to BayClock
					</h1>
					<div className="text-lg font-medium text-gray-600 mb-6 tracking-wide">
						The modern way to track your time and projects.
					</div>
					<p className="text-xl text-gray-700 mb-8">
						Track your time, manage projects, and boost productivity.
						<br />
						<span className="font-semibold" style={{ color: orange }}>
							BayClock
						</span>{" "}
						is your all-in-one solution for freelancers and teams.
					</p>
					<Button />
					<div className="mt-8 text-center">
						<h2 className="text-2xl font-bold mb-6 tracking-wide" style={{ color: orange }}>
							Core Features
						</h2>
						<ul className="grid grid-cols-1 sm:grid-cols-2 gap-8">
							{features.map((f, i) => (
								<motion.li
									key={f.title}
									className="flex flex-col items-center transition"
									whileHover={{ scale: 1.08, rotate: i % 2 === 0 ? 2 : -2 }}
									whileTap={{ scale: 0.97 }}
								>
									<span className="mb-2">{f.icon}</span>
									<span className="font-semibold mb-1 text-lg" style={{ color: orange }}>
										{f.title}
									</span>
									<span className="text-gray-600 text-sm">
										{f.desc}
									</span>
								</motion.li>
							))}
						</ul>
					</div>
				</motion.div>
			</motion.div>
			{/* Footer */}
			<footer className="mt-12 text-gray-400 text-sm z-10">
				&copy; {new Date().getFullYear()} BayClock. All rights reserved.
			</footer>
		</div>
	);
}