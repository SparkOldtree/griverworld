import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface ArticleFrontmatter {
  title: string;
  date: string;
  tags?: string[];
  category?: string;
  summary?: string;
  cover?: string;
  draft?: boolean;
}

export interface Article {
  slug: string;
  frontmatter: ArticleFrontmatter;
  content: string;
}

const articlesDirectory = path.join(process.cwd(), 'content/articles');

export function getAllArticles(): Article[] {
  if (!fs.existsSync(articlesDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(articlesDirectory);

  const articles = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(articlesDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        frontmatter: data as ArticleFrontmatter,
        content,
      };
    })
    .filter((article) => !article.frontmatter.draft)
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.date).getTime();
      const dateB = new Date(b.frontmatter.date).getTime();
      return dateB - dateA;
    });

  return articles;
}

export function getArticleBySlug(slug: string): Article | null {
  const fullPath = path.join(articlesDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    frontmatter: data as ArticleFrontmatter,
    content,
  };
}

export function getAllTags(): string[] {
  const articles = getAllArticles();
  const tagSet = new Set<string>();

  articles.forEach((article) => {
    article.frontmatter.tags?.forEach((tag) => {
      tagSet.add(tag);
    });
  });

  return Array.from(tagSet).sort();
}

export function getArticlesByTag(tag: string): Article[] {
  const articles = getAllArticles();
  return articles.filter((article) =>
    article.frontmatter.tags?.includes(tag)
  );
}
