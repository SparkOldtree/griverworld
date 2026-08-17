import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface NewsFrontmatter {
  title: string;
  date: string;
  tags?: string[];
  summary?: string;
}

export interface NewsItem {
  slug: string;
  frontmatter: NewsFrontmatter;
  content: string;
}

const newsDirectory = path.join(process.cwd(), 'content/news');

export function getAllNews(): NewsItem[] {
  if (!fs.existsSync(newsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(newsDirectory);

  const newsItems = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(newsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        frontmatter: data as NewsFrontmatter,
        content,
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.date).getTime();
      const dateB = new Date(b.frontmatter.date).getTime();
      return dateB - dateA;
    });

  return newsItems;
}

export function getNewsBySlug(slug: string): NewsItem | null {
  const fullPath = path.join(newsDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    frontmatter: data as NewsFrontmatter,
    content,
  };
}
