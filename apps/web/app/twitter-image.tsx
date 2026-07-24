import { ImageResponse } from 'next/og';

export const alt = 'Church_Hub OS — Evangelism, follow-up, membership & ministry in one place';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Same art as opengraph-image (explicit exports for Next metadata). */
export default function TwitterImage() {
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
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 20,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: '#d4a853',
                display: 'flex',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: '#ffffff' }}>Church</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: '#d4a853' }}>_Hub</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', marginLeft: 10 }}>
                OS
              </div>
            </div>
            <div style={{ fontSize: 18, color: '#94a3b8', marginTop: 6, display: 'flex' }}>
              Enterprise Ministry Platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#ffffff',
              display: 'flex',
              maxWidth: 920,
            }}
          >
            One platform for the entire church management
          </div>
          <div style={{ fontSize: 22, color: '#cbd5e1', marginTop: 16, display: 'flex' }}>
            Membership | Discipleship | Outreach | Youth | Operations
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 260,
            height: 48,
            borderRadius: 10,
            background: '#d4a853',
            color: '#1e1b4b',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Start free trial
        </div>
      </div>
    ),
    { ...size },
  );
}
