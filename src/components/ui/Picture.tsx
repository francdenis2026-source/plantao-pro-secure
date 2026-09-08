import { ImgHTMLAttributes } from 'react';

/**
 * <Picture> — drop-in <img> replacement that serves a .webp sibling with a
 * PNG/JPG fallback. Pass the original raster import as `src`; the component
 * derives the .webp URL by swapping the extension. Vite emits both files
 * because both are imported somewhere in the graph (batch conversion step).
 *
 * Usage:
 *   import hero from '@/assets/hero.jpg';
 *   import heroWebp from '@/assets/hero.webp';
 *   <Picture src={hero} webpSrc={heroWebp} alt="Hero" />
 *
 * If `webpSrc` is omitted, the component derives `${src%.*}.webp` — works
 * when the .webp sibling was generated but not imported (Vite build will
 * still resolve it as a static asset URL at runtime).
 */
export interface PictureProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  webpSrc?: string;
  alt: string;
}

export function Picture({ src, webpSrc, alt, ...rest }: PictureProps) {
  const webp = webpSrc ?? src.replace(/\.(png|jpe?g)(\?.*)?$/i, '.webp$2');
  return (
    <picture>
      {webp !== src && <source srcSet={webp} type="image/webp" />}
      <img src={src} alt={alt} {...rest} />
    </picture>
  );
}
