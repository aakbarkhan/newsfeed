const { createServer } = require('node:http');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const simpleGit = require('simple-git');
const cron = require('node-cron');

const git = simpleGit();
const hostname = '127.0.0.1';
const port = 3000;

// Function to fetch news data from sitemap
async function fetchNewsFromSitemap(url) {
  try {
    const response = await axios.get(url);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);

    // Format news articles based on sitemap structure
    const newsArticles = result.urlset.url.map((entry) => ({
      title: entry['news:news'] ? entry['news:news'][0]['news:title'][0] : 'No Title',
      link: entry.loc[0],
      publicationDate: entry['news:news'] ? entry['news:news'][0]['news:publication_date'][0] : 'No Date',
    }));

    return newsArticles;
  } catch (error) {
    console.error("Error fetching or parsing sitemap:", error);
    return [];
  }
}

// Function to save JSON data and push to GitHub
async function updateJsonOnGithub(jsonData) {
  fs.writeFileSync('news_data.json', JSON.stringify(jsonData, null, 2)); // Creates or updates the file
  
  try {
    await git.add('./news_data.json'); // Stage the new/modified file
    await git.commit('Updated news data'); // Commit with a message
    await git.push('origin', 'main'); // Push to the 'main' branch (ensure branch exists)
    console.log("Data pushed to GitHub successfully.");
  } catch (error) {
    console.error("Error pushing data to GitHub:", error);
  }
}

// Main function to fetch, format, and update news data
async function scrapeAndFormatNewsData() {
  const urls = [
    'https://techcrunch.com/news-sitemap.xml',
    // Add more sitemap URLs as needed
  ];

  let allArticles = [];
  for (let url of urls) {
    const articles = await fetchNewsFromSitemap(url);
    allArticles = allArticles.concat(articles);
  }

  return allArticles;
}

// Start the server
const server = createServer(async (req, res) => {
  if (req.url === '/fetch-news' && req.method === 'GET') {
    // Endpoint to manually fetch and update news data
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    try {
      const jsonData = await scrapeAndFormatNewsData();
      await updateJsonOnGithub(jsonData);
      res.end(JSON.stringify({ message: 'News data fetched and updated successfully!' }));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to fetch news data.' }));
    }

  } else if (req.url === '/news' && req.method === 'GET') {
    // Endpoint to serve the latest news data
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    try {
      const data = fs.readFileSync('news_data.json', 'utf8');
      res.end(data);
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to load news data.' }));
    }

  } else {
    // Default response for other endpoints
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
  }
});

// Schedule task to update news data every 20 minutes
cron.schedule('*/20 * * * *', async () => {
  console.log("Fetching and updating news data...");
  const jsonData = await scrapeAndFormatNewsData();
  await updateJsonOnGithub(jsonData);
  console.log("this just run after 20 mins")
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
