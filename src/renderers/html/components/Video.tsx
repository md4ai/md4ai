interface Props {
  src: string;
}

function getEmbedUrl(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const id = url.searchParams.get('v') ?? url.pathname.split('/').pop() ?? '';
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.split('/').pop() ?? '';
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    // not a URL
  }
  return null;
}

export function Video({ src }: Props) {
  const embedUrl = getEmbedUrl(src);

  if (embedUrl) {
    return (
      <div className="md4ai-video md4ai-video--embed">
        <iframe
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Embedded video"
        />
      </div>
    );
  }

  return (
    <div className="md4ai-video">
      <video src={src} controls />
    </div>
  );
}
