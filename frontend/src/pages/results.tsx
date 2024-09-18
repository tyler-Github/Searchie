import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import { FaSearch, FaRegImage, FaMicrophone } from "react-icons/fa";
import { AiOutlineMenu } from "react-icons/ai";

const Results = () => {
  const router = useRouter();
  const { query, page: queryPage } = router.query;
  const [results, setResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState<string>(
    (query as string) || "",
  );
  const [currentPage, setCurrentPage] = useState<number>(
    parseInt(queryPage as string, 10) || 1,
  );
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    if (query) {
      setSearchQuery(query as string);
      axios
        .get("http://localhost:3001/api/search", {
          params: { query, page: currentPage, limit: 100 }, // Adjust limit as needed
        })
        .then((response) => {
          const processedResults = response.data.results.map((result: any) => {
            if (result.imageUrls) {
              const imageUrlArray = result.imageUrls
                .split(",")
                .map((url: string) => url.trim());
              return { ...result, imageUrls: imageUrlArray };
            }
            return result;
          });

          setResults(processedResults);
          setFilteredResults(processedResults);
          setTotalPages(response.data.totalPages || 1);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching results:", error);
          setError("Failed to load results.");
          setLoading(false);
        });
    }
  }, [query, currentPage]);

  useEffect(() => {
    if (activeTab === "images") {
      const imagesResults = results.filter(
        (result) => result.imageUrls && result.imageUrls.length > 0,
      );
      setFilteredResults(imagesResults);
    } else {
      setFilteredResults(results);
    }
  }, [activeTab, results]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/results?query=${encodeURIComponent(searchQuery.trim())}&page=1`,
      );
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    router.push(
      `/results?query=${encodeURIComponent(searchQuery.trim())}&page=${newPage}`,
    );
  };

  if (loading)
    return <p className="mt-10 text-center text-white">Loading...</p>;
  if (error) return <p className="mt-10 text-center text-red-500">{error}</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-300">
      <header className="flex items-center justify-between bg-gray-800 bg-opacity-50 px-6 py-4">
        <div className="flex flex-grow items-center space-x-8">
          <img src="/searchie.png" alt="Searchie Logo" className="h-8" />
          <form
            onSubmit={handleSearch}
            className="relative max-w-3xl flex-grow"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border-2 border-gray-600 bg-gray-700 p-4 pr-16 text-white placeholder-gray-400 shadow-lg transition-all duration-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Discover more with Searchie"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors duration-200 hover:text-white"
            >
              <FaSearch size={20} />
            </button>
            <button
              type="button"
              className="absolute right-16 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors duration-200 hover:text-white"
            >
              <FaMicrophone size={20} />
            </button>
          </form>
        </div>
        <div className="ml-4 flex items-center space-x-4">
          <button className="text-gray-400 transition-colors duration-200 hover:text-white">
            <AiOutlineMenu size={20} />
          </button>
          <button className="rounded-full bg-indigo-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-indigo-700">
            Sign in
          </button>
        </div>
      </header>

      <nav className="flex space-x-6 bg-gray-800 bg-opacity-50 px-6 py-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center space-x-1 rounded-full px-3 py-2 transition-colors duration-200 ${
            activeTab === "all"
              ? "bg-indigo-600 text-white"
              : "text-gray-400 hover:bg-gray-700"
          }`}
        >
          <FaSearch size={14} />
          <span>All</span>
        </button>
        <button
          onClick={() => setActiveTab("images")}
          className={`flex items-center space-x-1 rounded-full px-3 py-2 transition-colors duration-200 ${
            activeTab === "images"
              ? "bg-indigo-600 text-white"
              : "text-gray-400 hover:bg-gray-700"
          }`}
        >
          <FaRegImage size={14} />
          <span>Images</span>
        </button>
      </nav>

      <main className="container mx-auto px-6 py-8">
        <p className="mb-4 text-sm text-gray-400">
          About {results.length} results
        </p>
        <div className="space-y-8">
          {filteredResults.map((result) => (
            <div
              key={result.id}
              className="max-w-2xl rounded-lg bg-gray-800 p-6 shadow-lg"
            >
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl text-indigo-400 hover:underline"
              >
                {result.title}
              </a>
              <p className="text-sm text-green-400">
                {result.url.substring(0, 30)}...
              </p>
              <p className="mt-2 text-sm text-gray-300">
                {result.metadata.substring(0, 200)}...
              </p>

              {activeTab === "images" && result.imageUrls && (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {result.imageUrls.map((url: string, index: number) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="h-24 w-full rounded object-cover transition-transform duration-200 hover:scale-105"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center space-x-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-full bg-gray-700 px-4 py-2 text-white transition-colors duration-200 hover:bg-gray-600 disabled:opacity-50"
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => handlePageChange(i + 1)}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 ${
                currentPage === i + 1
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="rounded-full bg-gray-700 px-4 py-2 text-white transition-colors duration-200 hover:bg-gray-600 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
};

export default Results;
