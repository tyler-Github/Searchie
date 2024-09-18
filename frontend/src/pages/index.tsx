import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FaSearch, FaMicrophone } from "react-icons/fa";
import { AiOutlineMenu } from "react-icons/ai";
import Head from "next/head";

const Home = () => {
  const [query, setQuery] = useState("");
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
        const elements = document.querySelectorAll("button, input, img, a");
        elements.forEach((el) => {
          (el as HTMLElement).style.transform =
            `rotate(${Math.random() * 360}deg)`;
        });
      }, 200);

      return () => {
        clearInterval(interval);
        const elements = document.querySelectorAll("button, input, img, a");
        elements.forEach((el) => {
          (el as HTMLElement).style.transform = "";
        });
      };
    }
  }, [isCurious]);

  return (
    <div
      className={`flex min-h-screen flex-col bg-gradient-to-br from-gray-900 to-gray-800 text-gray-300 ${isCurious ? "curious-mode" : ""}`}
    >
      <Head>
        <title>Searchie - Find the Best Results</title>
        <meta
          name="description"
          content="Discover the best results with Searchie. Explore a wide range of options and get accurate, relevant information quickly."
        />
        <meta
          name="keywords"
          content={`search results, find results, Searchie`}
        />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content="Searchie - Find the Best Results" />
        <meta
          property="og:description"
          content="Discover the best results with Searchie. Explore a wide range of options and get accurate, relevant information quickly."
        />
        <meta property="og:url" content="https://searchie.vmgware.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Searchie" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Searchie - Find the Best Results" />
        <meta
          name="twitter:description"
          content="Discover the best results with Searchie. Explore a wide range of options and get accurate, relevant information quickly."
        />
        <meta name="twitter:url" content="https://searchie.vmgware.dev/" />

        <link rel="canonical" href="https://searchie.vmgware.dev/" />

        <script type="application/ld+json">
          {`
        {
          "@context": "https://schema.org",
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://searchie.vmgware.dev/search?query={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      `}
        </script>
      </Head>
      <header className="flex items-center justify-between bg-gray-800 bg-opacity-50 px-6 py-4">
        <div className="flex items-center space-x-4">
          <img src="/searchie.png" alt="Searchie Logo" className="h-8" />
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-400 transition-colors duration-200 hover:text-white">
            <AiOutlineMenu size={20} />
          </button>
          <button className="rounded-full bg-indigo-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-indigo-700">
            {isCurious ? "Dance in" : "Sign in"}
          </button>
        </div>
      </header>

      <main className="flex flex-grow flex-col items-center justify-center py-16">
        <img
          src="/searchie.png"
          alt="Searchie Logo"
          className={`mb-12 h-32 ${isCurious ? "animate-spin" : "animate-pulse"}`}
        />
        <form onSubmit={handleSearch} className="w-full max-w-3xl">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`w-full rounded-full border-2 border-gray-600 bg-gray-700 p-5 pr-16 text-white placeholder-gray-400 shadow-lg transition-all duration-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isCurious ? "animate-bounce" : ""}`}
              placeholder={
                isCurious
                  ? "What's the meaning of life, the universe, and everything?"
                  : "Discover the world with Searchie"
              }
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors duration-200 hover:text-white"
            >
              <FaSearch size={24} className={isCurious ? "animate-ping" : ""} />
            </button>
            <button
              type="button"
              className="absolute right-16 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors duration-200 hover:text-white"
            >
              <FaMicrophone
                size={24}
                className={isCurious ? "animate-bounce" : ""}
              />
            </button>
          </div>
        </form>
        <div className="mt-10 space-x-6">
          <button
            onClick={handleSearch}
            className={`rounded-full bg-indigo-600 px-6 py-3 text-white shadow-md transition-colors duration-200 hover:bg-indigo-700 ${isCurious ? "animate-pulse" : ""}`}
          >
            {isCurious ? "Searchie Me!" : "Searchie It"}
          </button>
          <button
            onClick={handleCurious}
            className="rounded-full bg-pink-600 px-6 py-3 text-white shadow-md transition-colors duration-200 hover:bg-pink-700"
          >
            I'm Feeling Curious
          </button>
        </div>
      </main>

      <footer className="mt-auto bg-gray-800 bg-opacity-50 px-6 py-6 text-sm text-gray-400">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="space-x-6">
            <a
              href="#"
              className="transition-colors duration-200 hover:text-white"
            >
              About
            </a>
            <a
              href="#"
              className="transition-colors duration-200 hover:text-white"
            >
              Advertising
            </a>
            <a
              href="#"
              className="transition-colors duration-200 hover:text-white"
            >
              Business
            </a>
            <a
              href="#"
              className="transition-colors duration-200 hover:text-white"
            >
              How Searchie Works
            </a>
          </div>
          <div className="space-x-6">
            <a
              href="#"
              className="transition-colors duration-200 hover:text-white"
            >
              Privacy
            </a>
            <a
              href="#"
              className="transition-colors duration-200 hover:text-white"
            >
              Terms
            </a>
            <a
              href="#"
              className="transition-colors duration-200 hover:text-white"
            >
              Settings
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
