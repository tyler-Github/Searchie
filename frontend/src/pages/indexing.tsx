import { useState } from 'react';
import axios from 'axios';

const Indexing = () => {
  const [url, setUrl] = useState('');

  const handleIndex = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/index', { url });
      setUrl('');
      alert('URL indexed successfully!');
    } catch (error) {
      console.error('Error indexing URL:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Index a New URL</h1>
      <form onSubmit={handleIndex}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="p-2 border rounded"
          placeholder="Enter URL..."
          required
        />
        <button type="submit" className="ml-2 bg-green-500 text-white p-2 rounded">
          Index URL
        </button>
      </form>
    </div>
  );
};

export default Indexing;
