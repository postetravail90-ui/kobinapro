import { useEffect, useState } from 'react';

export function SupabaseTest() {
  const [status, setStatus] = useState('testing...');
  const [url, setUrl] = useState('');
  const [keyStatus, setKeyStatus] = useState('');

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const key =
      import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    console.log('ENV CHECK:', {
      url: supabaseUrl ?? 'UNDEFINED',
      keyLength: key?.length ?? 0,
      keyStart: key?.substring(0, 20) ?? 'UNDEFINED',
    });

    setUrl(supabaseUrl ?? 'UNDEFINED');
    setKeyStatus(key ? `Key loaded (${key.length} chars)` : 'KEY MISSING');

    if (!supabaseUrl || !key) {
      setStatus('ERROR: env variables missing!');
      return;
    }

    void fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })
      .then((res) => {
        setStatus(`HTTP ${res.status} - ${res.ok ? 'OK' : 'FAILED'}`);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        const name = err instanceof Error ? err.name : 'UnknownError';
        setStatus(`FETCH FAILED: ${msg} | type: ${name}`);
      });
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        right: 20,
        background: status.includes('OK') ? '#E1F5EE' : '#FCEBEB',
        color: status.includes('OK') ? '#085041' : '#791F1F',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace',
      }}
    >
      <div>
        <strong>Supabase URL:</strong> {url}
      </div>
      <div>
        <strong>Key:</strong> {keyStatus}
      </div>
      <div>
        <strong>Status:</strong> {status}
      </div>
    </div>
  );
}
