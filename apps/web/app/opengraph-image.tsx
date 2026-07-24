import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Church_Hub OS — Evangelism, follow-up, membership & ministry in one place';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Served at /opengraph-image — avoids aaPanel static .png disk 404s. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 700,
              color: '#d4a853',
            }}
          >
            ⊕
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>
              Church<span style={{ color: '#d4a853' }}>_Hub</span> OS
            </div>
            <div style={{ fontSize: 18, color: '#94a3b8', marginTop: 4 }}>
              Enterprise Ministry Platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.15, maxWidth: 920 }}>
            One platform for the entire church community
          </div>
          <div style={{ fontSize: 22, color: '#cbd5e1' }}>
            Membership · Discipleship · Outreach · Youth · Operations
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 240,
            height: 48,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #e8c878, #d4a853)',
            color: '#1e1b4b',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Start free trial →
        </div>
      </div>
    ),
    { ...size },
  );
}
