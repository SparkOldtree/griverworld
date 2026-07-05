import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type VideoPlatform = 'bilibili' | 'youtube';

export interface VideoFrontmatter {
  title: string;
  date: string;
  platform: VideoPlatform;
  bvid?: string;
  youtubeId?: string;
  cover?: string;
  duration?: string;
  tags?: string[];
  summary?: string;
}

export interface Video {
  slug: string;
  frontmatter: VideoFrontmatter;
  content: string;
}

const videosDirectory = path.join(process.cwd(), 'content/videos');

export function getAllVideos(): Video[] {
  if (!fs.existsSync(videosDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(videosDirectory);

  const videos = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(videosDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        frontmatter: data as VideoFrontmatter,
        content,
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.date).getTime();
      const dateB = new Date(b.frontmatter.date).getTime();
      return dateB - dateA;
    });

  return videos;
}

export function getVideoBySlug(slug: string): Video | null {
  const fullPath = path.join(videosDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    frontmatter: data as VideoFrontmatter,
    content,
  };
}
