import Parser from "rss-parser";

const parser = new Parser();

export const fetchEducationNews = async () => {
  try {
    const feeds = [
      "https://www.scholarshiptab.com/rss",
      "https://feeds.feedburner.com/ScholarshipsForDevelopingCountries",
      "https://www.timeshighereducation.com/rss",
    ];

    let allPosts = [];

    for (let url of feeds) {
      const feed = await parser.parseURL(url);

      const posts = feed.items.map((item) => ({
        title: item.title,
        content: item.contentSnippet,
        link: item.link,
        date: item.pubDate,
        source: feed.title,
        tag: detectTag(item.title),
      }));

      allPosts = [...allPosts, ...posts];
    }

    return allPosts;
  } catch (err) {
    console.log(err);
    return [];
  }
};

const detectTag = (text) => {
  text = text.toLowerCase();

  if (text.includes("scholarship")) return "Scholarship";
  if (text.includes("exam")) return "Exams";
  if (text.includes("tech")) return "Tech";

  return "Education";
};