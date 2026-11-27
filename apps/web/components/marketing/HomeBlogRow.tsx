import { BlogCarousel } from '@/components/marketing/BlogCarousel';
import { loadHomepageGuides } from '@/lib/public-guides';

export async function HomeBlogRow() {
  const posts = await loadHomepageGuides();
  return <BlogCarousel posts={posts} />;
}
