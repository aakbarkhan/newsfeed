const filterDuplicates = (newArticles, existingArticles) => {
    const existingLinks = new Set(existingArticles.map(article => article.link));
    return newArticles.filter(article => !existingLinks.has(article.link));
  };
  

  async function scrapeAndFormatNewsData() {
    let allArticles = [];
    const urls = [
      'https://techcrunch.com/news-sitemap.xml',
      // Add more sitemap URLs as needed
    ];
  
    for (let url of urls) {
      const articles = await fetchNewsFromSitemap(url);
      allArticles = allArticles.concat(articles);
    }
  
    // Load existing data, filter out duplicates
    const existingData = JSON.parse(fs.readFileSync('news_data.json', 'utf8'));
    const filteredArticles = filterDuplicates(allArticles, existingData);
  
    return [...existingData, ...filteredArticles];
  }
  

  function archiveOldArticles(articles) {
    const now = new Date();
    const freshArticles = [];
    const archivedArticles = [];
  
    for (let article of articles) {
      const pubDate = new Date(article.publicationDate);
      if ((now - pubDate) / (1000 * 60 * 60) > 24) {
        archivedArticles.push(article);
      } else {
        freshArticles.push(article);
      }
    }
  
    fs.writeFileSync('archive.json', JSON.stringify(archivedArticles, null, 2));
    return freshArticles;
  }
  