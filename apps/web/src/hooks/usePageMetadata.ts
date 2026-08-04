import { useEffect } from 'react';

export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  ogType?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function usePageMetadata(metadata: PageMetadata) {
  useEffect(() => {
    // 1. Document Title
    const prevTitle = document.title;
    document.title = metadata.title;

    // Helper function to set or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper function to set or create link tag
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // 2. Description
    setMetaTag('meta[name="description"]', 'name', 'description', metadata.description);

    // 3. Canonical
    setLinkTag('canonical', metadata.canonical);

    // 4. Robots
    setMetaTag('meta[name="robots"]', 'name', 'robots', metadata.robots || 'index, follow');

    // 5. Open Graph
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', metadata.ogTitle || metadata.title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', metadata.ogDescription || metadata.description);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', metadata.ogType || 'website');
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', metadata.ogUrl || metadata.canonical);
    if (metadata.ogImage) {
      setMetaTag('meta[property="og:image"]', 'property', 'og:image', metadata.ogImage);
    }

    // 6. Twitter
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', metadata.twitterCard || 'summary');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', metadata.twitterTitle || metadata.title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', metadata.twitterDescription || metadata.description);

    // 7. JSON-LD
    let scriptTag = document.getElementById('json-ld-page-data') as HTMLScriptElement | null;
    if (metadata.jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'json-ld-page-data';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(metadata.jsonLd, null, 2);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      document.title = prevTitle;
    };
  }, [metadata]);
}
