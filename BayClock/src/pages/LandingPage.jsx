import { motion } from "framer-motion";
import { FaRegClock, FaFolderOpen, FaChartBar, FaMoon, FaDatabase } from "react-icons/fa";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 text-center border border-blue-100 dark:border-gray-800"
      >
        <h1 className="text-5xl font-extrabold text-blue-700 dark:text-blue-400 mb-6 drop-shadow-lg">
          Welcome to BayClock
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-200 mb-8">
          Track your time, manage projects, and boost productivity.<br />
          <span className="text-blue-600 dark:text-blue-300 font-semibold">BayClock</span> is your all-in-one solution for freelancers and teams.
        </p>
        <motion.a
          href="/dashboard"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="inline-block bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition mb-10 text-lg"
        >
          Go to Dashboard
        </motion.a>
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 tracking-wide">
            Core Features
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <li className="flex flex-col items-center">
              <FaRegClock className="text-3xl text-blue-600 dark:text-blue-400 mb-2" />
              <span className="font-semibold">Time Tracking</span>
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                Start, pause, and stop timers or log hours manually.
              </span>
            </li>
            <li className="flex flex-col items-center">
              <FaFolderOpen className="text-3xl text-blue-600 dark:text-blue-400 mb-2" />
              <span className="font-semibold">Project & Task Management</span>
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                Organize your work by projects and tasks.
              </span>
            </li>
            <li className="flex flex-col items-center">
              <FaChartBar className="text-3xl text-blue-600 dark:text-blue-400 mb-2" />
              <span className="font-semibold">Reports</span>
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                Visualize your productivity with charts and summaries.
              </span>
            </li>
            <li className="flex flex-col items-center">
              <FaMoon className="text-3xl text-blue-600 dark:text-blue-400 mb-2" />
              <span className="font-semibold">Light/Dark Mode</span>
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                Switch themes for your comfort.
              </span>
            </li>
            <li className="flex flex-col items-center col-span-full sm:col-span-2">
              <FaDatabase className="text-3xl text-blue-600 dark:text-blue-400 mb-2" />
              <span className="font-semibold">Local Data</span>
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                Your data is stored safely in your browser.
              </span>
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}