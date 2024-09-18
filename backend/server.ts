import Fastify from 'fastify';
import cors from '@fastify/cors'
import sqlite3 from 'sqlite3';
import puppeteer from 'puppeteer';
import validUrl from 'valid-url';
import crypto from 'crypto';
import { URL } from 'url';
import NodeCache from 'node-cache';

// Initialize Fastify
const app = Fastify();
const cache = new NodeCache({ stdTTL: 60 });
const PORT = 3001;

// Register the CORS plugin
app.register(cors, {
  // CORS options here, adjust as needed
  origin: '*', // Allows all origins, adjust for security as needed
  methods: ['GET', 'POST'], // Allowed methods
});

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

  db.run(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE,
      pageId INTEGER,
      FOREIGN KEY(pageId) REFERENCES pages(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS urls_to_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE,
      indexed BOOLEAN DEFAULT FALSE
    )
  `);
});

// Function to generate a unique hash for content
const generateHash = (content: string) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

// Function to convert relative URLs to absolute
const makeAbsoluteUrl = (base: string, relative: string) => {
  try {
    return new URL(relative, base).href;
  } catch (e) {
    return null;
  }
};

// Extract and filter links from a page
const extractLinks = (baseUrl: string, links: string[]) => {
  return links
    .map((link) => makeAbsoluteUrl(baseUrl, link))
    .filter(
      (href) =>
        validUrl.isUri(href) &&
        (href.startsWith('http') || href.startsWith('https')) &&
        !href.endsWith('.pdf') &&
        !href.endsWith('.doc') &&
        !href.endsWith('.xls') &&
        !href.endsWith('.zip')
    );
};

// Extract image URLs from a page
const extractImageUrls = (baseUrl: string, images: string[]) => {
  return images
    .map((src) => makeAbsoluteUrl(baseUrl, src))
    .filter(
      (href) =>
        validUrl.isUri(href) &&
        (href.startsWith('http') || href.startsWith('https'))
    );
};

let browserInstance: puppeteer.Browser | null = null;

const initBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch();
  }
  return browserInstance;
};

const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
};

// Indexing a new URL
const indexUrl = async (url: string) => {
  if (!validUrl.isUri(url)) {
    console.error('Invalid URL:', url);
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        content: document.body.textContent || '',
        imageUrls: Array.from(document.querySelectorAll('img')).map(
          (img) => img.src
        ),
        metaDescription:
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute('content') || '',
        links: Array.from(document.querySelectorAll('a')).map((a) => a.href),
      };
    });

    const { title, content, imageUrls, metaDescription, links } = pageContent;

    const contentHash = generateHash(content);

    db.get(
      'SELECT id FROM pages WHERE contentHash = ?',
      [contentHash],
      (err, row) => {
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
          [
            url,
            title,
            content,
            extractImageUrls(url, imageUrls).join(','),
            metaDescription,
            contentHash,
          ],
          function (err) {
            if (err) {
              console.error('Error inserting page:', err);
              return;
            }
            console.log('Page indexed:', this.lastID);

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
      }
    );
  } catch (error) {
    console.error('Failed to fetch URL:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// API Endpoint to manually trigger indexing
app.post('/api/index', async (request, reply) => {
  const { url } = request.body as { url: string };
  if (!url) {
    return reply.status(400).send({ error: 'URL is required' });
  }
  indexUrl(url);
  return { message: 'Indexing started' };
});

// API Endpoint to process the queue and index new URLs
const processQueue = async () => {
  db.all(
    'SELECT url FROM urls_to_index WHERE indexed = FALSE LIMIT 1',
    (err, rows) => {
      if (err) {
        console.error('Error fetching URLs to index:', err);
        return;
      }

      const indexingPromises = rows.map((row) => {
        const { url } = row;
        return new Promise((resolve) => {
          indexUrl(url);
          db.run(
            'UPDATE urls_to_index SET indexed = TRUE WHERE url = ?',
            [url],
            (err) => {
              if (err) {
                console.error('Error updating index status:', err);
              }
              resolve();
            }
          );
        });
      });

      Promise.all(indexingPromises).then(() =>
        console.log('Queue processing complete')
      );
    }
  );
};

setInterval(processQueue, 20 * 1000);

app.get('/api/search', async (request, reply) => {
  const { query, page = '1', limit = '10' } = request.query as {
    query: string;
    page?: string;
    limit?: string;
  };

  if (!query) {
    return reply.status(400).send({ error: 'Query is required' });
  }

  const pageNum = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  if (isNaN(pageNum) || pageNum < 1 || isNaN(pageSize) || pageSize < 1) {
    return reply.status(400).send({ error: 'Invalid page or limit' });
  }

  const offset = (pageNum - 1) * pageSize;
  const cacheKey = `search:${query}:${pageNum}:${pageSize}`;

  // Check if the result is in the cache
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return reply.send(cachedResult);
  }

  try {
    // Get the total count of matching records
    const countResult = await new Promise<{ count: number }>((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM pages WHERE content LIKE ? OR title LIKE ?',
        [`%${query}%`, `%${query}%`],
        (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row);
        }
      );
    });

    const totalResults = countResult.count;
    const totalPages = Math.ceil(totalResults / pageSize);

    // Get the paginated results
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT id, url, title, imageUrls, metadata,
            (CASE 
              WHEN title LIKE ? THEN 2 
              ELSE 0 
            END + CASE 
              WHEN content LIKE ? THEN 1 
              ELSE 0 
            END) AS relevanceScore,
            LENGTH(title) / 100.0 + LENGTH(content) / 1000.0 AS lengthScore
          FROM pages 
          WHERE content LIKE ? OR title LIKE ?
          ORDER BY relevanceScore DESC, lengthScore DESC, createdAt DESC 
          LIMIT ? OFFSET ?`,
        [
          `%${query}%`, // Exact match in title
          `%${query}%`, // Exact match in content
          `%${query}%`, `%${query}%`, pageSize, offset
        ],
        (err, rows) => {
          if (err) {
            return reject(err);
          }
          resolve(rows);
        }
      );
    });

    // Cache the result
    const result = {
      results: rows,
      totalPages: totalPages,
      currentPage: pageNum,
    };
    cache.set(cacheKey, result);

    reply.send(result);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
});



// Start the server
app.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is running on ${address}`);
});
