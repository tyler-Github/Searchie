import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FaSearch, FaMicrophone } from 'react-icons/fa';
import { AiOutlineMenu } from 'react-icons/ai';

const Home = () => {
  const [query, setQuery] = useState('');
  const [isCurious, setIsCurious] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/results?query=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleCurious = () => {
    setIsCurious(true);
    setTimeout(() => setIsCurious(false), 5000); // Reset after 5 seconds
  };

  useEffect(() => {
    if (isCurious) {
      const interval = setInterval(() => {
        const elements = document.querySelectorAll('button, input, img, a');
        elements.forEach(el => {
          (el as HTMLElement).style.transform = `rotate(${Math.random() * 360}deg)`;
        });
      }, 200);

      return () => {
        clearInterval(interval);
        const elements = document.querySelectorAll('button, input, img, a');
        elements.forEach(el => {
          (el as HTMLElement).style.transform = '';
        });
      };
    }
  }, [isCurious]);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-300 flex flex-col ${isCurious ? 'curious-mode' : ''}`}>
      <header className="bg-opacity-50 bg-gray-800 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img src="/searchie.png" alt="Searchie Logo" className="h-8" />
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-400 hover:text-white transition-colors duration-200">
            <AiOutlineMenu size={20} />
          </button>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors duration-200">
            {isCurious ? 'Dance in' : 'Sign in'}
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center flex-grow py-16">
        <img src="/searchie.png" alt="Searchie Logo" className={`h-32 mb-12 ${isCurious ? 'animate-spin' : 'animate-pulse'}`} />
        <form onSubmit={handleSearch} className="w-full max-w-3xl">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`w-full p-5 pr-16 rounded-full bg-gray-700 text-white placeholder-gray-400 border-2 border-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all duration-300 shadow-lg ${isCurious ? 'animate-bounce' : ''}`}
              placeholder={isCurious ? "What's the meaning of life, the universe, and everything?" : "Discover the world with Searchie"}
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <FaSearch size={24} className={isCurious ? 'animate-ping' : ''} />
            </button>
            <button
              type="button"
              className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <FaMicrophone size={24} className={isCurious ? 'animate-bounce' : ''} />
            </button>
          </div>
        </form>
        <div className="mt-10 space-x-6">
          <button 
            onClick={handleSearch} 
            className={`bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 transition-colors duration-200 shadow-md ${isCurious ? 'animate-pulse' : ''}`}
          >
            {isCurious ? 'Searchie Me!' : 'Searchie It'}
          </button>
          <button 
            onClick={handleCurious}
            className="bg-pink-600 text-white px-6 py-3 rounded-full hover:bg-pink-700 transition-colors duration-200 shadow-md"
          >
            I'm Feeling Curious
          </button>
        </div>
      </main>

      <footer className="bg-opacity-50 bg-gray-800 text-sm text-gray-400 py-6 px-6 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="space-x-6">
            <a href="#" className="hover:text-white transition-colors duration-200">About</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Advertising</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Business</a>
            <a href="#" className="hover:text-white transition-colors duration-200">How Searchie Works</a>
          </div>
          <div className="space-x-6">
            <a href="#" className="hover:text-white transition-colors duration-200">Privacy</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Terms</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Settings</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;