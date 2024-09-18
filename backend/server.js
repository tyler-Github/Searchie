const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const puppeteer = require('puppeteer');
const validUrl = require('valid-url');
const crypto = require('crypto');
const { URL } = require('url');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = new sqlite3.Database('./db/index.db');

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE,
      title TEXT,
      content TEXT,
      imageUrls TEXT,
      metadata TEXT,
      contentHash TEXT UNIQUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(
    `CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER,
      image_url TEXT
    )`
  );

  db.run(`
    CREATE TABLE IF NOT EXISTS urls_to_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE,
      indexed BOOLEAN DEFAULT FALSE
    )
  `);
});

// Function to generate a unique hash for content
const generateHash = (content) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

// Function to convert relative URLs to absolute
const makeAbsoluteUrl = (base, relative) => {
  try {
    return new URL(relative, base).href;
  } catch (e) {
    return null;
  }
};

// Extract JSON-LD data
const extractJsonLdData = (document) => {
  const jsonLdData = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdData) {
    try {
      const json = JSON.parse(script.textContent || '{}');
      if (json['@type'] === 'BreadcrumbList' && json.itemListElement) {
        return json.itemListElement.map(item => item.item.name).join(' > ');
      }
      if (json['@type'] === 'WebPage' && json.description) {
        return json.description;
      }
    } catch (e) {
      console.error('Failed to parse JSON-LD data:', e);
    }
  }
  return '';
};

// Extract and filter links from a page
const extractLinks = (baseUrl, links) => {
  return links
    .map(link => makeAbsoluteUrl(baseUrl, link))
    .filter(href => validUrl.isUri(href) && (href.startsWith('http') || href.startsWith('https')) && !href.endsWith('.pdf') && !href.endsWith('.doc') && !href.endsWith('.xls') && !href.endsWith('.zip'));
};

// Extract image URLs from a page
const extractImageUrls = (baseUrl, images) => {
  return images
    .map(src => makeAbsoluteUrl(baseUrl, src))
    .filter(href => validUrl.isUri(href) && (href.startsWith('http') || href.startsWith('https')));
};

// Indexing a new URL
const indexUrl = async (url) => {
  if (!validUrl.isUri(url)) {
    console.error('Invalid URL:', url);
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        content: document.body.textContent || '',
        imageUrls: Array.from(document.querySelectorAll('img')).map(img => img.src),
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        jsonLdDescription: (function() {
          const jsonLdData = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of jsonLdData) {
            try {
              const json = JSON.parse(script.textContent || '{}');
              if (json['@type'] === 'BreadcrumbList' && json.itemListElement) {
                return json.itemListElement.map(item => item.item.name).join(' > ');
              }
              if (json['@type'] === 'WebPage' && json.description) {
                return json.description;
              }
            } catch (e) {
              console.error('Failed to parse JSON-LD data:', e);
            }
          }
          return '';
        })(),
        links: Array.from(document.querySelectorAll('a')).map(a => a.href)
      };
    });

    const { title, content, imageUrls, metaDescription, jsonLdDescription, links } = pageContent;
    const description = metaDescription || jsonLdDescription || 'No description available';

    // Generate a unique hash for content to avoid duplication
    const contentHash = generateHash(content);

    // Check if the content is already indexed
    db.get('SELECT id FROM pages WHERE contentHash = ?', [contentHash], (err, row) => {
      if (err) {
        console.error('Error checking content hash:', err);
        return;
      }
      if (row) {
        console.log('Content already indexed');
        return;
      }

      db.run(
        'INSERT INTO pages (url, title, content, imageUrls, metadata, contentHash) VALUES (?, ?, ?, ?, ?, ?)',
        [url, title, content, extractImageUrls(url, imageUrls).join(','), description, contentHash],
        function (err) {
          if (err) {
            console.error('Error inserting page:', err);
            return;
          }
          console.log('Page indexed:', this.lastID);

          // Extract and queue new links for indexing
          const validLinks = extractLinks(url, links);
          if (validLinks.length > 0) {
            const placeholders = validLinks.map(() => '(?)').join(',');
            const query = `INSERT OR IGNORE INTO urls_to_index (url) VALUES ${placeholders}`;
            db.run(query, validLinks, (err) => {
              if (err) {
                console.error('Error queuing links:', err);
              }
            });
          }
        }
      );
    });

  } catch (error) {
    console.error('Failed to fetch URL:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// API Endpoint to manually trigger indexing
app.post('/api/index', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  indexUrl(url);
  res.status(200).json({ message: 'Indexing started' });
});

// API Endpoint to process the queue and index new URLs
const processQueue = async () => {
  db.all('SELECT url FROM urls_to_index WHERE indexed = FALSE LIMIT 10', (err, rows) => {
    if (err) {
      console.error('Error fetching URLs to index:', err);
      return;
    }

    // Run indexing in parallel
    const indexingPromises = rows.map(row => {
      const { url } = row;
      return new Promise((resolve) => {
        indexUrl(url);
        db.run('UPDATE urls_to_index SET indexed = TRUE WHERE url = ?', [url], (err) => {
          if (err) {
            console.error('Error updating index status:', err);
          }
          resolve();
        });
      });
    });

    // Wait for all indexing promises to complete
    Promise.all(indexingPromises).then(() => console.log('Queue processing complete'));
  });
};

// Run the queue processor every minute
setInterval(processQueue, 60 * 1000);

// Search for pages with pagination
app.get('/api/search', (req, res) => {
  const { query, page = 1, limit = 100 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const pageNum = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (pageNum - 1) * pageSize;

  // First, get the total count of matching records
  db.get(
    `SELECT COUNT(*) AS count FROM pages WHERE content LIKE ? OR title LIKE ?`,
    [`%${query}%`, `%${query}%`],
    (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const totalResults = countResult.count;
      const totalPages = Math.ceil(totalResults / pageSize);

      // Then, get the paginated results
      db.all(
        `SELECT * FROM pages WHERE content LIKE ? OR title LIKE ? LIMIT ? OFFSET ?`,
        [`%${query}%`, `%${query}%`, pageSize, offset],
        (err, rows) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Extract image URLs and store them in the `images` table
          rows.forEach(row => {
            const imageUrls = row.imageUrls ? row.imageUrls.split(',') : [];
            imageUrls.forEach(url => {
              db.run(
                `INSERT INTO images (page_id, image_url) VALUES (?, ?)`,
                [row.id, url],
                (err) => {
                  if (err) {
                    console.error('Error inserting image URL:', err.message);
                  }
                }
              );
            });
          });

          res.json({
            results: rows,
            totalPages: totalPages,
            currentPage: pageNum
          });
        }
      );
    }
  );
});

// Get page by ID
app.get('/api/pages/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM pages WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(row);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
