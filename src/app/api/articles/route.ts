import { NextResponse } from 'next/server';
import { getAllArticles, getAllTags } from '@/lib/articles';

export function GET() {
  const articles = getAllArticles();
  const tags = getAllTags();

  return NextResponse.json({ articles, tags });
}
