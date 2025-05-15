import { Link } from "react-router-dom";
import { motion } from "motion/react";

const Home = () => {
  return (
    <motion.div
      className="w-screen h-screen bg-blue-600 flex flex-col items-center justify-center text-white"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 2 }}
    >
      <h1 className="text-4xl font-bold mb-4">Home Page</h1>
      <Link
        to="/login"
        className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-gray-100 transition-colors"
      >
        Go to Login
      </Link>
    </motion.div>
  );
};

export default Home;
